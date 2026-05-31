import { useState } from 'react'
import { Scissors, Menu, X, Globe } from 'lucide-react'
import { InstallButton } from './InstallButton'

export function SiteHeader({ currentRoute, language, setLanguage, canAccessBarberArea, canAccessAdminArea }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigate = (to, e) => {
    if (e) e.preventDefault()
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
    setMobileMenuOpen(false)
  }

  const isHome = currentRoute === '/' || currentRoute === '/home'
  const isBooking = currentRoute === '/booking'
  const isBarber = currentRoute === '/barber'
  const isAdmin = currentRoute === '/admin'

  // Translation helpers
  const t = {
    home: language === 'sq' ? 'Kreu' : 'Home',
    booking: language === 'sq' ? 'Rezervo' : 'Book Now',
    barbers: language === 'sq' ? 'Stafi' : 'Barbers',
    contact: language === 'sq' ? 'Kontakt' : 'Contact',
    barberArea: language === 'sq' ? 'Zona Barber' : 'Barber Area',
    adminArea: language === 'sq' ? 'Admin' : 'Admin',
  }

  return (
    <header className="sticky top-0 z-45 w-full border-b border-white/5 bg-[#0a0805]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        {/* Brand Logo */}
        <a 
          href="/home" 
          onClick={(e) => navigate('/home', e)} 
          className="flex items-center gap-3 active:scale-98 transition-transform group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-gold)] bg-white/5 text-[var(--accent-gold)] group-hover:bg-[var(--accent-gold)] group-hover:text-[#0a0805] transition-all duration-300">
            <Scissors size={20} className="rotate-90 group-hover:rotate-180 transition-transform duration-500" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-widest text-[#f5f3ef] group-hover:text-[var(--accent-gold)] transition-colors">
              SuLoCut
            </h1>
            <p className="text-[10px] font-medium tracking-widest text-[var(--text-muted)] uppercase">
              Fushe Kosove
            </p>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="/home"
            onClick={(e) => navigate('/home', e)}
            className={`font-display text-sm tracking-wider transition-colors hover:text-[var(--accent-gold)] ${
              isHome ? 'text-[var(--accent-gold)] border-b border-[var(--accent-gold)] pb-0.5' : 'text-[var(--text-secondary)]'
            }`}
          >
            {t.home}
          </a>
          <a
            href="/booking"
            onClick={(e) => navigate('/booking', e)}
            className={`font-display text-sm tracking-wider transition-colors hover:text-[var(--accent-gold)] ${
              isBooking ? 'text-[var(--accent-gold)] border-b border-[var(--accent-gold)] pb-0.5' : 'text-[var(--text-secondary)]'
            }`}
          >
            {t.booking}
          </a>
          {canAccessBarberArea && (
            <a
              href="/barber"
              onClick={(e) => navigate('/barber', e)}
              className={`font-display text-sm tracking-wider transition-colors hover:text-[var(--accent-gold)] ${
                isBarber ? 'text-[var(--accent-gold)] border-b border-[var(--accent-gold)] pb-0.5' : 'text-[var(--text-secondary)]'
              }`}
            >
              {t.barberArea}
            </a>
          )}
          {canAccessAdminArea && (
            <a
              href="/admin"
              onClick={(e) => navigate('/admin', e)}
              className={`font-display text-sm tracking-wider transition-colors hover:text-[var(--accent-gold)] ${
                isAdmin ? 'text-[var(--accent-gold)] border-b border-[var(--accent-gold)] pb-0.5' : 'text-[var(--text-secondary)]'
              }`}
            >
              {t.adminArea}
            </a>
          )}
        </nav>

        {/* Action Controls (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setLanguage('sq')}
              className={`rounded px-2.5 py-1 text-xs font-bold font-display cursor-pointer transition-all ${
                language === 'sq' ? 'bg-[var(--accent-gold)] text-[#0a0805]' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              AL
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded px-2.5 py-1 text-xs font-bold font-display cursor-pointer transition-all ${
                language === 'en' ? 'bg-[var(--accent-gold)] text-[#0a0805]' : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          <InstallButton />
        </div>

        {/* Mobile Toggle & Setup */}
        <div className="flex items-center gap-3 md:hidden">
          <div className="flex items-center gap-1 rounded-md border border-white/5 bg-white/5 p-0.5">
            <button
              onClick={() => setLanguage(language === 'sq' ? 'en' : 'sq')}
              className="flex items-center justify-center p-1 text-[var(--accent-gold)] text-xs font-bold font-display uppercase"
              aria-label="Toggle language"
            >
              <Globe size={14} className="mr-1" />
              {language === 'sq' ? 'EN' : 'AL'}
            </button>
          </div>

          <InstallButton />

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-[var(--text-primary)] cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0a0805]/98 px-6 py-6 animate-fade-in">
          <nav className="flex flex-col gap-5">
            <a
              href="/home"
              onClick={(e) => navigate('/home', e)}
              className={`font-display text-lg tracking-wider transition-colors ${
                isHome ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-secondary)]'
              }`}
            >
              {t.home}
            </a>
            <a
              href="/booking"
              onClick={(e) => navigate('/booking', e)}
              className={`font-display text-lg tracking-wider transition-colors ${
                isBooking ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-secondary)]'
              }`}
            >
              {t.booking}
            </a>
            {canAccessBarberArea && (
              <a
                href="/barber"
                onClick={(e) => navigate('/barber', e)}
                className={`font-display text-lg tracking-wider transition-colors ${
                  isBarber ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-secondary)]'
                }`}
              >
                {t.barberArea}
              </a>
            )}
            {canAccessAdminArea && (
              <a
                href="/admin"
                onClick={(e) => navigate('/admin', e)}
                className={`font-display text-lg tracking-wider transition-colors ${
                  isAdmin ? 'text-[var(--accent-gold)] font-bold' : 'text-[var(--text-secondary)]'
                }`}
              >
                {t.adminArea}
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
