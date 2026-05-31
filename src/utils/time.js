// Local-calendar date as YYYY-MM-DD (NOT UTC). Using toISOString() here would
// roll over to the next day every evening for UTC+1/+2 timezones like Kosovo.
export function toISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function toMinutes(time) {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

export function toTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60
  ).padStart(2, '0')}`
}

export function dayOfWeek(dateISO) {
  const date = new Date(`${dateISO}T12:00:00`)
  return date.getDay()
}

export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

export function buildAvailableSlots({
  schedules,
  appointments,
  serviceDuration,
  minimumStart = '10:00'
}) {
  if (!serviceDuration) return []

  const booked = appointments
    .filter((item) => ['pending', 'confirmed', 'walk_in', 'completed'].includes(item.status))
    .map((item) => ({
      start: toMinutes(item.start_time),
      end: toMinutes(item.end_time)
    }))

  return schedules.flatMap((schedule) => {
    const dayStart = Math.max(
      toMinutes(schedule.start_time),
      toMinutes('10:00'),
      toMinutes(minimumStart)
    )
    const dayEnd = Math.min(toMinutes(schedule.end_time), toMinutes('21:00'))
    const slots = []

    for (let start = dayStart; start + serviceDuration <= dayEnd; start += 30) {
      const end = start + serviceDuration
      // A slot is reserved only when a booking actually starts at this exact
      // time — not when it merely falls inside a longer booking's window.
      // Otherwise a 60-min booking at 17:00 would also mark 17:30 as reserved.
      // We keep reserved slots in the list so the UI shows them disabled
      // instead of removing them.
      const reserved = booked.some((bookedSlot) => bookedSlot.start === start)
      slots.push({ start: toTime(start), end: toTime(end), reserved })
    }

    return slots
  })
}

export function nextHalfHour() {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.ceil(minutes / 30) * 30
  return toTime(Math.min(Math.max(rounded, toMinutes('10:00')), toMinutes('20:30')))
}
