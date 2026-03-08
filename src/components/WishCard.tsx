import type { Wish } from '../lib/types'
import { getPublicUrl } from '../lib/storage'

interface Props {
  wish: Wish
}

const PIN_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6']

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export default function WishCard({ wish }: Props) {
  const pinColor = PIN_COLORS[wish.message.length % PIN_COLORS.length]
  const seed = hashCode(wish.id)
  const polaroidRotation = seededRandom(seed + 10) * 6 - 3
  const textRotation = seededRandom(seed + 20) * 2 - 1

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: wish.photo_path ? '280px' : '260px' }}
    >
      {/* Pin */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full z-10 shadow-md"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${pinColor}, ${pinColor}dd)`,
        }}
      />

      {/* Card */}
      <div className="paper-card rounded-xl p-5 pt-6 mt-1">
        {wish.photo_path && (
          <div
            className="polaroid mb-4 rounded-sm"
            style={{ transform: `rotate(${polaroidRotation}deg)` }}
          >
            <img
              src={getPublicUrl(wish.photo_path)}
              alt="Wish photo"
              className="w-full h-auto"
            />
          </div>
        )}

        <div style={{ transform: `rotate(${textRotation}deg)` }}>
          <p className="font-handwriting text-xl text-amber-950 leading-snug mb-2">
            {wish.message}
          </p>

          <p className="font-hand text-sm text-amber-700 text-right">
            — {wish.author_name}
          </p>
        </div>
      </div>
    </div>
  )
}
