DROP POLICY IF EXISTS "user_can_create_workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());