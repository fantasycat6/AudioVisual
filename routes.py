"""
主要路由蓝图 - 首页、视频解析、影视导航
"""
from flask import Blueprint, render_template, jsonify, request, redirect, url_for
from flask_login import login_required, current_user
from models import db, ParseAPI, DramaSite

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

    if not video_url:
        return jsonify({'success': False, 'message': '请输入视频链接'}), 400

    if api_id:
        api = ParseAPI.query.get(api_id)
    else:
        api = ParseAPI.query.filter_by(is_enabled=True).order_by(ParseAPI.sort_order).first()

    if not api:
        return jsonify({'success': False, 'message': '暂无可用的解析接口'}), 404

    parse_url = api.url + video_url
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
