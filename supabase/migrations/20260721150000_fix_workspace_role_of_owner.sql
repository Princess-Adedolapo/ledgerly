-- Redefine public.workspace_role_of to always return 'owner' if the user is the owner in public.workspaces
CREATE OR REPLACE FUNCTION public.workspace_role_of(_ws UUID, _uid UUID)
RETURNS public.workspace_role LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.workspace_role;
  v_is_owner boolean;
BEGIN
  -- Check if user is the workspace owner in workspaces table
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _ws AND owner_id = _uid
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN 'owner'::public.workspace_role;
  END IF;

  -- Otherwise get role from workspace_members
  SELECT role FROM public.workspace_members
  WHERE workspace_id = _ws AND user_id = _uid AND status = 'active'
  LIMIT 1 INTO v_role;

  RETURN v_role;
END;
$$;

-- Backfill any existing workspace_members rows where the user is the owner of the workspace to have the 'owner' role
UPDATE public.workspace_members
SET role = 'owner'
WHERE (workspace_id, user_id) IN (
  SELECT id, owner_id FROM public.workspaces
);
