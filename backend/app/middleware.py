import logging
import time
import uuid
from typing import Any, Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.auth import decode_access_token

request_logger = logging.getLogger("app.request")


def _client_host(request: Request) -> Optional[str]:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return None


def _token_identity(request: Request) -> dict[str, Any]:
    auth_header = request.headers.get("authorization", "")
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return {}

    payload = decode_access_token(token)
    if not payload:
        return {}

    return {
        "user_role": payload.get("role"),
        "user_id": payload.get("sub"),
    }


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        start = time.perf_counter()
        context = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query": request.url.query or None,
            "client_ip": _client_host(request),
            **_token_identity(request),
        }

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            request_logger.exception(
                "request_failed",
                extra={**context, "status_code": 500, "duration_ms": duration_ms},
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        log_level = logging.INFO
        if response.status_code >= 500:
            log_level = logging.ERROR
        elif response.status_code >= 400:
            log_level = logging.WARNING

        request_logger.log(
            log_level,
            "request_completed",
            extra={
                **context,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
