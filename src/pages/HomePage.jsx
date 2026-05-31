import { useEffect, useState } from 'react'
import { Scissors, Calendar, MapPin, Phone, Clock, Instagram, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function HomePage({ language }) {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)

  const navigate = (to, e) => {
    if (e) e.preventDefault()
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  useEffect(() => {
    async function loadBarbers() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('role', 'barber')
        if (error) throw error
        setBarbers(data || [])
      } catch (err) {
        console.error('Failed to load barbers for homepage:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBarbers()
  }, [])

  // Translations
  const t = {
    heroEyebrow: language === 'sq' ? 'Kujdes premium për flokët tuaj' : 'Premium hair care for gentlemen',
    heroTitle1: language === 'sq' ? 'STIL, TRADITË' : 'STYLE, TRADITION',
    heroTitle2: language === 'sq' ? '& DISIPLINË.' : '& DISCIPLINE.',
    heroText: language === 'sq' 
      ? 'Prerje flokësh dhe kujdes për mjekrën në nivelin më të lartë në Fushë Kosovë. Eksperiencë premium pa pritje të gjata.' 
      : 'Top-tier haircuts and beard grooming in Fushe Kosove. A premium experience without the long waiting times.',
    ctaBook: language === 'sq' ? 'Rezervo Tani' : 'Book Your Cut',
    ctaContact: language === 'sq' ? 'Orari & Kontakti' : 'Hours & Contact',
    philosophyTitle: language === 'sq' ? 'Filozofia Jonë' : 'Our Philosophy',
    philosophyText: language === 'sq'
      ? 'Disiplinë në proces. Elegancë në rezultat. Ne besojmë se një prerje flokësh nuk është thjesht një shërbim, është një ritual që ngre besimin tuaj.'
      : 'Discipline in the process. Elegance in the result. We believe a haircut is not just a service, but a ritual that elevates your confidence.',
    barbersTitle: language === 'sq' ? 'Berberët Tanë' : 'Meet the Craftsmen',
    barbersEyebrow: language === 'sq' ? 'Mjeshtrat e Prerjes' : 'Masters of the Craft',
    hoursTitle: language === 'sq' ? 'Orari i Punës' : 'Opening Hours',
    visitTitle: language === 'sq' ? 'Na Vizitoni' : 'Where to Find Us',
    phoneCall: language === 'sq' ? 'Telefono' : 'Call Now',
    directions: language === 'sq' ? 'Drejtimet' : 'Directions',
    weekdays: language === 'sq' ? 'E Hënë - E Shtunë' : 'Monday - Saturday',
    sunday: language === 'sq' ? 'E Diel' : 'Sunday',
    closed: language === 'sq' ? 'MBYLLUR' : 'CLOSED',
  }

  // Get initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#0a0805] text-[#f5f3ef]">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 md:px-8 md:py-32 border-b border-white/5">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[var(--accent-gold)]/5 blur-3xl pointer-events-none" />
        
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-gold)] bg-white/5 px-4 py-1.5 text-xs font-bold font-display uppercase tracking-widest text-[var(--accent-gold)] mb-6 animate-fade-in">
            <Sparkles size={12} />
            {t.heroEyebrow}
          </div>
          
          <h2 className="font-display text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl leading-none mb-6">
            <span className="block text-white">{t.heroTitle1}</span>
            <span className="block gold-text-gradient">{t.heroTitle2}</span>
          </h2>
          
          <p className="mx-auto max-w-2xl text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-10">
            {t.heroText}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={(e) => navigate('/booking', e)}
              className="btn-gold w-full sm:w-auto"
            >
              <Calendar size={18} />
              {t.ctaBook}
              <ArrowRight size={16} />
            </button>
            <a
              href="#contact"
              className="btn-outline w-full sm:w-auto text-center justify-center"
            >
              {t.ctaContact}
            </a>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="px-4 py-16 md:px-8 md:py-24 border-b border-white/5 bg-[#0f0d0a]/50">
        <div className="mx-auto max-w-4xl text-center">
          <span className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase block mb-3">
            Rituali
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white mb-6">
            {t.philosophyTitle}
          </h2>
          <div className="h-0.5 w-16 bg-[var(--accent-gold)] mx-auto mb-8" />
          <p className="font-display italic text-lg md:text-2xl font-light text-[var(--text-secondary)] leading-relaxed max-w-3xl mx-auto">
            "{t.philosophyText}"
          </p>
        </div>
      </section>

      {/* Barbers Section */}
      <section className="px-4 py-16 md:px-8 md:py-24 border-b border-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <span className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase block mb-3">
              {t.barbersEyebrow}
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
              {t.barbersTitle}
            </h2>
            <div className="h-0.5 w-16 bg-[var(--accent-gold)] mx-auto mt-4" />
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-gold)] border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {barbers.map((barber) => (
                <div 
                  key={barber.id} 
                  className="premium-card p-6 flex flex-col items-center text-center group cursor-pointer"
                  onClick={(e) => navigate('/booking', e)}
                >
                  <div className="relative mb-6">
                    {/* Circle avatar */}
                    <div className="h-20 w-20 rounded-full border-2 border-[var(--border-gold)] bg-white/5 font-display text-2xl font-bold flex items-center justify-center text-[var(--accent-gold)] group-hover:border-[var(--accent-gold)] group-hover:bg-[var(--accent-gold)] group-hover:text-[#0a0805] transition-all duration-300">
                      {getInitials(barber.full_name)}
                    </div>
                    {/* Live indicator on group hover */}
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#0f766e] text-white border-2 border-[#0a0805]">
                      <Scissors size={10} className="rotate-90" />
                    </div>
                  </div>
                  <h3 className="font-display text-lg font-bold text-white group-hover:text-[var(--accent-gold)] transition-colors">
                    {barber.full_name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mt-1">
                    {language === 'sq' ? 'Berber Profesionist' : 'Professional Barber'}
                  </p>
                  
                  <div className="mt-6 w-full pt-4 border-t border-white/5">
                    <button 
                      className="text-xs font-display tracking-widest text-[var(--accent-gold)] uppercase font-semibold flex items-center justify-center gap-1 mx-auto hover:underline"
                    >
                      {language === 'sq' ? 'Rezervo' : 'Book Now'}
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info & Map Section */}
      <section id="contact" className="px-4 py-16 md:px-8 md:py-24 bg-[#0f0d0a]/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            
            {/* Contact details */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-8">
              <div>
                <span className="font-display text-xs font-bold tracking-widest text-[var(--accent-gold)] uppercase block mb-3">
                  Lokacioni & Kontakti
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white mb-6">
                  {t.visitTitle}
                </h2>
                
                <div className="grid gap-6 mt-8">
                  {/* Address */}
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-[var(--accent-gold)]">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1">Adresa</h4>
                      <p className="text-sm text-[var(--text-secondary)]">Rruga Xhemail Mustafa, Fushë Kosovë</p>
                    </div>
                  </div>

                  {/* Phones */}
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-[var(--accent-gold)]">
                      <Phone size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1">Telefoni</h4>
                      <div className="flex flex-col gap-1 text-sm text-[var(--text-secondary)]">
                        <a href="tel:+38345990079" className="hover:text-[var(--accent-gold)] transition-colors">+383 45 990 079</a>
                        <a href="tel:+38345990003" className="hover:text-[var(--accent-gold)] transition-colors">+383 45 990 003</a>
                      </div>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-[var(--accent-gold)]">
                      <Instagram size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1">Instagram</h4>
                      <a 
                        href="https://www.instagram.com/brotherscutss/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
                      >
                        @brotherscutss
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Hours Card */}
              <div className="premium-card-gold p-6">
                <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-[var(--accent-gold)]" />
                  {t.hoursTitle}
                </h3>
                <div className="flex justify-between items-center text-sm py-2 border-b border-white/5">
                  <span className="text-[var(--text-secondary)]">{t.weekdays}</span>
                  <span className="font-bold text-[var(--accent-gold)]">10:00 - 21:00</span>
                </div>
                <div className="flex justify-between items-center text-sm py-2 text-red-400">
                  <span>{t.sunday}</span>
                  <span className="font-bold uppercase">{t.closed}</span>
                </div>
              </div>
            </div>

            {/* Embed Google Map */}
            <div className="lg:col-span-7 h-[350px] lg:h-auto min-h-[350px] rounded-2xl overflow-hidden border border-white/5 relative bg-[#0f0d0a]">
              {/* Fallback load / decorative map */}
              <iframe
                title="SuLoCut Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2934.8021650393246!2d21.097089476566838!3d42.644402617109594!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x13549effffad7489%3A0xe54e3d36746f34bd!2sRruga%20Xhemail%20Mustafa%2C%20Fush%C3%AB%20Kosov%C3%AB!5e0!3m2!1sen!2s!4v1716982400000!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(1) invert(0.9) contrast(1.2)' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}
