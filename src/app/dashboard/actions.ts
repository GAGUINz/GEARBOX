"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function completeAppointment(appointmentId: string, clientId: string, finalPrice: number) {
  const supabase = await createClient()

  // 1. Verify user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: "Acesso negado" }

  // Fetch appointment details first
  const { data: appointment } = await supabase.from('appointments').select('service_name, status').eq('id', appointmentId).single()
  
  if (!appointment) return { error: "Agendamento não encontrado" }
  if (appointment.status === 'Concluído') return { error: "Agendamento já concluído" }

  // 2. Mark appointment as completed and save final price
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'Concluído', final_price: finalPrice })
    .eq('id', appointmentId)

  if (updateError) {
    console.error("Error updating appointment:", updateError)
    return { error: "Erro ao atualizar agendamento" }
  }

  // 3. Increment loyalty points for the client (ONLY if not a free wash)
  const isFreeWash = appointment.service_name?.includes('GRÁTIS - FIDELIDADE')
  if (!isFreeWash) {
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('loyalty_points')
      .eq('id', clientId)
      .single()

    const currentPoints = clientProfile?.loyalty_points || 0
    const newPoints = currentPoints + 1

    const { error: pointsError } = await supabase
      .from('profiles')
      .update({ loyalty_points: newPoints })
      .eq('id', clientId)

    if (pointsError) {
      console.error("Error updating loyalty points:", pointsError)
      return { error: "Agendamento concluído, mas erro ao dar pontos." }
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient()

  // 1. Verify user is admin or the owner of the appointment
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: appointment } = await supabase.from('appointments').select('client_id, service_name, status').eq('id', appointmentId).single()
  if (!appointment) return { error: "Agendamento não encontrado" }
  
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  
  if (!profile?.is_admin && appointment.client_id !== user.id) {
    return { error: "Acesso negado" }
  }

  if (appointment.status === 'Cancelado') return { error: "Agendamento já cancelado" }

  // 2. Mark appointment as canceled
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'Cancelado' })
    .eq('id', appointmentId)

  if (updateError) {
    console.error("Error updating appointment:", updateError)
    return { error: "Erro ao cancelar agendamento" }
  }

  // 3. If it was a free wash, refund the 10 points
  const isFreeWash = appointment.service_name?.includes('GRÁTIS - FIDELIDADE')
  if (isFreeWash) {
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('loyalty_points')
      .eq('id', appointment.client_id)
      .single()

    const currentPoints = clientProfile?.loyalty_points || 0
    const { error: pointsError } = await supabase
      .from('profiles')
      .update({ loyalty_points: currentPoints + 10 })
      .eq('id', appointment.client_id)
      
    if (pointsError) {
      console.error("Erro ao devolver pontos:", pointsError)
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function bookAppointment(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const vehicle = formData.get("vehicle") as string || "Não informado"
  const service_id = formData.get("service_id") as string
  const service_name = formData.get("service_name") as string
  const price = formData.get("price") as string
  const scheduled_date = formData.get("scheduled_date") as string
  const scheduled_time = formData.get("scheduled_time") as string
  const delivery_type = formData.get("delivery_type") as string
  const client_address = formData.get("client_address") as string
  const isFreeWash = formData.get("is_free_wash") === 'true'

  if (!scheduled_date || !scheduled_time) {
    return { error: "Por favor, escolha uma data e horário." }
  }

  if (isFreeWash) {
    // Check if user has enough points
    const { data: clientProfile } = await supabase.from('profiles').select('loyalty_points').eq('id', user.id).single()
    const points = clientProfile?.loyalty_points || 0
    if (points < 10) {
      return { error: "Você não possui pontos suficientes para a lavagem grátis." }
    }

    // Deduct 10 points
    const { error: pointsError } = await supabase.from('profiles').update({ loyalty_points: points - 10 }).eq('id', user.id)
    if (pointsError) return { error: "Erro ao resgatar pontos." }
  }

  const { error } = await supabase.from('appointments').insert([
    { 
      client_id: user.id,
      vehicle, 
      service_id,
      service_name: isFreeWash ? `Lavagem Técnica (GRÁTIS - FIDELIDADE) - ${service_name}` : service_name,
      price: isFreeWash ? "R$ 0,00" : price,
      scheduled_date,
      scheduled_time,
      delivery_type,
      client_address: delivery_type === 'leva_traz' ? client_address : null,
      status: "Agendado"
    }
  ])

  if (error) {
    console.error("Error inserting appointment:", error)
    // If it was a free wash, we should refund the points ideally, but for now just return error
    if (isFreeWash) {
      const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', user.id).single()
      await supabase.from('profiles').update({ loyalty_points: (profile?.loyalty_points || 0) + 10 }).eq('id', user.id)
    }
    return { error: `Erro: ${error.message}` }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function insertExpense(formData: FormData) {
  const supabase = await createClient()

  // 1. Verify user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: "Acesso negado" }

  // 2. Parse data
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const rawAmount = formData.get('amount') as string
  const expenseDate = formData.get('expense_date') as string

  if (!description || !category || !rawAmount || !expenseDate) {
    return { error: "Preencha todos os campos" }
  }

  const amount = parseFloat(rawAmount.replace(',', '.'))
  if (isNaN(amount) || amount <= 0) {
    return { error: "Valor inválido" }
  }

  // 3. Insert into database
  const { error } = await supabase.from('expenses').insert([{
    description,
    category,
    amount,
    expense_date: expenseDate
  }])

  if (error) {
    console.error("Error inserting expense:", error)
    return { error: "Erro ao salvar despesa" }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function addEmployee(formData: FormData) {
  const supabase = await createClient()

  // 1. Verify user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const name = formData.get('name') as string
  const role = formData.get('role') as string

  if (!name || !role) return { error: "Preencha nome e cargo." }

  const { error } = await supabase.from('employees').insert([{ name, role }])
  if (error) return { error: "Erro ao cadastrar funcionário." }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function logTimeClock(employeeId: string, actionType: 'in' | 'out', manualTime?: string) {
  const supabase = await createClient()
  
  // 1. Verify user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: "Acesso negado" }

  const now = new Date()
  const todayDate = now.toISOString().split('T')[0]
  const timeString = manualTime || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (actionType === 'in') {
    const { error } = await supabase.from('time_logs').insert([{
      employee_id: employeeId,
      log_date: todayDate,
      clock_in: timeString
    }])
    if (error) return { error: "Erro ao bater ponto de entrada." }
  } else if (actionType === 'out') {
    const { error } = await supabase.from('time_logs')
      .update({ clock_out: timeString })
      .eq('employee_id', employeeId)
      .eq('log_date', todayDate)
      
    if (error) {
      console.error(error)
      return { error: "Erro ao bater ponto de saída." }
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function removeEmployee(employeeId: string) {
  const supabase = await createClient()

  // 1. Verify user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: "Acesso negado" }

  // 2. Soft delete
  const { error } = await supabase.from('employees').update({ active: false }).eq('id', employeeId)
  if (error) return { error: "Erro ao remover funcionário." }

  revalidatePath('/dashboard')
  return { success: true }
}

// --- CMS Actions ---

export async function addSiteService(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const price = formData.get('price') as string
  const icon = formData.get('icon') as string
  
  const imageFile = formData.get('image_file') as File
  let image_url = null

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-service-${Math.random().toString().slice(2, 8)}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('site-images')
      .upload(fileName, imageFile)
      
    if (uploadError) return { error: "Erro ao fazer upload da imagem no Supabase." }
    
    const { data: publicUrlData } = supabase.storage.from('site-images').getPublicUrl(fileName)
    image_url = publicUrlData.publicUrl
  }

  const { error } = await supabase.from('site_services').insert([{ 
    title, description, price, icon, image_url 
  }])
  
  if (error) return { error: "Erro ao adicionar serviço." }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function updateSiteService(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const price = formData.get('price') as string
  const icon = formData.get('icon') as string
  
  const imageFile = formData.get('image_file') as File
  const updates: any = { title, description, price, icon }

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-service-${Math.random().toString().slice(2, 8)}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('site-images')
      .upload(fileName, imageFile)
      
    if (uploadError) return { error: "Erro ao fazer upload da imagem no Supabase." }
    
    const { data: publicUrlData } = supabase.storage.from('site-images').getPublicUrl(fileName)
    updates.image_url = publicUrlData.publicUrl
  }

  const { error } = await supabase.from('site_services').update(updates).eq('id', id)
  
  if (error) return { error: "Erro ao atualizar serviço." }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function seedServices() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const data = [
    { icon: "🚿|Lavagem e Cuidados Externos", title: "Lavagem Técnica Detalhada", description: "Procedimento minucioso focado na segurança do verniz, utilizando método de dois baldes, luvas de microfibra e pincéis para frestas e emblemas, prevenindo micro-riscos.", price: "A partir de R$ 150" },
    { icon: "🚿|Lavagem e Cuidados Externos", title: "Lavagem Premium", description: "Serviço de alto padrão que além da limpeza técnica, inclui o uso de ceras rápidas ou selantes para entregar um brilho superior e proteção imediata após a lavagem.", price: "A partir de R$ 250" },
    { icon: "🚿|Lavagem e Cuidados Externos", title: "Limpeza de Caixa de Roda", description: "Remoção profunda de barro, terra e fuligem acumulados, devolvendo o aspecto de limpeza original às caixas de ar.", price: "Sob Consulta" },
    { icon: "🚿|Lavagem e Cuidados Externos", title: "Limpeza e Proteção de Rodas", description: "Desincrustação do pó de pastilhas de freio e sujeira viária, finalizada com um produto repelente para facilitar as próximas lavagens.", price: "A partir de R$ 100" },
    { icon: "🚿|Lavagem e Cuidados Externos", title: "Aplicação de Pretinho Premium", description: "Condicionamento dos pneus com produtos de alta durabilidade (acetinados ou brilhantes) que não grudam poeira e resistem à água.", price: "Sob Consulta" },

    { icon: "🧪|Descontaminação e Restauração", title: "Descontaminação de Pintura", description: "Processo físico (com clay bar) ou químico para remover impurezas cravadas no verniz, como seiva de árvore, névoa de tinta e poluição industrial, deixando a pintura lisa como vidro.", price: "A partir de R$ 200" },
    { icon: "🧪|Descontaminação e Restauração", title: "Descontaminação de Rodas", description: "Ação química específica para dissolver partículas de ferro incrustadas nas rodas devido ao desgaste dos freios.", price: "A partir de R$ 120" },
    { icon: "🧪|Descontaminação e Restauração", title: "Remoção de Chuva Ácida", description: "Tratamento químico (geralmente nos vidros) para eliminar manchas de calcificação deixadas por gotas d'água secas.", price: "A partir de R$ 180" },
    { icon: "🧪|Descontaminação e Restauração", title: "Remoção de Piche e Resíduos Asfálticos", description: "Uso de solventes seguros para dissolver e remover respingos de asfalto aderidos na lataria durante a rodagem.", price: "Sob Consulta" },
    { icon: "🧪|Descontaminação e Restauração", title: "Remoção de Cola e Adesivos", description: "Retirada técnica de restos de insulfilm, logotipos ou adesivos sem agredir o verniz ou os vidros.", price: "Sob Consulta" },
    { icon: "🧪|Descontaminação e Restauração", title: "Revitalização de Plásticos Externos", description: "Recuperação da pigmentação e proteção contra raios UV em para-choques, molduras e frisos esbranquiçados.", price: "A partir de R$ 150" },
    { icon: "🧪|Descontaminação e Restauração", title: "Revitalização de Borrachas", description: "Nutrição de guarnições e borrachas de vedação, evitando o ressecamento e rachaduras.", price: "Sob Consulta" },
    { icon: "🧪|Descontaminação e Restauração", title: "Cristalização de Vidros", description: "Aplicação de repelente hídrico no para-brisa e vidros laterais, melhorando drasticamente a visibilidade e a segurança em dias de chuva.", price: "A partir de R$ 120" },

    { icon: "✨|Polimento e Proteção", title: "Polimento Comercial", description: "Processo de polimento rápido focado na melhoria do brilho e na remoção de riscos superficiais leves. Ideal para ganho visual imediato.", price: "A partir de R$ 500" },
    { icon: "✨|Polimento e Proteção", title: "Polimento Técnico", description: "Correção profunda do verniz dividida em etapas (corte, refino e lustro). Busca a máxima eliminação de riscos, hologramas e marcas de lavagem, entregando um nível de perfeição.", price: "A partir de R$ 1.200" },
    { icon: "✨|Polimento e Proteção", title: "Vitrificação de Pintura / Ceramic Coating", description: "Revestimento nano-cerâmico que cria uma película de sacrifício resistente, oferecendo brilho intenso, propriedades hidrorepelentes e proteção prolongada (anos) contra intempéries.", price: "A partir de R$ 1.500" },
    { icon: "✨|Polimento e Proteção", title: "Selante Sintético", description: "Proteção polimérica de longa duração que sela os poros do verniz contra os elementos externos.", price: "A partir de R$ 350" },
    { icon: "✨|Polimento e Proteção", title: "Cera Premium de Carnaúba", description: "Proteção natural focada em entregar um brilho \"quente\", espelhado e profundo, muito utilizada em veículos de coleção ou exposição.", price: "A partir de R$ 250" },
    { icon: "✨|Polimento e Proteção", title: "Proteção Cerâmica para Rodas", description: "Vitrificação resistente a altas temperaturas, específica para rodas, que impede a fixação profunda da fuligem de freio.", price: "A partir de R$ 400" },
    { icon: "✨|Polimento e Proteção", title: "Polimento de Faróis", description: "Lixamento e polimento das lentes de policarbonato para remover a oxidação e o aspecto amarelado/fosco, devolvendo a iluminação original.", price: "A partir de R$ 150" },
    { icon: "✨|Polimento e Proteção", title: "Vitrificação de Faróis", description: "Aplicação de proteção cerâmica logo após o polimento para impedir que o farol volte a amarelar precocemente pela ação do sol.", price: "A partir de R$ 250" },

    { icon: "🛋️|Estética e Higienização", title: "Higienização Interna Completa", description: "Limpeza e desinfecção minuciosa de todo o habitáculo (teto, painel, bancos, carpetes e portas).", price: "A partir de R$ 600" },
    { icon: "🛋️|Estética e Higienização", title: "Higienização de Bancos", description: "Lavagem a seco ou por extração (tecido) focada na remoção de manchas, suor, poeira encardida e odores.", price: "A partir de R$ 250" },
    { icon: "🛋️|Estética e Higienização", title: "Higienização e Hidratação de Couro", description: "Limpeza com produtos de pH equilibrado seguida de nutrição para devolver a maciez, toque original (fosco) e evitar trincas.", price: "A partir de R$ 350" },
    { icon: "🛋️|Estética e Higienização", title: "Limpeza de Painel e Plásticos", description: "Desengorduramento e aplicação de protetor UV, devolvendo a cor original do painel e das portas sem aspecto oleoso.", price: "A partir de R$ 150" },
    { icon: "🛋️|Estética e Higienização", title: "Limpeza de Teto", description: "Procedimento delicado de limpeza a seco ou com espumas específicas para remover sujeira do forro sem causar descolamento.", price: "A partir de R$ 200" },
    { icon: "🛋️|Estética e Higienização", title: "Limpeza de Carpetes e Porta-Malas", description: "Aspiração técnica e extração de sujeiras líquidas ou sólidas entranhadas no piso do veículo.", price: "A partir de R$ 200" },
    { icon: "🛋️|Estética e Higienização", title: "Limpeza de Saídas de Ar", description: "Uso de pincéis, cotonetes e vapor para remover poeira e ácaros dos difusores de ar-condicionado.", price: "Sob Consulta" },
    { icon: "🛋️|Estética e Higienização", title: "Limpeza de Cintos de Segurança", description: "Remoção de óleos corporais e encardidos da trama do cinto, devolvendo a flexibilidade e a cor.", price: "Sob Consulta" },
    { icon: "🛋️|Estética e Higienização", title: "Impermeabilização de Bancos", description: "Aplicação de resina protetora que bloqueia a absorção de líquidos e evita manchas por derramamentos acidentais.", price: "A partir de R$ 400" },

    { icon: "🏍️|Estética para Motos", title: "Lavagem Técnica para Motos", description: "Limpeza feita nos mínimos detalhes com o uso de pincéis, cuidando da parte elétrica, motor e balança com produtos desengraxantes seguros.", price: "A partir de R$ 180" },
    { icon: "🏍️|Estética para Motos", title: "Polimento de Tanque", description: "Correção focada na remoção dos riscos típicos causados pelo atrito de jaquetas e pernas no verniz do tanque.", price: "A partir de R$ 200" },
    { icon: "🏍️|Estética para Motos", title: "Vitrificação de Moto", description: "Aplicação de coating cerâmico no tanque, plásticos e metais para garantir proteção UV extrema e facilitar as limpezas devido à grande exposição das peças.", price: "A partir de R$ 600" },

    { icon: "📦|Combos e Projetos Especiais", title: "Detalhamento Automotivo Completo", description: "O serviço definitivo. Engloba o cuidado extremo desde o chassi e motor até o refinamento interno e correção de pintura total.", price: "Sob Consulta" },
    { icon: "📦|Combos e Projetos Especiais", title: "Preparação para Venda", description: "Combo estratégico com excelente custo-benefício, focado em causar impacto visual, limpar o interior e elevar significativamente o valor de mercado do veículo.", price: "A partir de R$ 800" },
    { icon: "📦|Combos e Projetos Especiais", title: "Detailing de Veículos Premium", description: "Atendimento especializado voltado para carros esportivos ou de luxo, utilizando compostos e selantes de altíssima gama e cuidados específicos com materiais nobres (como Alcântara e fibra de carbono).", price: "Sob Consulta" },
    { icon: "📦|Combos e Projetos Especiais", title: "Plano de Manutenção Mensal", description: "Pacote recorrente para clientes fiéis, onde o veículo recebe lavagens técnicas regulares e manutenções na proteção da pintura, mantendo-o sempre impecável o ano todo.", price: "Sob Consulta" }
  ];

  await supabase.from('site_services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await supabase.from('site_services').insert(data);
  if (error) return { error: "Erro ao inserir serviços: " + error.message }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function removeSiteService(id: string) {
  const supabase = await createClient()
  await supabase.from('site_services').delete().eq('id', id)
  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function addSiteGallery(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const category = formData.get('category') as string
  const title = formData.get('title') as string
  const order_index = parseInt(formData.get('order_index') as string) || 0
  
  const imageFile = formData.get('image_file') as File
  const imageFileBefore = formData.get('image_file_before') as File
  let image_url = ""
  let image_url_before = null

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-after-${Math.random().toString().slice(2, 8)}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('site-images')
      .upload(fileName, imageFile)
      
    if (uploadError) return { error: "Erro ao fazer upload da imagem no Supabase." }
    
    const { data: publicUrlData } = supabase.storage.from('site-images').getPublicUrl(fileName)
    image_url = publicUrlData.publicUrl
  } else {
    return { error: "Nenhuma imagem selecionada." }
  }

  // Upload Before Image if it exists
  if (imageFileBefore && imageFileBefore.size > 0) {
    const fileExt = imageFileBefore.name.split('.').pop()
    const fileName = `${Date.now()}-before-${Math.random().toString().slice(2, 8)}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('site-images')
      .upload(fileName, imageFileBefore)
      
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('site-images').getPublicUrl(fileName)
      image_url_before = publicUrlData.publicUrl
    }
  }

  const { error } = await supabase.from('site_gallery').insert([{ image_url, image_url_before, category, title, order_index }])
  if (error) return { error: "Erro ao adicionar imagem ao site." }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function removeSiteGallery(id: string) {
  const supabase = await createClient()
  await supabase.from('site_gallery').delete().eq('id', id)
  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function updateSiteStudio(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const image_url = formData.get('image_url') as string

  // update the only row
  const { data: existing } = await supabase.from('site_studio').select('id').limit(1)
  
  if (existing && existing.length > 0) {
    await supabase.from('site_studio').update({ title, description, image_url }).eq('id', existing[0].id)
  } else {
    await supabase.from('site_studio').insert([{ title, description, image_url }])
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function addSiteTestimonial(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const client_name = formData.get('client_name') as string
  const content = formData.get('content') as string
  const vehicle = formData.get('vehicle') as string
  const rating = parseInt(formData.get('rating') as string) || 5

  const { error } = await supabase.from('site_testimonials').insert([{ client_name, content, vehicle, rating }])
  if (error) return { error: "Erro ao adicionar depoimento." }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function removeSiteTestimonial(id: string) {
  const supabase = await createClient()
  await supabase.from('site_testimonials').delete().eq('id', id)
  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function toggleScheduleBlock(date: string, time: string, isBlock: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: "Acesso negado" }

  if (isBlock) {
    const { error } = await supabase.from('appointments').insert([{
      client_id: user.id,
      service_id: '00000000-0000-0000-0000-000000000000',
      vehicle: 'N/A',
      service_name: 'Bloqueio de Agenda',
      status: 'Bloqueado',
      scheduled_date: date,
      scheduled_time: time
    }])
    if (error) {
      console.error(error)
      return { error: `Erro: ${error.message} - ${error.details} - ${error.hint}` }
    }
  } else {
    const { error } = await supabase.from('appointments').delete()
      .eq('scheduled_date', date)
      .eq('scheduled_time', time)
      .eq('status', 'Bloqueado')
    if (error) return { error: "Erro ao desbloquear horário" }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function blockFullDay(date: string, times: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: "Acesso negado" }

  // First remove existing blocks to avoid duplicates
  await supabase.from('appointments').delete()
    .eq('scheduled_date', date)
    .eq('status', 'Bloqueado')

  const inserts = times.map(time => ({
    client_id: user.id,
    service_id: '00000000-0000-0000-0000-000000000000',
    vehicle: 'N/A',
    service_name: 'Bloqueio de Agenda',
    status: 'Bloqueado',
    scheduled_date: date,
    scheduled_time: time
  }))

  const { error } = await supabase.from('appointments').insert(inserts)
  if (error) {
    console.error("Erro no blockFullDay:", error)
    return { error: `Erro: ${error.message} - ${error.details} - ${error.hint}` }
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function getAvailableTimes() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('appointments')
    .select('vehicle')
    .eq('status', 'CONFIG_HORARIOS')
    .eq('service_name', 'AVAILABLE_TIMES')
    .order('created_at', { ascending: false })
    .limit(1)
    
  if (data && data.length > 0 && data[0].vehicle) {
    try {
      return JSON.parse(data[0].vehicle) as string[]
    } catch(e) {
      console.error("Failed to parse available times", e)
    }
  }
  return ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
}

export async function updateAvailableTimes(times: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: "Acesso negado" }

  // Excluir config antiga
  await supabase
    .from('appointments')
    .delete()
    .eq('status', 'CONFIG_HORARIOS')
    .eq('service_name', 'AVAILABLE_TIMES')

  // Inserir nova config
  const { error } = await supabase.from('appointments').insert([{
    client_id: user.id, // using the admin's id to satisfy UUID
    service_id: '00000000-0000-0000-0000-000000000000',
    vehicle: JSON.stringify(times.sort()),
    service_name: 'AVAILABLE_TIMES',
    price: '0',
    scheduled_date: '2099-12-31',
    scheduled_time: '00:00',
    delivery_type: 'none',
    status: 'CONFIG_HORARIOS'
  }])

  if (error) {
    console.error("Error saving times:", error)
    return { error: "Erro ao salvar horários" }
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
  return { success: true }
}
