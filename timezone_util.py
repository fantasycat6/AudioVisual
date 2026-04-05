"""
时区处理工具模块
处理应用中的时区转换，将数据库中的UTC时间转换为用户本地时间
"""

import os
from datetime import datetime
import pytz

# 从环境变量获取时区配置，默认：亚洲/上海 (UTC+8)
DEFAULT_TIMEZONE = os.environ.get('APP_TIMEZONE', 'Asia/Shanghai')

# 预定义时区映射，用于常见时区别名
TIMEZONE_ALIASES = {
    'china': 'Asia/Shanghai',
    'shanghai': 'Asia/Shanghai',
    'beijing': 'Asia/Shanghai',
    'utc': 'UTC',
    'gmt': 'UTC',
    'us_eastern': 'America/New_York',
    'us_central': 'America/Chicago',
    'us_mountain': 'America/Denver',
    'us_pacific': 'America/Los_Angeles',
}

def get_app_timezone():
    """
    获取应用的时区设置
    
    Returns:
        时区字符串，如 'Asia/Shanghai'
    """
    timezone_env = os.environ.get('APP_TIMEZONE', '').strip().lower()
    
    if timezone_env:
        # 检查是否是别名
        if timezone_env in TIMEZONE_ALIASES:
            return TIMEZONE_ALIASES[timezone_env]
        # 直接使用时区字符串
        return timezone_env
    
    # 默认时区
    return 'Asia/Shanghai'

def get_local_time(utc_time=None, timezone_str=None):
    """
    将UTC时间转换为本地时间
    
    Args:
        utc_time: datetime对象，默认为当前UTC时间
        timezone_str: 时区字符串，如 'Asia/Shanghai'，默认为应用时区设置
    
    Returns:
        datetime对象（指定时区的本地时间）
    """
    if timezone_str is None:
        timezone_str = get_app_timezone()
    if utc_time is None:
        utc_time = datetime.utcnow()
    
    try:
        # 时区对象
        tz = pytz.timezone(timezone_str)
        
        # 处理时区转换
        # 如果utc_time是naive（没有时区信息），先标记为UTC
        if utc_time.tzinfo is None:
            utc_time = pytz.UTC.localize(utc_time)
        
        # 转换为本地时间
        local_time = utc_time.astimezone(tz)
        return local_time
    except Exception as e:
        print(f"时区转换错误: {e}")
        # 出错时返回原始时间
        return utc_time

def get_local_datetime_now(timezone_str=None):
    """
    获取当前时间的本地时间版本
    
    Args:
        timezone_str: 时区字符串，默认为应用时区设置
    
    Returns:
        datetime对象（指定时区的当前本地时间，没有时区信息）
    """
    if timezone_str is None:
        timezone_str = get_app_timezone()
        
    utc_now = datetime.utcnow()
    local_time = get_local_time(utc_now, timezone_str)
    # 移除时区信息，返回naive datetime
    return local_time.replace(tzinfo=None)

def format_local_time(utc_time, format_str='%Y-%m-%d %H:%M:%S', timezone_str=None):
    """
    格式化UTC时间为本地时间字符串
    
    Args:
        utc_time: datetime对象（UTC时间或无时区的时间）
        format_str: 格式化字符串
        timezone_str: 时区字符串，默认为应用时区设置
        
    Returns:
        格式化后的本地时间字符串
    """
    if timezone_str is None:
        timezone_str = get_app_timezone()
    if utc_time is None:
        return "从未登录"
    
    try:
        # 如果时间有时区信息，进行转换
        if utc_time.tzinfo is not None:
            local_time = get_local_time(utc_time, timezone_str)
            return local_time.strftime(format_str)
        else:
            # 如果时间没有时区信息，假设已经是本地时间
            return utc_time.strftime(format_str)
    except Exception as e:
        print(f"时间格式化错误: {e}")
        # 如果转换失败，回退到时间格式化
        try:
            return utc_time.strftime(format_str)
        except:
            return "时间格式错误"

def get_china_time_now():
    """
    获取当前中国时间（上海时区） - 向后兼容函数
    返回没有时区信息的datetime，便于存储到数据库
    """
    import warnings
    warnings.warn("get_china_time_now() is deprecated, use get_app_time_now() instead", DeprecationWarning, stacklevel=2)
    return get_app_time_now()

def get_app_time_now():
    """
    获取当前应用设置时区的时间
    返回没有时区信息的datetime，便于存储到数据库
    """
    app_time = get_local_datetime_now()
    return app_time

def format_china_time(utc_time, format_str='%Y-%m-%d %H:%M:%S'):
    """
    格式化时间为中国时间字符串
    """
    return format_local_time(utc_time, format_str, 'Asia/Shanghai')

# 测试函数
def test_timezone_functions():
    """测试时区功能"""
    import sys
    print("测试时区功能...")
    
    # 当前时间
    now_utc = datetime.utcnow()
    print(f"当前UTC时间: {now_utc}")
    
    # 转换到中国时间
    china_time = get_china_time_now()
    print(f"当前中国时间: {china_time}")
    
    # 格式化时间
    formatted = format_china_time(now_utc)
    print(f"格式化中国时间: {formatted}")
    
    # 测试None处理
    none_result = format_china_time(None)
    print(f"None输入处理: {none_result}")
    
    print("时区功能测试完成")

if __name__ == "__main__":
    test_timezone_functions()