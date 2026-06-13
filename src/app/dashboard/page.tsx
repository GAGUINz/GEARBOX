import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "./dashboard-client"
import { BackButton } from "./back-button"
import { getAvailableTimes } from "./actions"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // 1. Check Auth & Admin Role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.is_admin) {
    redirect('/')
  }

  // 2. Fetch Appointments manually and join with Profiles
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .order('scheduled_date', { ascending: false })
    .order('scheduled_time', { ascending: false })

  let enrichedAppointments = []

  if (appointments && appointments.length > 0) {
    // Fetch unique client IDs
    const clientIds = [...new Set(appointments.map(a => a.client_id))]
    
    // Fetch profiles for those clients
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, whatsapp')
      .in('id', clientIds)
      
    // Map them together
    enrichedAppointments = appointments.map(app => {
      const clientProfile = profiles?.find(p => p.id === app.client_id)
      return {
        ...app,
        client_name: clientProfile?.full_name || 'Desconhecido',
        client_whatsapp: clientProfile?.whatsapp || 'Sem número'
      }
    })
  }

  // 3. Fetch Expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })

  // 4. Fetch Employees and all time logs
  const { data: employees } = await supabase.from('employees').select('*').eq('active', true).order('name')
  
  const { data: allTimeLogs } = await supabase.from('time_logs').select('*')
  
  const today = new Date().toISOString().split('T')[0]

  // Attach today's log to each employee
  const enrichedEmployees = employees?.map(emp => {
    const todayLog = allTimeLogs?.find(log => log.employee_id === emp.id && log.log_date === today)
    return {
      ...emp,
      todayLog: todayLog || null
    }
  }) || []

  // 5. Fetch CMS Data
  const { data: siteServices } = await supabase.from('site_services').select('*').order('created_at', { ascending: true })
  const { data: siteGallery } = await supabase.from('site_gallery').select('*').order('created_at', { ascending: false })
  const { data: siteStudioArray } = await supabase.from('site_studio').select('*').limit(1)
  const siteStudio = siteStudioArray?.[0] || null
  const { data: siteTestimonials } = await supabase.from('site_testimonials').select('*').order('created_at', { ascending: false })

  // 6. Fetch Eligible Clients for Free Wash
  const { data: eligibleClientsData } = await supabase.from('profiles').select('id, full_name, whatsapp, loyalty_points').gte('loyalty_points', 10)

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-6">
            <BackButton />
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 tracking-tight">
                GEARBOX <span className="text-white">Admin</span>
              </h1>
              <p className="text-slate-400 mt-1 text-sm">Centro de Comando e Agendamentos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold">{profile.full_name}</p>
              <p className="text-xs text-orange-500 uppercase tracking-widest">Proprietário</p>
            </div>
            <div className="w-12 h-12 bg-orange-600/20 rounded-full border border-orange-500/50 flex items-center justify-center text-orange-500 font-bold">
              {profile.full_name.charAt(0)}
            </div>
          </div>
        </header>

        <DashboardClient 
          initialAppointments={enrichedAppointments} 
          initialAvailableTimes={await getAvailableTimes()}
          initialExpenses={expenses || []} 
          initialEmployees={enrichedEmployees}
          initialTimeLogs={allTimeLogs || []}
          eligibleClients={eligibleClientsData || []}
          initialCmsData={{
            services: siteServices || [],
            gallery: siteGallery || [],
            studio: siteStudio,
            testimonials: siteTestimonials || []
          }}
        />
      </div>
    </main>
  )
}
