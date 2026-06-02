import { useState } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall'

export function InstallButton() {
  const { canInstall, isIOS, installApp } = usePWAInstall()
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  if (!canInstall) return null

  const handleClick = () => {
    if (isIOS) {
      setShowIOSHelp(true)
      return
    }
    installApp()
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-gold)] bg-white/5 backdrop-blur px-3 py-1.5 text-xs font-bold text-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-[#0a0805] transition-all duration-250 active:scale-95 cursor-pointer font-display uppercase tracking-wider"
      >
        <Download size={14} aria-hidden="true" />
        Install
      </button>

      {/* iOS has no install prompt API — guide the user through the Share sheet. */}
      {showIOSHelp && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0a0805]/85 backdrop-blur-sm px-3 pb-3 sm:items-center sm:pb-0 animate-fade-in"
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            className="gradient-border w-full max-w-sm rounded-2xl border border-[var(--border-gold)] bg-[#12100d] p-6 shadow-2xl safe-bottom relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIOSHelp(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-gold)] bg-[var(--accent-gold-muted)] text-[var(--accent-gold)]">
              <Download size={22} />
            </div>

            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              Instalo aplikacionin
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
              Në iPhone/iPad, shtoje në ekran nga Safari:
            </p>

            <ol className="mt-4 grid gap-3 text-sm text-white">
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--accent-gold)]">
                  <Share size={15} />
                </span>
                <span>Shtyp butonin <span className="font-bold">Share</span> në Safari.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--accent-gold)]">
                  <Plus size={15} />
                </span>
                <span>Zgjidh <span className="font-bold">Add to Home Screen</span>.</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
