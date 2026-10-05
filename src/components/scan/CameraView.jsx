import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Camera, AlertTriangle, RotateCcw } from 'lucide-react'
import { captureJpeg, INSPECTION_PHOTO } from '../../lib/image'

function cameraErrorMessage(e) {
  if (!window.isSecureContext) return 'La caméra nécessite une connexion sécurisée (https).'
  switch (e?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return "Accès à la caméra refusé. Autorisez la caméra pour ce site dans les réglages du navigateur, puis réessayez."
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Aucune caméra disponible sur cet appareil.'
    case 'NotReadableError':
      return 'La caméra est utilisée par une autre application. Fermez-la puis réessayez.'
    default:
      return "Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur."
  }
}

/**
 * Camera stream + downscaled JPEG capture.
 * Exposes `capture(options)` via ref so a parent (a dedicated button) can trigger it.
 */
export const CameraView = forwardRef(function CameraView({ facingMode = 'environment', overlay, className }, ref) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let stream
    let cancelled = false
    setError(null)
    setReady(false)

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unsupported'), { name: 'NotFoundError' })
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          if (!cancelled) setReady(true)
        }
      } catch (e) {
        if (!cancelled) setError(cameraErrorMessage(e))
      }
    }
    start()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facingMode, attempt])

  useImperativeHandle(
    ref,
    () => ({
      /** Returns a downscaled JPEG data URL, or null if the camera isn't streaming yet. */
      capture(options = INSPECTION_PHOTO) {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || !ready) return null
        return captureJpeg(video, canvas, options)
      },
    }),
    [ready]
  )

  if (error) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900 p-6 text-center text-slate-300">
        <AlertTriangle className="text-amber-400" />
        <p className="text-sm">{error}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          <RotateCcw size={16} /> Réessayer
        </button>
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
