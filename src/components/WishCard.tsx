import type { Wish } from '../lib/types'
import { getPublicUrl } from '../lib/storage'

interface Props {
  wish: Wish
  stringLength: number
  pinColor: string
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

export default function WishCard({ wish, stringLength, pinColor }: Props) {
  const seed = hashCode(wish.id)
  const polaroidRotation = seededRandom(seed + 10) * 6 - 3
  const textRotation = seededRandom(seed + 20) * 2 - 1
  // Slight horizontal sway based on string length
  const sway = (seededRandom(seed + 30) - 0.5) * 8

  return (
    <div
      className="relative flex-shrink-0 flex flex-col items-center"
      style={{ width: wish.photo_path ? '280px' : '260px' }}
    >
      {/* Pin at top */}
      <div
        className="w-4 h-4 rounded-full shadow-md z-10 relative"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${pinColor}, ${pinColor}cc)`,
        }}
      />

      {/* String */}
      <div
        className="relative flex justify-center"
        style={{ height: stringLength }}
      >
        <svg
          width="20"
          height={stringLength}
          className="absolute top-0"
          style={{ overflow: 'visible' }}
        >
          <path
            d={`M 10 0 Q ${10 + sway * 0.5} ${stringLength * 0.5}, ${10 + sway * 0.3} ${stringLength}`}
            stroke="#8B7355"
            strokeWidth="1.5"
            fill="none"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* Card */}
      <div
        className="paper-card rounded-xl p-5 pt-5 overflow-hidden"
        style={{ wordBreak: 'break-word', transform: `rotate(${sway * 0.4}deg)` }}
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
