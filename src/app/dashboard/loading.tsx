export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-orange-500 rounded-full animate-spin"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500">
          <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
      </div>
      <h2 className="mt-6 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 tracking-widest uppercase animate-pulse">
        Acessando Central
      </h2>
      <p className="text-slate-500 mt-2 text-sm">Carregando dados financeiros e agendamentos...</p>
    </main>
  )
}
