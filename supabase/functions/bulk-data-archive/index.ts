import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify JWT and get user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check is_tenant_admin
    const { data: isAdmin } = await adminClient.rpc('is_tenant_admin', { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Not a tenant admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tenant_id, data_type, before_date, dry_run } = await req.json();

    if (!tenant_id || !data_type || !before_date) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTypes = ['attendance', 'donations', 'expenses'];
    if (!validTypes.includes(data_type)) {
      return new Response(JSON.stringify({ error: 'Invalid data_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Dry run: just count records
    if (dry_run) {
      const tableMap: Record<string, { table: string; dateCol: string }> = {
        attendance: { table: 'attendance_records', dateCol: 'event_date' },
        donations: { table: 'donations', dateCol: 'donation_date' },
        expenses: { table: 'expenses', dateCol: 'expense_date' },
      };
      const { table, dateCol } = tableMap[data_type];

      const { count, error } = await adminClient
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant_id)
        .lt(dateCol, before_date);

      if (error) throw error;

      return new Response(JSON.stringify({ count: count || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute archive
    const funcMap: Record<string, string> = {
      attendance: 'archive_tenant_attendance',
      donations: 'archive_tenant_donations',
      expenses: 'archive_tenant_expenses',
    };

    const { data: archivedCount, error: archiveError } = await adminClient.rpc(funcMap[data_type], {
      _tenant_id: tenant_id,
      _before_date: before_date,
      _user_id: user.id,
    });

    if (archiveError) throw archiveError;

    // Log the operation
    await adminClient.from('data_cleanup_logs').insert({
      tenant_id,
      data_type,
      records_archived: archivedCount || 0,
      date_before: before_date,
      archived_by: user.id,
    });

    return new Response(JSON.stringify({ archived: archivedCount || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Archive error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
