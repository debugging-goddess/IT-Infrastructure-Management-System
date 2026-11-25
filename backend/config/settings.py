"""
Django settings for IT Infrastructure Management System.
"""

from pathlib import Path

from decouple import config, Csv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Debug is OFF unless explicitly turned on, so a missing setting fails safe.
DEBUG = config("DJANGO_DEBUG", default=False, cast=bool)

# The secret key signs login tokens and sessions. There is deliberately no real
# default: outside debug mode a strong key must be provided.
_DEV_ONLY_KEY = "insecure-development-key-do-not-use-anywhere-else-0123456789"
SECRET_KEY = config("DJANGO_SECRET_KEY", default="")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY is not set. Copy .env.example to .env and set a long random value."
        )
    SECRET_KEY = _DEV_ONLY_KEY
elif not DEBUG and (len(SECRET_KEY) < 32 or SECRET_KEY.lower().startswith(("replace-me", "changeme"))):
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY is too short or still a placeholder. Use at least 32 random characters."
    )

ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.users",
    "apps.infrastructure",
    "apps.network",
    "apps.software",
    "apps.audit",
    "apps.dashboard",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.audit.middleware.CurrentUserMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="infra_db"),
        "USER": config("DB_USER", default="infra_user"),
        "PASSWORD": config("DB_PASSWORD"),  # required: no default password is shipped
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

# Custom user model
AUTH_USER_MODEL = "users.User"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalisation
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files (uploaded images)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# JWT: record each successful sign-in in User.last_login (simplejwt does not by default)
SIMPLE_JWT = {
    "UPDATE_LAST_LOGIN": True,
}

# CORS: which browser origins may call the API (comma-separated in .env)
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3001,http://127.0.0.1:3001",
    cast=Csv(),
)

# Cookie / transport hardening. Enable with DJANGO_HTTPS=True once the site is served
# over HTTPS (it would break plain-HTTP local use, so it is off by default).
if not DEBUG and config("DJANGO_HTTPS", default=False, cast=bool):
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 3600
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# API Docs (drf-spectacular)
SPECTACULAR_SETTINGS = {
    "TITLE": "IT Infrastructure Management API",
    "DESCRIPTION": "API for tracking servers, VMs, applications, IPs, users, and services.",
    "VERSION": "1.0.0",
    # Several models have a `status` field with different choices; give each a clear name
    "ENUM_NAME_OVERRIDES": {
        "HostStatusEnum": "apps.infrastructure.models.StatusChoices",
        "ApplicationStatusEnum": "apps.software.models.Application.StatusChoices",
        "ServiceStatusEnum": "apps.software.models.Service.StatusChoices",
        "IPAddressStatusEnum": "apps.network.models.IPAddress.StatusChoices",
    },
}
