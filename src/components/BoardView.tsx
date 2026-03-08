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

const CARD_W = 280
const CARD_H = 340

function getPositions(wishes: Wish[]): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []

  for (let i = 0; i < wishes.length; i++) {
    const seed = hashCode(wishes[i].id)

    if (i === 0) {
      positions.push({ x: 0, y: 0 })
      continue
    }

    const anchorIdx = seed % positions.length
    const anchor = positions[anchorIdx]

    const angle = seededRandom(seed) * Math.PI * 2
    const distance = CARD_W * 0.75 + seededRandom(seed + 1) * CARD_W * 0.3
    const candidate = {
      x: anchor.x + Math.cos(angle) * distance,
      y: anchor.y + Math.sin(angle) * (CARD_H * 0.6 + seededRandom(seed + 2) * CARD_H * 0.2),
    }

    for (const existing of positions) {
      const dx = candidate.x - existing.x
      const dy = candidate.y - existing.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < CARD_W * 0.6) {
        const pushAngle = Math.atan2(dy, dx)
        candidate.x += Math.cos(pushAngle) * (CARD_W * 0.6 - dist)
        candidate.y += Math.sin(pushAngle) * (CARD_H * 0.4 - dist * 0.5)
      }
    }

    positions.push(candidate)
  }

  return positions
}

export default function BoardView({ wishes, board }: Props) {
  const positions = getPositions(wishes)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const translateStart = useRef({ x: 0, y: 0 })

  // Calculate bounds
  let minX = 0, maxX = 0, minY = 0, maxY = 0
  for (const p of positions) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const layoutW = maxX - minX + CARD_W + 80
  const layoutH = maxY - minY + CARD_H + 80

  // Auto-fit zoom on mount and when wishes change
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp || wishes.length === 0) return

    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    const fitScale = Math.min(vpW / layoutW, vpH / layoutH, 1)
    setScale(fitScale)
    setTranslate({
      x: (vpW - layoutW * fitScale) / 2,
      y: (vpH - layoutH * fitScale) / 2,
    })
  }, [wishes.length, layoutW, layoutH])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const vp = viewportRef.current
    if (!vp) return

    const rect = vp.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(3, scale * delta))

    // Zoom toward mouse position
    setTranslate({
      x: mouseX - (mouseX - translate.x) * (newScale / scale),
      y: mouseY - (mouseY - translate.y) * (newScale / scale),
    })
    setScale(newScale)
  }, [scale, translate])

  // Pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY }
    translateStart.current = { ...translate }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [translate])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return
    setTranslate({
      x: translateStart.current.x + (e.clientX - panStart.current.x),
      y: translateStart.current.y + (e.clientY - panStart.current.y),
    })
  }, [])

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
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: layoutW,
          height: layoutH,
          position: 'relative',
        }}
      >
        {/* Person photo at top-center of layout */}
        {board.person_image_path && (
          <div
            className="absolute z-10"
            style={{
              left: -minX + 40,
              top: 0,
              transform: 'translateX(-50%)',
            }}
          >
            <PersonPhoto path={board.person_image_path} name={board.person_name} />
          </div>
        )}

        {wishes.map((wish, i) => {
          const pos = positions[i]
          const seed = hashCode(wish.id)
          const rotation = wish.rotation_deg ?? (seededRandom(seed + 3) * 12 - 6)

          return (
            <div
              key={wish.id}
              className="absolute"
              style={{
                left: pos.x - minX + 40,
                top: pos.y - minY + 40,
                transform: `rotate(${rotation}deg)`,
                zIndex: i,
              }}
            >
              <WishCard wish={wish} />
            </div>
          )
        })}
      </div>

      {wishes.length === 0 && (
        <p className="text-center font-handwriting text-2xl text-amber-800 pt-24 opacity-70">
          No wishes yet — be the first!
        </p>
      )}

      {/* Zoom controls */}
      <div className="fixed bottom-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => setScale(s => Math.min(3, s * 1.2))}
          className="w-10 h-10 rounded-full bg-amber-800/80 text-white text-xl flex items-center justify-center hover:bg-amber-900"
        >
          +
        </button>
        <button
          onClick={() => setScale(s => Math.max(0.1, s * 0.8))}
          className="w-10 h-10 rounded-full bg-amber-800/80 text-white text-xl flex items-center justify-center hover:bg-amber-900"
        >
          -
        </button>
      </div>
    </div>
  )
}
