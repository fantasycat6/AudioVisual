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


def _auto_migrate(db):
    """
    轻量级自动迁移：检测 users 表是否缺少新字段，若缺少则用 ALTER TABLE 补充。
    兼容 SQLite（不支持 ADD COLUMN ... UNIQUE，需单独建索引）和 MySQL。
    """
    import sqlalchemy
    engine = db.engine
    insp = sqlalchemy.inspect(engine)

    # 检测数据库类型
    dialect = engine.dialect.name  # 'sqlite' (仅支持SQLite)

    # users 表需要检查的新字段：字段名 → (ADD COLUMN SQL, 可选的后续 INDEX SQL)
    users_new_columns = [
        (
            'api_key',
            'ALTER TABLE users ADD COLUMN api_key VARCHAR(64)',
            # SQLite 不能在 ADD COLUMN 加 UNIQUE，需单独建索引
            'CREATE UNIQUE INDEX IF NOT EXISTS uq_users_api_key ON users (api_key)',
        ),
        (
            'api_key_created_at',
            'ALTER TABLE users ADD COLUMN api_key_created_at DATETIME',
            None,
        ),
    ]

    existing_cols = {col['name'] for col in insp.get_columns('users')}
    with engine.connect() as conn:
        for col_name, add_sql, index_sql in users_new_columns:
            if col_name not in existing_cols:
                try:
                    conn.execute(sqlalchemy.text(add_sql))
                    conn.commit()
                    print(f"[migrate] users 表已添加字段: {col_name}")
                except Exception as e:
                    print(f"[migrate] 添加字段 {col_name} 失败: {e}")
                    continue

            # 字段已存在（或刚添加）后，补建唯一索引（SQLite 用 IF NOT EXISTS 幂等）
            if index_sql and dialect == 'sqlite':
                try:
                    conn.execute(sqlalchemy.text(index_sql))
                    conn.commit()
                except Exception:
                    pass  # 索引已存在，忽略


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
        _auto_migrate(db)   # 自动补充缺失字段（轻量迁移）
        init_default_data()

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"\n{'='*50}")
    print(f"  AudioVisual Web 视频解析平台")
    print(f"  访问地址: http://127.0.0.1:{port}")
    print(f"  数据库架构: SQLite单文件（简洁）")
    print(f"{'='*50}\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
