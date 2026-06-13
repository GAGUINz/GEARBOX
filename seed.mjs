import { createClient } from '@supabase/supabase-js';

const url = "https://rzrxgxqshpmnufsriwky.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cnhneHFzaHBtbnVmc3Jpd2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODkyODYsImV4cCI6MjA5NTU2NTI4Nn0.Xw84F-mPo-dNGeISjck_0KzUj-GHvW9SkkwFE46B9K4";

const supabase = createClient(url, key);

const data = [
  // 🚿 Lavagem e Cuidados Externos
  { icon: "🚿|Lavagem e Cuidados Externos", title: "Lavagem Técnica Detalhada", description: "Procedimento minucioso focado na segurança do verniz, utilizando método de dois baldes, luvas de microfibra e pincéis para frestas e emblemas, prevenindo micro-riscos.", price: "A partir de R$ 150" },
  { icon: "🚿|Lavagem e Cuidados Externos", title: "Lavagem Premium", description: "Serviço de alto padrão que além da limpeza técnica, inclui o uso de ceras rápidas ou selantes para entregar um brilho superior e proteção imediata após a lavagem.", price: "A partir de R$ 250" },
  { icon: "🚿|Lavagem e Cuidados Externos", title: "Limpeza de Caixa de Roda", description: "Remoção profunda de barro, terra e fuligem acumulados, devolvendo o aspecto de limpeza original às caixas de ar.", price: "Sob Consulta" },
  { icon: "🚿|Lavagem e Cuidados Externos", title: "Limpeza e Proteção de Rodas", description: "Desincrustação do pó de pastilhas de freio e sujeira viária, finalizada com um produto repelente para facilitar as próximas lavagens.", price: "A partir de R$ 100" },
  { icon: "🚿|Lavagem e Cuidados Externos", title: "Aplicação de Pretinho Premium", description: "Condicionamento dos pneus com produtos de alta durabilidade (acetinados ou brilhantes) que não grudam poeira e resistem à água.", price: "Sob Consulta" },

  // 🧪 Descontaminação e Restauração de Superfícies
  { icon: "🧪|Descontaminação e Restauração", title: "Descontaminação de Pintura", description: "Processo físico (com clay bar) ou químico para remover impurezas cravadas no verniz, como seiva de árvore, névoa de tinta e poluição industrial, deixando a pintura lisa como vidro.", price: "A partir de R$ 200" },
  { icon: "🧪|Descontaminação e Restauração", title: "Descontaminação de Rodas", description: "Ação química específica para dissolver partículas de ferro incrustadas nas rodas devido ao desgaste dos freios.", price: "A partir de R$ 120" },
  { icon: "🧪|Descontaminação e Restauração", title: "Remoção de Chuva Ácida", description: "Tratamento químico (geralmente nos vidros) para eliminar manchas de calcificação deixadas por gotas d'água secas.", price: "A partir de R$ 180" },
  { icon: "🧪|Descontaminação e Restauração", title: "Remoção de Piche e Resíduos Asfálticos", description: "Uso de solventes seguros para dissolver e remover respingos de asfalto aderidos na lataria durante a rodagem.", price: "Sob Consulta" },
  { icon: "🧪|Descontaminação e Restauração", title: "Remoção de Cola e Adesivos", description: "Retirada técnica de restos de insulfilm, logotipos ou adesivos sem agredir o verniz ou os vidros.", price: "Sob Consulta" },
  { icon: "🧪|Descontaminação e Restauração", title: "Revitalização de Plásticos Externos", description: "Recuperação da pigmentação e proteção contra raios UV em para-choques, molduras e frisos esbranquiçados.", price: "A partir de R$ 150" },
  { icon: "🧪|Descontaminação e Restauração", title: "Revitalização de Borrachas", description: "Nutrição de guarnições e borrachas de vedação, evitando o ressecamento e rachaduras.", price: "Sob Consulta" },
  { icon: "🧪|Descontaminação e Restauração", title: "Cristalização de Vidros", description: "Aplicação de repelente hídrico no para-brisa e vidros laterais, melhorando drasticamente a visibilidade e a segurança em dias de chuva.", price: "A partir de R$ 120" },

  // ✨ Polimento e Proteção de Pintura (Coatings)
  { icon: "✨|Polimento e Proteção", title: "Polimento Comercial", description: "Processo de polimento rápido focado na melhoria do brilho e na remoção de riscos superficiais leves. Ideal para ganho visual imediato.", price: "A partir de R$ 500" },
  { icon: "✨|Polimento e Proteção", title: "Polimento Técnico", description: "Correção profunda do verniz dividida em etapas (corte, refino e lustro). Busca a máxima eliminação de riscos, hologramas e marcas de lavagem, entregando um nível de perfeição.", price: "A partir de R$ 1.200" },
  { icon: "✨|Polimento e Proteção", title: "Vitrificação de Pintura / Ceramic Coating", description: "Revestimento nano-cerâmico que cria uma película de sacrifício resistente, oferecendo brilho intenso, propriedades hidrorepelentes e proteção prolongada (anos) contra intempéries.", price: "A partir de R$ 1.500" },
  { icon: "✨|Polimento e Proteção", title: "Selante Sintético", description: "Proteção polimérica de longa duração que sela os poros do verniz contra os elementos externos.", price: "A partir de R$ 350" },
  { icon: "✨|Polimento e Proteção", title: "Cera Premium de Carnaúba", description: "Proteção natural focada em entregar um brilho \"quente\", espelhado e profundo, muito utilizada em veículos de coleção ou exposição.", price: "A partir de R$ 250" },
  { icon: "✨|Polimento e Proteção", title: "Proteção Cerâmica para Rodas", description: "Vitrificação resistente a altas temperaturas, específica para rodas, que impede a fixação profunda da fuligem de freio.", price: "A partir de R$ 400" },
  { icon: "✨|Polimento e Proteção", title: "Polimento de Faróis", description: "Lixamento e polimento das lentes de policarbonato para remover a oxidação e o aspecto amarelado/fosco, devolvendo a iluminação original.", price: "A partir de R$ 150" },
  { icon: "✨|Polimento e Proteção", title: "Vitrificação de Faróis", description: "Aplicação de proteção cerâmica logo após o polimento para impedir que o farol volte a amarelar precocemente pela ação do sol.", price: "A partir de R$ 250" },

  // 🛋️ Estética e Higienização Interna
  { icon: "🛋️|Estética e Higienização", title: "Higienização Interna Completa", description: "Limpeza e desinfecção minuciosa de todo o habitáculo (teto, painel, bancos, carpetes e portas).", price: "A partir de R$ 600" },
  { icon: "🛋️|Estética e Higienização", title: "Higienização de Bancos", description: "Lavagem a seco ou por extração (tecido) focada na remoção de manchas, suor, poeira encardida e odores.", price: "A partir de R$ 250" },
  { icon: "🛋️|Estética e Higienização", title: "Higienização e Hidratação de Couro", description: "Limpeza com produtos de pH equilibrado seguida de nutrição para devolver a maciez, toque original (fosco) e evitar trincas.", price: "A partir de R$ 350" },
  { icon: "🛋️|Estética e Higienização", title: "Limpeza de Painel e Plásticos", description: "Desengorduramento e aplicação de protetor UV, devolvendo a cor original do painel e das portas sem aspecto oleoso.", price: "A partir de R$ 150" },
  { icon: "🛋️|Estética e Higienização", title: "Limpeza de Teto", description: "Procedimento delicado de limpeza a seco ou com espumas específicas para remover sujeira do forro sem causar descolamento.", price: "A partir de R$ 200" },
  { icon: "🛋️|Estética e Higienização", title: "Limpeza de Carpetes e Porta-Malas", description: "Aspiração técnica e extração de sujeiras líquidas ou sólidas entranhadas no piso do veículo.", price: "A partir de R$ 200" },
  { icon: "🛋️|Estética e Higienização", title: "Limpeza de Saídas de Ar", description: "Uso de pincéis, cotonetes e vapor para remover poeira e ácaros dos difusores de ar-condicionado.", price: "Sob Consulta" },
  { icon: "🛋️|Estética e Higienização", title: "Limpeza de Cintos de Segurança", description: "Remoção de óleos corporais e encardidos da trama do cinto, devolvendo a flexibilidade e a cor.", price: "Sob Consulta" },
  { icon: "🛋️|Estética e Higienização", title: "Impermeabilização de Bancos", description: "Aplicação de resina protetora que bloqueia a absorção de líquidos e evita manchas por derramamentos acidentais.", price: "A partir de R$ 400" },

  // 🏍️ Estética para Motocicletas
  { icon: "🏍️|Estética para Motos", title: "Lavagem Técnica para Motos", description: "Limpeza feita nos mínimos detalhes com o uso de pincéis, cuidando da parte elétrica, motor e balança com produtos desengraxantes seguros.", price: "A partir de R$ 180" },
  { icon: "🏍️|Estética para Motos", title: "Polimento de Tanque", description: "Correção focada na remoção dos riscos típicos causados pelo atrito de jaquetas e pernas no verniz do tanque.", price: "A partir de R$ 200" },
  { icon: "🏍️|Estética para Motos", title: "Vitrificação de Moto", description: "Aplicação de coating cerâmico no tanque, plásticos e metais para garantir proteção UV extrema e facilitar as limpezas devido à grande exposição das peças.", price: "A partir de R$ 600" },

  // 📦 Combos, Pacotes e Projetos Especiais
  { icon: "📦|Combos e Projetos Especiais", title: "Detalhamento Automotivo Completo", description: "O serviço definitivo. Engloba o cuidado extremo desde o chassi e motor até o refinamento interno e correção de pintura total.", price: "Sob Consulta" },
  { icon: "📦|Combos e Projetos Especiais", title: "Preparação para Venda", description: "Combo estratégico com excelente custo-benefício, focado em causar impacto visual, limpar o interior e elevar significativamente o valor de mercado do veículo.", price: "A partir de R$ 800" },
  { icon: "📦|Combos e Projetos Especiais", title: "Detailing de Veículos Premium", description: "Atendimento especializado voltado para carros esportivos ou de luxo, utilizando compostos e selantes de altíssima gama e cuidados específicos com materiais nobres (como Alcântara e fibra de carbono).", price: "Sob Consulta" },
  { icon: "📦|Combos e Projetos Especiais", title: "Plano de Manutenção Mensal", description: "Pacote recorrente para clientes fiéis, onde o veículo recebe lavagens técnicas regulares e manutenções na proteção da pintura, mantendo-o sempre impecável o ano todo.", price: "Sob Consulta" }
];

async function run() {
  console.log("Deleting old services...");
  await supabase.from('site_services').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  console.log("Inserting new services...");
  const { error } = await supabase.from('site_services').insert(data);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Done!");
  }
}

run();
