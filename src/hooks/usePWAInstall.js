import { useCallback, useEffect, useMemo, useState } from 'react'

function isStandaloneMode() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// iOS (including iPadOS, which reports as "Macintosh" but is touch-capable)
// does not support `beforeinstallprompt`. Installing is manual via the Share
// sheet, so we detect it to show instructions instead of a native prompt.
function detectIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isAppleTouch = /iphone|ipad|ipod/i.test(ua)
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return isAppleTouch || isIPadOS
}

export function usePWAInstall() {
  // Seed from the prompt captured in index.html before React mounted.
  const [installPrompt, setInstallPrompt] = useState(() =>
    typeof window === 'undefined' ? null : window.deferredInstallPrompt || null
  )
  const [isInstalled, setIsInstalled] = useState(() =>
    typeof window === 'undefined' ? false : isStandaloneMode()
  )
  const [choice, setChoice] = useState(null)
  const isIOS = useMemo(() => detectIOS(), [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      window.deferredInstallPrompt = null
      setChoice('accepted')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const installApp = useCallback(async () => {
    // iOS has no programmatic prompt — the button shows manual instructions.
    if (!installPrompt) return { outcome: isIOS ? 'ios-instructions' : 'unavailable' }

    await installPrompt.prompt()
    const result = await installPrompt.userChoice
    setChoice(result.outcome)
    setInstallPrompt(null)
    window.deferredInstallPrompt = null
    return result
  }, [installPrompt, isIOS])

  return useMemo(
    () => ({
      // On iOS the native event never fires, so allow the button to appear
      // (when not already installed) to surface Add-to-Home-Screen guidance.
      canInstall: (Boolean(installPrompt) || isIOS) && !isInstalled,
      isInstalled,
      isIOS,
      choice,
      installApp
    }),
    [choice, installApp, installPrompt, isInstalled, isIOS]
  )
}
