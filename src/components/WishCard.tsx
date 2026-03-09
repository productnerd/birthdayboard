import type { Wish } from '../lib/types'
import { getPublicUrl } from '../lib/storage'

interface Props {
  wish: Wish
}

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
  const seed = hashCode(wish.id)
  const polaroidRotation = seededRandom(seed + 10) * 6 - 3
  const textRotation = seededRandom(seed + 20) * 2 - 1

  return (
    <div
      className="relative"
      style={{ width: wish.photo_path ? '280px' : '260px' }}
    >
      {/* Card */}
      <div
        className="paper-card rounded-xl p-5 overflow-hidden"
        style={{ wordBreak: 'break-word' }}
      >
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
          <p className="text-xl text-amber-950 leading-snug mb-2" style={{ fontFamily: `'${wish.font_family || 'Caveat'}', cursive` }}>
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
