"use client"

import { useState, useTransition, useMemo } from "react"
import { completeAppointment, cancelAppointment, insertExpense, addEmployee, logTimeClock, removeEmployee } from "./actions"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CmsTab } from "./cms-tab"
import { CalendarTab } from "./calendar-tab"

export function DashboardClient({ initialAppointments, initialAvailableTimes, initialExpenses, initialEmployees = [], initialTimeLogs = [], initialCmsData, eligibleClients = [] }: { initialAppointments: any[], initialAvailableTimes: string[], initialExpenses: any[], initialEmployees?: any[], initialTimeLogs?: any[], initialCmsData?: any, eligibleClients?: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'calendar' | 'agenda' | 'finance' | 'team' | 'cms'>('calendar')
  const [financeDate, setFinanceDate] = useState(new Date())
  
  // Optimistic UI states
  const [appointments, setAppointments] = useState(initialAppointments)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [employees, setEmployees] = useState(initialEmployees)
  const [timeLogs] = useState(initialTimeLogs)

  const handleComplete = async (appId: string, clientId: string) => {
    const rawPrice = window.prompt("Qual foi o valor final REAL cobrado deste serviço? (Apenas números. Ex: 450 ou 450.50)")
    if (rawPrice === null) return // Canceled

    const finalPrice = parseFloat(rawPrice.replace(',', '.'))
    if (isNaN(finalPrice) || finalPrice < 0) {
      alert("Valor inválido. Use apenas números.")
      return
    }

    const app = appointments.find(a => a.id === appId)
    const isFreeWash = app?.service_name?.includes('GRÁTIS - FIDELIDADE')

    if (!confirm(isFreeWash 
      ? `Confirmar a finalização da Lavagem Grátis? Isso NÃO dará pontos adicionais de fidelidade.` 
      : `Confirmar a finalização? Isso adicionará R$ ${finalPrice.toFixed(2)} na sua receita e dará +1 Ponto de Fidelidade para o cliente.`)) return;
    
    setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status: 'Concluído', final_price: finalPrice } : a))
    
    startTransition(async () => {
      const res = await completeAppointment(appId, clientId, finalPrice)
      if (res?.error) {
        alert(res.error)
        setAppointments(initialAppointments)
      }
    })
  }

  const handleCancel = async (appId: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setAppointments(prev => prev.map(a => a.id === appId ? { ...a, status: 'Cancelado' } : a))
    startTransition(async () => {
      const res = await cancelAppointment(appId)
      if (res?.error) {
        alert(res.error)
        setAppointments(initialAppointments)
      }
    })
  }

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const amountStr = formData.get('amount') as string
    const amount = parseFloat(amountStr.replace(',', '.'))
    
    if (isNaN(amount) || amount <= 0) return alert("Valor inválido.")

    const newExpense = {
      id: 'temp-' + Date.now(),
      description: formData.get('description'),
      category: formData.get('category'),
      amount: amount,
      expense_date: formData.get('expense_date')
    }

    setExpenses(prev => [newExpense, ...prev])
    const form = e.currentTarget
    
    startTransition(async () => {
      const res = await insertExpense(formData)
      if (res?.error) {
        alert(res.error)
        setExpenses(initialExpenses)
      } else {
        form.reset()
      }
    })
  }

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    
    // Optimistic add not easily feasible without ID, but we can wait for server response
    startTransition(async () => {
      const res = await addEmployee(formData)
      if (res?.error) {
        alert(res.error)
      } else {
        form.reset()
        alert("Funcionário cadastrado com sucesso! Atualize a página se ele não aparecer imediatamente.")
      }
    })
  }

  const handleTimeClock = async (empId: string, type: 'in' | 'out') => {
    const defaultTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const actionName = type === 'in' ? 'Entrada' : 'Saída'
    
    const manualTime = window.prompt(`Qual horário de ${actionName}? (Formato HH:MM)`, defaultTime)
    if (manualTime === null) return // Canceled

    if (!/^\d{2}:\d{2}$/.test(manualTime)) {
      alert("Formato inválido. Use HH:MM (ex: 08:30 ou 18:00)")
      return
    }

    // Optimistic update
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      
      let newLog = emp.todayLog ? { ...emp.todayLog } : { id: 'temp', clock_in: null, clock_out: null }
      if (type === 'in') newLog.clock_in = manualTime
      if (type === 'out') newLog.clock_out = manualTime
      
      return { ...emp, todayLog: newLog }
    }))

    startTransition(async () => {
      const res = await logTimeClock(empId, type, manualTime)
      if (res?.error) {
        alert(res.error)
        setEmployees(initialEmployees)
      }
    })
  }

  const handleRemoveEmployee = async (empId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover ${name} da equipe?`)) return;
    
    setEmployees(prev => prev.filter(e => e.id !== empId))
    startTransition(async () => {
      const res = await removeEmployee(empId)
      if (res?.error) {
        alert(res.error)
        setEmployees(initialEmployees)
      }
    })
  }

  // --- Metrics Calculation ---
  const currentMonthStr = `${financeDate.getFullYear()}-${String(financeDate.getMonth() + 1).padStart(2, '0')}`

  const completedAppointments = appointments.filter(a => a.status === 'Concluído' && a.scheduled_date?.startsWith(currentMonthStr))
  const currentMonthExpenses = expenses.filter(e => e.expense_date?.startsWith(currentMonthStr))

  const totalRevenue = completedAppointments.reduce((sum, a) => sum + (Number(a.final_price) || 0), 0)
  const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const netProfit = totalRevenue - totalExpenses
  
  const completedCount = completedAppointments.length
  const avgTicket = completedCount > 0 ? totalRevenue / completedCount : 0

  // --- Chart Data Preparation (Daily) ---
  const chartData = useMemo(() => {
    const dataMap: Record<string, { name: string, Receitas: number, Despesas: number }> = {}
    
    // Initialize days in month
    const daysInMonth = new Date(financeDate.getFullYear(), financeDate.getMonth() + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0')
      dataMap[dayStr] = { name: dayStr, Receitas: 0, Despesas: 0 }
    }
    
    completedAppointments.forEach(app => {
      if (!app.scheduled_date) return
      const day = app.scheduled_date.split('-')[2]
      if (dataMap[day]) dataMap[day].Receitas += Number(app.final_price) || 0
    })

    currentMonthExpenses.forEach(exp => {
      if (!exp.expense_date) return
      const day = exp.expense_date.split('-')[2]
      if (dataMap[day]) dataMap[day].Despesas += Number(exp.amount) || 0
    })

    return Object.values(dataMap)
  }, [completedAppointments, currentMonthExpenses, financeDate])

  // --- Team Chart Data Preparation ---
  const teamChartData = useMemo(() => {
    const dataMap: Record<string, { name: string, Horas: number }> = {}
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM
    
    // Initialize with 0 hours for all employees
    employees.forEach(emp => {
      dataMap[emp.id] = { name: emp.name.split(' ')[0], Horas: 0 }
    })

    timeLogs.forEach(log => {
      if (!log.log_date || !log.log_date.startsWith(currentMonth)) return
      if (!log.clock_in || !log.clock_out) return
      
      const inParts = log.clock_in.split(':')
      const outParts = log.clock_out.split(':')
      if (inParts.length !== 2 || outParts.length !== 2) return

      const inMins = parseInt(inParts[0]) * 60 + parseInt(inParts[1])
      const outMins = parseInt(outParts[0]) * 60 + parseInt(outParts[1])
      
      let workedMins = outMins - inMins
      if (workedMins < 0) workedMins += 24 * 60 // Crossed midnight
      
      if (dataMap[log.employee_id]) {
        dataMap[log.employee_id].Horas += workedMins / 60
      }
    })

    return Object.values(dataMap)
      .map(d => ({ 
        ...d, 
        Horas: parseFloat(d.Horas.toFixed(1)),
        name_display: `${d.name}\n${d.Horas.toFixed(1)}h`
      }))
      .sort((a, b) => b.Horas - a.Horas)
  }, [timeLogs, employees])

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`px-6 py-4 font-bold text-sm tracking-wide uppercase transition-all whitespace-nowrap ${activeTab === 'calendar' ? 'text-indigo-500 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          Calendário & Agenda
        </button>
        <button 
          onClick={() => setActiveTab('agenda')}
          className={`px-6 py-4 font-bold text-sm tracking-wide uppercase transition-all whitespace-nowrap ${activeTab === 'agenda' ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          Lista de Serviços
        </button>
        <button 
          onClick={() => setActiveTab('finance')}
          className={`px-6 py-4 font-bold text-sm tracking-wide uppercase transition-all whitespace-nowrap ${activeTab === 'finance' ? 'text-emerald-500 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          Gestão Financeira
        </button>
        <button 
          onClick={() => setActiveTab('team')}
          className={`px-6 py-4 font-bold text-sm tracking-wide uppercase transition-all whitespace-nowrap ${activeTab === 'team' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          Gestão de Equipe (RH)
        </button>
        <button 
          onClick={() => setActiveTab('cms')}
          className={`px-6 py-4 font-bold text-sm tracking-wide uppercase transition-all whitespace-nowrap ${activeTab === 'cms' ? 'text-purple-500 border-b-2 border-purple-500 bg-purple-500/5' : 'text-slate-400 hover:text-white'}`}
        >
          Editar Site
        </button>
      </div>

      {activeTab === 'cms' && initialCmsData && (
        <CmsTab initialCmsData={initialCmsData} />
      )}

      {activeTab === 'calendar' && (
        <CalendarTab initialAppointments={appointments} initialAvailableTimes={initialAvailableTimes} />
      )}

      {activeTab === 'team' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Add Employee Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
              <h3 className="text-white font-bold mb-6">Cadastrar Funcionário</h3>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nome Completo</label>
                  <input type="text" name="name" required placeholder="Ex: João Silva" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Cargo / Função</label>
                  <select name="role" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none">
                    <option value="Polidor">Polidor</option>
                    <option value="Lavador">Lavador</option>
                    <option value="Instalador de Película">Instalador de Película</option>
                    <option value="Atendimento">Atendimento</option>
                  </select>
                </div>
                <button type="submit" disabled={isPending} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-50">
                  Adicionar à Equipe
                </button>
              </form>
            </div>

            {/* Time Tracking (Ponto) */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold">Ponto Eletrônico (Hoje)</h3>
                <span className="text-xs font-medium bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3 font-medium">Funcionário</th>
                      <th className="py-3 font-medium">Entrada</th>
                      <th className="py-3 font-medium">Saída</th>
                      <th className="py-3 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {employees.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-500">Nenhum funcionário cadastrado.</td></tr>
                    ) : employees.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-800/30">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-bold text-white">{emp.name}</div>
                              <div className="text-xs text-blue-400">{emp.role}</div>
                            </div>
                            <button 
                              onClick={() => handleRemoveEmployee(emp.id, emp.name)}
                              disabled={isPending}
                              className="text-slate-600 hover:text-red-500 transition-colors opacity-50 hover:opacity-100 ml-1"
                              title="Remover Funcionário"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                        <td className="py-4 font-mono text-emerald-400">
                          {emp.todayLog?.clock_in || '--:--'}
                        </td>
                        <td className="py-4 font-mono text-orange-400">
                          {emp.todayLog?.clock_out || '--:--'}
                        </td>
                        <td className="py-4 text-right">
                          {!emp.todayLog?.clock_in ? (
                            <button 
                              onClick={() => handleTimeClock(emp.id, 'in')}
                              disabled={isPending}
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                              Bater Entrada
                            </button>
                          ) : !emp.todayLog?.clock_out ? (
                            <button 
                              onClick={() => handleTimeClock(emp.id, 'out')}
                              disabled={isPending}
                              className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                              Bater Saída
                            </button>
                          ) : (
                            <span className="text-slate-500 text-xs font-bold bg-slate-800/50 px-3 py-1.5 rounded-lg">Ponto Fechado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hours Worked Chart */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-white font-bold mb-6">Horas Trabalhadas (Mês Atual)</h3>
              <div className="h-72 w-full">
                {teamChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickMargin={10} 
                        tickFormatter={(val, i) => `${val} (${teamChartData[i].Horas}h)`}
                      />
                      <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${val}h`} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                      <Bar 
                        dataKey="Horas" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    Sem registros de ponto fechados neste mês.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header & Month Navigation */}
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white">Relatório Financeiro</h2>
            <div className="flex gap-4 items-center">
              <button 
                onClick={() => setFinanceDate(new Date(financeDate.getFullYear(), financeDate.getMonth() - 1, 1))} 
                className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition"
              >
                ⬅️
              </button>
              <div className="text-lg font-bold text-emerald-400 w-40 text-center uppercase tracking-wider text-sm">
                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][financeDate.getMonth()]} {financeDate.getFullYear()}
              </div>
              <button 
                onClick={() => setFinanceDate(new Date(financeDate.getFullYear(), financeDate.getMonth() + 1, 1))} 
                className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition"
              >
                ➡️
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px]" />
              <h3 className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1 relative z-10">Receita Bruta</h3>
              <p className="text-3xl font-black text-emerald-400 relative z-10">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px]" />
              <h3 className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1 relative z-10">Despesas Totais</h3>
              <p className="text-3xl font-black text-red-400 relative z-10">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}
              </p>
            </div>
            
            <div className={`bg-slate-900 border ${netProfit >= 0 ? 'border-orange-500/30' : 'border-red-500/30'} rounded-2xl p-6 shadow-xl relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${netProfit >= 0 ? 'bg-orange-500/10' : 'bg-red-500/10'} blur-[50px]`} />
              <h3 className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1 relative z-10">Lucro Líquido</h3>
              <p className="text-3xl font-black text-white relative z-10">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netProfit)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-white font-bold mb-6">Faturamento Diário vs Despesas</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} tickFormatter={(val) => `Dia ${val}`} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `R$ ${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-white font-bold mb-6">Lançar Nova Despesa</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Data do Gasto</label>
                  <input type="date" name="expense_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
                  <input type="text" name="description" required placeholder="Ex: Conta de Luz" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
                  <select name="category" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" defaultValue="Operacional">
                    <option value="Operacional">Operacional (Água, Luz, Internet)</option>
                    <option value="Insumos">Insumos (Produtos, Ceras)</option>
                    <option value="Folha de Pagamento">Folha de Pagamento</option>
                    <option value="Marketing">Marketing / Tráfego</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" name="amount" required placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <button type="submit" disabled={isPending} className="w-full mt-4 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-50">
                  Registrar Gasto
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agenda' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px]" />
              <h3 className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1 relative z-10">Serviços Concluídos</h3>
              <p className="text-3xl font-black text-white relative z-10">{completedCount}</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px]" />
              <h3 className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-1 relative z-10">Ticket Médio por Serviço</h3>
              <p className="text-3xl font-black text-white relative z-10">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgTicket)}
              </p>
            </div>
          </div>

          {/* Eligible Clients Alert */}
          {eligibleClients && eligibleClients.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <h3 className="text-orange-400 font-bold mb-1">Atenção: Clientes Elegíveis para Lavagem Grátis</h3>
                  <p className="text-slate-300 text-sm mb-3">Os clientes abaixo completaram 10 lavagens e têm direito a uma Lavagem Técnica Detalhada gratuita.</p>
                  <div className="flex flex-wrap gap-2">
                    {eligibleClients.map(c => (
                      <div key={c.id} className="bg-slate-900 border border-orange-500/30 text-slate-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span className="font-bold text-white">{c.full_name}</span>
                        <a href={`https://wa.me/55${c.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
                          {c.whatsapp}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-6 font-semibold">Data / Hora</th>
                    <th className="p-6 font-semibold">Cliente</th>
                    <th className="p-6 font-semibold">Serviço & Veículo</th>
                    <th className="p-6 font-semibold">Status</th>
                    <th className="p-6 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {appointments.filter(a => a.status !== 'CONFIG_HORARIOS').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500">Nenhum agendamento encontrado.</td>
                    </tr>
                  ) : (
                    appointments.filter(a => a.status !== 'CONFIG_HORARIOS').map((app) => (
                      <tr key={app.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="p-6">
                          <div className="font-bold text-white mb-1">
                            {app.scheduled_date ? new Intl.DateTimeFormat('pt-BR').format(new Date(app.scheduled_date + 'T12:00:00')) : 'S/ Data'}
                          </div>
                          <div className="text-orange-400 font-medium text-xs bg-orange-500/10 inline-block px-2 py-0.5 rounded border border-orange-500/20">
                            {app.scheduled_time || 'S/ Hora'}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-bold text-white mb-1">{app.client_name}</div>
                          <a href={`https://wa.me/55${app.client_whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-slate-400 text-xs hover:text-green-400 transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.172a9.123 9.123 0 01-4.708-1.298l-.337-.2-3.498.918.937-3.414-.219-.348a9.125 9.125 0 117.825 4.342zm-5.748-3.03l.366.217a7.618 7.618 0 10-2.316-2.585l.233.369-.556 2.029 2.273-.596zM15.42 13.84c-.187-.094-1.11-.548-1.282-.61-.173-.062-.299-.094-.424.094-.125.187-.487.61-.599.734-.112.125-.224.14-.412.047-.187-.094-.791-.292-1.506-.928-.556-.494-.931-1.106-1.043-1.293-.112-.187-.012-.288.082-.381.084-.084.187-.219.281-.328.093-.109.125-.187.187-.312.062-.125.031-.234-.016-.328-.047-.094-.424-1.024-.582-1.402-.153-.368-.308-.318-.424-.324-.109-.006-.234-.012-.359-.012s-.328.047-.5.234c-.172.187-.656.641-.656 1.562 0 .922.671 1.812.765 1.937.094.125 1.321 2.016 3.2 2.831 1.63.707 2.247.747 3.037.625.688-.106 1.11-.453 1.265-.891.156-.437.156-.812.109-.891-.046-.078-.172-.125-.359-.219z"/></svg>
                            {app.client_whatsapp}
                          </a>
                        </td>
                        <td className="p-6">
                          <div className={`font-bold mb-1 flex items-center gap-2 ${app.service_name?.includes('GRÁTIS - FIDELIDADE') ? 'text-orange-400' : 'text-slate-200'}`}>
                            {app.service_name}
                            {app.service_name?.includes('GRÁTIS - FIDELIDADE') && (
                              <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Fidelidade</span>
                            )}
                          </div>
                          <div className="text-slate-500 text-xs mb-3">{app.vehicle}</div>
                          
                          {app.delivery_type === 'leva_traz' ? (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded p-2 text-xs">
                              <strong className="text-orange-400 block mb-1 flex items-center justify-between">
                                <span>🚗 Leva e Traz Solicitado</span>
                                {app.client_address && (
                                  <a 
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(app.client_address + ', Itapiranga, SC')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-orange-600 hover:bg-orange-500 text-white p-1 rounded-md"
                                    title="Abrir no Mapa"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                                  </a>
                                )}
                              </strong>
                              <span className="text-slate-400">{app.client_address || 'Endereço não informado'}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">
                              📍 Cliente trará na loja
                            </div>
                          )}
                        </td>
                        <td className="p-6">
                          {app.status === 'Concluído' ? (
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider">Concluído</span>
                          ) : app.status === 'Cancelado' ? (
                            <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-wider">Cancelado</span>
                          ) : (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold uppercase tracking-wider">Agendado</span>
                          )}
                          {app.status === 'Concluído' && app.final_price && (
                            <div className="mt-2 text-emerald-400 font-bold text-xs">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(app.final_price)}
                            </div>
                          )}
                        </td>
                        <td className="p-6 text-right space-x-2">
                          {(app.status === 'Agendado' || app.status === 'Pendente') && (
                            <>
                              <button 
                                onClick={() => handleComplete(app.id, app.client_id)}
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                              >
                                Concluir
                              </button>
                              <button 
                                onClick={() => handleCancel(app.id)}
                                disabled={isPending}
                                className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/50 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
