import React, { useEffect, useState } from 'react'
import { Download, X, Share, PlusSquare } from 'lucide-react'

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export default function InstallApp() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    const before = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const done = () => {
      setInstalled(true)
      setPrompt(null)
      setShowIOS(false)
    }

    window.addEventListener('beforeinstallprompt', before)
    window.addEventListener('appinstalled', done)

    const media = window.matchMedia?.('(display-mode: standalone)')
    const mediaHandler = (e) => e.matches && done()
    media?.addEventListener?.('change', mediaHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', before)
      window.removeEventListener('appinstalled', done)
      media?.removeEventListener?.('change', mediaHandler)
    }
  }, [])

  if (installed) return null

  async function instalar() {
    if (prompt) {
      await prompt.prompt()
      const result = await prompt.userChoice
      if (result?.outcome === 'accepted') setPrompt(null)
      return
    }
    if (isIOS()) {
      setShowIOS(true)
      return
    }
    alert('A instalação ainda não está disponível neste navegador. Use Chrome ou Edge e aguarde alguns segundos após abrir o aplicativo.')
  }

  // Em navegadores Chromium aparece quando o evento estiver pronto.
  // No iOS mantemos visível para orientar "Adicionar à Tela de Início".
  if (!prompt && !isIOS()) return null

  return <>
    <button className="installBtn" onClick={instalar}>
      <Download size={16}/> Instalar aplicativo
    </button>

    {showIOS && (
      <div className="modalBackdrop">
        <div className="installModal">
          <div className="modalHead">
            <div>
              <span className="eyebrow">FORTAL TECH</span>
              <h2>Instalar no iPhone/iPad</h2>
            </div>
            <button className="iconBtn" onClick={()=>setShowIOS(false)}><X/></button>
          </div>
          <div className="iosSteps">
            <p><Share size={18}/> Toque no botão <b>Compartilhar</b> do Safari.</p>
            <p><PlusSquare size={18}/> Escolha <b>Adicionar à Tela de Início</b>.</p>
            <p>Confirme em <b>Adicionar</b>. Depois abra a FORTAL TECH pelo novo ícone.</p>
          </div>
        </div>
      </div>
    )}
  </>
}
