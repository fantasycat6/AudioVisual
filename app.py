"""
Flask 应用工厂和入口点
AudioVisual Web - 视频解析平台
"""
from flask import Flask
from flask_login import LoginManager
from models import db, User, init_default_data
from config import config
from timezone_util import format_china_time
import os

# 加载环境变量
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # 如果dotenv未安装，继续使用系统环境变量
    pass


def create_app(config_name=None):
    app = Flask(__name__)

    # 加载配置
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])

    # 初始化扩展
    db.init_app(app)

    # Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = '请先登录再访问此页面'
    login_manager.login_message_category = 'warning'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # 注册蓝图
    from auth import auth_bp
    from routes import main_bp
    from admin import admin_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp)
    
    # 注册Jinja2过滤器 - 中国时间格式化
    @app.template_filter('china_time')
    def china_time_filter(utc_time):
        """将UTC时间格式化为中国时间（上海时区）的Jinja2过滤器"""
        return format_china_time(utc_time, '%Y-%m-%d %H:%M')
    
    @app.template_filter('china_time_full')
    def china_time_full_filter(utc_time):
        """将UTC时间格式化为中国时间（上海时区）完整格式的Jinja2过滤器"""
        return format_china_time(utc_time, '%Y-%m-%d %H:%M:%S')

    # 创建表并初始化数据
    with app.app_context():
        db.create_all()
        init_default_data()

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"\n{'='*50}")
    print(f"  AudioVisual Web 视频解析平台")
    print(f"  访问地址: http://127.0.0.1:{port}")
    print(f"  数据库类型: {os.environ.get('DB_TYPE', 'sqlite')}")
    print(f"{'='*50}\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
