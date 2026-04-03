"""
数据库模型 - 用户、解析接口、影视导航
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """用户表"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    if ParseAPI.query.count() == 0:
        for api in DEFAULT_APIS:
            db.session.add(ParseAPI(**api))

    if DramaSite.query.count() == 0:
        for site in DEFAULT_DRAMA_SITES:
            db.session.add(DramaSite(**site))

    db.session.commit()
