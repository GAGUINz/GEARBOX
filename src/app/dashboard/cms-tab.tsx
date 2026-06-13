"use client"

import { useState, useTransition } from "react"
import { addSiteService, removeSiteService, updateSiteService, seedServices, addSiteGallery, removeSiteGallery, updateSiteStudio, addSiteTestimonial, removeSiteTestimonial } from "./actions"

export function CmsTab({ initialCmsData }: { initialCmsData: any }) {
  const [isPending, startTransition] = useTransition()
  const [galleryCategory, setGalleryCategory] = useState("obras")
  const [editingService, setEditingService] = useState<any>(null)

  const handleSeed = () => {
    if (!confirm("Isso apagará todos os serviços atuais e inserirá os 34 novos serviços categorizados. Continuar?")) return
    startTransition(async () => {
      const res = await seedServices()
      if (res?.error) alert(res.error)
      else alert("Serviços atualizados com sucesso!")
    })
  }

  // We rely heavily on server revalidation to refresh data, 
  // but we can use some basic optimistic UI or just wait for the server.
  // For CMS edits which are rare, waiting for server is perfectly fine.

  const handleAddService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTransition(async () => {
      let res
      if (editingService) {
        res = await updateSiteService(editingService.id, formData)
      } else {
        res = await addSiteService(formData)
      }
      
      if (res?.error) alert(res.error)
      else {
        form.reset()
        setEditingService(null)
      }
    })
  }

  const handleDeleteService = (id: string) => {
    if (!confirm("Apagar este serviço?")) return
    startTransition(async () => {
      await removeSiteService(id)
    })
  }

  const handleAddGallery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTransition(async () => {
      const res = await addSiteGallery(formData)
      if (res?.error) alert(res.error)
      else form.reset()
    })
  }

  const handleDeleteGallery = (id: string) => {
    if (!confirm("Remover esta imagem?")) return
    startTransition(async () => {
      await removeSiteGallery(id)
    })
  }

  const handleUpdateStudio = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateSiteStudio(formData)
      if (res?.error) alert(res.error)
      else alert("Studio atualizado com sucesso!")
    })
  }

  const handleAddTestimonial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTransition(async () => {
      const res = await addSiteTestimonial(formData)
      if (res?.error) alert(res.error)
      else form.reset()
    })
  }

  const handleDeleteTestimonial = (id: string) => {
    if (!confirm("Remover este depoimento?")) return
    startTransition(async () => {
      await removeSiteTestimonial(id)
    })
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Services Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white">1. Serviços Prestados</h2>
          <button 
            onClick={handleSeed} 
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition-colors text-sm"
          >
            Sincronizar Lista Completa de Serviços (Automático)
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <form key={editingService?.id || 'new'} onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Serviço</label>
                <input type="text" name="title" defaultValue={editingService?.title} required placeholder="Ex: Polimento Técnico" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
                <textarea name="description" defaultValue={editingService?.description} required placeholder="Ex: Remoção de riscos e correção de pintura em 3 etapas." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm h-20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Preço Inicial (Ex: A partir de R$ 400)</label>
                <input type="text" name="price" defaultValue={editingService?.price} required placeholder="400,00" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Foto do Serviço {editingService?.image_url && "(Opcional para manter a mesma)"}</label>
                <input type="file" name="image_file" accept="image/*" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isPending} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-50">
                  {editingService ? "Salvar Alterações" : "Adicionar Serviço"}
                </button>
                {editingService && (
                  <button type="button" onClick={() => setEditingService(null)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-3 rounded-xl transition-colors text-sm">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
          <div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {initialCmsData.services.length === 0 && <p className="text-slate-500 text-sm">Nenhum serviço cadastrado.</p>}
              {initialCmsData.services.map((svc: any) => (
                <div key={svc.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center group">
                  <div>
                    <h4 className="font-bold text-white text-sm">{svc.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{svc.description}</p>
                    <span className="text-purple-400 text-xs font-bold mt-2 block">R$ {svc.price}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingService(svc); document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' }); }} disabled={isPending} className="text-slate-600 hover:text-blue-500 p-2">
                      Editar
                    </button>
                    <button onClick={() => handleDeleteService(svc.id)} disabled={isPending} className="text-slate-600 hover:text-red-500 p-2">
                      Apagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-black text-white mb-6">2. Obras de Arte & Transformação (Fotos)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <form onSubmit={handleAddGallery} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
                <select name="category" value={galleryCategory} onChange={(e) => setGalleryCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="obras">Galeria Principal (Obras de Arte)</option>
                  <option value="transformacao">Antes e Depois (Transformação)</option>
                </select>
              </div>

              {galleryCategory === "transformacao" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">1. Foto do ANTES (Carro Sujo)</label>
                    <input type="file" name="image_file_before" accept="image/*" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">2. Foto do DEPOIS (Carro Pronto)</label>
                    <input type="file" name="image_file" accept="image/*" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Selecionar Foto</label>
                  <input type="file" name="image_file" accept="image/*" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                  <p className="text-xs text-slate-500 mt-1">Dica: Escolha a foto direto da sua galeria.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Posição / Ordem (Ex: 1, 2, 3)</label>
                <input type="number" name="order_index" required defaultValue="1" min="1" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Título (Opcional)</label>
                <input type="text" name="title" placeholder="Ex: Porsche 911 GT3" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <button type="submit" disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-50">
                Adicionar Imagem ao Site
              </button>
            </form>
          </div>
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2">
              {initialCmsData.gallery.length === 0 && <p className="text-slate-500 text-sm col-span-3">Nenhuma imagem cadastrada.</p>}
              {initialCmsData.gallery.map((img: any) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-800">
                  <img src={img.image_url} alt={img.title || ''} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded">
                    Posição: {img.order_index || 0}
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-bold text-white uppercase bg-blue-600 px-2 py-1 rounded mb-2">{img.category}</span>
                    <button onClick={() => handleDeleteGallery(img.id)} disabled={isPending} className="text-xs bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-lg font-bold">
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Studio Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-black text-white mb-6">3. Nosso Studio</h2>
        <form onSubmit={handleUpdateStudio} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Título da Seção</label>
            <input type="text" name="title" required defaultValue={initialCmsData.studio?.title || 'Nosso Studio'} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">História / Estrutura do Studio</label>
            <textarea name="description" required defaultValue={initialCmsData.studio?.description || ''} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm h-32" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Link/URL da Foto do Studio</label>
            <input type="url" name="image_url" defaultValue={initialCmsData.studio?.image_url || ''} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <button type="submit" disabled={isPending} className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 py-3 rounded-xl transition-colors text-sm disabled:opacity-50">
            Salvar Dados do Studio
          </button>
        </form>
      </section>

      {/* Testimonials Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-black text-white mb-6">4. Depoimentos dos Clientes</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <form onSubmit={handleAddTestimonial} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Cliente</label>
                <input type="text" name="client_name" required placeholder="Ex: Marcos Antônio" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Veículo (Opcional)</label>
                <input type="text" name="vehicle" placeholder="Ex: BMW 320i" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">O que ele disse?</label>
                <textarea name="content" required placeholder="Ex: O melhor polimento da cidade..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm h-20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nota (Estrelas de 1 a 5)</label>
                <input type="number" name="rating" min="1" max="5" defaultValue="5" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <button type="submit" disabled={isPending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-50">
                Adicionar Depoimento
              </button>
            </form>
          </div>
          <div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {initialCmsData.testimonials.length === 0 && <p className="text-slate-500 text-sm">Nenhum depoimento cadastrado.</p>}
              {initialCmsData.testimonials.map((test: any) => (
                <div key={test.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl relative group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{test.client_name}</h4>
                      {test.vehicle && <p className="text-[10px] text-slate-500">{test.vehicle}</p>}
                    </div>
                    <div className="flex text-orange-500 text-xs">
                      {"★".repeat(test.rating)}{"☆".repeat(5 - test.rating)}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 italic">"{test.content}"</p>
                  <button onClick={() => handleDeleteTestimonial(test.id)} disabled={isPending} className="absolute top-4 right-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all">
                    Apagar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
