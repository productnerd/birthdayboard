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
    const distance = CARD_W * 0.9 + seededRandom(seed + 1) * CARD_W * 0.2
    const candidate = {
      x: anchor.x + Math.cos(angle) * distance,
      y: anchor.y + Math.sin(angle) * (CARD_H * 0.85 + seededRandom(seed + 2) * CARD_H * 0.1),
    }

    // Push apart — keep overlap to max ~10-15% of card size
    const minDistX = CARD_W * 0.85
    const minDistY = CARD_H * 0.85
    for (const existing of positions) {
      const dx = candidate.x - existing.x
      const dy = candidate.y - existing.y
      const overlapX = Math.abs(dx) < minDistX
      const overlapY = Math.abs(dy) < minDistY
      if (overlapX && overlapY) {
        const pushAngle = Math.atan2(dy || 1, dx || 1)
        const push = Math.sqrt(minDistX * minDistX + minDistY * minDistY) -
          Math.sqrt(dx * dx + dy * dy)
        if (push > 0) {
          candidate.x += Math.cos(pushAngle) * push * 0.6
          candidate.y += Math.sin(pushAngle) * push * 0.6
        }
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

  // Clamp translate so layout can't be panned off-screen
  function clampTranslate(tx: number, ty: number, s: number) {
    const vp = viewportRef.current
    if (!vp) return { x: tx, y: ty }
    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    const scaledW = layoutW * s
    const scaledH = layoutH * s
    // Keep at least 25% of layout visible in each axis
    const margin = 0.25
    return {
      x: Math.max(-scaledW * (1 - margin), Math.min(vpW * (1 - margin), tx)),
      y: Math.max(-scaledH * (1 - margin), Math.min(vpH * (1 - margin), ty)),
    }
  }

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
    const newT = clampTranslate(
      mouseX - (mouseX - translate.x) * (newScale / scale),
      mouseY - (mouseY - translate.y) * (newScale / scale),
      newScale,
    )
    setTranslate(newT)
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
          // Cards higher on the page (lower y) get higher z-index
          // so their bottom text sits on top of cards below
          const y = pos.y - minY
          const maxY2 = maxY - minY || 1
          const zIndex = Math.round((1 - y / maxY2) * 1000)

          return (
            <div
              key={wish.id}
              className="absolute"
              style={{
                left: pos.x - minX + 40,
                top: pos.y - minY + 40,
                transform: `rotate(${rotation}deg)`,
                zIndex,
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

    </div>
  )
}
