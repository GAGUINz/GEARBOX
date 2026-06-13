'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login, signup } from './actions'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    
    let result
    if (isLogin) {
      result = await login(formData)
    } else {
      result = await signup(formData)
    }

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md bg-slate-900/60 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
          </h1>
          <p className="text-slate-400">
            {isLogin ? 'Acesse o seu painel de cliente' : 'Comece a acumular lavagens grátis'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
                <input name="full_name" required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all" placeholder="Seu nome" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">WhatsApp</label>
                <input name="whatsapp" required type="tel" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all" placeholder="(49) 99825-1262" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
            <input name="email" required type="email" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all" placeholder="seu@email.com" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
            <input name="password" required type="password" minLength={6} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all" placeholder="******" />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl px-4 py-3.5 hover:from-orange-500 hover:to-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all disabled:opacity-70 mt-4"
          >
            {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
            }}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça Login'}
          </button>
        </div>
        
        <div className="mt-8 text-center border-t border-slate-800 pt-6">
          <Link href="/" className="text-orange-500 hover:text-orange-400 text-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  )
}
