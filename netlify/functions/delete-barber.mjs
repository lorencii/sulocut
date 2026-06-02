// Admin-only endpoint to PERMANENTLY delete a barber and all their data.
//
// Like create-barber, this needs the service role key (deleting auth users +
// bypassing RLS), so it runs server-side. The frontend sends the signed-in
// admin's access token; we verify it belongs to an admin/owner before acting.
//
// This is irreversible: it removes the barber's appointments, schedules,
// service assignments, profile row, and auth login.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Serveri nuk është konfiguruar (mungon service role key).' }, 500)
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Mungon autorizimi.' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // 1. Verify the caller is an admin/owner.
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return json({ error: 'Sesion i pavlefshëm.' }, 401)

  const { data: callerProfile, error: callerErr } = await admin
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', userData.user.id)
    .single()
  if (callerErr || !callerProfile || !['admin', 'owner'].includes(callerProfile.role)) {
    return json({ error: 'Vetëm adminët mund të fshijnë berberë.' }, 403)
  }

  // 2. Parse + load the target barber.
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Trup i pavlefshëm.' }, 400)
  }
  const barberId = String(body.id || '').trim()
  if (!barberId) return json({ error: 'Mungon ID e berberit.' }, 400)

  const { data: target, error: targetErr } = await admin
    .from('profiles')
    .select('id, auth_user_id, role, full_name')
    .eq('id', barberId)
    .single()
  if (targetErr || !target) return json({ error: 'Berberi nuk u gjet.' }, 404)
  if (target.role !== 'barber') {
    return json({ error: 'Mund të fshihen vetëm llogaritë me rol berber.' }, 400)
  }

  // 3. Delete dependent rows first (FK-safe), then the profile, then the login.
  for (const table of ['appointments', 'schedules', 'barber_services']) {
    const { error } = await admin.from(table).delete().eq('barber_id', barberId)
    if (error) return json({ error: `Fshirja e "${table}" dështoi: ${error.message}` }, 400)
  }

  const { error: profileDelErr } = await admin.from('profiles').delete().eq('id', barberId)
  if (profileDelErr) {
    return json({ error: `Fshirja e profilit dështoi: ${profileDelErr.message}` }, 400)
  }

  if (target.auth_user_id) {
    const { error: authErr } = await admin.auth.admin.deleteUser(target.auth_user_id)
    // The profile (and all bookings) are already gone; a leftover auth user
    // only means a dangling login, so report it but don't hard-fail.
    if (authErr) {
      return json(
        { ok: true, warning: 'Profili u fshi, por llogaria e hyrjes mbeti: ' + authErr.message },
        200
      )
    }
  }

  return json({ ok: true })
}
