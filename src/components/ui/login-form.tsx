"use client"

import { useState } from "react"
import Link from "next/link"

interface LoginFormProps {
  isGoldMode: boolean
}

export function LoginForm({ isGoldMode }: LoginFormProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      alert(isRegistering ? "Cadastro simulado com sucesso!" : "Autenticação não conectada ao backend neste demo.")
    }, 1500)
  }

  // Dynamic Styles based on Gold Mode
  const glassBg = isGoldMode ? "rgba(15, 23, 42, 0.6)" : "rgba(15, 23, 42, 0.4)"
  const borderColor = isGoldMode ? "rgba(234, 88, 12, 0.3)" : "rgba(255, 255, 255, 0.1)"
  const boxShadow = isGoldMode ? "0 0 40px rgba(234, 88, 12, 0.1)" : "0 0 20px rgba(0, 0, 0, 0.3)"
  const inputBg = isGoldMode ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.03)"
  const inputBorder = isGoldMode ? "rgba(234, 88, 12, 0.4)" : "rgba(255, 255, 255, 0.1)"
  const inputFocusRing = isGoldMode ? "focus:ring-orange-500 focus:border-orange-500" : "focus:ring-blue-400 focus:border-blue-400"
  
  const submitBtnBg = isGoldMode 
    ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.5)]" 
    : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
    
  const socialBtnHover = isGoldMode ? "hover:border-orange-500/50 hover:bg-orange-500/10" : "hover:border-white/30 hover:bg-white/5"

  return (
    <div 
      className="w-full max-w-md rounded-2xl p-8 backdrop-blur-xl transition-all duration-700"
      style={{
        background: glassBg,
        border: `1px solid ${borderColor}`,
        boxShadow: boxShadow,
      }}
    >
      <div className="text-center mb-8">
        <h2 
          className="text-3xl font-bold mb-2 transition-colors duration-500"
          style={{ color: isGoldMode ? "#fdba74" : "#ffffff" }}
        >
          {isRegistering ? "Crie sua conta" : "Bem-vindo à GEARBOX"}
        </h2>
        <p className="text-slate-400 text-sm">
          {isRegistering 
            ? "Junte-se a nós para ter acesso aos veículos mais exclusivos." 
            : (isGoldMode ? "O sistema está online. Acesse sua conta." : "Identifique-se para ligar o sistema.")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          
          {isRegistering && (
            <div className="transition-all duration-500 opacity-100 transform translate-y-0">
              <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all ${inputFocusRing}`}
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
                placeholder="Ex: João Silva" 
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all ${inputFocusRing}`}
              style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              placeholder="seu@email.com" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-300">Senha</label>
              {!isRegistering && (
                <Link href="#" className={`text-xs hover:underline transition-colors ${isGoldMode ? "text-orange-400" : "text-slate-400"}`}>
                  Esqueceu a senha?
                </Link>
              )}
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 transition-all ${inputFocusRing}`}
              style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              placeholder="••••••••" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className={`w-full font-bold rounded-lg px-4 py-3 transition-all disabled:opacity-70 ${submitBtnBg}`}
        >
          {isLoading ? (isRegistering ? "Cadastrando..." : "Autenticando...") : (isRegistering ? "Criar Conta" : "Entrar")}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t" style={{ borderColor }}></div>
          <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase">Ou continue com</span>
          <div className="flex-grow border-t" style={{ borderColor }}></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button" 
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-transparent bg-slate-900/50 text-white transition-all ${socialBtnHover}`}
            style={{ border: `1px solid ${borderColor}` }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
          <button 
            type="button" 
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-transparent bg-slate-900/50 text-white transition-all ${socialBtnHover}`}
            style={{ border: `1px solid ${borderColor}` }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.74 3.58-.74 2.14.04 3.65.98 4.54 2.45-3.79 2.03-3.08 7.34.61 8.84-1.04 2.82-2.72 5.05-3.81 1.62zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Apple
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-400">
            {isRegistering ? "Já possui conta?" : "Ainda não tem conta?"}{" "}
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className={`font-medium hover:underline transition-colors focus:outline-none ${isGoldMode ? "text-orange-400" : "text-white"}`}
            >
              {isRegistering ? "Fazer Login" : "Cadastre-se"}
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}
