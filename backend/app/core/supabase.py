from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Client:
    """
    Initialize and return a Supabase client.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise ValueError("Supabase URL and Anon Key must be configured")
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Global client singleton
supabase: Client = None

if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
    supabase = get_supabase()
