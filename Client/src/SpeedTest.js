'use client'

import React, { useState, useRef, useEffect } from 'react'

export default function ModernSpeedTest() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ download: 0, upload: 0, ping: 0 })
  const [testPhase, setTestPhase] = useState('idle')
  const [rotation, setRotation] = useState(0)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let stars = []

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initStars()
    }

    const initStars = () => {
      stars = []
      const numStars = Math.floor((canvas.width * canvas.height) / 500)
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          size: Math.random() * 2 + 1,
        })
      }
    }

    const drawStars = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'white'
      stars.forEach(star => {
        const x = (star.x - canvas.width / 2) * (1000 / star.z)
        const y = (star.y - canvas.height / 2) * (1000 / star.z)
        const size = star.size * (1000 / star.z)
        ctx.beginPath()
        ctx.arc(x + canvas.width / 2, y + canvas.height / 2, size / 2, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const updateStars = () => {
      const speed = isRunning ? 5 : 1
      stars.forEach(star => {
        star.z -= speed
        if (star.z <= 0) {
          star.z = 1000
          star.x = Math.random() * canvas.width
          star.y = Math.random() * canvas.height
        }
      })
    }

    const animate = () => {
      updateStars()
      drawStars()
      animationFrameId = requestAnimationFrame(animate)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isRunning])

  useEffect(() => {
    let rotationInterval
    if (isRunning) {
      rotationInterval = setInterval(() => {
        setRotation(prev => (prev + 15) % 360)
      }, 16)
    }
    return () => clearInterval(rotationInterval)
  }, [isRunning])

  const startTest = async () => {
    setIsRunning(true)
    setProgress({ download: 0, upload: 0, ping: 0 })
    setError(null)
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    const handleError = (phase, error) => {
      console.error(`Error during ${phase} test:`, error)
      setError(`Failed to test ${phase}. Please check your connection and try again.`)
      setIsRunning(false)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }

    setTestPhase('download')
    try {
      const downloadResponse = await fetch('http://localhost:5000/api/speedtest/download', {
        signal,
        mode: 'cors',
      })
      if (!downloadResponse.ok) {
        throw new Error('Network response was not ok')
      }
      const downloadData = await downloadResponse.json()
      setProgress((prev) => ({ ...prev, download: downloadData.download }))

      setTestPhase('downloadComplete')
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      if (error.name !== 'AbortError') {
        handleError('download', error)
        return
      }
    }

    setTestPhase('upload')
    try {
      const response = await fetch('http://localhost:5000/api/speedtest/upload_ping', {
        signal,
        mode: 'cors',
      })
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      const data = await response.json()
      setProgress((prev) => ({
        ...prev,
        upload: data.upload,
        ping: data.ping,
      }))

      setTestPhase('uploadComplete')
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      if (error.name !== 'AbortError') {
        handleError('upload and ping', error)
        return
      }
    }

    setIsRunning(false)
    setTestPhase('idle')
  }

  const stopTest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsRunning(false)
    setTestPhase('idle')
    setProgress({ download: 0, upload: 0, ping: 0 })
    setError(null)
  }

  const resetTest = () => {
    setIsRunning(false)
    setProgress({ download: 0, upload: 0, ping: 0 })
    setTestPhase('idle')
    setRotation(0)
    setError(null)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const getGaugeGradient = () => {
    switch (testPhase) {
      case 'download':
        return 'linear-gradient(to right, #3b82f6, #93c5fd)'
      case 'upload':
        return 'linear-gradient(to right, #22c55e, #86efac)'
      default:
        return 'linear-gradient(to right, #6b7280, #d1d5db)'
    }
  }

  const getGlowColor = () => {
    switch (testPhase) {
      case 'download':
        return 'rgba(59, 130, 246, 0.5)'
      case 'upload':
        return 'rgba(34, 197, 94, 0.5)'
      default:
        return 'rgba(107, 114, 128, 0.5)'
    }
  }

  const renderGaugeContent = () => {
    if (testPhase === 'download') {
      return (
        <div className="flex flex-col items-center justify-center">
          <svg className="w-16 h-16 text-blue-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <div className="mt-2 text-blue-300 text-lg font-semibold">Downloading</div>
          <div className="text-4xl font-bold text-white mt-2">{progress.download.toFixed(2)}</div>
          <div className="text-blue-300 text-lg">Mbps</div>
        </div>
      )
    } else if (testPhase === 'upload') {
      return (
        <div className="flex flex-col items-center justify-center">
          <svg className="w-16 h-16 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <div className="mt-2 text-green-300 text-lg font-semibold">Uploading</div>
          <div className="text-4xl font-bold text-white mt-2">{progress.upload.toFixed(2)}</div>
          <div className="text-green-300 text-lg">Mbps</div>
        </div>
      )
    } else if (testPhase === 'downloadComplete') {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-blue-500 mb-2">{progress.download.toFixed(2)} ↓</div>
          <div className="text-blue-300 text-lg">Mbps</div>
          <div className="mt-4 text-gray-300 text-lg">Preparing upload test...</div>
        </div>
      )
    } else if (testPhase === 'idle' && (progress.download > 0 || progress.upload > 0)) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-blue-500 mb-2">{progress.download.toFixed(2)} ↓</div>
          <div className="text-3xl font-bold text-green-500 mb-2">{progress.upload.toFixed(2)} ↑</div>
          <div className="text-2xl font-bold text-yellow-500">{progress.ping.toFixed(0)} ms</div>
          <div className="text-gray-300 text-lg mt-2">Test Complete</div>
        </div>
      )
    } else if (testPhase === 'idle') {
      return (
        <div className="flex flex-col items-center justify-center">
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div className="mt-4 text-gray-300 text-lg">Ready to Test</div>
        </div>
      )
    } else if (testPhase === 'uploadComplete') {
        return (
          <div className="flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-green-500 mb-2">{progress.upload.toFixed(2)} ↑</div>
            <div className="text-green-300 text-lg">Mbps</div>
            <div className="mt-4 text-gray-300 text-lg">Test Complete</div>
          </div>
        )
      }
    else {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-400 mb-2">Testing...</div>
        </div>
      )
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-800 bg-opacity-50 rounded-3xl shadow-2xl p-8 w-full max-w-md border border-gray-700 relative overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <div className="relative z-10">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Oops! Something went wrong</h2>
              <p className="text-gray-300 mb-6">{error}</p>
              <button
                onClick={resetTest}
                className="px-6 py-3 bg-blue-500 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4 font-sans">
      <div className="bg-gray-800 bg-opacity-50 rounded-3xl shadow-2xl p-8 w-full max-w-5xl border border-gray-700 relative overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-center mb-12 text-white tracking-tight">SpeedTest</h1>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2 flex flex-col items-center">
              <div className="relative w-full max-w-xs aspect-square">
                <div className="absolute inset-0 rounded-full bg-gray-700 animate-pulse"></div>
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: getGaugeGradient(),
                    clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)',
                    transform: `rotate(${isRunning ? rotation : progress.download * 3.6}deg)`,
                    transition: isRunning ? 'none' : 'transform 0.1s linear, background 0.3s ease',
                    filter: `drop-shadow(0 0 10px ${getGlowColor()})`,
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-gray-800"></div>
                </div>
                <div className="absolute inset-4 rounded-full bg-gray-900 flex items-center justify-center">
                  {renderGaugeContent()}
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {['download', 'upload', 'ping'].map((type) => (
                  <div key={type} className="bg-gray-800 bg-opacity-80 rounded-xl p-4 transition-all duration-300 hover:bg-opacity-100 transform hover:scale-105">
                    <p className="text-sm text-gray-300 mb-2">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
                    <p className="font-bold text-2xl text-white">
                      {type === 'ping'
                        ? `${progress[type].toFixed(0)} ms`
                        : `${progress[type].toFixed(2)} Mbps`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={isRunning ? stopTest : startTest}
              className={`px-8 py-3 rounded-full text-white font-semibold transition-all duration-300 transform hover:scale-105 ${
                isRunning
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              {isRunning ? 'Stop Test' : 'Start Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
