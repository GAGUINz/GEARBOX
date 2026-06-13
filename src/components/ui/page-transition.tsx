"use client"

import React, { createContext, useContext, useState } from "react"
import { useRouter } from "next/navigation"

interface TransitionContextType {
  navigate: (href: string) => void
}

const TransitionContext = createContext<TransitionContextType>({
  navigate: () => {},
})

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const router = useRouter()

  const navigate = (href: string) => {
    setIsTransitioning(true) // Fade to black
    setTimeout(() => {
      router.push(href) // Swap route while screen is dark
      setTimeout(() => {
        setIsTransitioning(false) // Fade out black
      }, 300) // Small buffer to ensure DOM mounted
    }, 500) // Match the CSS transition duration
  }

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div 
        className={`fixed inset-0 z-[9999] bg-black pointer-events-none transition-opacity duration-500 ease-in-out ${
          isTransitioning ? "opacity-100" : "opacity-0"
        }`}
      />
    </TransitionContext.Provider>
  )
}

export const useTransition = () => useContext(TransitionContext)
