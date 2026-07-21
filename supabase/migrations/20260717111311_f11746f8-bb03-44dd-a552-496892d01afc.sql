
-- ============================================================
-- Multi-tenancy foundation: workspaces + members + data scoping
-- ============================================================

-- Enums
CREATE TYPE public.workspace_role AS ENUM ('owner','admin','member');
CREATE TYPE public.workspace_member_status AS ENUM ('active','pending');

-- Workspaces (promotes/replaces workspace_settings)
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_tagline TEXT,
  theme TEXT NOT NULL DEFAULT 'dark',
  weekly_sales_target NUMERIC NOT NULL DEFAULT 20000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Members
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT,
  role public.workspace_role NOT NULL DEFAULT 'member',
  status public.workspace_member_status NOT NULL DEFAULT 'active',
  invite_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wm_user_or_email CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL),
  CONSTRAINT wm_unique_user UNIQUE (workspace_id, user_id),
  CONSTRAINT wm_unique_email UNIQUE (workspace_id, invited_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
CREATE INDEX ON public.workspace_members(user_id);
CREATE INDEX ON public.workspace_members(workspace_id);
CREATE INDEX ON public.workspace_members(invited_email);

-- Security-definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws UUID, _uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _ws AND user_id = _uid AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.workspace_role_of(_ws UUID, _uid UUID)
RETURNS public.workspace_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = _ws AND user_id = _uid AND status = 'active'
  LIMIT 1
$$;

-- ============================================================
-- Add workspace_id to existing tables (nullable, backfill, then NOT NULL)
-- ============================================================
ALTER TABLE public.contacts         ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.deals            ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.notes            ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.invoices         ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.workflow_cards   ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.workflow_columns ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Promote existing workspace_settings rows into workspaces (preserving IDs is not needed;
-- we generate fresh workspace IDs and map by owner user_id).
INSERT INTO public.workspaces (name, slug, owner_id, business_tagline, theme, weekly_sales_target, created_at, updated_at)
SELECT
  COALESCE(NULLIF(TRIM(ws.business_name),''),'My Workspace') AS name,
  regexp_replace(lower(COALESCE(NULLIF(TRIM(ws.business_name),''),'workspace')), '[^a-z0-9]+', '-', 'g')
    || '-' || substr(gen_random_uuid()::text, 1, 8) AS slug,
  ws.user_id,
  ws.business_tagline,
  ws.theme,
  ws.weekly_sales_target,
  COALESCE(ws.updated_at, now()),
  COALESCE(ws.updated_at, now())
FROM public.workspace_settings ws;

-- Create default workspace for any user with data but no workspace_settings
INSERT INTO public.workspaces (name, slug, owner_id)
SELECT 'My Workspace',
       'workspace-' || substr(t.u_id::text,1,8),
       t.u_id
FROM (
  SELECT DISTINCT user_id AS u_id FROM public.contacts
  UNION SELECT DISTINCT user_id FROM public.invoices
  UNION SELECT DISTINCT user_id FROM public.workflow_cards
  UNION SELECT DISTINCT user_id FROM public.workflow_columns
  UNION SELECT DISTINCT user_id FROM public.deals
  UNION SELECT DISTINCT user_id FROM public.notes
) t
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.owner_id = t.u_id);

-- Owner membership rows
INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
SELECT id, owner_id, 'owner', 'active' FROM public.workspaces
ON CONFLICT DO NOTHING;

-- Backfill workspace_id on child tables using each user's owned workspace
UPDATE public.contacts         c SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = c.user_id AND c.workspace_id IS NULL;
UPDATE public.deals            c SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = c.user_id AND c.workspace_id IS NULL;
UPDATE public.notes            c SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = c.user_id AND c.workspace_id IS NULL;
UPDATE public.invoices         c SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = c.user_id AND c.workspace_id IS NULL;
UPDATE public.workflow_cards   c SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = c.user_id AND c.workspace_id IS NULL;
UPDATE public.workflow_columns c SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = c.user_id AND c.workspace_id IS NULL;

-- Lock down: workspace_id required going forward
ALTER TABLE public.contacts         ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.deals            ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.notes            ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.invoices         ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.workflow_cards   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.workflow_columns ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX ON public.contacts(workspace_id);
CREATE INDEX ON public.deals(workspace_id);
CREATE INDEX ON public.notes(workspace_id);
CREATE INDEX ON public.invoices(workspace_id);
CREATE INDEX ON public.workflow_cards(workspace_id);
CREATE INDEX ON public.workflow_columns(workspace_id);

-- ============================================================
-- Replace old user_id-scoped RLS policies with workspace-scoped ones
-- ============================================================
DO $$
DECLARE tname TEXT; p RECORD;
BEGIN
  FOREACH tname IN ARRAY ARRAY['contacts','deals','notes','invoices','workflow_cards','workflow_columns'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tname LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, tname);
    END LOOP;
  END LOOP;
END $$;

-- Uniform workspace-member access for all data tables
CREATE POLICY "ws_members_all" ON public.contacts FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws_members_all" ON public.deals FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws_members_all" ON public.notes FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws_members_all" ON public.invoices FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws_members_all" ON public.workflow_cards FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws_members_all" ON public.workflow_columns FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- ============================================================
-- RLS on workspaces + workspace_members
-- ============================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_view_workspace" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "user_can_create_workspace" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "admins_can_update_workspace" ON public.workspaces FOR UPDATE TO authenticated
  USING (public.workspace_role_of(id, auth.uid()) IN ('owner','admin'))
  WITH CHECK (public.workspace_role_of(id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "owner_can_delete_workspace" ON public.workspaces FOR DELETE TO authenticated
  USING (public.workspace_role_of(id, auth.uid()) = 'owner');

-- workspace_members
CREATE POLICY "members_view_own_workspace_members" ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id, auth.uid()));
-- Bootstrap: user can add themselves as owner (used right after creating a workspace)
CREATE POLICY "user_self_add_owner" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'owner');
-- Admins/Owners can invite/add other members
CREATE POLICY "admins_add_members" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (public.workspace_role_of(workspace_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "admins_update_members" ON public.workspace_members FOR UPDATE TO authenticated
  USING (public.workspace_role_of(workspace_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "admins_remove_members" ON public.workspace_members FOR DELETE TO authenticated
  USING (public.workspace_role_of(workspace_id, auth.uid()) IN ('owner','admin'));
-- A user can always remove themselves (leave workspace) — enforced app-side to block owner leaving last workspace
CREATE POLICY "user_leaves_workspace" ON public.workspace_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Signup trigger: promote pending invites for the new user's email
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_pending_invites()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.workspace_members
  SET user_id = NEW.id, status = 'active', invited_email = NULL, invite_token = NULL
  WHERE invited_email = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accept_invites_on_signup ON auth.users;
CREATE TRIGGER trg_accept_invites_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.accept_pending_invites();

-- ============================================================
-- Drop legacy workspace_settings (replaced by workspaces)
-- ============================================================
DROP TABLE public.workspace_settings;
