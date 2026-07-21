
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.workspace_role_of(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_owner_membership() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.accept_pending_invites() TO authenticated, anon, service_role;

-- Ensure the owner-membership trigger exists on workspaces (SECURITY DEFINER function already set)
DROP TRIGGER IF EXISTS create_owner_membership_trigger ON public.workspaces;
CREATE TRIGGER create_owner_membership_trigger
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.create_owner_membership();
