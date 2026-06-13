"use client"

import { useState, useEffect } from "react"

export default function DebugPage() {
  const [count, setCount] = useState(0)
  const [info, setInfo] = useState("Carregando...")
  const [jsLoaded, setJsLoaded] = useState(false)

  useEffect(() => {
    setJsLoaded(true)
    setInfo(`
      User Agent: ${navigator.userAgent}
      Window: ${window.innerWidth}x${window.innerHeight}
      URL: ${window.location.href}
      Protocol: ${window.location.protocol}
      Time: ${new Date().toLocaleString()}
    `)
  }, [])

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", color: "white", background: "#111", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>🔧 Debug Page - GEARBOX</h1>
      
      <div style={{ padding: "20px", background: "#222", borderRadius: "12px", marginBottom: "20px" }}>
        <h2 style={{ color: jsLoaded ? "#22c55e" : "#ef4444", marginBottom: "10px" }}>
          JavaScript: {jsLoaded ? "✅ FUNCIONANDO" : "❌ NÃO CARREGOU"}
        </h2>
        <p style={{ color: "#888", fontSize: "14px" }}>
          Se você vê &quot;FUNCIONANDO&quot; em verde, o JS está rodando corretamente.
        </p>
      </div>

      <div style={{ padding: "20px", background: "#222", borderRadius: "12px", marginBottom: "20px" }}>
        <h2 style={{ marginBottom: "10px" }}>Teste de Clique</h2>
        <p style={{ marginBottom: "10px" }}>Contador: <strong style={{ color: "#f97316", fontSize: "24px" }}>{count}</strong></p>
        <button 
          onClick={() => setCount(c => c + 1)}
          style={{ 
            padding: "16px 32px", 
            background: "#f97316", 
            color: "white", 
            border: "none", 
            borderRadius: "12px", 
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          CLIQUE AQUI (+1)
        </button>
      </div>

      <div style={{ padding: "20px", background: "#222", borderRadius: "12px", marginBottom: "20px" }}>
        <h2 style={{ marginBottom: "10px" }}>Info do Dispositivo</h2>
        <pre style={{ color: "#888", fontSize: "12px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{info}</pre>
      </div>
    </div>
  )
}
