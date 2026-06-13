"use client"

import { useState, useTransition, useMemo } from "react"
import { toggleScheduleBlock, blockFullDay, updateAvailableTimes } from "./actions"

export function CalendarTab({ initialAppointments, initialAvailableTimes }: { initialAppointments: any[], initialAvailableTimes?: string[] }) {
  const [isPending, startTransition] = useTransition()
  const [appointments, setAppointments] = useState(initialAppointments)
  
  const [availableTimes, setAvailableTimes] = useState<string[]>(() => {
    if (initialAvailableTimes && initialAvailableTimes.length > 0) {
      return initialAvailableTimes
    }
    return ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
  })
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDayModal, setSelectedDayModal] = useState<string | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [newTimeInput, setNewTimeInput] = useState("")

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  
  // Create calendar grid
  const days = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  // Calculate daily revenue and blocks
  const dailyData = useMemo(() => {
    const data: Record<string, { revenue: number, count: number, blocks: string[], appointments: any[] }> = {}
    
    appointments.forEach(app => {
      if (!app.scheduled_date) return
      
      if (!data[app.scheduled_date]) {
        data[app.scheduled_date] = { revenue: 0, count: 0, blocks: [], appointments: [] }
      }
      
      if (app.status === 'Concluído' && app.final_price) {
        data[app.scheduled_date].revenue += Number(app.final_price)
        data[app.scheduled_date].count += 1
      }
      
      if (app.status === 'Bloqueado') {
        data[app.scheduled_date].blocks.push(app.scheduled_time)
      } else if (app.status !== 'Cancelado' && app.status !== 'CONFIG_HORARIOS') {
        data[app.scheduled_date].appointments.push(app)
      }
    })
    return data
  }, [appointments])

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleToggleBlock = (dateStr: string, time: string, isBlock: boolean) => {
    // Optimistic Update
    setAppointments(prev => {
      if (isBlock) {
        return [...prev, {
          id: 'temp-' + Date.now(),
          client_name: 'SISTEMA',
          client_whatsapp: '000',
          vehicle: 'N/A',
          service_name: 'Bloqueio de Agenda',
          status: 'Bloqueado',
          scheduled_date: dateStr,
          scheduled_time: time
        }]
      } else {
        return prev.filter(a => !(a.scheduled_date === dateStr && a.scheduled_time === time && a.status === 'Bloqueado'))
      }
    })

    startTransition(async () => {
      const res = await toggleScheduleBlock(dateStr, time, isBlock)
      if (res?.error) {
        alert(res.error)
        // Reset to original state if error
      }
    })
  }

  const handleBlockFullDay = (dateStr: string) => {
    if (!confirm(`Deseja bloquear todos os horários do dia ${dateStr.split('-').reverse().join('/')}?`)) return

    setAppointments(prev => {
      const filtered = prev.filter(a => !(a.scheduled_date === dateStr && a.status === 'Bloqueado'))
      const blocks = availableTimes.map((time, idx) => ({
        id: 'temp-block-' + idx + '-' + Date.now(),
        client_name: 'SISTEMA',
        client_whatsapp: '000',
        vehicle: 'N/A',
        service_name: 'Bloqueio de Agenda',
        status: 'Bloqueado',
        scheduled_date: dateStr,
        scheduled_time: time
      }))
      return [...filtered, ...blocks]
    })

    startTransition(async () => {
      const res = await blockFullDay(dateStr, availableTimes)
      if (res?.error) {
        alert(res.error)
      }
    })
  }

  const handleUnblockFullDay = (dateStr: string) => {
    if (!confirm(`Deseja liberar todos os horários bloqueados do dia ${dateStr.split('-').reverse().join('/')}?`)) return
    
    setAppointments(prev => prev.filter(a => !(a.scheduled_date === dateStr && a.status === 'Bloqueado')))

    startTransition(async () => {
      // Unblock one by one
      for (const time of availableTimes) {
        const isBlocked = dailyData[dateStr]?.blocks.includes(time)
        if (isBlocked) {
          await toggleScheduleBlock(dateStr, time, false)
        }
      }
    })
  }

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-2xl font-black text-white">Calendário Financeiro & Agenda</h2>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <button 
              onClick={() => setShowConfigModal(true)}
              className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg hover:bg-orange-500/20 transition whitespace-nowrap"
            >
              ⚙️ Configurar Horários
            </button>

            <div className="flex gap-2 items-center">
              <button onClick={prevMonth} className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition leading-none">⬅️</button>
              <div className="text-sm sm:text-lg font-bold text-orange-400 w-32 sm:w-48 text-center truncate">
                {monthNames[month]} {year}
              </div>
              <button onClick={nextMonth} className="p-2 bg-slate-800 rounded hover:bg-slate-700 transition leading-none">➡️</button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="h-28 rounded-xl bg-slate-900/50" />
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const data = dailyData[dateStr] || { revenue: 0, count: 0, blocks: [], appointments: [] }
            const isFullyBlocked = data.blocks.length >= availableTimes.length

            return (
              <div 
                key={dateStr}
                onClick={() => setSelectedDayModal(dateStr)}
                className={`relative h-28 rounded-xl border p-2 cursor-pointer transition-all hover:scale-[1.02] 
                  ${isFullyBlocked ? 'border-red-900/50 bg-red-950/20' : 'border-slate-800 bg-slate-950 hover:border-orange-500/50'}`}
              >
                <div className={`font-bold text-lg ${isFullyBlocked ? 'text-red-500' : 'text-slate-300'}`}>{day}</div>
                
                {isFullyBlocked && (
                  <div className="absolute top-2 right-2 text-red-500 text-xs font-bold uppercase tracking-wider">Fechado</div>
                )}

                {!isFullyBlocked && data.revenue > 0 && (
                  <div className="absolute bottom-2 left-2 text-emerald-400 font-bold text-sm">
                    {formatCurrency(data.revenue)}
                  </div>
                )}
                
                {!isFullyBlocked && data.count > 0 && (
                  <div className="absolute bottom-2 right-2 bg-emerald-500/20 text-emerald-400 text-xs px-1.5 rounded">
                    {data.count} serv
                  </div>
                )}

                {data.blocks.length > 0 && !isFullyBlocked && (
                  <div className="absolute top-2 right-2 bg-orange-500/20 text-orange-400 text-[10px] px-1.5 rounded uppercase font-bold">
                    Parcial
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>

      {/* Modal */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-xl font-bold text-white">Gestão do Dia</h3>
                <p className="text-orange-400 text-sm mt-1">{selectedDayModal.split('-').reverse().join('/')}</p>
              </div>
              <button onClick={() => setSelectedDayModal(null)} className="text-slate-500 hover:text-white p-2 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="flex gap-4">
                <button 
                  onClick={() => handleBlockFullDay(selectedDayModal)}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-3 rounded-xl font-bold text-sm transition"
                >
                  🔒 Bloquear Dia Inteiro
                </button>
                <button 
                  onClick={() => handleUnblockFullDay(selectedDayModal)}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl font-bold text-sm transition"
                >
                  🔓 Liberar Todos Horários
                </button>
              </div>

              <div>
                <h4 className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-4">Horários (Livre / Bloqueado)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableTimes.map(time => {
                    const isBlocked = dailyData[selectedDayModal]?.blocks.includes(time)
                    const appInSlot = dailyData[selectedDayModal]?.appointments.find(a => a.scheduled_time === time)

                    return (
                      <div key={time} className={`p-3 rounded-xl border flex flex-col gap-2 ${isBlocked ? 'border-red-500/30 bg-red-500/10' : appInSlot ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950'}`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-bold font-mono ${isBlocked ? 'text-red-400' : 'text-slate-300'}`}>{time}</span>
                          <button 
                            disabled={!!appInSlot || isPending}
                            onClick={() => handleToggleBlock(selectedDayModal, time, !isBlocked)}
                            className={`px-3 py-1 rounded text-xs font-bold transition disabled:opacity-30 ${isBlocked ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'}`}
                          >
                            {isBlocked ? 'Liberar' : 'Bloquear'}
                          </button>
                        </div>
                        {appInSlot && (
                          <div className="text-xs text-emerald-400 font-bold truncate">
                            👤 {appInSlot.client_name.split(' ')[0]}
                          </div>
                        )}
                        {!appInSlot && !isBlocked && (
                          <div className="text-xs text-slate-500">Disponível</div>
                        )}
                        {isBlocked && (
                          <div className="text-xs text-red-400">Fechado</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="text-xl font-bold text-white">Horários Base</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-500 hover:text-white p-2 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                <input 
                  type="time" 
                  value={newTimeInput}
                  onChange={e => setNewTimeInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
                <button 
                  onClick={() => {
                    if (!newTimeInput) return;
                    if (availableTimes.includes(newTimeInput)) return alert("Horário já existe")
                    setAvailableTimes(prev => [...prev, newTimeInput].sort())
                    setNewTimeInput("")
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                {availableTimes.map(time => (
                  <div key={time} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-lg">
                    <span className="text-slate-300 font-mono text-sm">{time}</span>
                    <button 
                      onClick={() => setAvailableTimes(prev => prev.filter(t => t !== time))}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {availableTimes.length === 0 && (
                  <div className="text-slate-500 text-sm italic">Nenhum horário cadastrado.</div>
                )}
              </div>

              <button 
                onClick={() => {
                  startTransition(async () => {
                    const res = await updateAvailableTimes(availableTimes)
                    if (res?.error) alert(res.error)
                    else {
                      alert("Horários salvos com sucesso!")
                      setShowConfigModal(false)
                    }
                  })
                }}
                disabled={isPending}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar Configuração"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
