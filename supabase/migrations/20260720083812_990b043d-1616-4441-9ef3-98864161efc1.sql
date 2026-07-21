
-- Recreate the workspaces INSERT policy cleanly
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS user_can_create_workspace ON public.workspaces;

CREATE POLICY user_can_create_workspace
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Ensure only one owner-membership trigger exists (drop stale duplicate)
DROP TRIGGER IF EXISTS create_owner_membership_trigger ON public.workspaces;
-- keep trg_create_owner_membership as the canonical one
