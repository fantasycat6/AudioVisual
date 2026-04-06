"""
管理后台蓝图 - 用户管理、解析接口管理、影视导航管理、备份恢复
"""
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, flash, Response, send_file
from flask_login import login_required, current_user
from functools import wraps
from models import db, User, ParseAPI, DramaSite, BackupFile, APICallLog
from werkzeug.security import generate_password_hash
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from timezone_util import get_app_time_now, format_china_time
import time
import threading

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


def admin_required(f):
    """管理员权限装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            if request.is_json:
                return jsonify({'success': False, 'message': '需要管理员权限'}), 403
            flash('需要管理员权限', 'error')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function


# ==================== 管理后台主页 ====================

@admin_bp.route('/')
@login_required
@admin_required
def index():
    from datetime import datetime, timedelta
    
    user_count = User.query.count()
    api_count = ParseAPI.query.count()
    site_count = DramaSite.query.count()
    
    # API调用统计
    total_api_calls = APICallLog.query.count()
    today = datetime.now().date()  # 使用本地时间
    start_of_day = datetime.combine(today, datetime.min.time())
    today_calls = APICallLog.query.filter(APICallLog.created_at >= start_of_day).count()
    
    # 成功率统计
    successful_calls = APICallLog.query.filter_by(success=True).count()
    success_rate = (successful_calls / total_api_calls * 100) if total_api_calls > 0 else 0
    
    # 获取最近24小时的调用趋势
    last_24h_hours = []
    last_24h_counts = []
    for i in range(24):
        hour_start = datetime.now() - timedelta(hours=i+1)  # 使用本地时间
        hour_end = datetime.now() - timedelta(hours=i)      # 使用本地时间
        hour_count = APICallLog.query.filter(
            APICallLog.created_at >= hour_start,
            APICallLog.created_at < hour_end
        ).count()
        last_24h_hours.append(f"{hour_start.hour:02d}:00")
        last_24h_counts.append(hour_count)
    last_24h_hours.reverse()  # 按时间顺序
    last_24h_counts.reverse()
    
    # 最常用API统计
    api_stats = db.session.query(
        APICallLog.api_name,
        db.func.count(APICallLog.id).label('count')
    ).filter(APICallLog.api_name.isnot(None)).group_by(APICallLog.api_name).order_by(db.func.count(APICallLog.id).desc()).limit(10).all()
    
    return render_template('admin/index.html',
                           user_count=user_count,
                           api_count=api_count,
                           site_count=site_count,
                           total_api_calls=total_api_calls,
                           today_calls=today_calls,
                           success_rate=round(success_rate, 2),
                           api_stats=api_stats,
                           last_24h_counts_json=json.dumps(last_24h_counts),
                           last_24h_hours_json=json.dumps(last_24h_hours))


# ==================== 用户管理 ====================

@admin_bp.route('/users')
@login_required
@admin_required
def users():
    all_users = User.query.order_by(User.created_at.desc()).all()
    return render_template('admin/users.html', users=all_users)


@admin_bp.route('/users/<int:user_id>/toggle-admin', methods=['POST'])
@login_required
@admin_required
def toggle_admin(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        return jsonify({'success': False, 'message': '不能修改自己的管理员状态'}), 400
    user.is_admin = not user.is_admin
    db.session.commit()
    return jsonify({'success': True, 'is_admin': user.is_admin})


@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@login_required
@admin_required
def reset_password(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    new_password = data.get('password', '')
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': '密码至少需要6个字符'}), 400
    user.set_password(new_password)
    db.session.commit()
    return jsonify({'success': True, 'message': '密码已重置'})


@admin_bp.route('/users/<int:user_id>/delete', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        return jsonify({'success': False, 'message': '不能删除自己的账号'}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True, 'message': '用户已删除'})


@admin_bp.route('/users/change-password', methods=['POST'])
@login_required
@admin_required
def change_password():
    """修改当前用户的密码"""
    data = request.get_json()
    old_password = data.get('old_password', '').strip()
    new_password = data.get('new_password', '').strip()
    
    # 参数验证
    if not old_password or not new_password:
        return jsonify({'success': False, 'message': '旧密码和新密码不能为空'}), 400
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': '新密码至少需要6个字符'}), 400
    
    # 验证旧密码
    if not current_user.check_password(old_password):
        return jsonify({'success': False, 'message': '旧密码错误'}), 400
    
    # 设置新密码
    current_user.set_password(new_password)
    current_user.last_login = get_app_time_now()  # 使用应用时区时间
    db.session.commit()
    
    return jsonify({'success': True, 'message': '密码修改成功'})


# ==================== 解析接口管理 ====================

@admin_bp.route('/apis')
@login_required
@admin_required
def apis():
    all_apis = ParseAPI.query.order_by(ParseAPI.sort_order).all()
    return render_template('admin/apis.html', apis=all_apis)


@admin_bp.route('/apis/add', methods=['POST'])
@login_required
@admin_required
def add_api():
    data = request.get_json()
    name = data.get('name', '').strip()
    url = data.get('url', '').strip()
    if not name or not url:
        return jsonify({'success': False, 'message': '名称和URL不能为空'}), 400
    max_order = db.session.query(db.func.max(ParseAPI.sort_order)).scalar() or 0
    api = ParseAPI(name=name, url=url, sort_order=max_order + 1)
    db.session.add(api)
    db.session.commit()
    return jsonify({'success': True, 'api': api.to_dict()})


@admin_bp.route('/apis/<int:api_id>/edit', methods=['PUT'])
@login_required
@admin_required
def edit_api(api_id):
    api = ParseAPI.query.get_or_404(api_id)
    data = request.get_json()
    if 'name' in data:
        api.name = data['name'].strip()
    if 'url' in data:
        api.url = data['url'].strip()
    if 'is_enabled' in data:
        api.is_enabled = bool(data['is_enabled'])
    if 'sort_order' in data:
        api.sort_order = int(data['sort_order'])
    db.session.commit()
    return jsonify({'success': True, 'api': api.to_dict()})


@admin_bp.route('/apis/<int:api_id>/delete', methods=['DELETE'])
@login_required
@admin_required
def delete_api(api_id):
    api = ParseAPI.query.get_or_404(api_id)
    db.session.delete(api)
    db.session.commit()
    return jsonify({'success': True})


@admin_bp.route('/apis/<int:api_id>/toggle', methods=['POST'])
@login_required
@admin_required
def toggle_api(api_id):
    api = ParseAPI.query.get_or_404(api_id)
    api.is_enabled = not api.is_enabled
    db.session.commit()
    return jsonify({'success': True, 'is_enabled': api.is_enabled})


# ==================== 影视导航管理 ====================

@admin_bp.route('/drama-sites')
@login_required
@admin_required
def drama_sites():
    all_sites = DramaSite.query.order_by(DramaSite.sort_order).all()
    return render_template('admin/drama_sites.html', sites=all_sites)


@admin_bp.route('/drama-sites/add', methods=['POST'])
@login_required
@admin_required
def add_drama_site():
    data = request.get_json()
    name = data.get('name', '').strip()
    url = data.get('url', '').strip()
    description = data.get('description', '').strip()
    icon = data.get('icon', '🎬').strip()
    if not name or not url:
        return jsonify({'success': False, 'message': '名称和URL不能为空'}), 400
    max_order = db.session.query(db.func.max(DramaSite.sort_order)).scalar() or 0
    site = DramaSite(name=name, url=url, description=description, icon=icon, sort_order=max_order + 1)
    db.session.add(site)
    db.session.commit()
    return jsonify({'success': True, 'site': site.to_dict()})


@admin_bp.route('/drama-sites/<int:site_id>/edit', methods=['PUT'])
@login_required
@admin_required
def edit_drama_site(site_id):
    site = DramaSite.query.get_or_404(site_id)
    data = request.get_json()
    if 'name' in data:
        site.name = data['name'].strip()
    if 'url' in data:
        site.url = data['url'].strip()
    if 'description' in data:
        site.description = data['description'].strip()
    if 'icon' in data:
        site.icon = data['icon'].strip()
    if 'is_enabled' in data:
        site.is_enabled = bool(data['is_enabled'])
    db.session.commit()
    return jsonify({'success': True, 'site': site.to_dict()})


@admin_bp.route('/drama-sites/<int:site_id>/delete', methods=['DELETE'])
@login_required
@admin_required
def delete_drama_site(site_id):
    site = DramaSite.query.get_or_404(site_id)
    db.session.delete(site)
    db.session.commit()
    return jsonify({'success': True})


@admin_bp.route('/drama-sites/<int:site_id>/toggle', methods=['POST'])
@login_required
@admin_required
def toggle_drama_site(site_id):
    site = DramaSite.query.get_or_404(site_id)
    site.is_enabled = not site.is_enabled
    db.session.commit()
    return jsonify({'success': True, 'is_enabled': site.is_enabled})


# ==================== 解析接口排序 ====================

@admin_bp.route('/apis/reorder', methods=['POST'])
@login_required
@admin_required
def reorder_apis():
    """保存拖拽后的排序（传入有序 id 列表）"""
    data = request.get_json()
    order_list = data.get('order', [])   # [id1, id2, id3, ...]
    for idx, api_id in enumerate(order_list, start=1):
        ParseAPI.query.filter_by(id=api_id).update({'sort_order': idx})
    db.session.commit()
    return jsonify({'success': True})


# ==================== 数据备份与导入 ====================

@admin_bp.route('/backup/export')
@login_required
@admin_required
def export_backup():
    """导出全部数据为 JSON 文件"""
    apis = [a.to_dict() for a in ParseAPI.query.order_by(ParseAPI.sort_order).all()]
    sites = [s.to_dict() for s in DramaSite.query.order_by(DramaSite.sort_order).all()]
    china_now = get_china_time_now()
    backup = {
        'version': '1.0',
        'exported_at': format_china_time(china_now, '%Y-%m-%dT%H:%M:%S'),
        'exported_at_timezone': 'Asia/Shanghai',
        'parse_apis': apis,
        'drama_sites': sites,
    }
    json_str = json.dumps(backup, ensure_ascii=False, indent=2)
    filename = f"audiovisual_backup_{china_now.strftime('%Y%m%d_%H%M%S')}.json"
    
    # 同时保存到备份文件系统
    try:
        backup_dir = Path.cwd() / 'backup'
        backup_dir.mkdir(exist_ok=True)
        
        filepath = backup_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(json_str)
        
        # 记录备份文件信息到数据库
        backup_record = BackupFile(
            filename=filename,
            filepath=str(filepath),
            file_size=len(json_str.encode('utf-8')),
            backup_type='manual',
            description='手动导出备份'
        )
        db.session.add(backup_record)
        db.session.commit()
    except Exception as e:
        # 文件保存失败不影响主流程，只记录日志
        print(f"保存备份文件失败: {e}")
    
    return Response(
        json_str,
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )


@admin_bp.route('/backup/import', methods=['POST'])
@login_required
@admin_required
def import_backup():
    """导入备份 JSON，支持覆盖或合并两种模式"""
    file = request.files.get('backup_file')
    mode = request.form.get('mode', 'merge')   # merge | overwrite

    if not file or not file.filename.endswith('.json'):
        return jsonify({'success': False, 'message': '请上传 .json 格式的备份文件'})

    try:
        data = json.loads(file.read().decode('utf-8'))
    except Exception as e:
        return jsonify({'success': False, 'message': f'文件解析失败：{e}'})

    if 'parse_apis' not in data and 'drama_sites' not in data:
        return jsonify({'success': False, 'message': '备份文件格式不正确'})

    imported = {'apis': 0, 'sites': 0}

    # 处理解析接口
    if 'parse_apis' in data:
        if mode == 'overwrite':
            ParseAPI.query.delete()
        existing_urls = {a.url for a in ParseAPI.query.all()}
        max_order = db.session.query(db.func.max(ParseAPI.sort_order)).scalar() or 0
        for item in data['parse_apis']:
            url = item.get('url', '').strip()
            if not url:
                continue
            if mode == 'merge' and url in existing_urls:
                continue    # 合并模式跳过已有接口
            max_order += 1
            db.session.add(ParseAPI(
                name=item.get('name', '未命名'),
                url=url,
                is_enabled=item.get('is_enabled', True),
                sort_order=item.get('sort_order', max_order),
            ))
            imported['apis'] += 1

    # 处理影视导航
    if 'drama_sites' in data:
        if mode == 'overwrite':
            DramaSite.query.delete()
        existing_urls = {s.url for s in DramaSite.query.all()}
        max_order = db.session.query(db.func.max(DramaSite.sort_order)).scalar() or 0
        for item in data['drama_sites']:
            url = item.get('url', '').strip()
            if not url:
                continue
            if mode == 'merge' and url in existing_urls:
                continue
            max_order += 1
            db.session.add(DramaSite(
                name=item.get('name', '未命名'),
                url=url,
                description=item.get('description', ''),
                icon=item.get('icon', '🎬'),
                is_enabled=item.get('is_enabled', True),
                sort_order=item.get('sort_order', max_order),
            ))
            imported['sites'] += 1

    db.session.commit()
    
    # 保存到备份文件系统
    try:
        # 创建备份文件
        backup_dir = Path.cwd() / 'backup'
        backup_dir.mkdir(exist_ok=True)
        
        filename = f"audiovisual_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = backup_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(json.dumps(backup, ensure_ascii=False, indent=2))
        
        # 记录备份文件信息到数据库
        backup_record = BackupFile(
            filename=filename,
            filepath=str(filepath),
            file_size=filepath.stat().st_size,
            backup_type='auto_import',
            description=f'导入备份，模式：{mode}，导入 {imported["apis"]} 个接口，{imported["sites"]} 个导航'
        )
        db.session.add(backup_record)
        db.session.commit()
    except Exception as e:
        # 文件保存失败不影响主流程，只记录日志
        print(f"保存备份文件失败: {e}")
    
    return jsonify({
        'success': True,
        'message': f"导入成功：解析接口 {imported['apis']} 条，影视导航 {imported['sites']} 条。已保存到备份系统。",
        'imported': imported
    })


# ==================== 增强的备份文件管理系统 ====================


@admin_bp.route('/backup/list')
@login_required
@admin_required
def list_backups():
    """列出所有备份文件"""
    backups = BackupFile.query.order_by(BackupFile.created_at.desc()).all()
    return jsonify({
        'success': True,
        'backups': [backup.to_dict() for backup in backups]
    })


@admin_bp.route('/backup/create')
@login_required
@admin_required
def create_backup():
    """创建备份并保存到文件系统"""
    # 导出数据
    apis = [a.to_dict() for a in ParseAPI.query.order_by(ParseAPI.sort_order).all()]
    sites = [s.to_dict() for s in DramaSite.query.order_by(DramaSite.sort_order).all()]
    app_now = get_app_time_now()
    backup = {
        'version': '1.0',
        'exported_at': format_china_time(app_now, '%Y-%m-%dT%H:%M:%S'),
        'exported_at_timezone': 'Asia/Shanghai',
        'parse_apis': apis,
        'drama_sites': sites,
    }
    
    json_str = json.dumps(backup, ensure_ascii=False, indent=2)
    filename = f"audiovisual_backup_{app_now.strftime('%Y%m%d_%H%M%S')}.json"
    
    # 确保备份目录存在
    backup_dir = Path.cwd() / 'backup'
    backup_dir.mkdir(exist_ok=True)
    
    # 保存文件
    filepath = backup_dir / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(json_str)
    
    # 记录到数据库
    backup_record = BackupFile(
        filename=filename,
        filepath=str(filepath),
        file_size=len(json_str.encode('utf-8')),
        backup_type='manual',
        description='手动备份'
    )
    db.session.add(backup_record)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '备份创建成功',
        'backup': backup_record.to_dict()
    })


@admin_bp.route('/backup/download/<int:backup_id>')
@login_required
@admin_required
def download_backup(backup_id):
    """下载备份文件"""
    backup = BackupFile.query.get_or_404(backup_id)
    
    if not os.path.exists(backup.filepath):
        return jsonify({'success': False, 'message': '备份文件不存在'}), 404
    
    return send_file(
        backup.filepath,
        as_attachment=True,
        download_name=backup.filename,
        mimetype='application/json'
    )


@admin_bp.route('/backup/restore/<int:backup_id>', methods=['POST'])
@login_required
@admin_required
def restore_backup(backup_id):
    """从备份文件恢复数据"""
    backup = BackupFile.query.get_or_404(backup_id)
    
    if not os.path.exists(backup.filepath):
        return jsonify({'success': False, 'message': '备份文件不存在'}), 404
    
    try:
        with open(backup.filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        return jsonify({'success': False, 'message': f'备份文件解析失败: {e}'}), 400
    
    mode = request.json.get('mode', 'overwrite') if request.is_json else 'overwrite'
    
    imported = {'apis': 0, 'sites': 0}
    
    # 处理解析接口
    if 'parse_apis' in data:
        if mode == 'overwrite':
            ParseAPI.query.delete()
        existing_urls = {a.url for a in ParseAPI.query.all()}
        max_order = db.session.query(db.func.max(ParseAPI.sort_order)).scalar() or 0
        for item in data['parse_apis']:
            url = item.get('url', '').strip()
            if not url:
                continue
            if mode == 'merge' and url in existing_urls:
                continue
            max_order += 1
            db.session.add(ParseAPI(
                name=item.get('name', '未命名'),
                url=url,
                is_enabled=item.get('is_enabled', True),
                sort_order=item.get('sort_order', max_order),
            ))
            imported['apis'] += 1
    
    # 处理影视导航
    if 'drama_sites' in data:
        if mode == 'overwrite':
            DramaSite.query.delete()
        existing_urls = {s.url for s in DramaSite.query.all()}
        max_order = db.session.query(db.func.max(DramaSite.sort_order)).scalar() or 0
        for item in data['drama_sites']:
            url = item.get('url', '').strip()
            if not url:
                continue
            if mode == 'merge' and url in existing_urls:
                continue
            max_order += 1
            db.session.add(DramaSite(
                name=item.get('name', '未命名'),
                url=url,
                description=item.get('description', ''),
                icon=item.get('icon', '🎬'),
                is_enabled=item.get('is_enabled', True),
                sort_order=item.get('sort_order', max_order),
            ))
            imported['sites'] += 1
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f"恢复成功：解析接口 {imported['apis']} 条，影视导航 {imported['sites']} 条",
        'imported': imported
    })


@admin_bp.route('/backup/delete/<int:backup_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_backup(backup_id):
    """删除备份文件"""
    backup = BackupFile.query.get_or_404(backup_id)
    
    # 删除文件
    if os.path.exists(backup.filepath):
        try:
            os.remove(backup.filepath)
        except Exception as e:
            return jsonify({'success': False, 'message': f'删除文件失败: {e}'}), 500
    
    # 从数据库删除记录
    db.session.delete(backup)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '备份已删除'
    })






