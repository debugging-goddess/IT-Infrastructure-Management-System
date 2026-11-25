"""
Middleware that stores the current request's user in a thread-local,
so that model signals (which have no access to the request) can attribute
changes to the user who made them.

Because this project authenticates with JWT via Django REST Framework,
the standard `request.user` is still AnonymousUser at plain-middleware time
(DRF resolves the token inside the view). To capture the real user before
the view runs its database writes, we run the JWT authenticator here.
"""

import threading

_thread_locals = threading.local()


def get_current_user():
    """Return the user associated with the current request, or None."""
    return getattr(_thread_locals, "user", None)


def set_current_user(user):
    _thread_locals.user = user


class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Lazily import so Django apps are loaded first
        from rest_framework_simplejwt.authentication import JWTAuthentication
        self._jwt = JWTAuthentication()

    def _resolve_user(self, request):
        # 1. Session-authenticated user (e.g. Django admin)
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            return user
        # 2. JWT bearer token (the API)
        try:
            result = self._jwt.authenticate(request)
            if result is not None:
                return result[0]  # (user, token)
        except Exception:
            pass
        return None

    def __call__(self, request):
        set_current_user(self._resolve_user(request))
        try:
            response = self.get_response(request)
        finally:
            set_current_user(None)
        return response
