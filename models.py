"""
数据库模型 - 用户、解析接口、影视导航
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from timezone_util import format_china_time, get_app_time_now
import secrets
import string

db = SQLAlchemy()

def app_time_now():
    """获取当前应用时区时间，用于数据库字段默认值"""
    return datetime.now()  # 直接使用本地时间，不使用时区信息


def _generate_api_key():
    """生成格式为 av_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 的 API Key（前缀+36位随机字母数字）"""
    alphabet = string.ascii_letters + string.digits
    random_part = ''.join(secrets.choice(alphabet) for _ in range(36))
    return f'av_{random_part}'


class User(UserMixin, db.Model):
    """用户表"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=app_time_now)
    last_login = db.Column(db.DateTime, nullable=True)

    # API Key 认证（用于无登录态的 API 调用，如 type=video 直链）
    api_key = db.Column(db.String(64), unique=True, nullable=True, index=True)
    api_key_created_at = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def generate_api_key(self):
        """生成新的 API Key，并更新创建时间"""
        self.api_key = _generate_api_key()
        self.api_key_created_at = datetime.now()
        return self.api_key

    def revoke_api_key(self):
        """撤销 API Key"""
        self.api_key = None
        self.api_key_created_at = None

    def __repr__(self):
        return f'<User {self.username}>'


class ParseAPI(db.Model):
    """解析接口表"""
    __tablename__ = 'parse_apis'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    is_enabled = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=app_time_now)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'url': self.url,
            'is_enabled': self.is_enabled,
            'sort_order': self.sort_order
        }

    def __repr__(self):
        return f'<ParseAPI {self.name}>'


class DramaSite(db.Model):
    """影视导航表"""
    __tablename__ = 'drama_sites'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    description = db.Column(db.String(200), nullable=True)
    icon = db.Column(db.String(50), nullable=True, default='🎬')
    is_enabled = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=app_time_now)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'url': self.url,
            'description': self.description,
            'icon': self.icon,
            'is_enabled': self.is_enabled,
            'sort_order': self.sort_order
        }

    def __repr__(self):
        return f'<DramaSite {self.name}>'


class APICallLog(db.Model):
    """API调用记录表"""
    __tablename__ = 'api_call_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # API Key 调用时也可记录
    api_type = db.Column(db.String(20), nullable=False)  # 'smart_parse', 'quick_parse', 'normal'
    video_url = db.Column(db.String(500), nullable=False)
    success = db.Column(db.Boolean, default=True)
    api_id = db.Column(db.Integer, db.ForeignKey('parse_apis.id'), nullable=True)
    api_name = db.Column(db.String(100), nullable=True)
    error_message = db.Column(db.String(200), nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)  # 响应时间（毫秒）
    created_at = db.Column(db.DateTime, default=app_time_now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'api_type': self.api_type,
            'video_url': self.video_url,
            'success': self.success,
            'api_id': self.api_id,
            'api_name': self.api_name,
            'error_message': self.error_message,
            'response_time_ms': self.response_time_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<APICallLog {self.api_type} {"success" if self.success else "failed"}>'


class BackupFile(db.Model):
    """备份文件表"""
    __tablename__ = 'backup_files'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)  # 文件大小（字节）
    backup_type = db.Column(db.String(20), nullable=False, default='full')  # full, partial
    description = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=app_time_now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'filepath': self.filepath,
            'file_size': self.file_size,
            'file_size_formatted': self.format_size(),
            'backup_type': self.backup_type,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_at_formatted': format_china_time(self.created_at, '%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
    
    def format_size(self):
        """格式化文件大小"""
        if not self.file_size:
            return "未知"
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024.0 or unit == 'GB':
                return f"{self.file_size:.1f} {unit}"
            self.file_size /= 1024.0
    
    def __repr__(self):
        return f'<BackupFile {self.filename}>'


# 默认数据
DEFAULT_APIS = [
    {"name": "虾米视频解析", "url": "https://jx.xmflv.com/?url=", "sort_order": 1},
    {"name": "七七云解析",   "url": "https://jx.77flv.cc/?url=", "sort_order": 2},
    {"name": "Player-JY",   "url": "https://jx.playerjy.com/?url=", "sort_order": 3},
    {"name": "789解析",     "url": "https://jiexi.789jiexi.icu:4433/?url=", "sort_order": 4},
    {"name": "极速解析",    "url": "https://jx.2s0.cn/player/?url=", "sort_order": 5},
    {"name": "冰豆解析",    "url": "https://bd.jx.cn/?url=", "sort_order": 6},
    {"name": "973解析",     "url": "https://jx.973973.xyz/?url=", "sort_order": 7},
    {"name": "CK",          "url": "https://www.ckplayer.vip/jiexi/?url=", "sort_order": 8},
    {"name": "七哥解析",    "url": "https://jx.nnxv.cn/tv.php?url=", "sort_order": 9},
    {"name": "夜幕",        "url": "https://www.yemu.xyz/?url=", "sort_order": 10},
    {"name": "盘古",        "url": "https://www.pangujiexi.com/jiexi/?url=", "sort_order": 11},
    {"name": "playm3u8",    "url": "https://www.playm3u8.cn/jiexi.php?url=", "sort_order": 12},
    {"name": "芒果TV1",     "url": "https://video.isyour.love/player/getplayer?url=", "sort_order": 13},
    {"name": "芒果TV2",     "url": "https://im1907.top/?jx=", "sort_order": 14},
    {"name": "HLS解析",     "url": "https://jx.hls.one/?url=", "sort_order": 15},
]

DEFAULT_DRAMA_SITES = [
    {"name": "影巢movie", "url": "https://www.movie1080.xyz/", "description": "高清影视资源，美日韩剧优选", "icon": "🎬", "sort_order": 1},
    {"name": "猴影工坊", "url": "https://monkey-flix.com/", "description": "Netflix同步资源，猴影精选", "icon": "🐒", "sort_order": 2},
    {"name": "茉小影",   "url": "https://www.letu.me/", "description": "小清新影视导航，资源丰富", "icon": "🌸", "sort_order": 3},
    {"name": "网飞猫",   "url": "https://www.ncat21.com/", "description": "网飞猫影视，追剧首选", "icon": "🐱", "sort_order": 4},
]


def init_default_data():
    """初始化默认数据（仅在表为空时）"""
    import os
    
    # 初始化解析接口
    if ParseAPI.query.count() == 0:
        for api in DEFAULT_APIS:
            db.session.add(ParseAPI(**api))

    # 初始化影视导航站点
    if DramaSite.query.count() == 0:
        for site in DEFAULT_DRAMA_SITES:
            db.session.add(DramaSite(**site))

    # 初始化管理员账户（如果环境变量配置了）
    if User.query.count() == 0:
        admin_username = os.environ.get('ADMIN_USERNAME', '').strip()
        admin_password = os.environ.get('ADMIN_PASSWORD', '').strip()
        admin_email = os.environ.get('ADMIN_EMAIL', '').strip()
        
        if admin_username and admin_password and admin_email:
            # 检查用户名和邮箱是否有效
            if not User.query.filter_by(username=admin_username).first() and not User.query.filter_by(email=admin_email).first():
                admin_user = User(
                    username=admin_username,
                    email=admin_email,
                    is_admin=True
                )
                admin_user.set_password(admin_password)
                db.session.add(admin_user)
                print(f"[INFO] 已通过环境变量创建管理员账户: {admin_username}")
            else:
                print("[WARNING] 管理员用户名或邮箱已被占用，跳过创建")
        else:
            # 如果没有配置环境变量，打印提示信息
            print("[INFO] 未配置管理员环境变量，请通过注册页面创建第一个用户")
            print("[INFO] 第一个注册的用户将自动成为管理员")
            # 或者，可以创建一个默认的管理员账户
            # 这里我们选择不创建，让用户通过注册页面创建

    db.session.commit()
