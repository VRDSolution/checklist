"""
Rate limiter configuration using slowapi
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

def get_real_ip(request: Request) -> str:
    """
    Get the real IP address of the client, supporting proxies (Vercel).
    Prefers X-Forwarded-For header.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # The first IP in the list is the real client IP
        return forwarded.split(",")[0].strip()
    return get_remote_address(request) or "127.0.0.1"

# Initialize limiter with robust IP detection for serverless/proxy environments
limiter = Limiter(key_func=get_real_ip)
