"""
Supabase client initialization.
Provides two clients:
  - `supabase` (anon key): for auth-gated queries (RLS-aware).
  - `supabase_admin` (service key): for Storage and server-side operations
    that bypass RLS (e.g., uploading files on behalf of a user).
"""
from supabase import create_client, Client
from app.core.config import settings


def get_supabase() -> Client:
    """Return a Supabase client using the anonymous (public) key."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise ValueError("Supabase URL and Anon Key must be configured")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_supabase_admin() -> Client:
    """Return a Supabase client using the service-role key (bypasses RLS)."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase URL and Service Key must be configured")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


# ── Singleton instances (created once at import time if keys are present) ──

supabase: Client | None = None
supabase_admin: Client | None = None

if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
    supabase = get_supabase()

if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
    supabase_admin = get_supabase_admin()
