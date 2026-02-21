-- ==========================================================================
-- RyzeCanvas: Cloud-Native Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- Robust migration that handles:
--   1. Fresh deployments (creates new schema)
--   2. Existing deployments (migrates title -> name, int id -> UUID)
--   3. Partial migrations (idempotent)
--
-- What this does:
--   1. Enables uuid-ossp extension
--   2. Creates/migrates projects.id from INT to UUID
--   3. Renames projects.title -> projects.name (if exists)
--   4. Creates the chats table (JSONB history per project)
--   5. Creates the Supabase Storage bucket "projects"
--   6. Sets up RLS policies on both tables
-- ==========================================================================

-- ── 0. Enable UUID extension ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Projects table ───────────────────────────────────────────────────
-- Robustly handle both fresh and existing databases

-- 1a. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR NOT NULL,
    description VARCHAR,
    code_json   TEXT,
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    provider    VARCHAR DEFAULT 'gemini',
    model       VARCHAR DEFAULT 'gemini-2.5-flash',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1b. For EXISTING databases: migrate title column to name
DO $$
BEGIN
    -- Check if table exists and has 'title' column (old schema)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'title'
    ) THEN
        -- Rename title to name if name doesn't exist yet
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'projects' AND column_name = 'name'
        ) THEN
            ALTER TABLE projects RENAME COLUMN title TO name;
            RAISE NOTICE 'Renamed projects.title → projects.name';
        END IF;
    END IF;

    -- Check if id column is still INTEGER (old schema)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'id'
        AND data_type = 'integer'
    ) THEN
        -- Migrate id from INTEGER to UUID
        ALTER TABLE projects ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
        UPDATE projects SET new_id = uuid_generate_v4() WHERE new_id IS NULL;
        ALTER TABLE projects DROP CONSTRAINT projects_pkey;
        ALTER TABLE projects DROP COLUMN id;
        ALTER TABLE projects RENAME COLUMN new_id TO id;
        ALTER TABLE projects ADD PRIMARY KEY (id);
        RAISE NOTICE 'Migrated projects.id: INTEGER → UUID';
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);


-- ── 2. Chats table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    history     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);


-- ── 3. Auto-update updated_at trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS chats_updated_at ON chats;
CREATE TRIGGER chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── 4. Row Level Security (RLS) ─────────────────────────────────────────
-- NOTE: RLS policies use user_id directly in WHERE clauses.
-- The app's JWT payload contains 'sub' (user ID), which is injected into
-- request.user.id by the FastAPI dependency layer.
-- RLS cannot be enforced at the Postgres level without auth.uid() mapping,
-- so security is enforced at the application layer.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats    ENABLE ROW LEVEL SECURITY;

-- For now, use permissive policies (security enforced by API layer)
-- In production, set up a mapping table between auth.uid() (UUID) and app user_id (INTEGER)
-- and update these policies accordingly.

DROP POLICY IF EXISTS "Allow authenticated users" ON projects;
CREATE POLICY "Allow authenticated users"
    ON projects FOR ALL
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users" ON chats;
CREATE POLICY "Allow authenticated users"
    ON chats FOR ALL
    TO authenticated
    USING (true);


-- ── 5. Storage bucket ──────────────────────────────────────────────────
-- Create the "projects" storage bucket (public = false for private files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('projects', 'projects', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Allow authenticated users
-- Folder-level RLS at user_id prefix enforced by application layer
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
CREATE POLICY "Users can upload to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'projects');

DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
CREATE POLICY "Users can view own files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'projects');

DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
CREATE POLICY "Users can update own files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'projects');

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'projects');


-- ── 6. Project file context cache ─────────────────────────────────────
-- Stores downloaded file contents so the AI agent can load project context
-- from the DB instead of re-downloading from Storage every request.
CREATE TABLE IF NOT EXISTS project_file_context (
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL,
    file_path   VARCHAR NOT NULL,
    file_type   VARCHAR,              -- "source", "config", "style", "entry"
    file_content TEXT,
    file_size   INTEGER,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_pfc_project_id ON project_file_context(project_id);


-- ── 7. Project analysis summary ──────────────────────────────────────
-- Stores metadata about a project's file tree and read progress.
CREATE TABLE IF NOT EXISTS project_analysis (
    project_id      UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL,
    total_files     INTEGER,
    file_tree       JSONB,
    is_fully_read   BOOLEAN DEFAULT FALSE,
    read_progress   INTEGER DEFAULT 0,
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE project_file_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_analysis     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users" ON project_file_context;
CREATE POLICY "Allow authenticated users"
    ON project_file_context FOR ALL
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users" ON project_analysis;
CREATE POLICY "Allow authenticated users"
    ON project_analysis FOR ALL
    TO authenticated
    USING (true);


-- ── Done ────────────────────────────────────────────────────────────────
-- After running this migration:
--   1. Set SUPABASE_SERVICE_KEY in your backend .env
--   2. Restart the backend server
--   3. The orchestrator will now write files to Supabase Storage
