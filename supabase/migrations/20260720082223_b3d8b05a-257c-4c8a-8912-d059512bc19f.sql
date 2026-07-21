
-- Ensure the owner-membership trigger is actually attached to workspaces.
DROP TRIGGER IF EXISTS trg_create_owner_membership ON public.workspaces;
CREATE TRIGGER trg_create_owner_membership
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.create_owner_membership();

-- Backfill any workspaces that are missing an owner membership row.
INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
SELECT w.id, w.owner_id, 'owner'::workspace_role, 'active'::workspace_member_status
FROM public.workspaces w
WHERE w.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
  )
ON CONFLICT DO NOTHING;

-- Re-affirm the INSERT policy on workspaces (idempotent).
DROP POLICY IF EXISTS user_can_create_workspace ON public.workspaces;
CREATE POLICY user_can_create_workspace
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Ensure execute permission on membership-check functions used by RLS.
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.workspace_role_of(uuid, uuid) TO authenticated, anon;
