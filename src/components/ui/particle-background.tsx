"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  speed: number
  opacity: number
  fadeDelay: number
  fadeStart: number
  fadingOut: boolean
  reset: () => void
  update: () => void
  draw: (ctx: CanvasRenderingContext2D) => void
}

export function ParticleBackground({ isGoldMode }: { isGoldMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(undefined)

  const createParticle = (canvas: HTMLCanvasElement): Particle => {
    const particle = {
      x: 0,
      y: 0,
      speed: 0,
      opacity: 1,
      fadeDelay: 0,
      fadeStart: 0,
      fadingOut: false,
      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.speed = Math.random() / 5 + 0.1
        this.opacity = 1
        this.fadeDelay = Math.random() * 600 + 100
        this.fadeStart = Date.now() + this.fadeDelay
        this.fadingOut = false
      },
      update() {
        this.y -= this.speed
        if (this.y < 0) {
          this.reset()
        }

        if (!this.fadingOut && Date.now() > this.fadeStart) {
          this.fadingOut = true
        }

        if (this.fadingOut) {
          this.opacity -= 0.008
          if (this.opacity <= 0) {
            this.reset()
          }
        }
      },
      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(200, 255, 255, ${this.opacity})`
        ctx.fillRect(this.x, this.y, 1.5, 2)
      },
    }

    particle.reset()
    particle.y = Math.random() * canvas.height
    particle.fadeDelay = Math.random() * 600 + 100
    particle.fadeStart = Date.now() + particle.fadeDelay
    particle.fadingOut = false

    return particle
  }

  const calculateParticleCount = (canvas: HTMLCanvasElement) => {
    const count = Math.floor((canvas.width * canvas.height) / 20000)
    return Math.min(50, count)
  }

  const initParticles = (canvas: HTMLCanvasElement) => {
    const particleCount = calculateParticleCount(canvas)
    particlesRef.current = []
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(canvas))
    }
  }

  const animate = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particlesRef.current.forEach((particle) => {
      particle.update()
      particle.draw(ctx)
    })
    animationRef.current = requestAnimationFrame(() => animate(canvas, ctx))
  }

  const handleResize = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    initParticles(canvas)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    initParticles(canvas)
    animate(canvas, ctx)

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div
      className={`fixed inset-0 w-full h-full pointer-events-none z-[-1] overflow-hidden ${isGoldMode ? "gold-mode" : ""}`}
      style={{ 
        background: "#05060f",
        backgroundImage: "linear-gradient(0deg,rgba(216,236,248,.06),rgba(152,192,239,.06))",
        fontSize: "max(calc(min(600px, 80vh) * 0.03), 10px)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .gold-mode canvas {
          opacity: 0.8;
        }
        .gold-mode .spotlight {
          filter: invert(1) brightness(4.7) opacity(0.5);
        }
        @media (max-width: 768px) {
          .gold-mode .spotlight {
            display: none !important;
          }
        }
        @keyframes load {  
          0% { opacity: 0;}    
          100% { opacity: 1;}    
        }
        @keyframes spotlight {
          0% {
            transform: rotateZ(0deg) scale(1);
          }
          20% {
            transform: rotateZ(-1deg) scale(1.2);
          }    
          40% {
            transform: rotateZ(2deg) scale(1.3);
          }    
          60% {
            transform: rotateZ(-2deg) scale(1.2);
          }    
          80% {
            transform: rotateZ(1deg) scale(1.1);
          }    
          100% {
            transform: rotateZ(0deg) scale(1);
          }    
        }
        @keyframes loadrot {
          0% { transform: rotate(0deg) scale(0);}
          100% { transform: scale(1);}
        }
        @keyframes accentload {
          0% {
            opacity: 0; transform: scale(0);
          }
          100% {
            opacity: 1; transform: scale(1);
          }
        }
      `}} />

      {/* Canvas only */}
      <canvas
        ref={canvasRef}
        id="particleCanvas"
        style={{
          position: "absolute",
          pointerEvents: "none",
          animation: "load 0.4s ease-in-out forwards",
          zIndex: 1,
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  )
}
