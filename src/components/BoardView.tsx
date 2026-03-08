import type { Board, Wish } from '../lib/types'
import WishCard from './WishCard'
import PersonPhoto from './PersonPhoto'

interface Props {
  wishes: Wish[]
  board: Board
}

// Simple hash from wish ID for deterministic randomness
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

const CARD_W = 260
const CARD_H = 320

function getPositions(wishes: Wish[]): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []

  for (let i = 0; i < wishes.length; i++) {
    const seed = hashCode(wishes[i].id)

    if (i === 0) {
      positions.push({ x: 0, y: 0 })
      continue
    }

    // Pick a random existing card as anchor (seeded)
    const anchorIdx = seed % positions.length
    const anchor = positions[anchorIdx]

    // Place adjacent: pick a random angle, push out by card size + small overlap
    const angle = seededRandom(seed) * Math.PI * 2
    const distance = CARD_W * 0.75 + seededRandom(seed + 1) * CARD_W * 0.3
    const candidate = {
      x: anchor.x + Math.cos(angle) * distance,
      y: anchor.y + Math.sin(angle) * (CARD_H * 0.6 + seededRandom(seed + 2) * CARD_H * 0.2),
    }

    // Nudge if too close to any existing card
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

  // Calculate bounds to center the layout
  let minX = 0, maxX = 0, minY = 0, maxY = 0
  for (const p of positions) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const layoutW = maxX - minX + CARD_W
  const layoutH = maxY - minY + CARD_H

  return (
    <div className="w-full overflow-x-auto">
      {/* Person photo in center if exists */}
      {board.person_image_path && (
        <div className="flex justify-center mb-4">
          <PersonPhoto path={board.person_image_path} name={board.person_name} />
        </div>
      )}

      {wishes.length > 0 ? (
        <div
          className="relative mx-auto"
          style={{
            width: Math.max(layoutW + 40, 300),
            height: layoutH + 40,
          }}
        >
          {wishes.map((wish, i) => {
            const pos = positions[i]
            const seed = hashCode(wish.id)
            const rotation = wish.rotation_deg ?? (seededRandom(seed + 3) * 12 - 6)

            return (
              <div
                key={wish.id}
                className="absolute"
                style={{
                  left: pos.x - minX + 20,
                  top: pos.y - minY + 20,
                  transform: `rotate(${rotation}deg)`,
                  zIndex: i,
                }}
              >
                <WishCard wish={wish} />
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-center font-handwriting text-2xl text-amber-800 pt-24 opacity-70">
          No wishes yet — be the first!
        </p>
      )}
    </div>
  )
}
