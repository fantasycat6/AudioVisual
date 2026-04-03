"""
配置文件 - 支持 SQLite（默认）和 MySQL
"""
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'audiovisual-secret-key-2026'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 默认使用 SQLite
    DB_TYPE = os.environ.get('DB_TYPE', 'sqlite')  # 'sqlite' 或 'mysql'

    @staticmethod
    def get_db_uri():
        db_type = os.environ.get('DB_TYPE', 'sqlite')
        if db_type == 'mysql':
            host = os.environ.get('MYSQL_HOST', 'localhost')
            port = os.environ.get('MYSQL_PORT', '3306')
            user = os.environ.get('MYSQL_USER', 'root')
            password = os.environ.get('MYSQL_PASSWORD', '')
            db_name = os.environ.get('MYSQL_DB', 'audiovisual')
            return f'mysql+pymysql://{user}:{password}@{host}:{port}/{db_name}?charset=utf8mb4'
        else:
            # SQLite（默认）
            db_path = os.environ.get('SQLITE_PATH', os.path.join(BASE_DIR, 'audiovisual.db'))
            return f'sqlite:///{db_path}'


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = Config.get_db_uri()


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = Config.get_db_uri()


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
