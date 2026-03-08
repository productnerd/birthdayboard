import type { Wish } from '../lib/types'

interface Props {
  wishes: Wish[]
  getCardTransform: (wishId: string) => { x: number; y: number; angle: number } | null
}

export default function StringRenderer({ wishes, getCardTransform }: Props) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 4 }}>
      {wishes.map((wish) => {
        const transform = getCardTransform(wish.id)
        if (!transform) return null

        // Pin position is above the card
        const pinX = transform.x
        const pinY = transform.y - 60
        const cardX = transform.x
        const cardY = transform.y - 30

        // Bezier control points for slight droop
        const cx1 = pinX + (cardX - pinX) * 0.3
        const cy1 = pinY + 15
        const cx2 = pinX + (cardX - pinX) * 0.7
        const cy2 = cardY - 10

        return (
          <path
            key={wish.id}
            d={`M ${pinX} ${pinY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${cardX} ${cardY}`}
            stroke="#8B7355"
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
          />
        )
      })}
    </svg>
  )
}
