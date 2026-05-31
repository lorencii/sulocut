import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
  Star,
  UserRound,
  Wallet,
  X
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAppointmentsRealtime } from '../hooks/useAppointmentsRealtime'
import { buildAvailableSlots, dayOfWeek, intervalsOverlap, toISODate, todayISO, toMinutes, toTime } from '../utils/time'

const COPY = {
  sq: {
    locale: 'sq-AL',
    heroEyebrow: 'Rezervime live',
    heroTitle: 'Rezervo prerjen pa pritje.',
    heroText:
      'Zgjidh shërbimin, berberin dhe orarin. Nuk nevojitet llogari dhe pagesa bëhet në dyqan.',
    heroPrimary: 'Hap rezervimin',
    heroSecondary: '10:00 - 21:00',
    liveBadge: 'Live',
    cashBadge: 'Vetëm cash',
    noLogin: 'Pa llogari',
    stepLabels: ['Shërbimi', 'Berberi', 'Data', 'Ora', 'Të dhënat'],
    required: 'E detyrueshme',
    chooseService: 'Zgjidh shërbimin',
    chooseBarber: 'Zgjidh berberin',
    chooseDate: 'Zgjidh datën',
    availableTimes: 'Orarët e lirë',
    customerDetails: 'Të dhënat e klientit',
    servicesEmpty: 'Shërbimet do të shfaqen pasi Supabase të jetë konfiguruar.',
    noBarbers: 'Asnjë berber nuk është caktuar për këtë shërbim.',
    chooseBarberFirst: 'Zgjidh një berber për të parë orarët e lirë.',
    noSlots: 'Nuk ka orare të lira për këtë zgjedhje.',
    reserved: 'I rezervuar',
    firstName: 'Emri',
    lastName: 'Mbiemri',
    phone: 'Numri i telefonit',
    confirm: 'Konfirmo rezervimin',
    confirming: 'Duke konfirmuar...',
    confirmed: 'Rezervimi u konfirmua me sukses! Pagesa bëhet cash në dyqan.',
    successTitle: 'Rezervimi u konfirmua!',
    successText: 'Të presim në dyqan. Pagesa bëhet cash pas shërbimit.',
    clientLabel: 'Klienti',
    bookAnother: 'Bëj një rezervim tjetër',
    close: 'Mbyll',
    unavailable: 'Ky orar nuk është më i lirë.',
    conflictWithSlot: 'Shërbimi yt zgjat {duration} minuta, por ora {time} është i zënë. Zgjidh një orar tjetër.',
    conflictGeneric: 'Shërbimi yt zgjat {duration} minuta dhe përplaset me një rezervim ekzistues. Zgjidh një orar tjetër.',
    summary: 'Përmbledhje',
    service: 'Shërbimi',
    barber: 'Berberi',
    date: 'Data',
    time: 'Ora',
    total: 'Totali',
    durationLabel: 'Kohëzgjatja',
    nextStep: 'Hapi tjetër',
    duration: 'min',
    paidInPerson: 'paguhet në dyqan',
    cash: 'cash',
    today: 'Sot',
    closed: 'Mbyllur',
    barberRole: 'Berber',
    next: {
      service: 'Zgjidh shërbimin',
      barber: 'Zgjidh berberin',
      date: 'Zgjidh datën',
      time: 'Zgjidh orën',
      details: 'Plotëso të dhënat',
      confirm: 'Konfirmo'
    },
    sections: {
      standardsTitle: 'Standardi i vizitës',
      standards: [
        ['Orar i qartë', 'Rezervimet hapen çdo 30 minuta nga 10:00 deri në 21:00.'],
        ['Berber i zgjedhur', 'Çdo klient zgjedh vetë berberin para se të zgjedhë orën.'],
        ['Pagesë në dyqan', 'Nuk ka pagesa online. Totali paguhet cash pas shërbimit.']
      ],
      visitTitle: 'Para se të vish',
      visitItems: [
        'Mbërrij 5 minuta më herët për kontrollin e orarit.',
        'Nëse vonohesh, telefono dyqanin që berberi ta dijë.',
        'Rezervimet live përditësohen menjëherë kur një orar zëhet.'
      ],
      shopTitle: 'Dyqani',
      shopLines: ['Hapur çdo ditë pune', 'Rezervime 10:00 - 21:00', 'Shërbim pa pagesë online']
    }
  },
  en: {
    locale: 'en',
    heroEyebrow: 'Live reservations',
    heroTitle: 'Book your cut without waiting.',
    heroText:
      'Choose the service, barber, and time. No account is needed and payment happens in the shop.',
    heroPrimary: 'Start booking',
    heroSecondary: '10:00 - 21:00',
    liveBadge: 'Live',
    cashBadge: 'Cash only',
    noLogin: 'No account',
    stepLabels: ['Service', 'Barber', 'Date', 'Time', 'Details'],
    required: 'Required',
    chooseService: 'Choose service',
    chooseBarber: 'Choose barber',
    chooseDate: 'Choose date',
    availableTimes: 'Available times',
    customerDetails: 'Customer details',
    servicesEmpty: 'Services will appear here after Supabase is configured.',
    noBarbers: 'No barber is assigned to this service yet.',
    chooseBarberFirst: 'Choose a barber to see available times.',
    noSlots: 'No open times for this selection.',
    reserved: 'Reserved',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    confirm: 'Confirm appointment',
    confirming: 'Confirming...',
    confirmed: 'Appointment confirmed successfully! Pay in cash at the shop.',
    successTitle: 'Appointment confirmed!',
    successText: 'See you at the shop. Payment is in cash after the service.',
    clientLabel: 'Client',
    bookAnother: 'Book another appointment',
    close: 'Close',
    unavailable: 'This time is no longer available.',
    conflictWithSlot: 'Your service lasts {duration} minutes, but {time} is already booked. Please choose another time.',
    conflictGeneric: 'Your service lasts {duration} minutes and overlaps an existing booking. Please choose another time.',
    summary: 'Summary',
    service: 'Service',
    barber: 'Barber',
    date: 'Date',
    time: 'Time',
    total: 'Total',
    durationLabel: 'Duration',
    nextStep: 'Next step',
    duration: 'min',
    paidInPerson: 'paid in person',
    cash: 'cash',
    today: 'Today',
    closed: 'Closed',
    barberRole: 'Barber',
    next: {
      service: 'Choose service',
      barber: 'Choose barber',
      date: 'Choose date',
      time: 'Choose time',
      details: 'Add details',
      confirm: 'Confirm'
    },
    sections: {
      standardsTitle: 'Visit standard',
      standards: [
        ['Clear timing', 'Reservations open every 30 minutes from 10:00 to 21:00.'],
        ['Your barber', 'Every client chooses a barber before selecting a time.'],
        ['Pay in shop', 'No online payments. The total is paid in cash after the service.']
      ],
      visitTitle: 'Before you arrive',
      visitItems: [
        'Arrive 5 minutes early so the schedule stays clean.',
        'If you are running late, call the shop so the barber knows.',
        'Live reservations update instantly when a slot is taken.'
      ],
      shopTitle: 'The shop',
      shopLines: ['Open on working days', 'Reservations 10:00 - 21:00', 'No online payment']
    }
  }
}

function formatEuro(value) {
  if (value === undefined || value === null || value === '') return '-'
  return `€${Number(value).toFixed(2)}`
}

// Service names are stored as free text in the DB (usually English), so we map
// them to Albanian here. Keys are matched case-insensitively; unknown names
// fall back to the original. Add new entries as services are created.
const SERVICE_TRANSLATIONS = {
  sq: {
    haircut: 'Prerje flokësh',
    'kids haircut': 'Prerje për fëmijë',
    beard: 'Mjekër',
    'beard trim': 'Rregullim mjekre',
    shave: 'Rruajtje',
    'haircut & beard': 'Prerje + Mjekër',
    'haircut and beard': 'Prerje + Mjekër',
    'hair wash': 'Larje flokësh',
    styling: 'Stilizim'
  }
}

function translateService(name, language) {
  if (!name) return name
  const dict = SERVICE_TRANSLATIONS[language]
  return dict?.[name.trim().toLowerCase()] || name
}

// Turns an ISO date (2026-06-01) into a human label: "1st June 2026" (en) or
// "1 Qershor 2026" (sq). Parsed manually to avoid UTC timezone roll-over.
function formatLongDate(iso, language) {
  if (!iso) return '-'
  const [year, month, day] = iso.split('-').map(Number)
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return iso

  if (language === 'sq') {
    const months = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
    return `${day} ${months[month - 1]} ${year}`
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const suffix = day >= 11 && day <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th'
  return `${day}${suffix} ${months[month - 1]} ${year}`
}

function buildDateOptions(copy, language) {
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    const iso = toISODate(date)
    const sqWeekdays = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht']
    const sqMonths = ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gush', 'sht', 'tet', 'nën', 'dhj']

    return {
      iso,
      dayOfWeek: date.getDay(),
      weekday:
        language === 'sq'
          ? sqWeekdays[date.getDay()]
          : date.toLocaleDateString(copy.locale, { weekday: 'short' }),
      day:
        language === 'sq'
          ? `${date.getDate()} ${sqMonths[date.getMonth()]}`
          : date.toLocaleDateString(copy.locale, { day: 'numeric', month: 'short' }),
      isToday: index === 0
    }
  })
}

function StepHeader({ number, eyebrow, title, required, locked = false }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-gold)] font-display">
          {number}. {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-lg font-bold tracking-wider text-white">{title}</h2>
      </div>
      <span
        className={`shrink-0 rounded-md px-2.5 py-0.5 text-[10px] font-bold font-display uppercase tracking-wider border ${
          locked 
            ? 'border-white/5 bg-white/5 text-[var(--text-muted)]' 
            : 'border-[var(--border-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)]'
        }`}
      >
        {required}
      </span>
    </div>
  )
}

export function BookingPage({ language = 'sq' }) {
  const copy = COPY[language] || COPY.sq
  const [services, setServices] = useState([])
  const [barberServices, setBarberServices] = useState([])
  const [barberSchedule, setBarberSchedule] = useState([])
  const [schedules, setSchedules] = useState([])
  const [appointments, setAppointments] = useState([])
  const [serviceId, setServiceId] = useState('')
  const [barberId, setBarberId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  useEffect(() => {
    async function loadCatalog() {
      const [{ data: serviceRows }, { data: assignmentRows }] = await Promise.all([
        supabase
          .from('services')
          .select('id, name, duration_minutes, price')
          .eq('active', true)
          .order('name'),
        supabase
          .from('barber_services')
          .select('barber_id, service_id, barber:profiles(id, full_name)')
      ])

      setServices(serviceRows || [])
      setBarberServices(assignmentRows || [])
      if (serviceRows?.[0]) setServiceId(serviceRows[0].id)
    }

    loadCatalog()
  }, [])

  const selectedService = services.find((service) => service.id === serviceId)

  const eligibleBarbers = useMemo(() => {
    const seen = new Set()
    return barberServices
      .filter((item) => item.service_id === serviceId && item.barber)
      .filter((item) => {
        if (seen.has(item.barber_id)) return false
        seen.add(item.barber_id)
        return true
      })
      .map((item) => item.barber)
  }, [barberServices, serviceId])

  const selectedBarber = eligibleBarbers.find((barber) => barber.id === barberId)

  useEffect(() => {
    if (!barberId) return
    const stillEligible = eligibleBarbers.some((barber) => barber.id === barberId)
    if (!stillEligible) {
      setBarberId('')
      setSelectedSlot(null)
    }
  }, [barberId, eligibleBarbers])

  useEffect(() => {
    if (!barberId) {
      setBarberSchedule([])
      setSchedules([])
      setAppointments([])
      return
    }

    async function loadSchedule() {
      const { data } = await supabase
        .from('schedules')
        .select('id, day_of_week, start_time, end_time')
        .eq('barber_id', barberId)

      setBarberSchedule(data || [])
    }

    loadSchedule()
  }, [barberId])

  const loadSlotsContext = useCallback(async () => {
    if (!barberId || !date) return

    const [{ data: scheduleRows }, { data: bookedRows }] = await Promise.all([
      supabase
        .from('schedules')
        .select('id, start_time, end_time')
        .eq('barber_id', barberId)
        .eq('day_of_week', dayOfWeek(date)),
      supabase
        .from('appointments')
        .select('id, start_time, end_time, status, appointment_date')
        .eq('barber_id', barberId)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed', 'walk_in', 'completed'])
    ])

    setSchedules(scheduleRows || [])
    setAppointments(bookedRows || [])
  }, [barberId, date])

  useEffect(() => {
    loadSlotsContext()
    setSelectedSlot(null)
  }, [loadSlotsContext])

  useAppointmentsRealtime({
    barberId,
    appointmentDate: date,
    onChange: loadSlotsContext
  })

  const minimumStart = useMemo(() => {
    if (date !== todayISO()) return '10:00'
    const now = new Date()
    return toTime(Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30)
  }, [date])

  const availableSlots = useMemo(
    () =>
      buildAvailableSlots({
        schedules,
        appointments,
        serviceDuration: selectedService?.duration_minutes,
        minimumStart
      }),
    [appointments, minimumStart, schedules, selectedService]
  )

  const openWeekdays = useMemo(
    () => new Set(barberSchedule.map((schedule) => schedule.day_of_week)),
    [barberSchedule]
  )
  const dateOptions = useMemo(() => buildDateOptions(copy, language), [copy, language])

  const nextStep = useMemo(() => {
    if (!selectedService) return copy.next.service
    if (!selectedBarber) return copy.next.barber
    if (!date) return copy.next.date
    if (!selectedSlot) return copy.next.time
    if (!form.firstName || !form.lastName || !form.phone) return copy.next.details
    return copy.next.confirm
  }, [copy, date, form.firstName, form.lastName, form.phone, selectedBarber, selectedService, selectedSlot])

  // Get initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  async function bookAppointment(event) {
    event.preventDefault()
    if (!selectedSlot || !selectedService || !selectedBarber) return

    setLoading(true)
    setStatus('')
    const { error } = await supabase.rpc('book_client_appointment', {
      p_barber_id: barberId,
      p_service_id: serviceId,
      p_appointment_date: date,
      p_start_time: selectedSlot.start,
      p_full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      p_phone: form.phone.trim()
    })

    setLoading(false)
    if (error) {
      // The server rejects clashes with an English message. Re-fetch the latest
      // bookings, find the slot that overlaps the chosen service window, and
      // explain the conflict in the active language (with the duration + the
      // time that is taken).
      const duration = selectedService.duration_minutes
      const { data: latest } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('barber_id', barberId)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed', 'walk_in', 'completed'])

      const startMin = toMinutes(selectedSlot.start)
      const endMin = startMin + duration
      const conflicts = (latest || [])
        .filter((appt) =>
          intervalsOverlap(startMin, endMin, toMinutes(appt.start_time), toMinutes(appt.end_time))
        )
        .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
      // Prefer the first booking that starts inside the chosen service window
      // (e.g. 11:30 when booking 11:00 for 60 min) — that is the slot the
      // customer sees as taken — rather than an earlier booking spilling in.
      const clash =
        conflicts.find((appt) => toMinutes(appt.start_time) >= startMin) || conflicts[0]

      const message = clash
        ? copy.conflictWithSlot
            .replace('{duration}', duration)
            .replace('{time}', toTime(toMinutes(clash.start_time)))
        : copy.conflictGeneric.replace('{duration}', duration)

      setStatus(message)
      loadSlotsContext()
      return
    }

    setStatus('')
    setConfirmation({
      service: selectedService.name,
      barber: selectedBarber.full_name,
      date,
      time: selectedSlot.start,
      duration: selectedService.duration_minutes,
      price: selectedService.price,
      customer: `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
    })
    setForm({ firstName: '', lastName: '', phone: '' })
    setSelectedSlot(null)
    loadSlotsContext()
  }

  return (
    <div className="min-h-screen bg-[#0a0805] text-[#f5f3ef]">
      
      {/* Mini Hero Banner */}
      <div className="border-b border-white/5 bg-[#0f0d0a]/60 py-8">
        <div className="mx-auto max-w-7xl px-4 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase block mb-1">
              {copy.heroEyebrow}
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-wider text-white">
              {language === 'sq' ? 'APLIKIMI I REZERVIMIT' : 'ONLINE BOOKING SYSTEM'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-lg border border-[var(--border-gold)] bg-[var(--accent-gold-muted)] px-3 py-1 text-xs font-bold text-[var(--accent-gold)] font-display uppercase tracking-wider">
              <span className="pulse-badge" />
              {copy.liveBadge}
            </span>
            <span className="rounded-lg border border-white/5 bg-white/5 px-3 py-1 text-xs font-bold text-[var(--text-secondary)] font-display uppercase tracking-wider">
              {copy.noLogin}
            </span>
          </div>
        </div>
      </div>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        
        {/* Reservation Wizard Steps */}
        <div className="flex flex-col gap-6">
          
          {/* Step Indicators (Progress Bar) */}
          <div id="booking" className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {copy.stepLabels.map((label, index) => {
              // Highlight based on progress
              let isActive = false
              if (index === 0) isActive = true // Service always accessible
              if (index === 1 && selectedService) isActive = true
              if (index === 2 && selectedBarber) isActive = true
              if (index === 3 && date && selectedBarber) isActive = true
              if (index === 4 && selectedSlot) isActive = true

              return (
                <span
                  key={label}
                  className={`shrink-0 rounded-lg border px-3.5 py-2 text-xs font-bold font-display uppercase tracking-wider transition-all ${
                    isActive
                      ? 'border-[var(--accent-gold)] bg-[#191612] text-[var(--accent-gold)]'
                      : 'border-white/5 bg-[#0f0d0a]/50 text-[var(--text-muted)]'
                  }`}
                >
                  {index + 1}. {label}
                </span>
              )
            })}
          </div>

          <div className="grid gap-6">
            
            {/* Step 1: Select Service */}
            <BookingPanel>
              <StepHeader
                number={1}
                eyebrow={copy.service}
                title={copy.chooseService}
                required={copy.required}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((service) => {
                  const isSelected = serviceId === service.id
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setServiceId(service.id)
                        setSelectedSlot(null)
                      }}
                      className={`flex min-h-[90px] items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-white'
                          : 'border-white/5 bg-[#12100d]/80 text-[var(--text-secondary)] hover:border-white/10 hover:bg-[#12100d]'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-base font-bold uppercase tracking-wider text-white">{translateService(service.name, language)}</span>
                        <span className="mt-1 block text-xs text-[var(--text-secondary)] font-medium">
                          {service.duration_minutes} {copy.duration}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-md border border-[var(--border-gold)] bg-[#0a0805]/90 px-3 py-1.5 text-xs font-bold font-display text-[var(--accent-gold)] tracking-wide">
                        {formatEuro(service.price)}
                      </span>
                    </button>
                  )
                })}
              </div>
              {!services.length && <EmptyMessage>{copy.servicesEmpty}</EmptyMessage>}
            </BookingPanel>

            {/* Step 2: Select Barber */}
            <BookingPanel>
              <StepHeader
                number={2}
                eyebrow={copy.barber}
                title={copy.chooseBarber}
                required={copy.required}
                locked={!selectedService}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {eligibleBarbers.map((barber) => {
                  const isSelected = barberId === barber.id
                  return (
                    <button
                      key={barber.id}
                      type="button"
                      onClick={() => {
                        setBarberId(barber.id)
                        setSelectedSlot(null)
                      }}
                      className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.98] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)]'
                          : 'border-white/5 bg-[#12100d]/80 text-[var(--text-secondary)] hover:border-white/10 hover:bg-[#12100d]'
                      }`}
                      disabled={!selectedService}
                    >
                      <div className={`h-11 w-11 rounded-lg font-display text-sm font-bold flex items-center justify-center border transition-all ${
                        isSelected 
                          ? 'bg-[var(--accent-gold)] text-[#0a0805] border-[var(--accent-gold)]' 
                          : 'bg-white/5 text-[var(--accent-gold)] border-white/5'
                      }`}>
                        {getInitials(barber.full_name)}
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-base font-bold uppercase tracking-wider text-white">{barber.full_name}</span>
                        <span className="text-xs text-[var(--text-muted)] font-medium">
                          {copy.barberRole}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {selectedService && !eligibleBarbers.length && <EmptyMessage>{copy.noBarbers}</EmptyMessage>}
            </BookingPanel>

            {/* Step 3: Select Date */}
            <BookingPanel>
              <StepHeader
                number={3}
                eyebrow={copy.date}
                title={copy.chooseDate}
                required={copy.required}
                locked={!selectedBarber}
              />
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {dateOptions.map((option) => {
                  const closed = selectedBarber && !openWeekdays.has(option.dayOfWeek)
                  const isSelected = date === option.iso
                  return (
                    <button
                      key={option.iso}
                      type="button"
                      disabled={!selectedBarber || closed}
                      onClick={() => {
                        setDate(option.iso)
                        setSelectedSlot(null)
                      }}
                      className={`min-w-[95px] rounded-xl border p-3.5 text-left transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-20 ${
                        isSelected
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-muted)] text-white'
                          : 'border-white/5 bg-[#12100d]/80 text-[var(--text-secondary)] hover:border-white/10 hover:bg-[#12100d]'
                      }`}
                    >
                      <span className="block text-[10px] font-bold font-display uppercase tracking-widest text-[var(--text-muted)]">
                        {option.isToday ? copy.today : option.weekday}
                      </span>
                      <span className="mt-1 block font-display text-base font-bold tracking-wider text-white">{option.day}</span>
                      {closed && (
                        <span className="mt-1 block text-[10px] font-bold font-display uppercase tracking-wider text-red-400">
                          {copy.closed}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </BookingPanel>

            {/* Step 4: Available Times */}
            <BookingPanel>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-gold)] font-display">
                    4. {copy.time}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-bold tracking-wider text-white">
                    {copy.availableTimes}
                  </h2>
                </div>
                <span className="flex items-center gap-1 rounded-md border border-[var(--border-gold)] bg-[var(--accent-gold-muted)] px-2.5 py-0.5 text-[10px] font-bold font-display uppercase tracking-wider text-[var(--accent-gold)]">
                  <span className="pulse-badge" />
                  {copy.liveBadge}
                </span>
              </div>

              {!selectedBarber && <EmptyMessage>{copy.chooseBarberFirst}</EmptyMessage>}

              {selectedBarber && (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start
                    return (
                      <button
                        key={`${slot.start}-${slot.end}`}
                        type="button"
                        disabled={slot.reserved}
                        title={slot.reserved ? copy.reserved : undefined}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-xl border py-3.5 text-center font-display text-sm font-bold tracking-wider transition-all active:scale-[0.98] ${
                          slot.reserved
                            ? 'cursor-not-allowed border-white/5 bg-[#0a0805]/60 text-[var(--text-muted)] line-through opacity-50'
                            : isSelected
                            ? 'cursor-pointer border-[var(--accent-gold)] bg-[var(--accent-gold)] text-[#0a0805]'
                            : 'cursor-pointer border-white/5 bg-[#12100d]/80 text-white hover:border-white/10 hover:bg-[#12100d]'
                        }`}
                      >
                        {slot.start}
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedBarber && !availableSlots.length && <EmptyMessage>{copy.noSlots}</EmptyMessage>}
            </BookingPanel>

            {/* Step 5: Customer Form */}
            <BookingPanel>
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-gold)] font-display">
                  5. {copy.stepLabels[4]}
                </p>
                <h2 className="mt-1 font-display text-lg font-bold tracking-wider text-white">
                  {copy.customerDetails}
                </h2>
              </div>

              <form onSubmit={bookAppointment} className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    icon={<UserRound size={16} className="text-[var(--accent-gold)]" />}
                    required
                    disabled={!selectedSlot}
                    value={form.firstName}
                    onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                    placeholder={copy.firstName}
                  />
                  <InputField
                    icon={<UserRound size={16} className="text-[var(--accent-gold)]" />}
                    required
                    disabled={!selectedSlot}
                    value={form.lastName}
                    onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                    placeholder={copy.lastName}
                  />
                </div>
                <InputField
                  icon={<Phone size={16} className="text-[var(--accent-gold)]" />}
                  required
                  type="tel"
                  inputMode="numeric"
                  disabled={!selectedSlot}
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value.replace(/[^0-9+\s]/g, '') })
                  }
                  placeholder={copy.phone}
                />
                
                <button
                  disabled={loading || !selectedSlot}
                  className="btn-gold w-full mt-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={18} />
                  {loading ? copy.confirming : copy.confirm}
                </button>
              </form>
            </BookingPanel>

          </div>
        </div>

        {/* Floating / Sticky Booking Summary Sidebar */}
        <aside className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-md rounded-2xl border border-white/5 bg-[#0f0d0a]/95 p-5 shadow-2xl backdrop-blur-md safe-bottom lg:sticky lg:top-24 lg:bottom-auto lg:mx-0 lg:max-w-none lg:self-start lg:translate-x-4 lg:bg-[#12100d]/80 lg:shadow-sm xl:translate-x-6">
          <div className="mb-4 flex items-center justify-between gap-3 pb-3 border-b border-white/5">
            <h2 className="font-display text-lg font-bold tracking-wider text-white uppercase">{copy.summary}</h2>
            <span className="rounded-md border border-[var(--border-gold)] bg-[var(--accent-gold-muted)] px-2.5 py-0.5 text-[10px] font-bold font-display uppercase tracking-wider text-[var(--accent-gold)]">
              {copy.cashBadge}
            </span>
          </div>
          
          <div className="grid gap-3.5 text-xs text-[var(--text-secondary)]">
            <SummaryRow icon={<Scissors size={14} className="text-[var(--accent-gold)]" />} label={copy.service} value={selectedService ? translateService(selectedService.name, language) : '-'} />
            <SummaryRow icon={<UserRound size={14} className="text-[var(--accent-gold)]" />} label={copy.barber} value={selectedBarber?.full_name || '-'} />
            <SummaryRow icon={<CalendarDays size={14} className="text-[var(--accent-gold)]" />} label={copy.date} value={date || '-'} />
            <SummaryRow icon={<Clock3 size={14} className="text-[var(--accent-gold)]" />} label={copy.time} value={selectedSlot?.start || '-'} />
            
            <div className="border-t border-white/5 pt-3.5 mt-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-white uppercase tracking-wider">{copy.total}</span>
                <span className="text-xl font-bold font-display text-[var(--accent-gold)]">
                  {selectedService ? formatEuro(selectedService.price) : '-'}
                </span>
              </div>
              {selectedService && (
                <p className="mt-1 text-[10px] text-[var(--text-muted)] font-medium">
                  {selectedService.duration_minutes} {copy.duration} — {copy.paidInPerson} ({copy.cash})
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-5 flex items-center justify-between rounded-lg bg-white/5 border border-white/5 px-4 py-3 text-white">
            <span className="text-[10px] font-bold font-display tracking-widest text-[var(--text-muted)] uppercase">{copy.nextStep}</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold font-display text-[var(--accent-gold)] uppercase tracking-wider">
              {nextStep} <ChevronRight size={14} />
            </span>
          </div>
        </aside>
      </section>

      {/* Info Sections */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-32 md:px-8 lg:pb-16 mt-8">
        <div className="mb-6">
          <span className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase block mb-1">
            Barber Studio
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            {copy.sections.standardsTitle}
          </h2>
          <div className="h-0.5 w-12 bg-[var(--accent-gold)] mt-2" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {copy.sections.standards.map(([title, text], index) => (
            <article key={title} className="premium-card p-5">
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-[var(--border-gold)] bg-white/5 text-[var(--accent-gold)]">
                {index === 0 && <Clock3 size={18} />}
                {index === 1 && <Star size={18} />}
                {index === 2 && <Wallet size={18} />}
              </span>
              <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">{title}</h3>
              <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="premium-card p-5">
            <h2 className="font-display text-lg font-bold tracking-wider text-white uppercase">{copy.sections.visitTitle}</h2>
            <div className="mt-4 grid gap-3">
              {copy.sections.visitItems.map((item) => (
                <p key={item} className="flex gap-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#0f766e]" size={15} />
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </section>

          <section className="premium-card-gold p-5 text-white flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-gold)] bg-white/5 text-[var(--accent-gold)] mb-4">
                <MapPin size={18} />
              </div>
              <h2 className="font-display text-lg font-bold tracking-wider uppercase mb-3">{copy.sections.shopTitle}</h2>
              <div className="grid gap-2">
                {copy.sections.shopLines.map((line) => (
                  <p key={line} className="rounded-lg bg-[#0a0805]/40 border border-white/5 px-3.5 py-2 text-xs font-bold font-display uppercase tracking-wider text-[var(--accent-gold)]">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Floating Error Notification */}
      {status && (
        <div className="fixed top-4 inset-x-4 z-[60] mx-auto max-w-md rounded-xl border border-red-500/30 bg-[#12100d]/95 backdrop-blur-md px-5 py-4 shadow-2xl animate-fade-in sm:inset-x-auto sm:right-4 sm:top-6 sm:mx-0 sm:max-w-sm">
          <p className="text-xs font-bold text-center text-red-300 tracking-wide sm:text-left">
            {status}
          </p>
        </div>
      )}

      {/* Success Confirmation Modal */}
      {confirmation && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0a0805]/85 backdrop-blur-sm px-3 sm:items-center animate-fade-in"
          onClick={() => setConfirmation(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border border-[var(--border-gold)] bg-[#12100d] p-6 shadow-2xl safe-bottom sm:rounded-2xl relative overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[var(--accent-gold)]/10 blur-2xl pointer-events-none" />

            <button
              type="button"
              onClick={() => setConfirmation(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
              aria-label={copy.close}
            >
              <X size={16} />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)]">
              <CheckCircle2 size={32} />
            </div>

            <h2 className="text-center font-display text-2xl font-extrabold uppercase tracking-wider text-white">
              {copy.successTitle}
            </h2>
            <p className="mt-2 text-center text-xs text-[var(--text-secondary)] leading-relaxed">
              {copy.successText}
            </p>

            <div className="mt-6 grid gap-3 rounded-xl border border-white/5 bg-[#0a0805]/50 p-4 text-xs">
              <SummaryRow icon={<UserRound size={14} className="text-[var(--accent-gold)]" />} label={copy.clientLabel} value={confirmation.customer} />
              <SummaryRow icon={<Scissors size={14} className="text-[var(--accent-gold)]" />} label={copy.service} value={translateService(confirmation.service, language)} />
              <SummaryRow icon={<UserRound size={14} className="text-[var(--accent-gold)]" />} label={copy.barber} value={confirmation.barber} />
              <SummaryRow icon={<CalendarDays size={14} className="text-[var(--accent-gold)]" />} label={copy.date} value={formatLongDate(confirmation.date, language)} />
              <SummaryRow icon={<Clock3 size={14} className="text-[var(--accent-gold)]" />} label={copy.time} value={confirmation.time} />
              <SummaryRow icon={<Sparkles size={14} className="text-[var(--accent-gold)]" />} label={copy.durationLabel} value={`${confirmation.duration} ${copy.duration}`} />
              <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                <span className="font-bold uppercase tracking-wider text-white">{copy.total}</span>
                <span className="font-display text-lg font-bold text-[var(--accent-gold)]">{formatEuro(confirmation.price)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmation(null)}
              className="btn-gold w-full mt-6 cursor-pointer"
            >
              {copy.bookAnother}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingPanel({ children }) {
  return (
    <section className="premium-card p-5">
      {children}
    </section>
  )
}

function EmptyMessage({ children }) {
  return (
    <p className="rounded-lg border border-white/5 bg-white/5 px-4 py-3 text-xs text-[var(--text-muted)] font-medium">
      {children}
    </p>
  )
}

function InputField({ icon, ...props }) {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute left-3 top-3 text-[var(--text-muted)]">{icon}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-white/5 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:bg-white/10 transition-all disabled:opacity-20"
      />
    </label>
  )
}

function SummaryRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {icon}
        {label}
      </span>
      <span className="max-w-[150px] truncate text-right font-display text-sm font-bold text-white tracking-wider">{value}</span>
    </div>
  )
}
