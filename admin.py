"""
管理后台蓝图 - 用户管理、解析接口管理、影视导航管理、备份恢复
"""
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, flash, Response
from flask_login import login_required, current_user
from functools import wraps
from models import db, User, ParseAPI, DramaSite
from werkzeug.security import generate_password_hash
import json
from datetime import datetime

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
    user_count = User.query.count()
    api_count = ParseAPI.query.count()
    site_count = DramaSite.query.count()
    return render_template('admin/index.html',
                           user_count=user_count,
                           api_count=api_count,
                           site_count=site_count)


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
    backup = {
        'version': '1.0',
        'exported_at': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'parse_apis': apis,
        'drama_sites': sites,
    }
    json_str = json.dumps(backup, ensure_ascii=False, indent=2)
    filename = f"audiovisual_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
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
    return jsonify({
        'success': True,
        'message': f"导入成功：解析接口 {imported['apis']} 条，影视导航 {imported['sites']} 条",
        'imported': imported
    })
