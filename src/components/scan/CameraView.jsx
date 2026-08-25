import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Camera, AlertTriangle } from 'lucide-react'

/**
 * Camera stream + base64 JPEG capture.
 * Exposes `capture()` via ref so a parent (a dedicated button) can trigger it.
 */
export const CameraView = forwardRef(function CameraView({ facingMode = 'environment', overlay, className }, ref) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let stream
    let cancelled = false

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setReady(true)
        }
      } catch (e) {
        setError("Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur.")
      }
    }
    start()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facingMode])

  useImperativeHandle(ref, () => ({
    capture() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return null
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.85)
    },
  }))

  if (error) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900 p-6 text-center text-slate-300">
        <AlertTriangle className="text-amber-400" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className={className || 'relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-900'}>
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <Camera className="animate-pulse" />
        </div>
      )}
      {overlay}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
})
