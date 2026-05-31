import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { 
  LogOut, 
  Plus, 
  Scissors, 
  Sparkles, 
  Calendar, 
  CalendarDays, 
  TrendingUp, 
  Users, 
  User, 
  Search, 
  Mail, 
  Phone, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  TrendingDown
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppointmentsRealtime } from '../hooks/useAppointmentsRealtime'
import { toISODate, todayISO } from '../utils/time'
import { WalkInModal } from './WalkInModal'

export function BarberDashboard() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [schedules, setSchedules] = useState([])
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('today') // today, weekly, revenue, clients, profile
  
  // Weekly Overview States
  const [selectedWeeklyDate, setSelectedWeeklyDate] = useState(todayISO())
  
  // Client History States
  const [searchQuery, setSearchQuery] = useState('')
  const [clientHistoryPage, setClientHistoryPage] = useState(0)
  const clientsPerPage = 10

  const today = todayISO()

  const navigate = (to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Authentication monitoring
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Load Barber Profile
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) {
        setProfile(null)
        return
      }
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role, phone')
          .eq('auth_user_id', session.user.id)
          .in('role', ['barber', 'owner', 'admin'])
          .single()
        
        if (profileError) throw profileError
        setProfile(data)
      } catch (err) {
        console.error('Failed to load profile:', err)
      }
    }

    loadProfile()
  }, [session])

  // Tracks whether the dashboard has loaded at least once so background
  // refreshes (realtime / polling) don't flash the loading indicator.
  const hasLoadedRef = useRef(false)

  // Load All Relevant Data for Dashboard
  const loadDashboard = useCallback(async () => {
    if (!profile?.id) return

    const isInitialLoad = !hasLoadedRef.current
    if (isInitialLoad) setLoading(true)
    try {
      // Fetch:
      // 1. Appointments (recent 300 appointments for client history, weekly overview, and analytics calculations)
      // 2. Services assigned to this barber
      // 3. Weekly schedule of this barber
      const [
        { data: appointmentRows, error: aptError }, 
        { data: serviceRows, error: srvError },
        { data: scheduleRows, error: schError }
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, appointment_date, start_time, end_time, status, client:profiles!appointments_client_id_fkey(full_name, phone), service:services(name, price, duration_minutes)')
          .eq('barber_id', profile.id)
          .order('appointment_date', { ascending: false })
          .order('start_time', { ascending: false })
          .limit(300),
        supabase
          .from('barber_services')
          .select('service:services(id, name, duration_minutes, price)')
          .eq('barber_id', profile.id),
        supabase
          .from('schedules')
          .select('id, day_of_week, start_time, end_time')
          .eq('barber_id', profile.id)
          .order('day_of_week')
      ])

      if (aptError) throw aptError
      if (srvError) throw srvError
      if (schError) throw schError

      setAppointments(appointmentRows || [])
      setServices((serviceRows || []).map((item) => item.service).filter(Boolean))
      setSchedules(scheduleRows || [])
    } catch (err) {
      console.error('Dashboard data load failed:', err)
    } finally {
      hasLoadedRef.current = true
      if (isInitialLoad) setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Set up real-time listener on appointments table
  useAppointmentsRealtime({
    barberId: profile?.id,
    appointmentDate: null, // Listen to all appointments for this barber
    onChange: loadDashboard
  })

  // Auth Functions
  async function signIn(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) setError(signInError.message)
  }

  async function updateStatus(id, status) {
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
    if (updateError) {
      alert('Error updating status: ' + updateError.message)
    } else {
      loadDashboard()
    }
  }

  // Greeting helper based on local time
  const greeting = useMemo(() => {
    const hours = new Date().getHours()
    if (hours < 12) return 'Mirëmëngjes' // Good morning
    if (hours < 18) return 'Mirëdita' // Good afternoon
    return 'Mirëmbrëma' // Good evening
  }, [])

  // Today's Stats & Filtered Appointments
  const todayAppointments = useMemo(() => {
    return appointments
      .filter((apt) => apt.appointment_date === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [appointments, today])

  const todayStats = useMemo(() => {
    const completed = todayAppointments.filter((a) => a.status === 'completed')
    const noShow = todayAppointments.filter((a) => a.status === 'no_show')
    const totalCash = completed.reduce((sum, a) => sum + Number(a.service?.price || 0), 0)
    
    return {
      count: todayAppointments.length,
      cash: totalCash,
      completedCount: completed.length,
      noShowCount: noShow.length
    }
  }, [todayAppointments])

  // Weekly Overview (Next 7 working days starting from today)
  const weeklyDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const iso = toISODate(d)
      const sqDays = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht']
      return {
        iso,
        dayLabel: sqDays[d.getDay()],
        dateLabel: d.getDate(),
        isToday: i === 0
      }
    })
  }, [])

  const weeklyAppointmentsByDate = useMemo(() => {
    return appointments.filter((apt) => {
      return weeklyDates.some((wd) => wd.iso === apt.appointment_date)
    })
  }, [appointments, weeklyDates])

  const selectedWeeklyAppointments = useMemo(() => {
    return weeklyAppointmentsByDate
      .filter((apt) => apt.appointment_date === selectedWeeklyDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [weeklyAppointmentsByDate, selectedWeeklyDate])

  // Analytics Computations
  const analyticsStats = useMemo(() => {
    // Current Week Range (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = toISODate(sevenDaysAgo)

    // Current Month Range (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = toISODate(thirtyDaysAgo)

    const completed = appointments.filter((apt) => apt.status === 'completed')
    const noShows = appointments.filter((apt) => apt.status === 'no_show')
    const cancelled = appointments.filter((apt) => apt.status === 'cancelled')

    const todayRev = completed
      .filter((apt) => apt.appointment_date === today)
      .reduce((sum, apt) => sum + Number(apt.service?.price || 0), 0)

    const weekRev = completed
      .filter((apt) => apt.appointment_date >= sevenDaysAgoISO)
      .reduce((sum, apt) => sum + Number(apt.service?.price || 0), 0)

    const monthRev = completed
      .filter((apt) => apt.appointment_date >= thirtyDaysAgoISO)
      .reduce((sum, apt) => sum + Number(apt.service?.price || 0), 0)

    // Service Type Breakdown
    const serviceBreakdown = {}
    completed.forEach((apt) => {
      const name = apt.service?.name || 'Unknown'
      const price = Number(apt.service?.price || 0)
      if (!serviceBreakdown[name]) {
        serviceBreakdown[name] = { count: 0, revenue: 0 }
      }
      serviceBreakdown[name].count += 1
      serviceBreakdown[name].revenue += price
    })

    // Percentages
    const totalResolved = completed.length + noShows.length + cancelled.length
    const completionRate = totalResolved > 0 ? Math.round((completed.length / totalResolved) * 100) : 100
    const noShowRate = totalResolved > 0 ? Math.round((noShows.length / totalResolved) * 100) : 0
    const cancelRate = totalResolved > 0 ? Math.round((cancelled.length / totalResolved) * 100) : 0

    return {
      todayRev,
      weekRev,
      monthRev,
      serviceBreakdown: Object.entries(serviceBreakdown).map(([name, data]) => ({ name, ...data })),
      completionRate,
      noShowRate,
      cancelRate,
      totalResolved
    }
  }, [appointments, today])

  // Clients History List with search & pagination
  const filteredClientAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return appointments

    return appointments.filter((apt) => {
      const clientName = (apt.client?.full_name || '').toLowerCase()
      const clientPhone = (apt.client?.phone || '').toLowerCase()
      const serviceName = (apt.service?.name || '').toLowerCase()
      return clientName.includes(query) || clientPhone.includes(query) || serviceName.includes(query)
    })
  }, [appointments, searchQuery])

  const paginatedClients = useMemo(() => {
    const offset = clientHistoryPage * clientsPerPage
    return filteredClientAppointments.slice(offset, offset + clientsPerPage)
  }, [filteredClientAppointments, clientHistoryPage])

  const totalClientHistoryPages = Math.ceil(filteredClientAppointments.length / clientsPerPage)

  // Reset page on search
  useEffect(() => {
    setClientHistoryPage(0)
  }, [searchQuery])

  if (!session) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-md flex-col justify-center px-4 py-12">
        <div className="premium-card p-8 shadow-2xl relative overflow-hidden border border-white/5 bg-[#12100d]">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[var(--accent-gold)]/5 blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={() => navigate('/home')}
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs font-bold font-display uppercase tracking-wider text-[var(--text-secondary)] transition-all hover:border-[var(--border-gold)] hover:text-[var(--accent-gold)]"
          >
            <ChevronLeft size={14} />
            Kthehu
          </button>
          
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border-gold)] bg-white/5 text-[var(--accent-gold)] mb-6">
            <Scissors size={26} className="rotate-90" />
          </div>
          
          <h1 className="font-display text-2xl font-extrabold tracking-wider text-white uppercase">Hyrja e Berberit</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Hyni për të menaxhuar orarin dhe rezervimet tuaja live.</p>
          
          <form onSubmit={signIn} className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Email</span>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(event) => setEmail(event.target.value)} 
                placeholder="email@barberbrothers.style" 
                className="w-full rounded-lg border border-white/5 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:bg-white/10 transition-all" 
              />
            </label>
            <label className="block font-semibold">
              <span className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Fëjalëkalimi</span>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                placeholder="••••••••" 
                className="w-full rounded-lg border border-white/5 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:bg-white/10 transition-all" 
              />
            </label>
            <button 
              disabled={loading}
              className="btn-gold w-full mt-2 cursor-pointer font-display uppercase tracking-wider py-3"
            >
              {loading ? 'Duke hyrë...' : 'Kyçu'}
            </button>
          </form>
          {error && <p className="mt-4 text-xs font-bold text-center text-red-400 tracking-wide">{error}</p>}
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0805] text-[#f5f3ef] flex flex-col md:flex-row">
      
      {/* Desktop Sidebar Dashboard Navigation */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-[#0f0d0a]/90 backdrop-blur-md p-6 sticky top-0 h-screen justify-between">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-gold)] bg-white/5 text-[var(--accent-gold)]">
              <Scissors size={18} className="rotate-90" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold tracking-widest text-white uppercase">PANELI</h2>
              <p className="text-[10px] text-[var(--accent-gold)] font-bold tracking-wider font-display uppercase">SuLoCut</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border border-[var(--border-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar size={15} />
              Sot ({todayAppointments.length})
            </button>
            
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'weekly'
                  ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border border-[var(--border-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <CalendarDays size={15} />
              Koha Javore
            </button>

            <button
              onClick={() => setActiveTab('revenue')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'revenue'
                  ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border border-[var(--border-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp size={15} />
              Statistikat
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'clients'
                  ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border border-[var(--border-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={15} />
              Historiku
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border border-[var(--border-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={15} />
              Profili Im
            </button>
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-bold text-white uppercase truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-[var(--text-muted)] font-medium truncate mt-0.5">{session.user.email}</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs font-bold font-display uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut size={14} />
            Dil nga Llogaria
          </button>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <main className="flex-1 px-4 py-6 md:px-10 md:py-8 overflow-y-auto pb-24 md:pb-8">
        
        {/* Header (Greeting & Mini Details) */}
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 text-xs font-bold font-display uppercase tracking-wider text-[var(--text-secondary)] transition-all hover:border-[var(--border-gold)] hover:text-[var(--accent-gold)]"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Kthehu</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-md border border-[#0f766e]/30 bg-[#0f766e]/10 px-2 py-0.5 text-[9px] font-bold font-display uppercase tracking-wider text-[#14b8a6]">
                  <Sparkles size={10} className="animate-pulse" /> Live updates
                </span>
                {loading && <span className="text-[9px] text-[var(--text-muted)] animate-pulse">Duke u ringarkuar...</span>}
              </div>
              <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase">
                {greeting}, {profile?.full_name?.split(' ')?.[0] || 'Barber'}!
              </h1>
            </div>
          </div>
          
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer" 
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Tab content renderer */}
        <div className="animate-fade-in">
          
          {/* TAB 1: TODAY'S SCHEDULE */}
          {activeTab === 'today' && (
            <div className="flex flex-col gap-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="premium-card p-4.5 bg-[#12100d]/80 border border-white/5">
                  <p className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)]">Rezervime Sot</p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">{todayStats.count}</p>
                </div>
                <div className="premium-card-gold p-4.5">
                  <p className="text-[10px] font-bold font-display uppercase tracking-widest text-white/70">Arkat e Mbledhura</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[var(--accent-gold)]">€{todayStats.cash.toFixed(2)}</p>
                </div>
                <div className="premium-card p-4.5 bg-[#12100d]/80 border border-white/5">
                  <p className="text-[10px] font-bold font-display uppercase tracking-widest text-green-400/80">Të Kryera</p>
                  <p className="mt-1 font-display text-2xl font-bold text-green-400">{todayStats.completedCount}</p>
                </div>
                <div className="premium-card p-4.5 bg-[#12100d]/80 border border-white/5">
                  <p className="text-[10px] font-bold font-display uppercase tracking-widest text-amber-500/80">No-show</p>
                  <p className="mt-1 font-display text-2xl font-bold text-amber-500">{todayStats.noShowCount}</p>
                </div>
              </div>

              {/* Timeline slots for Today */}
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-sm font-bold tracking-widest text-white uppercase mb-1">Rezervimet e Ditës</h3>
                
                {todayAppointments.map((apt) => {
                  const price = Number(apt.service?.price || 0)
                  const isCompleted = apt.status === 'completed'
                  const isNoShow = apt.status === 'no_show'
                  const isCancelled = apt.status === 'cancelled'
                  
                  return (
                    <article 
                      key={apt.id} 
                      className={`premium-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isCompleted ? 'border-green-500/20 bg-green-500/[0.02]' :
                        isNoShow ? 'border-amber-500/20 bg-amber-500/[0.02]' :
                        isCancelled ? 'border-red-500/20 bg-red-500/[0.02]' : 
                        'border-white/5 bg-[#12100d]/80'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex flex-col items-center justify-center h-12 w-14 rounded-lg font-display font-extrabold text-sm border tracking-wide ${
                          isCompleted ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          isNoShow ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          isCancelled ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-white/5 text-[var(--accent-gold)] border-[var(--border-gold)]'
                        }`}>
                          <span>{apt.start_time.slice(0, 5)}</span>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{apt.client?.full_name}</h4>
                            <span className={`rounded px-2 py-0.5 text-[9px] font-bold font-display uppercase tracking-wider border ${
                              isCompleted ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              isNoShow ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              isCancelled ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border-[var(--border-gold)]'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-[var(--text-secondary)]">
                            <a href={`tel:${apt.client?.phone}`} className="flex items-center gap-1 hover:text-[var(--accent-gold)] transition-colors">
                              <Phone size={11} className="text-[var(--accent-gold)]" />
                              <span>{apt.client?.phone}</span>
                            </a>
                            <span className="hidden sm:inline text-white/10">•</span>
                            <span className="font-semibold text-white/90">
                              {apt.service?.name} ({apt.service?.duration_minutes} min) — €{price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons (only active for pending/confirmed/walk_in slots) */}
                      {!isCompleted && !isNoShow && !isCancelled && (
                        <div className="flex items-center gap-2 sm:self-center border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
                          <button 
                            onClick={() => updateStatus(apt.id, 'completed')} 
                            className="flex-1 sm:flex-initial rounded px-3 py-1.5 text-xs font-bold font-display uppercase tracking-wider bg-green-600 text-white hover:bg-green-500 transition-colors cursor-pointer"
                          >
                            Paguar
                          </button>
                          <button 
                            onClick={() => updateStatus(apt.id, 'no_show')} 
                            className="flex-1 sm:flex-initial rounded px-3 py-1.5 text-xs font-bold font-display uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                          >
                            No-show
                          </button>
                          <button 
                            onClick={() => updateStatus(apt.id, 'cancelled')} 
                            className="flex-1 sm:flex-initial rounded px-3 py-1.5 text-xs font-bold font-display uppercase tracking-wider bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all cursor-pointer"
                          >
                            Anulo
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}

                {todayAppointments.length === 0 && (
                  <div className="premium-card p-12 text-center border border-white/5 bg-[#12100d]/50">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Nuk ka rezervime të programuara për sot.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WEEKLY OVERVIEW */}
          {activeTab === 'weekly' && (
            <div className="flex flex-col gap-6">
              <h3 className="font-display text-sm font-bold tracking-widest text-white uppercase mb-1">Mënyra Javore</h3>
              
              {/* 7-day grid count */}
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-7">
                {weeklyDates.map((wd) => {
                  const isSelected = selectedWeeklyDate === wd.iso
                  const dateApts = weeklyAppointmentsByDate.filter((apt) => apt.appointment_date === wd.iso)
                  
                  return (
                    <button
                      key={wd.iso}
                      onClick={() => setSelectedWeeklyDate(wd.iso)}
                      className={`rounded-xl border p-4.5 text-center transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)]'
                          : 'border-white/5 bg-[#12100d]/80 text-[var(--text-secondary)] hover:border-white/10 hover:bg-[#12100d]'
                      }`}
                    >
                      <span className="block text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] mb-1">
                        {wd.isToday ? 'Sot' : wd.dayLabel}
                      </span>
                      <span className="block font-display text-lg font-bold text-white tracking-wider">{wd.dateLabel}</span>
                      
                      <span className={`inline-block mt-2 rounded px-1.5 py-0.5 text-[10px] font-bold font-display ${
                        dateApts.length > 0
                          ? 'bg-[var(--accent-gold)] text-[#0a0805]'
                          : 'bg-white/5 text-[var(--text-muted)]'
                      }`}>
                        {dateApts.length}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Day specific schedule listing */}
              <div className="flex flex-col gap-3 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase">
                    Rezervimet për: {selectedWeeklyDate === today ? 'Sot (' + selectedWeeklyDate + ')' : selectedWeeklyDate}
                  </h4>
                  <span className="text-xs text-[var(--text-muted)]">{selectedWeeklyAppointments.length} rezervime</span>
                </div>

                {selectedWeeklyAppointments.map((apt) => {
                  const isCompleted = apt.status === 'completed'
                  const isNoShow = apt.status === 'no_show'
                  const isCancelled = apt.status === 'cancelled'
                  return (
                    <div 
                      key={apt.id}
                      className="premium-card p-4.5 flex items-center justify-between border border-white/5 bg-[#12100d]/80 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="px-2 py-1.5 rounded bg-white/5 font-display font-extrabold text-sm text-white tracking-wider">
                          {apt.start_time.slice(0, 5)}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{apt.client?.full_name}</p>
                          <p className="text-[var(--text-secondary)] mt-0.5">{apt.service?.name} — €{Number(apt.service?.price).toFixed(2)}</p>
                        </div>
                      </div>
                      <span className={`rounded px-2.5 py-0.5 text-[10px] font-bold font-display uppercase tracking-wider border ${
                        isCompleted ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        isNoShow ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        isCancelled ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border-[var(--border-gold)]'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  )
                })}

                {selectedWeeklyAppointments.length === 0 && (
                  <div className="premium-card p-12 text-center border border-white/5 bg-[#12100d]/50">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Nuk ka rezervime për këtë ditë.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REVENUE & ANALYTICS STATS */}
          {activeTab === 'revenue' && (
            <div className="flex flex-col gap-8">
              
              {/* Financial cards */}
              <div>
                <h3 className="font-display text-sm font-bold tracking-widest text-white uppercase mb-4">Përmbledhja Financiare</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="premium-card p-5 border border-white/5 bg-[#12100d]/80">
                    <p className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)]">Arka sot</p>
                    <p className="mt-2 font-display text-3xl font-bold text-white">€{analyticsStats.todayRev.toFixed(2)}</p>
                  </div>
                  <div className="premium-card p-5 border border-white/5 bg-[#12100d]/80">
                    <p className="text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)] font-semibold">Këtë Javë (7 ditë)</p>
                    <p className="mt-2 font-display text-3xl font-bold text-white">€{analyticsStats.weekRev.toFixed(2)}</p>
                  </div>
                  <div className="premium-card-gold p-5">
                    <p className="text-[10px] font-bold font-display uppercase tracking-widest text-white/80">Këtë Muaj (30 ditë)</p>
                    <p className="mt-2 font-display text-3xl font-bold text-[var(--accent-gold)]">€{analyticsStats.monthRev.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Service type breakdown & percentages */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                
                {/* Completion percentages breakdown */}
                <div className="premium-card p-6 border border-white/5 bg-[#12100d]/80">
                  <h4 className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase mb-5">Normat e Vizitave (Total: {analyticsStats.totalResolved})</h4>
                  
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-green-400 font-bold uppercase tracking-wider font-display">Të Kryera</span>
                        <span>{analyticsStats.completionRate}%</span>
                      </div>
                      <div className="w-full h-2 rounded bg-white/5 overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${analyticsStats.completionRate}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-amber-500 font-bold uppercase tracking-wider font-display">No-show</span>
                        <span>{analyticsStats.noShowRate}%</span>
                      </div>
                      <div className="w-full h-2 rounded bg-white/5 overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${analyticsStats.noShowRate}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-red-400 font-bold uppercase tracking-wider font-display">Të Anuluara</span>
                        <span>{analyticsStats.cancelRate}%</span>
                      </div>
                      <div className="w-full h-2 rounded bg-white/5 overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${analyticsStats.cancelRate}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service type breakdown */}
                <div className="premium-card p-6 border border-white/5 bg-[#12100d]/80 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase mb-5 font-bold">Mbledhja sipas Shërbimit</h4>
                    <div className="flex flex-col gap-3">
                      {analyticsStats.serviceBreakdown.map((sb) => (
                        <div key={sb.name} className="flex justify-between items-center py-2 border-b border-white/5 text-xs text-[var(--text-secondary)]">
                          <span>{sb.name} <span className="text-[var(--text-muted)] font-semibold">({sb.count})</span></span>
                          <span className="font-bold text-white">€{sb.revenue.toFixed(2)}</span>
                        </div>
                      ))}
                      {analyticsStats.serviceBreakdown.length === 0 && (
                        <p className="text-xs text-[var(--text-muted)] text-center py-6">Nuk ka të dhëna për shërbimet e kryera.</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: CLIENT HISTORY */}
          {activeTab === 'clients' && (
            <div className="flex flex-col gap-6">
              
              {/* Search bar & info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-display text-sm font-bold tracking-widest text-white uppercase">Historiku i Rezervimeve</h3>
                <div className="relative w-full sm:w-64">
                  <Search size={15} className="absolute left-3 top-3 text-[var(--text-muted)] pointer-events-none" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Kërko klient, shërbim..." 
                    className="w-full rounded-lg border border-white/5 bg-white/5 py-2 pl-9 pr-4 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:bg-white/10 transition-all" 
                  />
                </div>
              </div>

              {/* Table details */}
              <div className="premium-card overflow-hidden border border-white/5 bg-[#12100d]/80">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider font-display text-[var(--text-muted)] bg-black/25">
                        <th className="px-5 py-3">Klienti</th>
                        <th className="px-5 py-3">Data & Ora</th>
                        <th className="px-5 py-3">Shërbimi</th>
                        <th className="px-5 py-3">Pagesa</th>
                        <th className="px-5 py-3">Statusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[var(--text-secondary)]">
                      {paginatedClients.map((apt) => (
                        <tr key={apt.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-white">{apt.client?.full_name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">{apt.client?.phone}</p>
                          </td>
                          <td className="px-5 py-3.5 font-display font-medium tracking-wide">
                            <p className="text-white">{apt.appointment_date}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}</p>
                          </td>
                          <td className="px-5 py-3.5 font-medium">{apt.service?.name}</td>
                          <td className="px-5 py-3.5 font-bold font-display text-[var(--accent-gold)]">€{Number(apt.service?.price || 0).toFixed(2)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold font-display uppercase tracking-wider border ${
                              apt.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              apt.status === 'no_show' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              apt.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-[var(--accent-gold-muted)] text-[var(--accent-gold)] border-[var(--border-gold)]'
                            }`}>
                              {apt.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {filteredClientAppointments.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-5 py-8 text-center text-[var(--text-muted)]">
                            Nuk u gjet asnjë rekord i vizitave.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination strip */}
                {totalClientHistoryPages > 1 && (
                  <div className="flex justify-between items-center px-5 py-3.5 border-t border-white/5 text-xs text-[var(--text-muted)]">
                    <span>Faqja {clientHistoryPage + 1} nga {totalClientHistoryPages} ({filteredClientAppointments.length} rekorde)</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setClientHistoryPage((p) => Math.max(0, p - 1))}
                        disabled={clientHistoryPage === 0}
                        className="p-1.5 rounded border border-white/5 bg-white/5 text-[var(--text-secondary)] hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        onClick={() => setClientHistoryPage((p) => Math.min(totalClientHistoryPages - 1, p + 1))}
                        disabled={clientHistoryPage === totalClientHistoryPages - 1}
                        className="p-1.5 rounded border border-white/5 bg-white/5 text-[var(--text-secondary)] hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MY PROFILE */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
              
              {/* Account Details column */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="premium-card p-6 border border-white/5 bg-[#12100d]/80 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[var(--accent-gold)]/5 blur-xl pointer-events-none" />
                  
                  <div className="h-20 w-20 rounded-full border-2 border-[var(--border-gold)] bg-white/5 font-display text-2xl font-bold flex items-center justify-center text-[var(--accent-gold)] mx-auto mb-4">
                    {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'B'}
                  </div>
                  
                  <h3 className="font-display text-lg font-bold text-white uppercase">{profile?.full_name}</h3>
                  <p className="text-[10px] text-[var(--accent-gold)] font-bold uppercase tracking-wider font-display mt-0.5">Berber Profesional</p>
                  
                  <div className="flex flex-col gap-2.5 mt-6 border-t border-white/5 pt-6 text-xs text-left">
                    <div className="flex items-center gap-3">
                      <Mail size={13} className="text-[var(--accent-gold)]" />
                      <span className="text-[var(--text-secondary)] truncate">{session.user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={13} className="text-[var(--accent-gold)]" />
                      <span className="text-[var(--text-secondary)]">{profile?.phone || '+383 45 990 079'}</span>
                    </div>
                  </div>
                </div>

                <div className="premium-card p-6 border border-white/5 bg-[#12100d]/80">
                  <h4 className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase mb-4">Shërbimet e Caktuara</h4>
                  <div className="flex flex-col gap-2.5">
                    {services.map((srv) => (
                      <div key={srv.id} className="flex justify-between items-center py-2 border-b border-white/5 text-xs text-[var(--text-secondary)]">
                        <span className="font-semibold text-white">{srv.name}</span>
                        <span>{srv.duration_minutes} min — €{Number(srv.price).toFixed(2)}</span>
                      </div>
                    ))}
                    {services.length === 0 && (
                      <p className="text-xs text-[var(--text-muted)] text-center py-4">Asnjë shërbim i caktuar.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Working Schedule details */}
              <div className="lg:col-span-7 premium-card p-6 border border-white/5 bg-[#12100d]/80 flex flex-col justify-between">
                <div>
                  <h4 className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase mb-5 flex items-center gap-2">
                    <Clock size={15} />
                    Orari Im Javor
                  </h4>
                  
                  <div className="flex flex-col gap-3">
                    {['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'].map((dayLabel, index) => {
                      const activeSched = schedules.find((sch) => sch.day_of_week === index)
                      return (
                        <div key={dayLabel} className="flex justify-between items-center py-2.5 border-b border-white/5 text-xs text-[var(--text-secondary)]">
                          <span className="font-semibold">{dayLabel}</span>
                          {activeSched ? (
                            <span className="font-bold text-[var(--accent-gold)] font-display text-sm tracking-wider">
                              {activeSched.start_time.slice(0, 5)} - {activeSched.end_time.slice(0, 5)}
                            </span>
                          ) : (
                            <span className="font-bold uppercase text-red-400">MBYLLUR</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Floating Action Button (FAB) for walk-ins */}
      <button 
        onClick={() => setShowWalkIn(true)} 
        className="fixed bottom-20 right-5 md:bottom-6 md:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-gold)] text-[#0a0805] shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer hover:shadow-[var(--accent-gold)]/20 hover:shadow-lg" 
        aria-label="Walk-in appointment quick book"
      >
        <Plus size={26} />
      </button>

      {/* Mobile bottom tab navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0d0a]/95 border-t border-white/5 backdrop-blur-md px-6 py-2 flex justify-between items-center text-[var(--text-secondary)] safe-bottom shadow-lg">
        <button 
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${activeTab === 'today' ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-muted)]'}`}
        >
          <Calendar size={18} />
          <span className="text-[9px] uppercase tracking-wider font-display font-semibold">Sot</span>
        </button>
        <button 
          onClick={() => setActiveTab('weekly')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${activeTab === 'weekly' ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-muted)]'}`}
        >
          <CalendarDays size={18} />
          <span className="text-[9px] uppercase tracking-wider font-display font-semibold">Javor</span>
        </button>
        <button 
          onClick={() => setActiveTab('revenue')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${activeTab === 'revenue' ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-muted)]'}`}
        >
          <TrendingUp size={18} />
          <span className="text-[9px] uppercase tracking-wider font-display font-semibold">Stats</span>
        </button>
        <button 
          onClick={() => setActiveTab('clients')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${activeTab === 'clients' ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-muted)]'}`}
        >
          <Users size={18} />
          <span className="text-[9px] uppercase tracking-wider font-display font-semibold">Vizitat</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${activeTab === 'profile' ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-muted)]'}`}
        >
          <User size={18} />
          <span className="text-[9px] uppercase tracking-wider font-display font-semibold">Profil</span>
        </button>
      </nav>

      {/* Render Walk-in Quick Book Modal */}
      {showWalkIn && (
        <WalkInModal
          services={services}
          onClose={() => setShowWalkIn(false)}
          onBooked={() => {
            setShowWalkIn(false)
            loadDashboard()
          }}
        />
      )}

    </div>
  )
}
