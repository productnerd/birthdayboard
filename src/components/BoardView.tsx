import { useRef, useCallback } from 'react'
import type { Board, Wish } from '../lib/types'
import WishCard from './WishCard'
import PersonPhoto from './PersonPhoto'
import { usePhysics } from '../hooks/usePhysics'

interface Props {
  wishes: Wish[]
  board: Board
}

export default function BoardView({ wishes, board }: Props) {
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

  // Calculate bounds from actual card positions (physics bodies) + card dimensions
  let maxX = 1200, maxY = 800
  cardStates.forEach((state) => {
    maxX = Math.max(maxX, state.x + 300)
    maxY = Math.max(maxY, state.y + 250)
  })
  pinPositions.forEach((pos) => {
    maxX = Math.max(maxX, pos.x + 300)
  })

  return (
    <div
      className="w-full overflow-auto"
      style={{ height: 'calc(100vh - 180px)' }}
    >
      <div
        ref={containerRef}
        className="relative"
        style={{ width: maxX, height: maxY, minWidth: '100%', minHeight: '100%' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Person photo */}
        {board.person_image_path && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
            <PersonPhoto path={board.person_image_path} name={board.person_name} />
          </div>
        )}

        {/* Pins */}
        {wishes.map((wish) => {
          const pinPos = pinPositions.get(wish.id)
          if (!pinPos) return null

          return (
            <div
              key={`pin-${wish.id}`}
              className="absolute w-4 h-4 rounded-full shadow-md z-30"
              style={{
                left: pinPos.x - 8,
                top: pinPos.y - 8,
                background: 'radial-gradient(circle at 35% 35%, #444, #111)',
              }}
            />
          )
        })}

        {/* Cards */}
        {wishes.map((wish) => {
          const state = cardStates.get(wish.id)
          if (!state) return null

          return (
            <div
              key={wish.id}
              className="absolute cursor-grab active:cursor-grabbing select-none z-10"
              style={{
                left: state.x,
                top: state.y,
                transform: `translate(-50%, -50%) rotate(${state.angle}deg)`,
              }}
              onPointerDown={(e) => handlePointerDown(wish.id, e)}
            >
              <WishCard wish={wish} />
            </div>
          )
        })}

        {wishes.length === 0 && (
          <p className="text-center font-handwriting text-2xl text-amber-800 pt-24 opacity-70 absolute w-full">
            No wishes yet — be the first!
          </p>
        )}
      </div>
    </div>
  )
}
