import { useRef, useCallback } from 'react'
import type { Board, Wish } from '../lib/types'
import WishCard from './WishCard'
import PersonPhoto from './PersonPhoto'
import { usePhysics } from '../hooks/usePhysics'

interface Props {
  wishes: Wish[]
  board: Board
}

const PIN_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
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

  // Calculate bounds for scrollable area
  let maxX = 1200, maxY = 800
  pinPositions.forEach((pos) => {
    maxX = Math.max(maxX, pos.x + 400)
    maxY = Math.max(maxY, pos.y + 600)
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
          const pinColor = PIN_COLORS[hashCode(wish.id) % PIN_COLORS.length]

          return (
            <div
              key={`pin-${wish.id}`}
              className="absolute w-5 h-5 rounded-full shadow-md z-30"
              style={{
                left: pinPos.x - 10,
                top: pinPos.y - 10,
                background: `radial-gradient(circle at 35% 35%, ${pinColor}, ${pinColor}cc)`,
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
