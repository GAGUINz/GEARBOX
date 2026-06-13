"use client"

import { useState, useEffect, useRef, useCallback, useTransition as useReactTransition } from "react"
import { ParticleBackground } from "./particle-background"
import { useTransition } from "./page-transition"
import { createClient } from "@/utils/supabase/client"
import { bookAppointment, cancelAppointment } from "@/app/dashboard/actions"
import { BeforeAfterSlider } from "./before-after-slider"
import { ScrollReveal } from "./scroll-reveal"

// Mock Data for Detailing Services
const SERVICES = [
  {
    id: 1,
    name: "Lavagem Detalhada",
    type: "Estética Básica",
    price: "A partir de R$ 80",
    duration: "1 a 2 horas",
    benefits: "Limpeza profunda com produtos premium e pH neutro para não agredir a pintura.",
    icon: "🧼"
  },
  {
    id: 2,
    name: "Polimento Técnico",
    type: "Correção de Pintura",
    price: "A partir de R$ 350",
    duration: "1 a 2 dias",
    benefits: "Remoção de riscos, hologramas e recuperação do brilho original da fábrica.",
    icon: "✨"
  },
  {
    id: 3,
    name: "Vitrificação (Coating)",
    type: "Proteção Avançada",
    price: "A partir de R$ 800",
    duration: "2 a 3 dias",
    benefits: "Proteção cerâmica 9H contra riscos superficiais, manchas e raios UV por até 3 anos.",
    icon: "🛡️"
  },
  {
    id: 4,
    name: "Higienização Interna",
    type: "Cuidados Internos",
    price: "A partir de R$ 250",
    duration: "4 a 6 horas",
    benefits: "Limpeza profunda de bancos, carpetes e teto. Eliminação total de odores e bactérias.",
    icon: "💺"
  },
  {
    id: 5,
    name: "Revitalização de Faróis",
    type: "Restauração Visual",
    price: "A partir de R$ 120",
    duration: "2 horas",
    benefits: "Remoção do amarelado e aplicação de verniz de proteção UV para máxima visibilidade noturna.",
    icon: "💡"
  },
  {
    id: 6,
    name: "Estética de Motor",
    type: "Limpeza Técnica",
    price: "A partir de R$ 150",
    duration: "2 horas",
    benefits: "Limpeza detalhada a seco com pincelamento e aplicação de verniz protetor para plásticos e mangueiras.",
    icon: "⚙️"
  }
]

export function CarPlatform({ userProfile, cmsData, availableTimes = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"], myAppointments = [] }: { userProfile?: any, cmsData?: any, availableTimes?: string[], myAppointments?: any[] }) {
  // If cmsData has services, override the hardcoded SERVICES
  const activeServices = cmsData?.services?.length > 0 
    ? cmsData.services.map((s: any) => {
        const hasPipe = s.icon && s.icon.includes('|');
        return {
          id: s.id,
          name: s.title,
          type: hasPipe ? s.icon.split('|')[1] : (s.type || "Serviço Customizado"),
          price: s.price,
          duration: "--",
          benefits: s.description,
          icon: hasPipe ? s.icon.split('|')[0] : (s.icon || "💎"),
          image_url: s.image_url
        }
      })
    : SERVICES;

  const categories = ["Todos", ...Array.from(new Set(activeServices.map((s: any) => s.type))) as string[]];
  const [activeCategory, setActiveCategory] = useState("Todos");
  const filteredServices = activeCategory === "Todos" 
    ? activeServices 
    : activeServices.filter((s: any) => s.type === activeCategory);

  const [isGoldMode, setIsGoldMode] = useState(false)
  const [isPreGlow, setIsPreGlow] = useState(true)
  const [selectedService, setSelectedService] = useState<typeof SERVICES[0] | null>(null)
  const [additionalServices, setAdditionalServices] = useState<typeof SERVICES[0][]>([])
  const [modalCategory, setModalCategory] = useState("")
  const [showAdditionalServices, setShowAdditionalServices] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [bookingStatus, setBookingStatus] = useState<"idle" | "booking" | "success">("idle")
  const [isPendingAction, startTransitionAction] = useReactTransition()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [deliveryType, setDeliveryType] = useState<"cliente_traz" | "leva_traz">("cliente_traz")
  const [clientAddress, setClientAddress] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPreGlow(false);
      setIsGoldMode(prev => {
        if (!prev) return true;
        return prev;
      });
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function fetchBookedTimes() {
      if (!scheduledDate) {
        setBookedTimes([])
        return
      }
      const supabase = createClient()
      const { data, error } = await supabase
        .from('appointments')
        .select('scheduled_time')
        .eq('scheduled_date', scheduledDate)
        .neq('status', 'Cancelado')
      
      if (!error && data) {
        setBookedTimes(data.map(app => app.scheduled_time))
      }
    }
    fetchBookedTimes()
  }, [scheduledDate])

  const [upcomingDays, setUpcomingDays] = useState<Date[]>([])

  useEffect(() => {
    const days = []
    let d = new Date()
    while(days.length < 14) {
      if (d.getDay() !== 0) { // Not Sunday
        days.push(new Date(d))
      }
      d.setDate(d.getDate() + 1)
    }
    setUpcomingDays(days)
  }, [])

  const { navigate } = useTransition()
  
  const toggleGoldMode = () => {
    setIsPreGlow(false)
    setIsGoldMode(!isGoldMode)
  }

  const handleBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!scheduledDate || !scheduledTime) {
      alert("Por favor, escolha uma data e horário.")
      return
    }
    setBookingStatus("booking")
    
    if (!selectedService) return

    const supabase = createClient()
    const formData = new FormData(e.currentTarget)
    const vehicle = formData.get("vehicle") as string || "Não informado"

    const allServices = [selectedService, ...additionalServices]
    const combinedNames = allServices.map(s => s.name).join(" + ")

    // Extract numbers to calculate total estimate
    const extractNumber = (str: string) => {
      const match = str.match(/\d+/)
      return match ? parseInt(match[0], 10) : 0
    }
    
    let totalEstimate = allServices.reduce((sum, s) => sum + extractNumber(s.price), 0)
    if (deliveryType === "leva_traz") {
      totalEstimate += 8 // Taxa de entrega
    }

    formData.append("service_id", String(selectedService.id))
    formData.append("service_name", combinedNames)
    formData.append("price", `Estimativa: R$ ${totalEstimate},00`)
    formData.append("scheduled_date", scheduledDate)
    formData.append("scheduled_time", scheduledTime)
    formData.append("delivery_type", deliveryType)
    if (deliveryType === 'leva_traz') formData.append("client_address", clientAddress)
    
    // Check if free wash
    const isFreeWash = userProfile?.loyalty_points >= 10 && selectedService.name === "Lavagem Técnica Detalhada"
    formData.append("is_free_wash", isFreeWash ? 'true' : 'false')

    startTransitionAction(async () => {
      const res = await bookAppointment(formData)
      if (res?.error) {
        setBookingStatus("idle")
        alert(res.error)
        return
      }
      setBookingStatus("success")
      setTimeout(() => {
        setSelectedService(null)
        setAdditionalServices([])
        setModalCategory("")
        setShowAdditionalServices(false)
        setBookingStatus("idle")
        setScheduledDate("")
        setScheduledTime("")
        setIsSidebarOpen(false)
      }, 3000)
    })
  }

  const handleCancelAppointment = (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    startTransitionAction(async () => {
      const res = await cancelAppointment(id)
      if (res?.error) alert(res.error)
    })
  }



  return (
    <div className={`relative min-h-screen w-full flex flex-col items-center ${isGoldMode ? "gold-mode" : ""}`}>
      {/* Dynamic Keyframes for Shine Effect */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shine-text {
          0% { background-position: -200% center, center; }
          100% { background-position: 200% center, center; }
        }
        @keyframes swallowGlow {
          0%, 30% {
            background: black;
            box-shadow: 0 0 1.5em 0px #98c0ef;
            border-color: #98c0ef;
          }
          60% {
            background: black;
            box-shadow: 0 0 1.5em 0px rgba(255,255,255,0.4);
            border-color: rgba(255,255,255,0.6);
          }
          85% {
            background: black;
            box-shadow: 0 0 1.5em 0px rgba(234,88,12,0.6);
            border-color: rgba(234, 88, 12, 0.8);
          }
          100% {
            background: black;
            box-shadow: 0 0 2em 0px #ea580c;
            border-color: #ea580c;
          }
        }
        .spotlight {
          filter: none;
        }
        .spotlight.active-gold {
          filter: invert(1) brightness(4.7) opacity(0.8);
        }
        @media (max-width: 768px) {
          .spotlight {
            display: none !important;
          }
        }
      `}} />

      {/* Fixed Background (Canvas only) */}
      <ParticleBackground isGoldMode={isGoldMode} />

      {/* Header with Login/Profile Button */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        {userProfile ? (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-2.5 rounded-full font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center md:gap-2 md:backdrop-blur-md bg-opacity-90 bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:scale-105`}
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden md:inline">Minha Conta</span>
          </button>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className={`w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-2.5 rounded-full font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center md:gap-2 md:backdrop-blur-md bg-opacity-90 ${
              isGoldMode
                ? "bg-orange-950/30 text-orange-400 border border-orange-500/30 hover:bg-gradient-to-r hover:from-orange-600 hover:to-orange-500 hover:text-white hover:border-transparent shadow-[0_0_10px_rgba(234,88,12,0.2)]"
                : "bg-slate-900/30 text-slate-300 border border-white/10 hover:bg-white hover:text-black"
            }`}
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden md:inline">Entrar</span>
          </button>
        )}
      </div>

      {/* Spotlight and Accent Lines (scroll with page) */}
      <div className="absolute top-0 left-0 right-0 w-full h-full pointer-events-none flex justify-center overflow-hidden z-0">
        <div
          className={`spotlight ${isGoldMode ? 'active-gold' : ''}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            margin: "0 auto",
            transition: "filter 1s ease-in-out",
            height: "100%",
            width: "100%",
            willChange: "filter",
            transform: "translateZ(0)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: "0 0 50% 50%",
                position: "absolute",
                left: 0,
                right: 0,
                margin: "0 auto",
                top: "4em", // Matches the button's vertical position
                width: "30em",
                height: "100%", // Stretches to the very bottom of the document
                backgroundImage:
                  "conic-gradient(from 0deg at 50% -5%, transparent 45%, rgba(124, 145, 182, .3) 49%, rgba(124, 145, 182, .5) 50%, rgba(124, 145, 182, .3) 51%, transparent 55%)",
                transformOrigin: "50% 0",
                filter: "blur(15px) opacity(0.5)",
                transform: `rotate(${i === 0 ? 20 : i === 1 ? -20 : 0}deg) translateZ(0)`,
                willChange: "transform",
                animation:
                  i === 0
                    ? "load 2s ease-in-out forwards, loadrot 2s ease-in-out forwards, spotlight 17s ease-in-out infinite"
                    : i === 1
                      ? "load 2s ease-in-out forwards, loadrot 2s ease-in-out forwards, spotlight 14s ease-in-out infinite"
                      : "load 2s ease-in-out forwards, loadrot 2s ease-in-out forwards, spotlight 21s ease-in-out infinite reverse",
              }}
            />
          ))}
        </div>
        

      </div>

      {/* Client Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 md:backdrop-blur-sm bg-opacity-90" 
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative w-full max-w-sm h-full bg-slate-950 border-l border-slate-800 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="mt-8 mb-10">
              <h2 className="text-2xl font-bold text-white mb-2">Olá, {userProfile?.full_name?.split(' ')[0] || 'Cliente'}</h2>
              <p className="text-slate-400 text-sm">Bem-vindo ao seu portal exclusivo GEARBOX.</p>
            </div>

            {/* Loyalty Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-orange-500 font-bold tracking-wider text-sm">CARTÃO FIDELIDADE</h3>
                <span className="text-slate-300 text-sm">{userProfile?.loyalty_points || 0}/10 Lavagens</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-3 mb-6 relative z-10">
                <div 
                  className="bg-gradient-to-r from-orange-600 to-orange-400 h-3 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(234,88,12,0.5)]" 
                  style={{ width: `${Math.min(((userProfile?.loyalty_points || 0) / 10) * 100, 100)}%` }}
                ></div>
              </div>
              
              <p className="text-slate-400 text-xs leading-relaxed relative z-10">
                Complete 10 lavagens detalhadas para ganhar <strong className="text-white">1 lavagem totalmente grátis</strong>.
              </p>
              
              {userProfile?.loyalty_points >= 10 && (
                <div className="mt-4 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-500">
                  <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 text-center shadow-[0_0_15px_rgba(234,88,12,0.3)]">
                    <p className="text-orange-400 font-bold text-sm mb-2">🎉 Você ganhou 1 Lavagem Técnica Grátis!</p>
                    <button 
                      onClick={() => {
                        setIsSidebarOpen(false);
                        const techWash = activeServices.find((s: any) => s.name === "Lavagem Técnica Detalhada");
                        if (techWash) setSelectedService(techWash);
                      }}
                      className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded font-bold py-2 text-xs hover:scale-105 transition-transform"
                    >
                      Resgatar Agora
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* My Appointments List */}
            {myAppointments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-white font-bold mb-3 flex items-center justify-between">
                  Meus Agendamentos
                  <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">{myAppointments.length}</span>
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {myAppointments.map(app => (
                    <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className={`text-xs font-bold truncate max-w-[160px] ${app.service_name?.includes('GRÁTIS') ? 'text-orange-400' : 'text-white'}`}>
                          {app.service_name}
                        </div>
                        {app.status === 'Concluído' ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold">Concluído</span>
                        ) : app.status === 'Cancelado' ? (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold">Cancelado</span>
                        ) : (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">Agendado</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mb-2">
                        {app.scheduled_date ? new Date(app.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'} às {app.scheduled_time || 'Sem hora'}
                      </div>
                      {(app.status === 'Agendado' || app.status === 'Pendente') && (
                        <button 
                          onClick={() => handleCancelAppointment(app.id)}
                          disabled={isPendingAction}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors w-full text-left py-1"
                        >
                          Cancelar Agendamento
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setIsSidebarOpen(false);
                  document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl py-4 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                Agendar Novo Serviço
              </button>
              
              {userProfile?.is_admin && (
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-xl py-4 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  Painel do Dono
                </button>
              )}
            </div>

            <div className="mt-auto">
              <button 
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className="w-full text-slate-500 hover:text-red-400 text-sm py-2 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layer (Scrollable) */}
      <div className="relative z-10 w-full max-w-7xl px-4 flex flex-col items-center pb-32">
        
        {/* Hero Section (Takes full viewport height to push cars down) */}
        <div className="w-full min-h-screen flex flex-col items-center relative">
          {/* Toggle Button Container (Aligned to spotlight origin at 4em) */}
          <div className="w-full flex justify-center absolute z-20" style={{ top: "2.5em" }}>
            <div
              className="mid-spot"
              onClick={toggleGoldMode}
              style={{
                width: "3rem",
                height: "3rem",
                borderRadius: "50%",
                background: "black",
                boxShadow: isGoldMode ? "0 0 2em 0px #ea580c" : "0 0 1.5em 0px #98c0ef",
                cursor: "pointer",
                transition: "all 1s ease-in-out",
                border: isGoldMode ? "1px solid #ea580c" : "1px solid #98c0ef",
                animation: isPreGlow ? "swallowGlow 7s ease-in-out forwards" : "none",
              }}
            />
          </div>

          {/* Centered Text Wrapper */}
          <div className="flex-1 w-full flex justify-center items-center relative">
            {/* OFF State Text (Dimmed and White/Grey) */}
            <div
              className="heroT notranslate relative h-[250px] w-full flex justify-center items-center"
              translate="no"
              style={{
                animation: "load 1s ease-in-out forwards",
              }}
            >
            <h2
              style={{
                position: "absolute",
                margin: "auto",
                width: "fit-content",
                fontSize: "clamp(3.5rem, 16vw, 8rem)",
                fontWeight: 800,
                opacity: isGoldMode ? 0 : 0.2,
                textShadow: "none",
                animation: "pulse 10s linear 1.2s infinite",
                transition: "opacity 1s ease-in-out",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  backgroundImage: `
                    linear-gradient(90deg, 
                      rgba(255,255,255,0.1) 0%, 
                      rgba(255,255,255,0.1) 40%, 
                      rgba(255,255,255,0.8) 50%, 
                      rgba(255,255,255,0.1) 60%, 
                      rgba(255,255,255,0.1) 100%
                    )
                  `,
                  backgroundSize: "200% auto",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                  animation: "shine-text 5s infinite linear",
                }}
              >
                GEAR
              </span>
              <span
                style={{
                  backgroundImage: `
                    linear-gradient(90deg, 
                      rgba(255,255,255,0.1) 0%, 
                      rgba(255,255,255,0.1) 40%, 
                      rgba(255,255,255,0.8) 50%, 
                      rgba(255,255,255,0.1) 60%, 
                      rgba(255,255,255,0.1) 100%
                    )
                  `,
                  backgroundSize: "200% auto",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                  animation: "shine-text 5s infinite linear 0.5s",
                }}
              >
                BOX
              </span>
            </h2>

            {/* ON State Text (Vibrant Metallic) */}
            <h2
              style={{
                position: "absolute",
                margin: "auto",
                width: "fit-content",
                fontSize: "clamp(3.5rem, 16vw, 8rem)",
                fontWeight: 800,
                opacity: isGoldMode ? 1 : 0,
                textShadow: "none",
                transition: "opacity 1s ease-in-out",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  backgroundImage: `
                    linear-gradient(60deg, transparent 30%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0.8) 55%, transparent 70%),
                    linear-gradient(0deg, #ea580c 30%, #fdba74 100%)
                  `,
                  backgroundSize: "200% auto, auto",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                  animation: "shine-text 6s infinite ease-in-out",
                }}
              >
                GEAR
              </span>
              <span
                style={{
                  backgroundImage: `
                    linear-gradient(60deg, transparent 30%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0.8) 55%, transparent 70%),
                    linear-gradient(0deg, #000000 30%, #444444 100%)
                  `,
                  backgroundSize: "200% auto, auto",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                  filter: "drop-shadow(0 0 12px rgba(234, 88, 12, 0.8))", // Neon orange glow around BOX
                  animation: "shine-text 6s infinite ease-in-out 0.8s", // Delayed so the shine travels from GEAR to BOX
                }}
              >
                BOX
              </span>
            </h2>
            
            {/* Subtitle about premium cars and low prices */}
            <p
              className={`absolute w-full text-center tracking-[0.2em] font-medium ${
                isGoldMode ? "text-orange-200 drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]" : "text-transparent"
              }`}
              style={{
                top: "calc(50% + clamp(3.5rem, 10vw, 5rem))", // Dynamically stays closer to the text
                fontSize: "clamp(0.75rem, 2vw, 1rem)",
                textTransform: "uppercase",
                opacity: isGoldMode ? 1 : 0,
                transition: "all 2s ease-in-out", // Slow transition (2 seconds)
              }}
            >
              Alta performance. O luxo que cabe no seu bolso.
            </p>
          </div>
          </div>

          {/* Hero Pill Instruction */}
          <div
            translate="no"
            className="notranslate flex justify-center mt-auto pb-16"
            style={{
              animation: "load 2s ease-out 0.5s forwards",
            }}
          >
            <div
              style={{
                padding: "0.75rem 2rem",
                borderRadius: "9999px",
                background: isGoldMode ? "rgba(234, 88, 12, 0.1)" : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${isGoldMode ? "rgba(234, 88, 12, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                backdropFilter: "blur(8px)",
                boxShadow: isGoldMode ? "0 0 20px rgba(234, 88, 12, 0.2)" : "0 0 10px rgba(255,255,255,0.02)",
                color: isGoldMode ? "#fdba74" : "#ffffff",
                fontSize: "0.85rem",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                transition: "all 0.5s ease",
              }}
            >
              <span style={{ animation: "pulse 2s infinite", display: isGoldMode ? "none" : "inline-block" }}>👆</span>
              <span>{isGoldMode ? "SISTEMA ONLINE" : "Aperte o botão acima para ligar"}</span>
            </div>
          </div>
        </div>
        {/* Filter Tabs */}
        <div className={`w-full max-w-7xl mx-auto px-4 mt-12 mb-4 flex overflow-x-auto gap-3 items-center justify-start md:justify-center transition-opacity duration-1000 z-10 relative ${isGoldMode ? 'opacity-100' : 'opacity-0'}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {categories.map((cat: string) => (
             <button 
               key={cat} 
               onClick={() => setActiveCategory(cat)}
               className={`px-5 py-2.5 rounded-full whitespace-nowrap text-xs md:text-sm font-bold tracking-wide transition-all shadow-lg ${activeCategory === cat ? 'bg-orange-600 text-white shadow-orange-600/30' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'}`}
             >
               {cat}
             </button>
          ))}
        </div>
        {/* Services Grid */}
        <div className={`relative w-full transition-opacity duration-1000 ${isGoldMode ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
          
          {/* Arrow Left - Desktop */}
          <button 
            type="button"
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 30 }}
            className="hidden md:flex bg-orange-600 hover:bg-orange-500 text-white rounded-full items-center justify-center shadow-2xl hover:scale-110 transition-all"
            onClick={() => {
              const el = document.getElementById('svc-carousel');
              if (el) el.scrollLeft -= 400;
            }}
          >
            <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </div>
          </button>

          {/* Arrow Right - Desktop */}
          <button 
            type="button"
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 30 }}
            className="hidden md:flex bg-orange-600 hover:bg-orange-500 text-white rounded-full items-center justify-center shadow-2xl hover:scale-110 transition-all"
            onClick={() => {
              const el = document.getElementById('svc-carousel');
              if (el) el.scrollLeft += 400;
            }}
          >
            <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </div>
          </button>

          {/* Carousel Container */}
          <div 
            id="svc-carousel"
            style={{
              display: 'flex',
              overflowX: 'auto',
              gap: 16,
              padding: '16px 16px 32px 16px',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              cursor: 'grab',
            }}
            onMouseDown={(e) => {
              const el = e.currentTarget;
              el.style.cursor = 'grabbing';
              el.style.scrollBehavior = 'auto';
              el.dataset.dragging = 'true';
              el.dataset.startX = String(e.clientX);
              el.dataset.sl = String(el.scrollLeft);
            }}
            onMouseMove={(e) => {
              const el = e.currentTarget;
              if (el.dataset.dragging !== 'true') return;
              e.preventDefault();
              const dx = e.clientX - Number(el.dataset.startX);
              el.scrollLeft = Number(el.dataset.sl) - dx;
            }}
            onMouseUp={(e) => {
              const el = e.currentTarget;
              el.dataset.dragging = 'false';
              el.style.cursor = 'grab';
              el.style.scrollBehavior = 'smooth';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.dataset.dragging = 'false';
              el.style.cursor = 'grab';
              el.style.scrollBehavior = 'smooth';
            }}
          >
            {/* Hide scrollbar via style tag */}
            <style>{`#svc-carousel::-webkit-scrollbar { display: none; }`}</style>

            {filteredServices.map((service: any) => (
              <div 
                key={service.id}
                className="group"
                style={{
                  flexShrink: 0,
                  width: 280,
                  minHeight: 380,
                  background: isGoldMode ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)' : 'rgba(15, 23, 42, 0.7)',
                  boxShadow: isGoldMode ? '0 10px 30px -10px rgba(234, 88, 12, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                  border: `1px solid ${isGoldMode ? 'rgba(234, 88, 12, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  userSelect: 'none',
                }}
              >
                {/* Card Top */}
                <div style={{ padding: 24, paddingBottom: 16, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, color: isGoldMode ? '#fdba74' : '#94a3b8' }}>
                    {service.icon?.includes?.('|') ? service.icon.split('|')[1] : (service.type || 'Estética Automotiva')}
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, color: 'white', marginBottom: 12, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                    {service.name || service.title}
                  </h3>
                  <div style={{ maxHeight: 120, overflowY: 'auto', scrollbarWidth: 'thin', paddingRight: 4 }}>
                    <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                      {service.benefits || service.description}
                    </p>
                  </div>
                </div>

                {/* Card Bottom */}
                <div style={{ padding: '16px 24px 24px', borderTop: '1px solid rgba(30, 41, 59, 0.5)', marginTop: 'auto' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Valor do Investimento</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{service.price}</span>
                    <button 
                      onClick={() => isGoldMode && setSelectedService(service)}
                      disabled={!isGoldMode}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: 'none',
                        cursor: isGoldMode ? 'pointer' : 'not-allowed',
                        background: isGoldMode ? '#ea580c' : '#1e293b',
                        color: isGoldMode ? 'white' : '#64748b',
                        boxShadow: isGoldMode ? '0 0 20px rgba(234,88,12,0.4)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Solicitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {/* Spacer at end */}
            <div style={{ flexShrink: 0, width: 16 }} />
          </div>
        </div>


        {/* Slider Section */}
        <ScrollReveal>
          <BeforeAfterSlider 
            isGoldMode={isGoldMode} 
            imageUrl={cmsData?.gallery?.find((g: any) => g.category === 'transformacao')?.image_url} 
            imageUrlBefore={cmsData?.gallery?.find((g: any) => g.category === 'transformacao')?.image_url_before} 
          />
        </ScrollReveal>

        {/* The Process (Ciência do Brilho) */}
        <ScrollReveal>
        <div className={`w-full max-w-7xl mx-auto mb-32 transition-opacity duration-1000 ${isGoldMode ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">A Ciência do Brilho</h2>
            <p className="text-slate-400">Nosso protocolo de 4 etapas para atingir o nível máximo de espelhamento e proteção.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting line (visible on desktop) */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-white/10" />
            
            {[
              { num: "01", title: "Descontaminação", desc: "Processo químico e mecânico para remoção de chuva ácida, seiva de árvore e fuligem de freio incrustados no verniz." },
              { num: "02", title: "Nivelamento", desc: "Polimento técnico com maquinário RUPES para correção de microrriscos e hologramas, recuperando o brilho espelhado original." },
              { num: "03", title: "Vitrificação 9H", desc: "Aplicação manual de Ceramic Coating de alta dureza (9H). Uma armadura de vidro líquido sobre a pintura." },
              { num: "04", title: "Cura IR", desc: "Secagem técnica controlada por painéis de luz infravermelha, garantindo a fusão perfeita do coating com o verniz." }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                <div 
                  className="w-24 h-24 rounded-full bg-slate-900 border-4 flex items-center justify-center text-2xl font-black mb-6 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-500"
                  style={{ color: isGoldMode ? "#fdba74" : "#94a3b8", background: isGoldMode ? "rgba(234, 88, 12, 0.2)" : "rgba(15, 23, 42, 0.8)", borderColor: isGoldMode ? "rgba(234, 88, 12, 0.5)" : "rgba(255, 255, 255, 0.1)" }}
                >
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
        </ScrollReveal>

        {/* Gallery (Obras de Arte) */}
        <ScrollReveal>
        <div className="w-full max-w-7xl mx-auto mb-32">
          <div className={`text-center mb-16 transition-opacity duration-1000 ${isGoldMode ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Galeria de Obras</h2>
            <p className="text-slate-400">A perfeição mora nos detalhes. O resultado do nosso protocolo.</p>
          </div>
          
          {(cmsData?.gallery?.filter((g: any) => g.category !== 'transformacao') || []).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[...cmsData.gallery.filter((g: any) => g.category !== 'transformacao')].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)).map((img: any, idx: number) => {
                // Apply the beautiful masonry layout logic
                let classes = "relative rounded-3xl overflow-hidden group aspect-square"
                if (idx === 0) classes = "col-span-2 row-span-2 relative rounded-3xl overflow-hidden group aspect-square md:aspect-auto"
                if (idx === 3) classes = "col-span-2 relative rounded-3xl overflow-hidden group aspect-[2/1]"
                
                return (
                  <div key={img.id} className={classes}>
                    <img 
                      loading="lazy"
                      src={img.image_url} 
                      alt={img.title || "Galeria"} 
                      className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isGoldMode ? 'grayscale-0' : 'grayscale opacity-30'}`} 
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-700 flex items-end p-6 md:p-8 ${isGoldMode ? 'opacity-100' : 'opacity-0'}`}>
                      <span className="text-white text-xs md:text-sm font-bold tracking-widest uppercase">{img.title || img.category}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="col-span-2 row-span-2 relative rounded-3xl overflow-hidden group aspect-square md:aspect-auto">
                <img 
                  loading="lazy"
                  src="https://images.unsplash.com/photo-1619682817481-e994891cd1f5?q=80&w=1200&auto=format&fit=crop" 
                  alt="Reflexo espelhado" 
                  className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isGoldMode ? 'grayscale-0' : 'grayscale opacity-30'}`} 
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-700 flex items-end p-8 ${isGoldMode ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-white font-bold tracking-widest uppercase">Reflexo 100% (Polimento)</span>
                </div>
              </div>
              <div className="relative rounded-3xl overflow-hidden group aspect-square">
                <img 
                  loading="lazy"
                  src="https://images.unsplash.com/photo-1632734139885-3b925b6826dd?q=80&w=800&auto=format&fit=crop" 
                  alt="Beading (Gotas de água)" 
                  className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isGoldMode ? 'grayscale-0' : 'grayscale opacity-30'}`} 
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-700 flex items-end p-6 ${isGoldMode ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-white text-xs font-bold tracking-widest uppercase">Hidrorepelência</span>
                </div>
              </div>
              <div className="relative rounded-3xl overflow-hidden group aspect-square">
                <img 
                  loading="lazy"
                  src="https://images.unsplash.com/photo-1542282088-fe8426682b8f?q=80&w=800&auto=format&fit=crop" 
                  alt="Roda esportiva limpa" 
                  className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isGoldMode ? 'grayscale-0' : 'grayscale opacity-30'}`} 
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-700 flex items-end p-6 ${isGoldMode ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-white text-xs font-bold tracking-widest uppercase">Caixas de Roda</span>
                </div>
              </div>
              <div className="col-span-2 relative rounded-3xl overflow-hidden group aspect-[2/1]">
                <img 
                  loading="lazy"
                  src="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=1200&auto=format&fit=crop" 
                  alt="Carro de luxo frente" 
                  className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 ${isGoldMode ? 'grayscale-0' : 'grayscale opacity-30'}`} 
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-700 flex items-end p-6 ${isGoldMode ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-white text-sm font-bold tracking-widest uppercase">Vitrificação Completa</span>
                </div>
              </div>
            </div>
          )}
        </div>
        </ScrollReveal>

        {/* Studio Section */}
        <ScrollReveal>
        <div className={`w-full max-w-6xl mx-auto mb-32 transition-opacity duration-1000 ${isGoldMode ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">{cmsData?.studio?.title || 'Nosso Estúdio'}</h2>
              <p className="text-slate-400 text-lg leading-relaxed whitespace-pre-wrap">
                {cmsData?.studio?.description || 'Ambiente climatizado, iluminação técnica controlada de 5000K para inspeção de hologramas e segurança 24h. Seu veículo tratado com os mesmos produtos utilizados nas principais montadoras de hipercarros na Europa.'}
              </p>
            </div>
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] border border-white/10" style={{ borderColor: isGoldMode ? "rgba(234, 88, 12, 0.3)" : "rgba(255, 255, 255, 0.1)" }}>
              <img loading="lazy" src={cmsData?.studio?.image_url || "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?q=80&w=1200&auto=format&fit=crop"} alt="Estúdio de estética" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* Testimonials */}
        <ScrollReveal>
        <div className={`w-full max-w-7xl mx-auto mb-32 transition-opacity duration-1000 ${isGoldMode ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">O Que Dizem Nossos Clientes</h2>
            <p className="text-slate-400">A confiança de quem exige a perfeição.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(cmsData?.testimonials?.length > 0 ? cmsData.testimonials.slice(0,3) : [
              { client_name: "Carlos M.", vehicle: "Porsche 911 Carrera", content: "Trabalho impecável. A vitrificação deixou o carro com um brilho que nem na concessionária eu vi. O cuidado nos detalhes é absurdo.", rating: 5 },
              { client_name: "Roberto F.", vehicle: "BMW M3 Competition", content: "Deixei meu carro para higienização interna e polimento. Parecia que o carro tinha saído da fábrica novamente. Recomendo de olhos fechados.", rating: 5 },
              { client_name: "Amanda T.", vehicle: "Range Rover Velar", content: "Atendimento premium do começo ao fim. A equipe entende muito do que faz e os produtos usados realmente fazem a diferença na durabilidade.", rating: 5 }
            ]).map((t: any, i: number) => (
              <div key={i} className="p-8 rounded-3xl border border-white/10 bg-slate-900/60" style={{ borderColor: isGoldMode ? "rgba(234, 88, 12, 0.3)" : "rgba(255, 255, 255, 0.1)" }}>
                <div className="flex text-orange-500 mb-4">
                  {"★".repeat(t.rating || 5)}{"☆".repeat(5 - (t.rating || 5))}
                </div>
                <p className="text-slate-300 italic mb-6">"{t.content}"</p>
                <div>
                  <div className="font-bold text-white">{t.client_name}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">{t.vehicle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </ScrollReveal>

        {/* FAQ */}
        <ScrollReveal>
        <div className={`w-full max-w-3xl mx-auto mb-32 transition-opacity duration-1000 ${isGoldMode ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Dúvidas Frequentes</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Qual a diferença entre Polimento e Vitrificação?", a: "O polimento corrige defeitos da pintura (riscos, hologramas). A vitrificação é a proteção aplicada DEPOIS do polimento (um coating de vidro líquido/cerâmica) que protege contra raios UV, fezes de pássaros e pequenos riscos, durando até 3 anos." },
              { q: "Quanto tempo o carro precisa ficar no estúdio?", a: "Depende do serviço. Uma lavagem detalhada leva cerca de 2 horas. Um processo completo de polimento e vitrificação exige tempo de cura do produto, levando de 2 a 3 dias em ambiente 100% controlado." },
              { q: "Posso lavar o carro normalmente após a vitrificação?", a: "Sim, porém recomendamos o uso exclusivo de shampoos automotivos com pH neutro e luvas de microfibra de alta gramatura. Evite lavagens automáticas com escovas rotativas para preservar a integridade da camada protetora cerâmica." }
            ].map((faq, i) => (
              <details key={i} className="group p-6 rounded-2xl border border-white/10 bg-slate-900/60 cursor-pointer" style={{ borderColor: isGoldMode ? "rgba(234, 88, 12, 0.3)" : "rgba(255, 255, 255, 0.1)" }}>
                <summary className="font-bold text-white flex justify-between items-center list-none outline-none">
                  {faq.q}
                  <span className="text-orange-500 group-open:rotate-45 transition-transform duration-300 text-2xl font-light">+</span>
                </summary>
                <p className="text-slate-400 mt-4 leading-relaxed pl-4 border-l-2 border-orange-500/50">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
        </ScrollReveal>

      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-black/50 md:backdrop-blur-xl bg-opacity-95 relative z-10 pt-16 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h2 translate="no" className={`notranslate text-3xl font-black mb-4 tracking-widest transition-all duration-700 ${isGoldMode ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]' : 'text-slate-600'}`}>GEARBOX</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              O mais alto padrão em estética automotiva no Brasil. Especialistas em superesportivos e veículos de luxo.
            </p>
          </div>
          {/* Contact */}
          <div>
            <h3 className="text-white font-bold tracking-widest uppercase mb-4 text-sm">Contato & Local</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=-27.168389,-53.704880"
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-orange-400 transition-colors"
                  title="Ver no Google Maps"
                >
                  BR-163, 111-13<br/>Itapiranga - SC, 89896-000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                <span>(49) 99825-1262</span>
              </li>
            </ul>
          </div>
          {/* Action */}
          <div className="flex flex-col items-start">
            <h3 className="text-white font-bold tracking-widest uppercase mb-4 text-sm">Fale Conosco</h3>
            <a href="https://wa.me/5549998251262" target="_blank" rel="noreferrer" className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${isGoldMode ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.172a9.123 9.123 0 01-4.708-1.298l-.337-.2-3.498.918.937-3.414-.219-.348a9.125 9.125 0 117.825 4.342zm-5.748-3.03l.366.217a7.618 7.618 0 10-2.316-2.585l.233.369-.556 2.029 2.273-.596zM15.42 13.84c-.187-.094-1.11-.548-1.282-.61-.173-.062-.299-.094-.424.094-.125.187-.487.61-.599.734-.112.125-.224.14-.412.047-.187-.094-.791-.292-1.506-.928-.556-.494-.931-1.106-1.043-1.293-.112-.187-.012-.288.082-.381.084-.084.187-.219.281-.328.093-.109.125-.187.187-.312.062-.125.031-.234-.016-.328-.047-.094-.424-1.024-.582-1.402-.153-.368-.308-.318-.424-.324-.109-.006-.234-.012-.359-.012s-.328.047-.5.234c-.172.187-.656.641-.656 1.562 0 .922.671 1.812.765 1.937.094.125 1.321 2.016 3.2 2.831 1.63.707 2.247.747 3.037.625.688-.106 1.11-.453 1.265-.891.156-.437.156-.812.109-.891-.046-.078-.172-.125-.359-.219z"/></svg>
              Chamar no WhatsApp
            </a>
          </div>
        </div>
        <div className="text-center text-xs text-slate-600 border-t border-white/5 pt-8">
          <span translate="no" className="notranslate">© 2026 GEARBOX Estética Automotiva.</span> Todos os direitos reservados.
        </div>
      </footer>

      {/* Booking Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div 
            className="w-full max-w-md rounded-2xl p-6 md:p-8 max-h-[95vh] overflow-y-auto scrollbar-hide"
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(234, 88, 12, 0.4)",
              boxShadow: "0 0 40px rgba(234, 88, 12, 0.2)",
            }}
          >
            {bookingStatus === "success" ? (
              <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-500">
                <div className="relative w-24 h-24 mb-6">
                  {/* Glowing background circles */}
                  <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-full shadow-[0_0_30px_rgba(234,88,12,0.6)] flex items-center justify-center">
                    {/* SVG Checkmark */}
                    <svg className="w-12 h-12 text-white" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 27l8 8 16-16" className="animate-[stroke_0.6s_ease-out_0.2s_forwards]" strokeDasharray="50" strokeDashoffset="50" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3 text-center">Tudo Certo!</h3>
                <p className="text-slate-400 text-center text-sm leading-relaxed max-w-[280px]">
                  Seu horário para <strong>{selectedService.name}</strong> está garantido. Te esperamos na GEARBOX!
                </p>
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes stroke {
                    100% { stroke-dashoffset: 0; }
                  }
                `}} />
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">Agendamento</h3>
                    <p className="text-orange-400 font-medium tracking-wide">
                      {selectedService.name} <span className="text-slate-400 font-normal ml-2 text-sm">{selectedService.price}</span>
                    </p>
                  </div>
                  <button type="button" onClick={() => { setSelectedService(null); setAdditionalServices([]); setModalCategory(""); setShowAdditionalServices(false); }} className="text-slate-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                
                <div className="p-2">
                  {userProfile ? (
                    <form onSubmit={handleBook}>
                      <div className="space-y-4 mb-8">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">Veículo (Modelo e Ano)</label>
                          <input name="vehicle" required type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all text-[16px]" placeholder="Ex: Porsche 911 2023" />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Logística do Veículo</label>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                              type="button"
                              onClick={() => setDeliveryType("cliente_traz")}
                              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border ${
                                deliveryType === "cliente_traz"
                                  ? "bg-orange-500/20 border-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                                  : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-orange-500/50 hover:bg-slate-800"
                              }`}
                            >
                              Trarei na Loja
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliveryType("leva_traz")}
                              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border ${
                                deliveryType === "leva_traz"
                                  ? "bg-orange-500/20 border-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                                  : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-orange-500/50 hover:bg-slate-800"
                              }`}
                            >
                              Leva e Traz
                            </button>
                          </div>
                          
                          {deliveryType === "leva_traz" && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                              <label className="block text-sm font-medium text-slate-300 mb-1">Endereço de Coleta/Entrega</label>
                              <div className="flex gap-2 mb-2">
                                <input 
                                  value={clientAddress}
                                  onChange={(e) => setClientAddress(e.target.value)}
                                  required={deliveryType === "leva_traz"}
                                  type="text" 
                                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all text-[16px]" 
                                  placeholder="Rua, Número, Bairro (Em Itapiranga)" 
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!navigator.geolocation) return alert("Geolocalização não suportada no seu navegador.");
                                    setIsFetchingLocation(true);
                                    navigator.geolocation.getCurrentPosition(
                                      async (pos) => {
                                        try {
                                          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                                          const data = await res.json();
                                          let addressStr = "";
                                          if (data.address) {
                                            const road = data.address.road || data.address.pedestrian || "";
                                            const suburb = data.address.suburb || data.address.neighbourhood || "";
                                            const city = data.address.city || data.address.town || data.address.village || "";
                                            addressStr = `${road}${road && suburb ? ', ' : ''}${suburb}${suburb && city ? ' - ' : ''}${city}`.trim();
                                          }
                                          if (addressStr) {
                                            addressStr += ` (${pos.coords.latitude}, ${pos.coords.longitude})`;
                                          }
                                          setClientAddress(addressStr || data.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}`);
                                        } catch(e) {
                                          setClientAddress(`${pos.coords.latitude}, ${pos.coords.longitude}`);
                                        }
                                        setIsFetchingLocation(false);
                                      },
                                      () => {
                                        alert("Não foi possível acessar a localização. Verifique as permissões do seu celular.");
                                        setIsFetchingLocation(false);
                                      }
                                    )
                                  }}
                                  className="px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 min-w-[56px]"
                                  disabled={isFetchingLocation}
                                  title="Puxar Localização Atual"
                                >
                                  {isFetchingLocation ? (
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-orange-400 font-medium bg-orange-500/10 inline-block px-2 py-1 rounded">
                                + Taxa fixa de deslocamento: R$ 8,00
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <button 
                            type="button" 
                            onClick={() => setShowAdditionalServices(!showAdditionalServices)}
                            className="w-full flex items-center justify-between text-sm font-medium text-slate-300 mb-2 py-2 px-1 hover:text-white transition-colors"
                          >
                            <span>Adicionar mais serviços (Opcional)</span>
                            <svg className={`w-5 h-5 transition-transform duration-300 ${showAdditionalServices ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </button>
                          
                          {showAdditionalServices && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-300 border border-slate-800 bg-slate-900/30 rounded-xl p-3">
                              <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                                {categories.filter((cat: string) => cat !== "Todos").map((cat: string) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setModalCategory(modalCategory === cat ? "" : cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                                      modalCategory === cat 
                                        ? "bg-orange-600 text-white border-orange-500" 
                                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>

                              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                                {modalCategory === "" ? (
                                  <p className="text-xs text-slate-500 italic text-center py-4">
                                    Selecione uma categoria acima para ver os opcionais.
                                  </p>
                                ) : (
                                  activeServices
                                    .filter((s: any) => s.id !== selectedService.id)
                                    .filter((s: any) => s.type === modalCategory)
                                    .map((s: any) => {
                                    const isAdded = additionalServices.some(as => as.id === s.id)
                                    return (
                                      <label key={s.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isAdded ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'}`}>
                                        <div className="flex items-center gap-3">
                                          <input 
                                            type="checkbox" 
                                            className="w-4 h-4 accent-orange-500"
                                            checked={isAdded}
                                            onChange={(e) => {
                                              if (e.target.checked) setAdditionalServices(prev => [...prev, s])
                                              else setAdditionalServices(prev => prev.filter(as => as.id !== s.id))
                                            }}
                                          />
                                          <div className="flex flex-col">
                                            <span className="text-white text-sm font-medium">{s.name}</span>
                                          </div>
                                        </div>
                                        <span className="text-slate-400 text-xs">{s.price}</span>
                                      </label>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Data do Serviço
                            {scheduledDate && (
                              <span className="text-orange-400 font-normal ml-2 block sm:inline mt-1 sm:mt-0 text-xs sm:text-sm">
                                ({new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(scheduledDate + 'T12:00:00'))})
                              </span>
                            )}
                          </label>
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {upcomingDays.map((day, idx) => {
                              const year = day.getFullYear();
                              const month = String(day.getMonth() + 1).padStart(2, '0');
                              const date = String(day.getDate()).padStart(2, '0');
                              const dateStr = `${year}-${month}-${date}`;
                              const isSelected = scheduledDate === dateStr
                              const dayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day)
                              const dayNumber = day.getDate()
                              const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(day)
                              
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => { setScheduledDate(dateStr); setScheduledTime(""); }}
                                  className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-xl border transition-all ${
                                    isSelected 
                                      ? "bg-orange-500/20 border-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]" 
                                      : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-orange-500/50 hover:bg-slate-800"
                                  }`}
                                >
                                  <span className="text-xs uppercase font-medium mb-1">{dayName}</span>
                                  <span className="text-2xl font-bold">{dayNumber}</span>
                                  <span className="text-[10px] uppercase tracking-wider">{monthName}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {scheduledDate && (
                          <div className="animate-in fade-in duration-300">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Horários Disponíveis</label>
                            <div className="grid grid-cols-3 gap-2">
                              {availableTimes.map((time) => {
                                const isBooked = bookedTimes.includes(time)
                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    disabled={isBooked}
                                    onClick={() => setScheduledTime(time)}
                                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                                      isBooked
                                        ? "bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed line-through"
                                        : scheduledTime === time 
                                        ? "bg-orange-500 text-white shadow-[0_0_10px_rgba(234,88,12,0.5)] border border-orange-400" 
                                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white"
                                    }`}
                                  >
                                    {isBooked ? "Reservado" : time}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
              </div>

                      <button
                        type="submit"
                        disabled={bookingStatus === "booking"}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] disabled:opacity-50"
                      >
                        {bookingStatus === "booking" ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processando...
                          </span>
                        ) : (
                          (() => {
                            const isFreeWash = userProfile?.loyalty_points >= 10 && selectedService.name === "Lavagem Técnica Detalhada";
                            if (isFreeWash) return `Agendar (GRATUITA)`;

                            const extractNumber = (str: string) => {
                              const match = str.match(/\d+/)
                              return match ? parseInt(match[0], 10) : 0
                            }
                            let estimate = extractNumber(selectedService.price) + additionalServices.reduce((sum, s) => sum + extractNumber(s.price), 0)
                            if (deliveryType === "leva_traz") estimate += 8
                            
                            return `Agendar (Est. R$ ${estimate},00)`
                          })()
                        )}
                      </button>
                      
                      <p className="text-center text-slate-500 text-xs mt-4">
                        O agendamento será vinculado à sua conta: {userProfile.full_name}
                      </p>
                    </form>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Login Necessário</h3>
                      <p className="text-slate-400 text-sm mb-8">Para agendar este serviço e acumular pontos de fidelidade, você precisa estar logado.</p>
                      <button
                        onClick={() => navigate("/login")}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(234,88,12,0.4)]"
                      >
                        Fazer Login ou Criar Conta
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating WhatsApp */}
      <a 
        href="https://wa.me/5549998251262"
        target="_blank"
        rel="noreferrer"
        className={`fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-[0_0_20px_rgba(37,211,102,0.5)] transition-all duration-500 hover:scale-110 flex items-center justify-center ${isGoldMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
        style={{ background: "#25D366" }}
        title="Fale conosco no WhatsApp"
      >
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.172a9.123 9.123 0 01-4.708-1.298l-.337-.2-3.498.918.937-3.414-.219-.348a9.125 9.125 0 117.825 4.342zm-5.748-3.03l.366.217a7.618 7.618 0 10-2.316-2.585l.233.369-.556 2.029 2.273-.596zM15.42 13.84c-.187-.094-1.11-.548-1.282-.61-.173-.062-.299-.094-.424.094-.125.187-.487.61-.599.734-.112.125-.224.14-.412.047-.187-.094-.791-.292-1.506-.928-.556-.494-.931-1.106-1.043-1.293-.112-.187-.012-.288.082-.381.084-.084.187-.219.281-.328.093-.109.125-.187.187-.312.062-.125.031-.234-.016-.328-.047-.094-.424-1.024-.582-1.402-.153-.368-.308-.318-.424-.324-.109-.006-.234-.012-.359-.012s-.328.047-.5.234c-.172.187-.656.641-.656 1.562 0 .922.671 1.812.765 1.937.094.125 1.321 2.016 3.2 2.831 1.63.707 2.247.747 3.037.625.688-.106 1.11-.453 1.265-.891.156-.437.156-.812.109-.891-.046-.078-.172-.125-.359-.219z"/></svg>
      </a>
    </div>
  )
}
