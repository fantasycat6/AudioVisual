"""
配置文件 - AudioVisual 简洁架构（仅SQLite支持）
已移除复杂的MySQL支持，回归稳定简洁的单文件数据库架构
"""
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'audiovisual-secret-key-2026'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 数据库配置（仅SQLite支持 - 2026年4月6日架构优化）
    SQLITE_PATH = os.environ.get('SQLITE_PATH', os.path.join(BASE_DIR, 'audiovisual.db'))
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{SQLITE_PATH}'
    
    # 调试模式配置
    @staticmethod
    def get_debug_mode():
        flask_env = os.environ.get('FLASK_ENV', '').lower()
        flask_debug = os.environ.get('FLASK_DEBUG', '').lower()
        
        # 环境变量优先级：FLASK_ENV > FLASK_DEBUG
        if flask_env == 'production':
            return False
        elif flask_env == 'development':
            return True
        elif flask_debug in ['true', '1', 'yes']:
            return True
        else:
            # 默认开发模式
            return True


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False


# 动态配置选择
def get_config():
    """
    根据环境变量返回相应的配置类
    简化为：如果明确指定production则用生产配置，其他情况用开发配置
    
    理由：避免过度设计，专注核心功能稳定性
    """
    env = os.environ.get('FLASK_ENV', '').lower()
    if env == 'production':
        return ProductionConfig
    else:
        return DevelopmentConfig


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
