import { useRef, useCallback } from 'react'
import type { Wish } from '../lib/types'
import WishCard from './WishCard'
import { usePhysics } from '../hooks/usePhysics'

interface Props {
  wishes: Wish[]
}

export default function BoardView({ wishes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { cardStates, pinPositions, startDrag, moveDrag, endDrag } = usePhysics(wishes)

  const handlePointerDown = useCallback(
    (wishId: string, e: React.PointerEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      startDrag(wishId, e.clientX, e.clientY, rect)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [startDrag],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const container = containerRef.current
      if (!container) return
      moveDrag(e.clientX, e.clientY, container.getBoundingClientRect())
    },
    [moveDrag],
  )

  const handlePointerUp = useCallback(() => {
    endDrag()
  }, [endDrag])

  // Calculate bounds — cards hang downward from pins, so use pin positions + generous card height
  let maxX = 1200, maxY = 800
  pinPositions.forEach((pos) => {
    maxX = Math.max(maxX, pos.x + 500)
    maxY = Math.max(maxY, pos.y + 900)
  })

  return (
    <div
      className="w-full overflow-auto"
      style={{ minHeight: 'calc(100vh - 180px)' }}
    >
      <div
        ref={containerRef}
        className="relative"
        style={{ width: maxX, height: maxY, minWidth: '100%', minHeight: '100%' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Cards — positioned at pin, hanging downward */}
        {wishes.map((wish) => {
          const state = cardStates.get(wish.id)
          const pinPos = pinPositions.get(wish.id)
          if (!state || !pinPos) return null

          // Pin offset from card center (stored in state)
          const offsetX = state.pinOffsetX
          // Card width for transform-origin calculation
          const cardW = wish.photo_path ? 300 : 280
          // Pin attachment point as percentage from left edge of card
          const originX = ((cardW / 2 + offsetX) / cardW) * 100

          return (
            <div
              key={wish.id}
              className="absolute cursor-grab active:cursor-grabbing select-none z-10"
              style={{
                left: pinPos.x - (cardW / 2 + offsetX),
                top: pinPos.y,
                transform: `rotate(${state.angle}deg)`,
                transformOrigin: `${originX}% 0%`,
              }}
              onPointerDown={(e) => handlePointerDown(wish.id, e)}
            >
              <WishCard wish={wish} pinOffsetX={state.pinOffsetX} />
            </div>
          )
        })}

      </div>
    </div>
  )
}
