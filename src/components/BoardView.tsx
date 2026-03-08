import { useRef, useEffect, useState, useCallback } from 'react'
import type { Board, Wish } from '../lib/types'
import WishCard from './WishCard'
import PersonPhoto from './PersonPhoto'
import { usePhysics } from '../hooks/usePhysics'
import StringRenderer from './StringRenderer'

interface Props {
  wishes: Wish[]
  board: Board
}

export default function BoardView({ wishes, board }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { getCardTransform, startDrag, moveDrag, endDrag } = usePhysics(wishes, containerRef)
  const [, setTick] = useState(0)

  // Re-render at 60fps to sync DOM with physics
  useEffect(() => {
    let raf: number
    function loop() {
      setTick((t) => t + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const handlePointerDown = useCallback(
    (wishId: string, e: React.PointerEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      startDrag(wishId, e.clientX - rect.left, e.clientY - rect.top)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [startDrag],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      moveDrag(e.clientX - rect.left, e.clientY - rect.top)
    },
    [moveDrag],
  )

  const handlePointerUp = useCallback(() => {
    endDrag()
  }, [endDrag])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ minHeight: '70vh' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* SVG layer for strings */}
      <StringRenderer wishes={wishes} getCardTransform={getCardTransform} />

      {/* Person photo in center if exists */}
      {board.person_image_path && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <PersonPhoto path={board.person_image_path} name={board.person_name} />
        </div>
      )}

      {/* Wish cards positioned by physics */}
      {wishes.map((wish) => {
        const transform = getCardTransform(wish.id)
        if (!transform) return null

        return (
          <div
            key={wish.id}
            className="absolute cursor-grab active:cursor-grabbing select-none"
            style={{
              left: transform.x,
              top: transform.y,
              transform: `translate(-50%, -50%) rotate(${transform.angle}deg)`,
              zIndex: 5,
            }}
            onPointerDown={(e) => handlePointerDown(wish.id, e)}
          >
            <WishCard wish={wish} />
          </div>
        )
      })}

      {wishes.length === 0 && (
        <p className="text-center font-handwriting text-2xl text-amber-800 pt-24 opacity-70">
          No wishes yet — be the first!
        </p>
      )}
    </div>
  )
}
