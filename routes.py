"""
主要路由蓝图 - 首页、视频解析、影视导航
"""
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, abort
from flask_login import login_required, current_user
from models import db, ParseAPI, DramaSite, APICallLog, BackupFile, User
from timezone_util import get_app_time_now
import requests
from urllib.parse import urljoin
from datetime import datetime
import time
from functools import wraps

main_bp = Blueprint('main', __name__)


# ──────────────────────────────────────────────
#  API Key 认证工具
# ──────────────────────────────────────────────

def _resolve_api_key_user(api_key: str):
    """根据 API Key 查找对应用户，不存在则返回 None"""
    if not api_key:
        return None
    return User.query.filter_by(api_key=api_key).first()


def api_key_or_login_required(f):
    """
    双重认证装饰器，规则如下：

    ① API 模式（满足任一条件即触发）：
       - 请求中存在 ?api_key= 参数（不管是否为空）
       - 请求头包含 X-API-Key 或 Authorization: Bearer
       - 请求参数 type=video（直链外部调用，不应进入登录流程）
       此模式下：api_key 有效 → 放行；无效/缺失 → 静默 403，不重定向

    ② Session 模式（不满足上述任何条件）：
       - 已登录 → 放行
       - 未登录 → 重定向到登录页（保留 next 参数）
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import g
        from flask_login import current_user as _cu

        # 判断是否处于"API 模式"
        has_api_key_param  = 'api_key' in request.args          # 参数存在（不管值）
        has_api_key_header = bool(request.headers.get('X-API-Key', '').strip())
        has_bearer         = bool(_extract_bearer_token())
        has_type_param     = 'type' in request.args              # 有 type 参数即为程序性调用

        api_mode = has_api_key_param or has_api_key_header or has_bearer or has_type_param

        if api_mode:
            # API 模式：必须有合法 Key，否则 403
            api_key = (
                request.args.get('api_key', '').strip()
                or request.headers.get('X-API-Key', '').strip()
                or _extract_bearer_token()
            )
            user = _resolve_api_key_user(api_key) if api_key else None
            if user is None:
                return _api_key_rejected(request)
            g.api_user = user
            return f(*args, **kwargs)

        # Session 模式：走普通登录态
        if _cu.is_authenticated:
            g.api_user = _cu
            return f(*args, **kwargs)

        # 未登录，重定向到登录页
        return redirect(url_for('auth.login', next=request.url))

    return decorated


def _extract_bearer_token():
    """从 Authorization: Bearer <token> 头中提取 token"""
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:].strip()
    return ''


def _api_key_rejected(req):
    """API Key 验证失败时的响应策略：静默 403，不泄露任何信息"""
    # 如果是请求 HTML 页面（type=video），返回一个看起来正常但无实质内容的空响应
    accept = req.headers.get('Accept', '')
    if 'text/html' in accept:
        # 直接返回 403 空白页，不显示任何有用信息
        from flask import abort
        abort(403)
    return jsonify({'error': 'Forbidden'}), 403


def get_api_user():
    """在视图函数内获取当前认证用户（兼容 API Key 认证和 session 登录）"""
    from flask import g
    return getattr(g, 'api_user', None)


def _perform_smart_parse(video_url, api_key=None, requested_api_id=None, max_retries=3):
    """
    执行智能解析的核心逻辑，返回解析结果字典
    
    参数：
        video_url: 视频链接
        api_key: API Key（可选，用于记录日志归属）
        requested_api_id: 指定开始尝试的接口ID
        max_retries: 最大尝试次数
    
    返回格式（始终统一）：
        {
            'success': bool,
            'parse_url': str（成功时）,
            'api_id': int（成功时）,
            'api_name': str,
            'message': str,
            'error': str,
            'tried_apis': list
        }
    """
    apis = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).all()

    if not apis:
        return {
            'success': False,
            'message': '暂无可用的解析接口',
            'error': 'No enabled parse APIs found',
            'tried_apis': []
        }

    # 确定起始位置
    start_index = 0
    if requested_api_id:
        for i, api in enumerate(apis):
            if api.id == requested_api_id:
                start_index = i
                break

    # 尝试多个接口
    tried_apis = []
    success_api = None
    start_time = time.time()

    for i in range(max_retries):
        idx = start_index + i
        if idx >= len(apis):
            # 超出列表则从头循环
            idx = idx % len(apis)

        api = apis[idx]
        tried_apis.append({
            'id': api.id,
            'name': api.name,
            'url': api.url,
            'index': idx
        })

        # 构造解析URL
        parse_url = api.url + video_url

        try:
            # 只检查解析站首页是否可达
            probe_url = api.url if api.url.startswith('http') else 'https://' + api.url
            probe_url = probe_url.split('?')[0]  # 去掉查询参数
            response = requests.head(probe_url, timeout=5, allow_redirects=True)
            if response.status_code < 500:  # 只要不是 5xx 服务端错误都认为接口可达
                success_api = api
                break
        except requests.RequestException:
            # 接口不可达，继续尝试下一个
            continue

    # 构建返回结果
    if success_api:
        # 对视频链接进行URL编码，确保特殊字符正确处理
        import urllib.parse
        encoded_video_url = urllib.parse.quote(video_url)
        parse_url = success_api.url + encoded_video_url
        return {
            'success': True,
            'parse_url': parse_url,
            'api_id': success_api.id,
            'api_name': success_api.name,
            'message': f'使用接口：{success_api.name}',
            'error': '',
            'tried_apis': tried_apis
        }
    else:
        return {
            'success': False,
            'parse_url': '',
            'api_id': None,
            'api_name': '',
            'message': '所有接口均不可达',
            'error': 'All parse API endpoints unreachable',
            'tried_apis': tried_apis
        }


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
@api_key_or_login_required
def smart_parse():
    """智能解析 API - 统一管理多个解析接口，失败自动切换到下一个

    参数:
        video_url:    要解析的视频URL
        type:         返回类型。json（默认）返回JSON数据；video 返回视频播放页HTML
        api_id:       (可选) 指定从哪个接口开始尝试，默认从第一个开始
        max_retries:  (可选) 最大尝试次数，默认3个接口

    返回（type=json，默认）:
        success:      是否成功
        parse_url:    可播放的解析URL（成功时）
        api_id:       成功使用的接口ID
        api_name:     成功使用的接口名称
        message:      状态信息
        error:        错误信息（失败时）
        next_api_id:  下一个建议尝试的接口ID（可用于前端检测失败后继续尝试）
        tried_apis:   已尝试的接口列表

    返回（type=video）:
        直接返回视频播放页面HTML（包含 iframe 嵌入解析站）
    """
    video_url = request.args.get('video_url', '').strip()
    start_api_id = request.args.get('api_id', type=int)
    max_retries = request.args.get('max_retries', default=3, type=int)
    return_type = request.args.get('type', 'json').strip().lower()

    if not video_url:
        if return_type == 'video':
            return '<html><body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>❌ 缺少参数</h2><p>请提供 video_url 参数</p></div></body></html>', 400
        return jsonify({
            'success': False,
            'message': '请输入视频链接',
            'error': 'video_url parameter is required'
        }), 400

    # 获取所有启用的解析接口
    apis = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).all()

    if not apis:
        if return_type == 'video':
            return '<html><body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>❌ 暂无可用解析接口</h2><p>请联系管理员添加解析接口</p></div></body></html>', 404
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

    # 尝试解析接口：只做连通性检测，不判断内容是否真正解析成功
    # （内容是否解析成功由前端 iframe 加载后自行检测，见 index.html 的智能解析逻辑）
    tried_apis = []
    success_api = None
    start_time = time.time()

    for i in range(max_retries):
        idx = start_index + i
        if idx >= len(apis):
            # 超出列表则从头循环
            idx = idx % len(apis)

        api = apis[idx]
        tried_apis.append({
            'id': api.id,
            'name': api.name,
            'url': api.url,
            'index': idx
        })

        # 构造解析URL
        parse_url = api.url + video_url

        try:
            # 只检查解析站首页是否可达，避免带着视频URL发请求（某些接口 HEAD 不支持）
            probe_url = api.url if api.url.startswith('http') else 'https://' + api.url
            probe_url = probe_url.split('?')[0]  # 去掉查询参数，只探测域名/路径
            response = requests.head(probe_url, timeout=5, allow_redirects=True)
            if response.status_code < 500:  # 只要不是 5xx 服务端错误都认为接口可达
                success_api = api
                break
        except requests.RequestException:
            # 接口不可达，继续尝试下一个
            continue

    # 计算响应时间
    response_time_ms = int((time.time() - start_time) * 1000)

    # 记录API调用日志
    try:
        _user = get_api_user()
        log_entry = APICallLog(
            user_id=_user.id if _user else None,
            api_type='smart_parse',
            video_url=video_url[:200],
            success=success_api is not None,
            api_id=success_api.id if success_api else None,
            api_name=success_api.name if success_api else 'unknown',
            error_message='' if success_api else 'All parse APIs failed',
            response_time_ms=response_time_ms
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        print(f"Failed to log API call: {e}")

    # 确定下一个建议尝试的接口
    next_index = (start_index + len(tried_apis)) % len(apis)
    next_api_id = apis[next_index].id

    if success_api:
        # 对视频链接进行URL编码，确保特殊字符正确处理
        import urllib.parse
        encoded_video_url = urllib.parse.quote(video_url)
        final_parse_url = success_api.url + encoded_video_url

        # ── type=video：返回播放页 HTML ──────────────────────────────────────
        if return_type == 'video':
            return render_template(
                'main/smart_player.html',
                parse_url=final_parse_url,
                video_url=video_url,
                api=success_api,
                all_apis=apis,
                next_api_id=next_api_id
            )

        # ── type=json（默认）：返回 JSON ────────────────────────────────────
        return jsonify({
            'success': True,
            'message': f'使用 {success_api.name} 解析成功',
            'parse_url': final_parse_url,
            'api_id': success_api.id,
            'api_name': success_api.name,
            'next_api_id': next_api_id,
            'tried_apis': tried_apis
        })

    else:
        # 所有接口均不可达
        if return_type == 'video':
            tried_names = '、'.join(a['name'] for a in tried_apis)
            return f'<html><body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>❌ 解析失败</h2><p>已尝试接口：{tried_names}</p><p>请检查视频链接或稍后重试</p></div></body></html>', 503

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


# ──────────────────────────────────────────────
#  API Key 管理路由（需要登录）
# ──────────────────────────────────────────────

@main_bp.route('/profile/api-key/generate', methods=['POST'])
@login_required
def generate_api_key():
    """生成（或重新生成）当前用户的 API Key"""
    key = current_user.generate_api_key()
    db.session.commit()
    return jsonify({
        'success': True,
        'api_key': key,
        'created_at': current_user.api_key_created_at.strftime('%Y-%m-%d %H:%M') if current_user.api_key_created_at else ''
    })


@main_bp.route('/profile/api-key/revoke', methods=['POST'])
@login_required
def revoke_api_key():
    """撤销当前用户的 API Key"""
    current_user.revoke_api_key()
    db.session.commit()
    return jsonify({'success': True, 'message': 'API Key 已撤销'})


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


# ──────────────────────────────────────────────
#  特殊路由：favicon.ico 重定向
# ──────────────────────────────────────────────

@main_bp.route('/favicon.ico')
def favicon():
    """处理根目录的favicon请求，重定向到静态文件地址"""
    from flask import redirect
    return redirect('/static/favicon.ico')
