import { useRef, useState, useCallback, useEffect } from 'react'
import type { Board, Wish } from '../lib/types'
import WishCard from './WishCard'
import PersonPhoto from './PersonPhoto'

interface Props {
  wishes: Wish[]
  board: Board
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const PIN_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']

export default function BoardView({ wishes, board }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const translateStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const vp = viewportRef.current
    const content = contentRef.current
    if (!vp || !content || wishes.length === 0) return

    requestAnimationFrame(() => {
      const vpW = vp.clientWidth
      const vpH = vp.clientHeight
      const contentW = content.scrollWidth
      const contentH = content.scrollHeight

      const fitScale = Math.min(vpW / contentW, vpH / contentH, 1)
      setScale(fitScale)
      setTranslate({
        x: (vpW - contentW * fitScale) / 2,
        y: Math.max(0, (vpH - contentH * fitScale) / 2),
      })
    })
  }, [wishes.length])

  function clampTranslate(tx: number, ty: number, s: number) {
    const vp = viewportRef.current
    const content = contentRef.current
    if (!vp || !content) return { x: tx, y: ty }
    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    const scaledW = content.scrollWidth * s
    const scaledH = content.scrollHeight * s
    const margin = 0.25
    return {
      x: Math.max(-scaledW * (1 - margin), Math.min(vpW * (1 - margin), tx)),
      y: Math.max(-scaledH * (1 - margin), Math.min(vpH * (1 - margin), ty)),
    }
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const vp = viewportRef.current
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(3, scale * delta))
    const newT = clampTranslate(
      mouseX - (mouseX - translate.x) * (newScale / scale),
      mouseY - (mouseY - translate.y) * (newScale / scale),
      newScale,
    )
    setTranslate(newT)
    setScale(newScale)
  }, [scale, translate])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY }
    translateStart.current = { ...translate }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [translate])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return
    const raw = {
      x: translateStart.current.x + (e.clientX - panStart.current.x),
      y: translateStart.current.y + (e.clientY - panStart.current.y),
    }
    setTranslate(clampTranslate(raw.x, raw.y, scale))
  }, [scale])

  const handlePointerUp = useCallback(() => {
    isPanning.current = false
  }, [])

  return (
    <div
      ref={viewportRef}
      className="w-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ height: 'calc(100vh - 180px)' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        ref={contentRef}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          display: 'inline-block',
        }}
      >
        {/* Person photo */}
        {board.person_image_path && (
          <div className="flex justify-center mb-6">
            <PersonPhoto path={board.person_image_path} name={board.person_name} />
          </div>
        )}

        {/* Cards hanging from strings */}
        <div className="flex flex-wrap justify-center items-start gap-6 p-6 max-w-6xl">
          {wishes.map((wish) => {
            const seed = hashCode(wish.id)
            const stringLength = 30 + seededRandom(seed + 5) * 70
            const pinColor = PIN_COLORS[seed % PIN_COLORS.length]

            return (
              <div key={wish.id}>
                <WishCard
                  wish={wish}
                  stringLength={stringLength}
                  pinColor={pinColor}
                />
              </div>
            )
          })}
        </div>

        {wishes.length === 0 && (
          <p className="text-center font-handwriting text-2xl text-amber-800 pt-24 opacity-70">
            No wishes yet — be the first!
          </p>
        )}
      </div>
    </div>
  )
}
