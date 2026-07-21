REVOKE ALL ON FUNCTION public.create_user_workspace(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_user_workspace(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_workspace(text) TO service_role;

REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.workspace_role_of(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workspace_role_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_role_of(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.create_owner_membership() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_owner_membership() TO service_role;

REVOKE ALL ON FUNCTION public.accept_pending_invites() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_pending_invites() TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;