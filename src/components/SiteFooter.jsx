import { Scissors, Phone, MapPin, Instagram, Clock } from 'lucide-react'

export function SiteFooter({ language, canAccessBarberArea, canAccessAdminArea }) {
  const navigate = (to, e) => {
    if (e) e.preventDefault()
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Translations
  const t = {
    tagline: language === 'sq' ? 'Kujdes premium dhe stil pa kompromis.' : 'Premium care and style without compromise.',
    hours: language === 'sq' ? 'Orari' : 'Working Hours',
    weekdays: language === 'sq' ? 'E Hënë - E Shtunë' : 'Monday - Saturday',
    sunday: language === 'sq' ? 'E Diel: MBYLLUR' : 'Sunday: CLOSED',
    contact: language === 'sq' ? 'Na Gjeni' : 'Contact Us',
    links: language === 'sq' ? 'Lidhje të Shpejta' : 'Quick Links',
    home: language === 'sq' ? 'Kreu' : 'Home',
    booking: language === 'sq' ? 'Rezervo Tani' : 'Book Now',
    barberArea: language === 'sq' ? 'Zona Barber' : 'Barber Area',
    adminArea: language === 'sq' ? 'Admin' : 'Admin',
  }

  return (
    <footer className="border-t border-white/5 bg-[#0a0805] text-[var(--text-secondary)]">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          
          {/* Brand Info */}
          <div className="flex flex-col gap-4">
            <a 
              href="/home" 
              onClick={(e) => navigate('/home', e)} 
              className="flex items-center gap-3 w-fit active:scale-98 transition-transform group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-gold)] bg-white/5 text-[var(--accent-gold)]">
                <Scissors size={18} className="rotate-90" />
              </div>
              <h2 className="font-display text-lg font-bold tracking-widest text-[#f5f3ef]">
                SuLoCut
              </h2>
            </a>
            <p className="text-xs max-w-xs leading-relaxed">
              {t.tagline}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <a
                href="https://www.instagram.com/brotherscutss/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/5 bg-white/5 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-[#0a0805] transition-all"
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-bold text-[#f5f3ef] tracking-widest uppercase">
              {t.links}
            </h3>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <a
                  href="/home"
                  onClick={(e) => navigate('/home', e)}
                  className="hover:text-[var(--accent-gold)] transition-colors"
                >
                  {t.home}
                </a>
              </li>
              <li>
                <a
                  href="/booking"
                  onClick={(e) => navigate('/booking', e)}
                  className="hover:text-[var(--accent-gold)] transition-colors"
                >
                  {t.booking}
                </a>
              </li>
              {canAccessBarberArea && (
                <li>
                  <a
                    href="/barber"
                    onClick={(e) => navigate('/barber', e)}
                    className="hover:text-[var(--accent-gold)] transition-colors"
                  >
                    {t.barberArea}
                  </a>
                </li>
              )}
              {canAccessAdminArea && (
                <li>
                  <a
                    href="/admin"
                    onClick={(e) => navigate('/admin', e)}
                    className="hover:text-[var(--accent-gold)] transition-colors"
                  >
                    {t.adminArea}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Working Hours */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-bold text-[#f5f3ef] tracking-widest uppercase flex items-center gap-2">
              <Clock size={15} className="text-[var(--accent-gold)]" />
              {t.hours}
            </h3>
            <div className="flex flex-col gap-1 text-xs">
              <p className="font-semibold text-[#f5f3ef]">{t.weekdays}</p>
              <p className="text-[var(--accent-gold)] font-medium">10:00 - 21:00</p>
              <p className="mt-1 text-red-400 font-semibold">{t.sunday}</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-bold text-[#f5f3ef] tracking-widest uppercase flex items-center gap-2">
              <MapPin size={15} className="text-[var(--accent-gold)]" />
              {t.contact}
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <a
                href="https://maps.google.com/?q=Rruga+Xhemail+Mustafa,+Fushe+Kosove"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--accent-gold)] transition-colors leading-relaxed flex items-start gap-1"
              >
                <span>Rruga Xhemail Mustafa,<br />Fushe Kosove</span>
              </a>
              <div className="flex flex-col gap-1.5 text-xs text-[#f5f3ef]">
                <a href="tel:+38345990079" className="flex items-center gap-2 hover:text-[var(--accent-gold)] transition-colors">
                  <Phone size={13} className="text-[var(--accent-gold)]" />
                  <span>+383 45 990 079</span>
                </a>
                <a href="tel:+38345990003" className="flex items-center gap-2 hover:text-[var(--accent-gold)] transition-colors">
                  <Phone size={13} className="text-[var(--accent-gold)]" />
                  <span>+383 45 990 003</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Copyright Strip */}
        <div className="mt-12 border-t border-white/5 pt-8 text-center text-[10px] uppercase tracking-wider text-[var(--text-muted)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} SuLoCut. ALL RIGHTS RESERVED.</p>
          <p className="hover:text-[var(--accent-gold)] transition-colors">DESIGNED & DEVELOPED FOR THE ULTIMATE CUT</p>
        </div>
      </div>
    </footer>
  )
}
