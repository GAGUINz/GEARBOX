"use client"
import { useState, useRef, useEffect } from "react"

export function BeforeAfterSlider({ isGoldMode, imageUrl: propImageUrl, imageUrlBefore }: { isGoldMode: boolean, imageUrl?: string, imageUrlBefore?: string }) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      handleMove(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      handleMove(e.touches[0].clientX)
    }

    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      window.addEventListener("touchmove", handleTouchMove, { passive: false })
      window.addEventListener("touchend", handleMouseUp)
    }
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleMouseUp)
    }
  }, [isDragging])

  // Using the provided images or fallback to a dramatic Porsche macro shot
  const imageUrlAfter = propImageUrl || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200&auto=format&fit=crop"
  const beforeImage = imageUrlBefore || imageUrlAfter

  return (
    <div className={`w-full max-w-5xl mx-auto my-32 px-4 transition-opacity duration-1000 ${isGoldMode ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">A Transformação</h2>
        <p className="text-slate-400">Arraste para comparar a pintura antes e depois do nosso Polimento Técnico.</p>
      </div>
      
      <div 
        ref={containerRef}
        className="relative w-full rounded-3xl overflow-hidden select-none cursor-ew-resize border touch-none bg-slate-900"
        style={{ borderColor: isGoldMode ? "rgba(234, 88, 12, 0.5)" : "rgba(255, 255, 255, 0.1)" }}
        onMouseDown={(e) => {
          setIsDragging(true)
          handleMove(e.clientX)
        }}
        onTouchStart={(e) => {
          setIsDragging(true)
          handleMove(e.touches[0].clientX)
        }}
      >
        {/* DESKTOP SPACER: Forces 16:9 aspect ratio safely using the bulletproof padding-bottom hack */}
        <div className="hidden md:block w-full pointer-events-none" style={{ paddingBottom: '56.25%' }}></div>

        {/* AFTER IMAGE (Bottom Layer - MOBILE: dictates height) */}
        <div className="w-full relative md:hidden">
          <img 
            loading="lazy"
            src={imageUrlAfter} 
            alt="Pintura Vitrificada" 
            className="w-full h-auto block pointer-events-none"
            style={!propImageUrl ? { filter: "contrast(115%) brightness(115%) saturate(130%)" } : { transform: "scale(1.09) translate(-2%, -3%)" }}
          />
          <div className="absolute top-6 right-6 bg-gradient-to-r from-orange-600 to-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.5)] text-white px-4 py-2 rounded-full text-xs tracking-widest font-bold z-10">DEPOIS</div>
        </div>

        {/* AFTER IMAGE (Bottom Layer - DESKTOP: fills the spacer area) */}
        <div className="hidden md:block absolute inset-0 w-full h-full">
          <img 
            loading="lazy"
            src={imageUrlAfter} 
            alt="Pintura Vitrificada" 
            className="w-full h-full object-cover pointer-events-none"
            style={!propImageUrl ? { filter: "contrast(115%) brightness(115%) saturate(130%)" } : { transform: "scale(1.09) translate(-2%, -3%)" }}
          />
          <div className="absolute top-6 right-6 bg-gradient-to-r from-orange-600 to-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.5)] text-white px-4 py-2 rounded-full text-xs tracking-widest font-bold z-10">DEPOIS</div>
        </div>

        {/* BEFORE IMAGE (Top Layer, Clipped - visible on the Left) */}
        <div 
          className="absolute inset-0 w-full h-full border-r-[3px]"
          style={{ 
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
            borderColor: isGoldMode ? "#ea580c" : "#ffffff"
          }}
        >
          <img 
            loading="lazy"
            src={beforeImage} 
            alt="Pintura antes" 
            className="w-full h-full object-cover pointer-events-none"
            style={!imageUrlBefore ? { filter: "grayscale(60%) contrast(70%) brightness(80%) sepia(20%)" } : {}} 
          />
          <div className="absolute top-6 left-6 bg-black/70 text-white/50 px-4 py-2 rounded-full text-xs tracking-widest font-bold border border-white/10 z-10">ANTES</div>
        </div>

        {/* DRAGGER HANDLE */}
        <div 
          className="absolute top-0 bottom-0 w-1 flex items-center justify-center pointer-events-none z-20"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            style={{ background: isGoldMode ? "#ea580c" : "#ffffff" }}
          >
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)"/></svg>
          </div>
        </div>
      </div>
    </div>
  )
}
