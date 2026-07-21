CREATE OR REPLACE FUNCTION public.create_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner'::workspace_role, 'active'::workspace_member_status)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_owner_membership ON public.workspaces;
CREATE TRIGGER trg_create_owner_membership
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.create_owner_membership();

CREATE OR REPLACE FUNCTION public.create_user_workspace(p_name text)
RETURNS public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_name text := NULLIF(BTRIM(p_name), '');
  v_base_slug text;
  v_slug text;
  v_workspace public.workspaces;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  v_clean_name := COALESCE(v_clean_name, 'My Workspace');
  v_base_slug := LOWER(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := TRIM(BOTH '-' FROM v_base_slug);
  IF v_base_slug = '' THEN
    v_base_slug := 'workspace';
  END IF;

  v_slug := LEFT(v_base_slug, 48) || '-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 8);

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (v_clean_name, v_slug, v_uid)
  RETURNING * INTO v_workspace;

  RETURN v_workspace;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_user_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_workspace(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.workspace_role_of(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());