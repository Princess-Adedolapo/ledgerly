DROP POLICY IF EXISTS user_self_add_owner ON public.workspace_members;

CREATE POLICY user_self_add_owner ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = workspace_members.workspace_id AND m.role = 'owner'
    )
  );