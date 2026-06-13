"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function BackButton() {
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsNavigating(true)
    
    // We navigate using router.push, the overlay will stay until the new page mounts
    router.push('/')
    
    // Fallback if router.push is fast but assets take a moment
    setTimeout(() => {
      window.location.href = '/'
    }, 1500)
  }

  return (
    <>
      {isNavigating && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-800 border-t-orange-500 rounded-full animate-spin"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500">
              <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 tracking-widest uppercase animate-pulse">
            Retornando à Loja
          </h2>
          <p className="text-slate-500 mt-2 text-sm">Fechando os cofres...</p>
        </div>
      )}
      <a href="/" onClick={handleBack} className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all cursor-pointer" title="Voltar para a Loja">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      </a>
    </>
  )
}
