"""Shared helpers for the test suite."""

from rest_framework.test import APIClient

from apps.users.models import User

PASSWORD = "Test-pass-12345"


def make_user(username: str, **extra) -> User:
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password=PASSWORD, **extra
    )


def client_for(user: User) -> APIClient:
    """An API client acting as `user` (skips the login step)."""
    client = APIClient()
    client.force_authenticate(user)
    return client


def jwt_client_for(user: User) -> APIClient:
    """An API client that signs in through the real token endpoint, like the frontend does."""
    client = APIClient()
    resp = client.post(
        "/api/v1/auth/token/", {"email": user.email, "password": PASSWORD}, format="json"
    )
    assert resp.status_code == 200, resp.content
    client.credentials(HTTP_AUTHORIZATION="Bearer " + resp.json()["access"])
    return client
