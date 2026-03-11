import type { Wish } from '../lib/types'
import { getPublicUrl } from '../lib/storage'

interface Props {
  wish: Wish
  pinOffsetX?: number
}

function seededRandom(seed: number): number {
  let t = (seed + 0x6D2B79F5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export default function WishCard({ wish, pinOffsetX = 0 }: Props) {
  const seed = hashCode(wish.id)
  const polaroidRotation = seededRandom(seed + 10) * 6 - 3
  const textRotation = seededRandom(seed + 20) * 2 - 1

  // Random card width: min 312px, bias wider for long messages
  const textBonus = Math.min(wish.message.length / 3, 60)
  const cardWidth = 312 + seededRandom(seed + 30) * 80 + textBonus
  const font = wish.font_family || 'Indie Flower'
  const fontSize = font === 'Reenie Beanie' ? '1.5rem' : '1.25rem'

  // Pin position on card: centered + offset
  const pinLeft = cardWidth / 2 + pinOffsetX

  return (
    <div
      className="relative"
      style={{ width: `${cardWidth}px` }}
    >
      {/* Decorative pin — always on the card */}
      <div
        className="absolute z-10 w-5 h-5 rounded-full shadow-md"
        style={{
          left: pinLeft - 10,
          top: 6,
          background: 'radial-gradient(circle at 35% 35%, #c0392b, #7b241c)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
        }}
      />
      {/* Card */}
      <div
        className="paper-card rounded-xl p-5 pt-8"
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
          <p className="text-amber-950 leading-snug mb-2" style={{ fontFamily: `'${font}', cursive`, fontSize }}>
            {wish.message}
          </p>
          <p className="text-sm text-amber-950 text-right" style={{ fontFamily: `'${font}', cursive` }}>
            — {wish.author_name}
          </p>
        </div>
      </div>
    </div>
  )
}
