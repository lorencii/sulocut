// Admin-only endpoint to create a barber account.
//
// Why a server function: creating an auth user requires the Supabase service
// role key, which bypasses RLS and must never reach the browser. The frontend
// calls this with the signed-in admin's access token; we verify that token
// belongs to an admin/owner, then call the existing `create_barber` RPC with
// the service role key.
//
// Env (set in Netlify; falls back to the VITE_-prefixed names from .env):
//   SUPABASE_URL                / VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   / VITE_SUPABASE_SERVICE_ROLE_KEY

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

  // 1. Verify the caller's token and that they are an admin/owner.
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return json({ error: 'Sesion i pavlefshëm.' }, 401)

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', userData.user.id)
    .single()
  if (profileErr || !profile || !['admin', 'owner'].includes(profile.role)) {
    return json({ error: 'Vetëm adminët mund të shtojnë berberë.' }, 403)
  }

  // 2. Validate input.
  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Trup i pavlefshëm.' }, 400)
  }
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const fullName = String(body.full_name || '').trim()
  const phone = String(body.phone || '').trim()

  if (!email || !password || !fullName) {
    return json({ error: 'Email, fjalëkalimi dhe emri janë të detyrueshëm.' }, 400)
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Email i pavlefshëm.' }, 400)
  if (password.length < 6) {
    return json({ error: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' }, 400)
  }

  // 3. Reject an email that already has an account. `create_barber` is
  // idempotent for existing emails (it would silently RESET that account's
  // password), so guard against it. A barbershop has few users, so a single
  // listUsers page is plenty.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) return json({ error: 'Kontrolli i email-it dështoi.' }, 500)
  if (list?.users?.some((u) => (u.email || '').toLowerCase() === email)) {
    return json({ error: 'Ekziston tashmë një llogari me këtë email.' }, 409)
  }

  // 4. Create the barber via the existing SECURITY DEFINER function.
  const { data, error } = await admin.rpc('create_barber', {
    p_email: email,
    p_password: password,
    p_full_name: fullName,
    p_phone: phone || null
  })
  if (error) {
    const msg = /already|exists|duplicate|unique/i.test(error.message)
      ? 'Ekziston tashmë një llogari me këtë email.'
      : error.message
    return json({ error: msg }, 400)
  }

  return json({ ok: true, id: data })
}
