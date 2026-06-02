import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LogOut,
  Scissors,
  Sparkles,
  LayoutDashboard,
  CalendarDays,
  Users,
  Wrench,
  Phone,
  CheckCircle2,
  Plus,
  Save,
  ExternalLink,
  TrendingUp,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toISODate, todayISO } from '../utils/time'

const DURATION_OPTIONS = [30, 60, 90, 120]

export function AdminDashboard() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [appointments, setAppointments] = useState([])
  const [barbers, setBarbers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') // overview | appointments | barbers | services
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const today = todayISO()
  const hasLoadedRef = useRef(false)

  // ---- Auth ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) {
        setProfile(null)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('auth_user_id', session.user.id)
        .in('role', ['admin', 'owner'])
        .single()
      setProfile(data || null)
    }
    loadProfile()
  }, [session])

  async function signIn(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setAuthLoading(false)
    if (error) setAuthError(error.message)
  }

  // ---- Data ----
  const loadData = useCallback(async () => {
    if (!profile?.id) return
    const initial = !hasLoadedRef.current
    if (initial) setLoading(true)
    try {
      const [{ data: aptRows }, { data: barberRows }, { data: serviceRows }] = await Promise.all([
        supabase
          .from('appointments')
          .select(
            'id, appointment_date, start_time, end_time, status, ' +
              'client:profiles!appointments_client_id_fkey(full_name, phone), ' +
              'barber:profiles!appointments_barber_id_fkey(id, full_name), ' +
              'service:services(name, price, duration_minutes)'
          )
          .order('appointment_date', { ascending: false })
          .order('start_time', { ascending: false })
          .limit(500),
        supabase.from('profiles').select('id, full_name, phone').eq('role', 'barber').order('full_name'),
        supabase
          .from('services')
          .select('id, name, duration_minutes, price, active, sort_order')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true })
      ])
      setAppointments(aptRows || [])
      setBarbers(barberRows || [])
      setServices(serviceRows || [])
    } catch (err) {
      console.error('Admin data load failed:', err)
    } finally {
      hasLoadedRef.current = true
      if (initial) setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Live-ish: poll + refresh on tab focus (admin watches all barbers at once).
  useEffect(() => {
    if (!profile?.id) return undefined
    const interval = setInterval(loadData, 20000)
    const onVisible = () => document.visibilityState === 'visible' && loadData()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadData, profile?.id])

  async function updateStatus(id, status) {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    else loadData()
  }

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoISO = toISODate(weekAgo)
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthAgoISO = toISODate(monthAgo)

    const completed = appointments.filter((a) => a.status === 'completed')
    const price = (a) => Number(a.service?.price || 0)

    return {
      todayCount: appointments.filter((a) => a.appointment_date === today).length,
      todayRev: completed.filter((a) => a.appointment_date === today).reduce((s, a) => s + price(a), 0),
      weekRev: completed.filter((a) => a.appointment_date >= weekAgoISO).reduce((s, a) => s + price(a), 0),
      monthRev: completed.filter((a) => a.appointment_date >= monthAgoISO).reduce((s, a) => s + price(a), 0),
      upcoming: appointments.filter(
        (a) => a.appointment_date >= today && ['pending', 'confirmed', 'walk_in'].includes(a.status)
      ).length
    }
  }, [appointments, today])

  const barberStats = useMemo(() => {
    return barbers
      .map((b) => {
        const mine = appointments.filter((a) => a.barber?.id === b.id)
        const completed = mine.filter((a) => a.status === 'completed')
        return {
          id: b.id,
          name: b.full_name,
          todayCount: mine.filter((a) => a.appointment_date === today).length,
          completedCount: completed.length,
          revenue: completed.reduce((s, a) => s + Number(a.service?.price || 0), 0)
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [barbers, appointments, today])

  const dateAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.appointment_date === selectedDate)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments, selectedDate]
  )

  const navigate = (to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // No session → login. (A signed-in non-admin is redirected away by App.jsx.)
  if (!session) {
    return <AdminLogin {...{ email, setEmail, password, setPassword, signIn, authLoading, authError }} />
  }

  return (
    <div className="min-h-screen bg-[#0a0805] text-[#f5f3ef] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-[#0f0d0a]/90 backdrop-blur-md p-6 sticky top-0 h-screen justify-between">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-gold)] bg-white/5 text-[var(--accent-gold)]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold tracking-widest text-white uppercase">ADMIN</h2>
              <p className="text-[10px] text-[var(--accent-gold)] font-bold tracking-wider font-display uppercase">SuLoCut</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <NavButton icon={<LayoutDashboard size={15} />} label="Përmbledhje" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
            <NavButton icon={<CalendarDays size={15} />} label="Rezervimet" active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
            <NavButton icon={<Users size={15} />} label="Berberët" active={activeTab === 'barbers'} onClick={() => setActiveTab('barbers')} />
            <NavButton icon={<Wrench size={15} />} label="Shërbimet" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/barber')}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/5 px-4 py-2.5 text-xs font-bold font-display uppercase tracking-wider text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
          >
            <ExternalLink size={14} /> Pamja e Berberit
          </button>
          <div className="border-t border-white/5 pt-3">
            <p className="text-xs font-bold text-white uppercase truncate">{profile?.full_name || 'Admin'}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{session.user.email}</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs font-bold font-display uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut size={14} /> Dil
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-4 py-6 md:px-10 md:py-8 overflow-y-auto pb-24 md:pb-8">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <span className="flex w-fit items-center gap-1 rounded-md border border-[#0f766e]/30 bg-[#0f766e]/10 px-2 py-0.5 text-[9px] font-bold font-display uppercase tracking-wider text-[#14b8a6]">
              <Sparkles size={10} className="animate-pulse" /> Live · gjithë dyqani
            </span>
            <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
              Paneli i Adminit
            </h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-[var(--text-secondary)] cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>

        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Rezervime sot" value={stats.todayCount} />
                <StatCard label="Arka sot" value={`€${stats.todayRev.toFixed(2)}`} gold />
                <StatCard label="Këtë javë" value={`€${stats.weekRev.toFixed(2)}`} />
                <StatCard label="Këtë muaj" value={`€${stats.monthRev.toFixed(2)}`} />
              </div>

              <div>
                <h3 className="font-display text-sm font-bold tracking-widest text-white uppercase mb-4 flex items-center gap-2">
                  <TrendingUp size={15} className="text-[var(--accent-gold)]" /> Performanca e Berberëve
                </h3>
                <div className="premium-card overflow-hidden border border-white/5 bg-[#12100d]/80">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider font-display text-[var(--text-muted)] bg-black/25">
                        <th className="px-5 py-3">Berberi</th>
                        <th className="px-5 py-3 text-center">Sot</th>
                        <th className="px-5 py-3 text-center">Të kryera</th>
                        <th className="px-5 py-3 text-right">Arka totale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[var(--text-secondary)]">
                      {barberStats.map((b) => (
                        <tr key={b.id} className="hover:bg-white/[0.01]">
                          <td className="px-5 py-3.5 font-bold text-white">{b.name}</td>
                          <td className="px-5 py-3.5 text-center">{b.todayCount}</td>
                          <td className="px-5 py-3.5 text-center">{b.completedCount}</td>
                          <td className="px-5 py-3.5 text-right font-bold font-display text-[var(--accent-gold)]">€{b.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                      {barberStats.length === 0 && (
                        <tr><td colSpan="4" className="px-5 py-8 text-center text-[var(--text-muted)]">Asnjë berber.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-display text-sm font-bold tracking-widest text-white uppercase">Të gjitha rezervimet</h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-white/5 bg-white/5 px-4 py-2 text-xs text-white focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>

              <div className="flex flex-col gap-3">
                {dateAppointments.map((apt) => {
                  const open = ['pending', 'confirmed', 'walk_in'].includes(apt.status)
                  return (
                    <article key={apt.id} className="premium-card p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/5 bg-[#12100d]/80">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-14 flex-col items-center justify-center rounded-lg border border-[var(--border-gold)] bg-white/5 font-display font-extrabold text-sm text-[var(--accent-gold)]">
                          {apt.start_time.slice(0, 5)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{apt.client?.full_name}</h4>
                            <StatusBadge status={apt.status} />
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1"><Scissors size={11} className="text-[var(--accent-gold)]" />{apt.barber?.full_name}</span>
                            <a href={`tel:${apt.client?.phone}`} className="flex items-center gap-1 hover:text-[var(--accent-gold)]"><Phone size={11} className="text-[var(--accent-gold)]" />{apt.client?.phone}</a>
                            <span className="font-semibold text-white/90">{apt.service?.name} — €{Number(apt.service?.price || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      {open && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateStatus(apt.id, 'completed')} className="rounded px-3 py-1.5 text-xs font-bold font-display uppercase tracking-wider bg-green-600 text-white hover:bg-green-500 cursor-pointer">Paguar</button>
                          <button onClick={() => updateStatus(apt.id, 'no_show')} className="rounded px-3 py-1.5 text-xs font-bold font-display uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 cursor-pointer">No-show</button>
                          <button onClick={() => updateStatus(apt.id, 'cancelled')} className="rounded px-3 py-1.5 text-xs font-bold font-display uppercase tracking-wider bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 cursor-pointer">Anulo</button>
                        </div>
                      )}
                    </article>
                  )
                })}
                {dateAppointments.length === 0 && (
                  <div className="premium-card p-12 text-center border border-white/5 bg-[#12100d]/50">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Nuk ka rezervime për këtë datë.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'barbers' && (
            <div className="flex flex-col gap-5">
              <h3 className="font-display text-sm font-bold tracking-widest text-white uppercase">Berberët ({barbers.length})</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {barberStats.map((b) => (
                  <div key={b.id} className="premium-card p-5 border border-white/5 bg-[#12100d]/80">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-11 w-11 rounded-lg border border-[var(--border-gold)] bg-white/5 font-display font-bold flex items-center justify-center text-[var(--accent-gold)]">
                        {b.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{b.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-display">Berber</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="Sot" value={b.todayCount} />
                      <MiniStat label="Kryer" value={b.completedCount} />
                      <MiniStat label="Arka" value={`€${b.revenue.toFixed(0)}`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="premium-card p-5 border border-[var(--border-gold)] bg-[var(--accent-gold-muted)]/30">
                <h4 className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase mb-2">Shto / Menaxho llogari</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Llogaritë e berberëve krijohen në Supabase SQL Editor (për siguri). Komandat:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0a0805]/70 border border-white/5 p-3 text-[11px] text-[var(--accent-gold)]">
{`select public.create_barber('emer@barberbrothers.style', 'fjalekalimi', 'Emri', '+38344000000');
select public.set_barber_password('emer@barberbrothers.style', 'fjalekalimi_ri');`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <ServicesManager services={services} barbers={barbers} onChanged={loadData} />
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0d0a]/95 border-t border-white/5 backdrop-blur-md px-4 py-2 flex justify-between items-center safe-bottom">
        <MobileTab icon={<LayoutDashboard size={18} />} label="Përmbledhje" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <MobileTab icon={<CalendarDays size={18} />} label="Rezervime" active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
        <MobileTab icon={<Users size={18} />} label="Berberë" active={activeTab === 'barbers'} onClick={() => setActiveTab('barbers')} />
        <MobileTab icon={<Wrench size={18} />} label="Shërbime" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
      </nav>
    </div>
  )
}

// ---------------- Sub-components ----------------

function AdminLogin({ email, setEmail, password, setPassword, signIn, authLoading, authError }) {
  const navigate = (to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="premium-card p-8 shadow-2xl relative overflow-hidden border border-white/5 bg-[#12100d]">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[var(--accent-gold)]/5 blur-2xl pointer-events-none" />
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs font-bold font-display uppercase tracking-wider text-[var(--text-secondary)] transition-all hover:border-[var(--border-gold)] hover:text-[var(--accent-gold)]"
        >
          <ChevronLeft size={14} />
          Kthehu
        </button>

        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border-gold)] bg-white/5 text-[var(--accent-gold)] mb-6">
          <ShieldCheck size={26} />
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-wider text-white uppercase">Hyrja e Adminit</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Vetëm administratorët kanë qasje në këtë panel.</p>
        <form onSubmit={signIn} className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gmail.com"
              className="w-full rounded-lg border border-white/5 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:bg-white/10 transition-all" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Fjalëkalimi</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full rounded-lg border border-white/5 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:bg-white/10 transition-all" />
          </label>
          <button disabled={authLoading} className="btn-gold w-full mt-2 cursor-pointer font-display uppercase tracking-wider py-3">
            {authLoading ? 'Duke hyrë...' : 'Kyçu'}
          </button>
        </form>
        {authError && <p className="mt-4 text-xs font-bold text-center text-red-400 tracking-wide">{authError}</p>}
      </div>
    </section>
  )
}

function ServicesManager({ services, barbers, onChanged }) {
  const [drafts, setDrafts] = useState({})
  const [newService, setNewService] = useState({ name: '', duration_minutes: 30, price: '' })
  const [saving, setSaving] = useState(false)

  const draftFor = (s) => drafts[s.id] || { name: s.name, duration_minutes: s.duration_minutes, price: s.price, active: s.active }
  const setDraft = (id, patch) => setDrafts((d) => ({ ...d, [id]: { ...draftFor(services.find((s) => s.id === id)), ...d[id], ...patch } }))

  async function saveService(s) {
    const d = draftFor(s)
    setSaving(true)
    const { error } = await supabase
      .from('services')
      .update({ name: d.name, duration_minutes: Number(d.duration_minutes), price: Number(d.price), active: d.active })
      .eq('id', s.id)
    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    setDrafts((d2) => { const n = { ...d2 }; delete n[s.id]; return n })
    onChanged()
  }

  async function addService(event) {
    event.preventDefault()
    if (!newService.name || newService.price === '') return
    setSaving(true)
    const { data, error } = await supabase
      .from('services')
      .insert({ name: newService.name, duration_minutes: Number(newService.duration_minutes), price: Number(newService.price), active: true })
      .select('id')
      .single()
    if (error) { setSaving(false); return alert('Error: ' + error.message) }
    // Assign the new service to every barber so it appears in booking.
    if (data?.id && barbers.length) {
      await supabase.from('barber_services').insert(barbers.map((b) => ({ barber_id: b.id, service_id: data.id })))
    }
    setSaving(false)
    setNewService({ name: '', duration_minutes: 30, price: '' })
    onChanged()
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-display text-sm font-bold tracking-widest text-white uppercase">Shërbimet</h3>

      <div className="premium-card overflow-hidden border border-white/5 bg-[#12100d]/80">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider font-display text-[var(--text-muted)] bg-black/25">
              <th className="px-4 py-3">Emri</th>
              <th className="px-4 py-3">Kohëzgjatja</th>
              <th className="px-4 py-3">Çmimi (€)</th>
              <th className="px-4 py-3 text-center">Aktiv</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[var(--text-secondary)]">
            {services.map((s) => {
              const d = draftFor(s)
              const dirty = Boolean(drafts[s.id])
              return (
                <tr key={s.id} className={dirty ? 'bg-[var(--accent-gold-muted)]/20' : ''}>
                  <td className="px-4 py-3">
                    <input value={d.name} onChange={(e) => setDraft(s.id, { name: e.target.value })}
                      className="w-full rounded border border-white/5 bg-white/5 px-2 py-1.5 text-white focus:outline-none focus:border-[var(--accent-gold)]" />
                  </td>
                  <td className="px-4 py-3">
                    <select value={d.duration_minutes} onChange={(e) => setDraft(s.id, { duration_minutes: Number(e.target.value) })}
                      className="rounded border border-white/5 bg-white/5 px-2 py-1.5 text-white focus:outline-none focus:border-[var(--accent-gold)]">
                      {DURATION_OPTIONS.map((m) => <option key={m} value={m} className="bg-[#12100d]">{m} min</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" step="0.5" min="0" value={d.price} onChange={(e) => setDraft(s.id, { price: e.target.value })}
                      className="w-20 rounded border border-white/5 bg-white/5 px-2 py-1.5 text-white focus:outline-none focus:border-[var(--accent-gold)]" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setDraft(s.id, { active: !d.active })}
                      className={`rounded px-2.5 py-1 text-[10px] font-bold font-display uppercase tracking-wider border cursor-pointer ${d.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-[var(--text-muted)] border-white/10'}`}>
                      {d.active ? 'Po' : 'Jo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button disabled={!dirty || saving} onClick={() => saveService(s)}
                      className="inline-flex items-center gap-1 rounded bg-[var(--accent-gold)] px-3 py-1.5 text-[10px] font-bold font-display uppercase tracking-wider text-[#0a0805] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                      <Save size={12} /> Ruaj
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={addService} className="premium-card p-5 border border-white/5 bg-[#12100d]/80 flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="flex-1">
          <span className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Shërbim i ri</span>
          <input value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="Emri i shërbimit" required
            className="w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]" />
        </label>
        <label>
          <span className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Kohë</span>
          <select value={newService.duration_minutes} onChange={(e) => setNewService({ ...newService, duration_minutes: Number(e.target.value) })}
            className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent-gold)]">
            {DURATION_OPTIONS.map((m) => <option key={m} value={m} className="bg-[#12100d]">{m} min</option>)}
          </select>
        </label>
        <label>
          <span className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Çmimi €</span>
          <input type="number" step="0.5" min="0" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} placeholder="0" required
            className="w-24 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]" />
        </label>
        <button disabled={saving} className="btn-gold cursor-pointer disabled:opacity-40">
          <Plus size={16} /> Shto
        </button>
      </form>
    </div>
  )
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${
        active ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border border-[var(--border-gold)]' : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
      }`}>
      {icon}{label}
    </button>
  )
}

function MobileTab({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${active ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)]'}`}>
      {icon}
      <span className="text-[9px] uppercase tracking-wider font-display font-semibold">{label}</span>
    </button>
  )
}

function StatCard({ label, value, gold }) {
  return (
    <div className={`${gold ? 'premium-card-gold' : 'premium-card bg-[#12100d]/80 border border-white/5'} p-4.5`}>
      <p className={`text-[10px] font-bold font-display uppercase tracking-widest ${gold ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${gold ? 'text-[var(--accent-gold)]' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/5 py-2">
      <p className="font-display text-base font-bold text-white">{value}</p>
      <p className="text-[9px] uppercase tracking-wider font-display text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    no_show: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20'
  }
  return (
    <span className={`rounded px-2 py-0.5 text-[9px] font-bold font-display uppercase tracking-wider border ${map[status] || 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border-[var(--border-gold)]'}`}>
      {status}
    </span>
  )
}
