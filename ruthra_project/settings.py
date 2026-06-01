import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

# Load .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# -----------------------------
# SECURITY
# -----------------------------

SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-fallback-key")

DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = [
    "ruthra1-architects.onrender.com",
    "127.0.0.1",
    "localhost",
]

CSRF_TRUSTED_ORIGINS = [
    "https://ruthra1-architects.onrender.com",
]

# -----------------------------
# INSTALLED APPS
# -----------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Cloudinary
    "cloudinary",
    "cloudinary_storage",

    # Your app
    "portfolio",
]

# -----------------------------
# MIDDLEWARE
# -----------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "ruthra_project.urls"

# -----------------------------
# TEMPLATES
# -----------------------------

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

WSGI_APPLICATION = "ruthra_project.wsgi.application"

# -----------------------------
# DATABASE (POSTGRES WITH SQLITE FALLBACK)
# -----------------------------

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            ssl_require=True if "render.com" in DATABASE_URL or "postgresql" in DATABASE_URL else False
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# -----------------------------
# PASSWORD VALIDATION
# -----------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# -----------------------------
# INTERNATIONALIZATION
# -----------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# -----------------------------
# STATIC FILES (IMPORTANT FIX)
# -----------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_DIRS = []
if (BASE_DIR / "static").exists():
    STATICFILES_DIRS.append(BASE_DIR / "static")


# -----------------------------
# MEDIA & STATIC FILES STORAGE (DJANGO 6 COMPLIANT)
# -----------------------------

USE_CLOUDINARY = os.environ.get("CLOUDINARY_CLOUD_NAME") is not None

if USE_CLOUDINARY:
    STORAGES = {
        "default": {
            "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "API_KEY": os.environ.get("CLOUDINARY_API_KEY"),
        "API_SECRET": os.environ.get("CLOUDINARY_API_SECRET"),
        "SECURE": True,  # Forces HTTPS secure URLs
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# -----------------------------
# DEFAULT PRIMARY KEY
# -----------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"