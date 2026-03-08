import { useEffect, useRef, useState } from 'react'

export function useAudio(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = 0.3
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (muted) {
      audio.pause()
    } else {
      audio.play().catch(() => {
        // Autoplay blocked — stay muted
        setMuted(true)
      })
    }
  }, [muted])

  return { muted, toggle: () => setMuted((m) => !m) }
}
