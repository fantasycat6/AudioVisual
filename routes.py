"""
主要路由蓝图 - 首页、视频解析、影视导航
"""
from flask import Blueprint, render_template, jsonify, request, redirect, url_for
from flask_login import login_required, current_user
from models import db, ParseAPI, DramaSite, APICallLog, BackupFile
from timezone_util import get_app_time_now
import requests
from urllib.parse import urljoin
from datetime import datetime
import time

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
@login_required
def index():
    """主页 - 视频解析"""
    apis = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).all()
    return render_template('main/index.html', apis=apis)


@main_bp.route('/drama')
@login_required
def drama():
    """影视导航页"""
    sites = DramaSite.query.filter_by(is_enabled=True).order_by(DramaSite.sort_order).all()
    return render_template('main/drama.html', sites=sites)


@main_bp.route('/parse')
@login_required
def parse():
    """视频解析 - 接收 video_url 和 api_url，返回解析页面（iframe）"""
    video_url = request.args.get('video_url', '').strip()
    api_id = request.args.get('api_id', type=int)
    start_time = time.time()

    if not video_url:
        return jsonify({'success': False, 'message': '请输入视频链接'}), 400

    if api_id:
        api = ParseAPI.query.get(api_id)
    else:
        api = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).first()

    if not api:
        return jsonify({'success': False, 'message': '暂无可用的解析接口'}), 404

    parse_url = api.url + video_url
    
    # 记录API调用日志
    try:
        response_time_ms = int((time.time() - start_time) * 1000)
        log_entry = APICallLog(
            user_id=current_user.id,
            api_type='normal',
            video_url=video_url[:200],
            success=True,
            api_id=api.id,
            api_name=api.name,
            response_time_ms=response_time_ms
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        # 记录失败不影响主流程
        print(f"Failed to log API call: {e}")
    
    return render_template('main/player.html', parse_url=parse_url, video_url=video_url, api=api)


@main_bp.route('/api/apis')
@login_required
def get_apis():
    """获取解析接口列表（JSON API）"""
    apis = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).all()
    return jsonify([api.to_dict() for api in apis])


@main_bp.route('/api/drama-sites')
@login_required
def get_drama_sites():
    """获取影视导航列表（JSON API）"""
    sites = DramaSite.query.filter_by(is_enabled=True).order_by(DramaSite.sort_order).all()
    return jsonify([site.to_dict() for site in sites])


@main_bp.route('/api/parse/smart')
@login_required
def smart_parse():
    """智能解析 API - 统一管很多个解析接口，失败自动切换到下一个
    
    参数:
        video_url: 要解析的视频URL
        api_id (可选): 指定从哪个接口开始尝试，默认从第一个开始
        max_retries (可选): 最大尝试次数，默认3个接口
    
    返回:
        success: 是否成功
        parse_url: 可播放的解析URL（成功时）
        api_id: 成功使用的接口ID
        api_name: 成功使用的接口名称
        message: 状态信息
        error: 错误信息（失败时）
        next_api_id: 下一个建议尝试的接口ID
        tried_apis: 已尝试的接口列表
    """
    video_url = request.args.get('video_url', '').strip()
    start_api_id = request.args.get('api_id', type=int)
    max_retries = request.args.get('max_retries', default=3, type=int)
    
    if not video_url:
        return jsonify({
            'success': False,
            'message': '请输入视频链接',
            'error': 'video_url parameter is required'
        }), 400
    
    # 获取所有启用的解析接口
    apis = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).all()
    
    if not apis:
        return jsonify({
            'success': False,
            'message': '暂无可用的解析接口',
            'error': 'No enabled parse APIs found'
        }), 404
    
    # 确定起始位置
    start_index = 0
    if start_api_id:
        for i, api in enumerate(apis):
            if api.id == start_api_id:
                start_index = i
                break
    
    # 尝试解析接口
    tried_apis = []
    success_api = None
    start_time = time.time()
    
    for i in range(max_retries):
        if start_index + i >= len(apis):
            # 如果已经尝试完所有接口，从头开始
            start_index = 0
            i = 0
        
        api = apis[start_index + i]
        tried_apis.append({
            'id': api.id,
            'name': api.name,
            'url': api.url,
            'index': start_index + i
        })
        
        # 构造解析URL
        parse_url = api.url + video_url
        
        # 测试接口是否可用（可选步骤，可以注释掉以提高速度）
        # 这里我们可以简单的检查或者不检查，让前端直接加载
        try:
            # 简单测试一下接口是否可达（只检查头部，不下载完整内容）
            response = requests.head(parse_url, timeout=5, allow_redirects=True)
            if response.status_code < 400:
                success_api = api
                break
        except requests.RequestException:
            # 请求失败，继续尝试下一个接口
            continue
    
    # 计算响应时间
    response_time_ms = int((time.time() - start_time) * 1000)
    
    # 记录API调用日志
    try:
        log_entry = APICallLog(
            user_id=current_user.id,
            api_type='smart_parse',
            video_url=video_url[:200],  # 限制长度
            success=success_api is not None,
            api_id=success_api.id if success_api else None,
            api_name=success_api.name if success_api else 'unknown',
            error_message='' if success_api else 'All parse APIs failed',
            response_time_ms=response_time_ms
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        # 记录失败不影响主流程
        print(f"Failed to log API call: {e}")
    
    if success_api:
        # 确定下一个建议尝试的接口
        next_index = (start_index + len(tried_apis)) % len(apis)
        next_api_id = apis[next_index].id if next_index < len(apis) else apis[0].id
        
        return jsonify({
            'success': True,
            'message': f'使用 {success_api.name} 解析成功',
            'parse_url': success_api.url + video_url,
            'api_id': success_api.id,
            'api_name': success_api.name,
            'next_api_id': next_api_id,
            'tried_apis': tried_apis
        })
    else:
        # 所有尝试都失败了
        next_index = (start_index + len(tried_apis)) % len(apis)
        next_api_id = apis[next_index].id if next_index < len(apis) else apis[0].id
        
        return jsonify({
            'success': False,
            'message': f'尝试了 {len(tried_apis)} 个接口均失败，请检查视频链接或稍后重试',
            'error': 'All parse APIs failed',
            'next_api_id': next_api_id,
            'tried_apis': tried_apis
        }), 503


@main_bp.route('/api/parse/quick')
@login_required
def quick_parse():
    """快速解析 API - 返回所有可用解析接口列表，供前端选择"""
    start_time = time.time()
    apis = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).all()
    
    # 记录API调用日志
    try:
        response_time_ms = int((time.time() - start_time) * 1000)
        log_entry = APICallLog(
            user_id=current_user.id,
            api_type='quick_parse',
            video_url='quick_api_list',
            success=True,
            response_time_ms=response_time_ms
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        # 记录失败不影响主流程
        print(f"Failed to log API call: {e}")
    
    return jsonify({
        'success': True,
        'message': f'找到 {len(apis)} 个可用解析接口',
        'apis': [api.to_dict() for api in apis]
    })


@main_bp.route('/api-docs')
@login_required
def api_docs():
    """API介绍使用页面"""
    # 获取所有可用API的统计信息
    apis = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).all()
    
    # 计算API统计信息
    from datetime import datetime, timedelta
    
    # 总API调用次数
    total_api_calls = APICallLog.query.count()
    
    # 今日活跃用户（今天调用过API的不同用户）
    today = datetime.now().date()  # 使用本地时间
    start_of_day = datetime.combine(today, datetime.min.time())
    today_active_users = db.session.query(APICallLog.user_id).filter(
        APICallLog.created_at >= start_of_day
    ).distinct().count()
    
    # 成功率统计
    successful_calls = APICallLog.query.filter_by(success=True).count()
    success_rate = (successful_calls / total_api_calls * 100) if total_api_calls > 0 else 0
    
    # 平均响应时间
    avg_response_time = db.session.query(db.func.avg(APICallLog.response_time_ms)).filter(
        APICallLog.response_time_ms.isnot(None)
    ).scalar()
    avg_response_time = round(avg_response_time) if avg_response_time else 0
    
    # 可用解析接口数量
    api_count = len(apis)
    
    # 影视导航站数量
    drama_site_count = DramaSite.query.filter_by(is_enabled=True).count()
    
    return render_template('main/api_docs.html', 
                          apis=apis,
                          total_api_calls=total_api_calls,
                          today_active_users=today_active_users,
                          success_rate=round(success_rate, 2),
                          avg_response_time=avg_response_time,
                          api_count=api_count,
                          drama_site_count=drama_site_count)


@main_bp.route('/profile')
@login_required
def profile():
    """用户中心页面"""
    return render_template('main/profile.html')


@main_bp.route('/profile/change-password', methods=['POST'])
@login_required
def change_password_profile():
    """普通用户修改密码"""
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
