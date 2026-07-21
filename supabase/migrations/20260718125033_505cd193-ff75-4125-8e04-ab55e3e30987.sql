
-- 1) Delete orphaned workspaces (owner no longer exists in auth.users)
DELETE FROM public.workspaces w
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = w.owner_id);

-- 2) Backfill missing owner memberships for every existing workspace
INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
SELECT w.id, w.owner_id, 'owner'::workspace_role, 'active'::workspace_member_status
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members m
  WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
);

-- 3) Trigger: auto-create owner membership whenever a workspace is inserted.
--    This removes the chicken-and-egg problem where RLS SELECT on the newly
--    inserted workspace fails because no membership row exists yet.
CREATE OR REPLACE FUNCTION public.create_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner'::workspace_role, 'active'::workspace_member_status)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_owner_membership ON public.workspaces;
CREATE TRIGGER trg_create_owner_membership
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.create_owner_membership();
