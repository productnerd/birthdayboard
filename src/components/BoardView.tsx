import type { Board, Wish } from '../lib/types'
import WishCard from './WishCard'
import PersonPhoto from './PersonPhoto'

interface Props {
  wishes: Wish[]
  board: Board
}

function getPositions(wishes: Wish[]): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []

  for (let i = 0; i < wishes.length; i++) {
    if (i === 0) {
      // First card near center
      positions.push({ x: 50, y: 50 })
    } else {
      // Random offset from a random existing card
      const anchor = positions[Math.floor(Math.random() * positions.length)]
      const offsetX = (Math.random() - 0.5) * 30
      const offsetY = (Math.random() - 0.5) * 30
      positions.push({
        x: Math.max(10, Math.min(90, anchor.x + offsetX)),
        y: Math.max(10, Math.min(90, anchor.y + offsetY)),
      })
    }
  }

  return positions
}

export default function BoardView({ wishes, board }: Props) {
  const positions = getPositions(wishes)

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: '70vh' }}>
      {/* Person photo in center if exists */}
      {board.person_image_path && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <PersonPhoto path={board.person_image_path} name={board.person_name} />
        </div>
      )}

      {/* Wish cards */}
      {wishes.map((wish, i) => {
        const pos = positions[i]
        const rotation = wish.rotation_deg ?? (Math.random() * 10 - 5)

        return (
          <div
            key={wish.id}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              zIndex: 5,
            }}
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
