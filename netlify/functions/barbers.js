import { createClient } from '@supabase/supabase-js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(body)
  }
}

function getBearerToken(req) {
  const raw = req.headers?.authorization || req.headers?.Authorization || ''
  const match = raw.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

async function assertAdmin(supabase, jwt) {
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user?.id) {
    return { ok: false, statusCode: 401, message: 'Unauthorized' }
  }

  const authUserId = userData.user.id
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .single()

  if (profErr || !profile) return { ok: false, statusCode: 403, message: 'Forbidden' }
  if (!['admin', 'owner'].includes(profile.role)) return { ok: false, statusCode: 403, message: 'Forbidden' }
  return { ok: true, authUserId }
}

export async function handler(event) {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, {
      error:
        'Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.'
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const jwt = getBearerToken(event)
  if (!jwt) return json(401, { error: 'Unauthorized' })

  const adminCheck = await assertAdmin(supabase, jwt)
  if (!adminCheck.ok) return json(adminCheck.statusCode, { error: adminCheck.message })

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const full_name = String(body.full_name || '').trim()
      const phone = String(body.phone || '').trim()

      if (!email || !password || !full_name) {
        return json(400, { error: 'Missing required fields (email, password, full_name).' })
      }

      const { data: userRes, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (createErr || !userRes?.user?.id) return json(400, { error: createErr?.message || 'Failed to create user.' })

      const auth_user_id = userRes.user.id

      // Create the barber profile.
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .insert({ auth_user_id, role: 'barber', full_name, phone })
        .select('id, full_name, phone, role')
        .single()

      if (profErr || !profile?.id) return json(400, { error: profErr?.message || 'Failed to create profile.' })

      // Assign all active services to the new barber so they appear in booking.
      const { data: activeServices, error: srvErr } = await supabase
        .from('services')
        .select('id')
        .eq('active', true)

      if (!srvErr && activeServices?.length) {
        await supabase
          .from('barber_services')
          .insert(activeServices.map((s) => ({ barber_id: profile.id, service_id: s.id })))
      }

      // Default weekly schedule: open every day 10:00–21:00 (admin can adjust in DB if needed).
      await supabase.from('schedules').insert(
        Array.from({ length: 7 }, (_v, day) => ({
          barber_id: profile.id,
          day_of_week: day,
          start_time: '10:00',
          end_time: '21:00'
        }))
      )

      return json(200, { barber: profile })
    }

    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}')
      const id = String(body.id || '').trim()
      const full_name = body.full_name === undefined ? undefined : String(body.full_name || '').trim()
      const phone = body.phone === undefined ? undefined : String(body.phone || '').trim()

      if (!id) return json(400, { error: 'Missing barber id.' })
      const patch = {}
      if (full_name !== undefined) patch.full_name = full_name
      if (phone !== undefined) patch.phone = phone

      if (!Object.keys(patch).length) return json(400, { error: 'Nothing to update.' })

      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', id)
        .eq('role', 'barber')
        .select('id, full_name, phone, role')
        .single()

      if (error) return json(400, { error: error.message })
      return json(200, { barber: data })
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}')
      const barberId = String(body.id || '').trim()
      if (!barberId) return json(400, { error: 'Missing barber id.' })

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, auth_user_id, role')
        .eq('id', barberId)
        .single()
      if (profErr || !prof) return json(404, { error: 'Barber not found.' })
      if (prof.role !== 'barber') return json(400, { error: 'Not a barber profile.' })

      // Remove from booking catalog.
      await supabase.from('barber_services').delete().eq('barber_id', barberId)
      await supabase.from('schedules').delete().eq('barber_id', barberId)

      // Delete auth user so they can’t sign in anymore. Keep profile row for appointment history.
      if (prof.auth_user_id) {
        await supabase.auth.admin.deleteUser(prof.auth_user_id)
      }

      return json(200, { ok: true })
    }

    return json(405, { error: 'Method not allowed.' })
  } catch (err) {
    return json(500, { error: err?.message || 'Unexpected server error.' })
  }
}

