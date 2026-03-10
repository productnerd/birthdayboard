import { useRef, useCallback } from 'react'
import type { Wish } from '../lib/types'
import WishCard from './WishCard'
import { usePhysics } from '../hooks/usePhysics'

interface Props {
  wishes: Wish[]
}

export default function BoardView({ wishes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { cardStates, cardLayouts, startDrag, moveDrag, endDrag } = usePhysics(wishes)

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

  // Calculate bounds from card layouts
  let maxX = 1200, maxY = 800
  cardLayouts.forEach((layout) => {
    maxX = Math.max(maxX, layout.pinX + layout.cardW)
    maxY = Math.max(maxY, layout.pinY + layout.cardH + 60)
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
        {wishes.map((wish) => {
          const state = cardStates.get(wish.id)
          const layout = cardLayouts.get(wish.id)
          if (!state || !layout) return null

          const offsetX = state.pinOffsetX
          const cardW = layout.cardW
          const originX = ((cardW / 2 + offsetX) / cardW) * 100

          return (
            <div
              key={wish.id}
              className="absolute cursor-grab active:cursor-grabbing select-none z-10"
              style={{
                left: layout.pinX - (cardW / 2 + offsetX),
                top: layout.pinY - 12,
                transform: `rotate(${state.angle}deg)`,
                transformOrigin: `${originX}% 12px`,
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
