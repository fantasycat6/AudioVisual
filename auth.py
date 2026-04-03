"""
认证蓝图 - 登录、注册、登出
"""
from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User
from datetime import datetime

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))

    if request.method == 'POST':
        # 支持 JSON 和表单两种提交方式
        if request.is_json:
            data = request.get_json()
            username = data.get('username', '').strip()
            password = data.get('password', '')
            remember = data.get('remember', False)
        else:
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')
            remember = bool(request.form.get('remember'))

        if not username or not password:
            if request.is_json:
                return jsonify({'success': False, 'message': '请输入用户名和密码'}), 400
            flash('请输入用户名和密码', 'error')
            return render_template('auth/login.html')

        # 支持用户名或邮箱登录
        user = User.query.filter(
            (User.username == username) | (User.email == username)
        ).first()

        if user and user.check_password(password):
            user.last_login = datetime.utcnow()
            db.session.commit()
            login_user(user, remember=remember)
            if request.is_json:
                return jsonify({'success': True, 'redirect': url_for('main.index')})
            next_page = request.args.get('next')
            return redirect(next_page or url_for('main.index'))
        else:
            if request.is_json:
                return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
            flash('用户名或密码错误', 'error')

    return render_template('auth/login.html')


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))

    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            username = data.get('username', '').strip()
            email = data.get('email', '').strip()
            password = data.get('password', '')
            confirm_password = data.get('confirm_password', '')
        else:
            username = request.form.get('username', '').strip()
            email = request.form.get('email', '').strip()
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')

        # 验证
        errors = []
        if not username or len(username) < 2:
            errors.append('用户名至少需要2个字符')
        if len(username) > 20:
            errors.append('用户名不能超过20个字符')
        if not email or '@' not in email:
            errors.append('请输入有效的邮箱地址')
        if not password or len(password) < 6:
            errors.append('密码至少需要6个字符')
        if password != confirm_password:
            errors.append('两次输入的密码不一致')

        if not errors:
            if User.query.filter_by(username=username).first():
                errors.append('用户名已被占用')
            if User.query.filter_by(email=email).first():
                errors.append('邮箱已被注册')

        if errors:
            if request.is_json:
                return jsonify({'success': False, 'message': '；'.join(errors)}), 400
            for error in errors:
                flash(error, 'error')
            return render_template('auth/register.html')

        # 创建用户
        user = User(username=username, email=email)
        user.set_password(password)
        # 第一个注册的用户自动成为管理员
        if User.query.count() == 0:
            user.is_admin = True
        db.session.add(user)
        db.session.commit()

        if request.is_json:
            return jsonify({'success': True, 'message': '注册成功，请登录', 'redirect': url_for('auth.login')})
        flash('注册成功，欢迎加入！', 'success')
        login_user(user)
        return redirect(url_for('main.index'))

    return render_template('auth/register.html')


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('已安全退出', 'info')
    return redirect(url_for('auth.login'))
