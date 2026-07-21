import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === 'string' ? body.password : '';
    const confirm = typeof body?.confirm === 'string' ? body.confirm : '';
    if (confirm !== 'DELETE') {
      return new Response(JSON.stringify({ error: 'Confirmation phrase required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!password || !user.email) {
      return new Response(JSON.stringify({ error: 'Password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify password by attempting sign-in
    const verifyClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: pwErr } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (pwErr) {
      return new Response(JSON.stringify({ error: 'Incorrect password' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Data owned by workspaces the user owns cascades away when we delete the
    // workspaces (workspace_id FKs use ON DELETE CASCADE). Membership rows in
    // other workspaces cascade via workspace_members.user_id FK on user delete.
    const { error: wsErr } = await admin.from('workspaces').delete().eq('owner_id', user.id);
    if (wsErr) console.error('delete workspaces failed', wsErr.message);
    const { error: prefErr } = await admin.from('user_preferences').delete().eq('id', user.id);
    if (prefErr) console.error('delete user_preferences failed', prefErr.message);

    // Delete the auth user (email becomes reusable immediately)
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
