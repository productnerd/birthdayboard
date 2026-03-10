import { useEffect, useRef, useCallback, useState } from 'react'
import Matter from 'matter-js'
import type { Wish } from '../lib/types'

export interface CardState {
  x: number
  y: number
  angle: number
  pinOffsetX: number
}

export interface CardLayout {
  pinX: number
  pinY: number
  cardW: number
  cardH: number
  pinOffsetX: number
  rotation: number
}

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

// Estimate card dimensions based on content
function estimateCardSize(wish: Wish, seed: number): { w: number; h: number } {
  const textBonus = Math.min(wish.message.length / 3, 60)
  const w = 312 + seededRandom(seed + 30) * 80 + textBonus

  // Estimate height: base padding + text lines + photo
  const charsPerLine = w / 14 // rough estimate
  const lines = Math.ceil(wish.message.length / charsPerLine)
  const textH = lines * 28 + 40 // line height + author line
  const photoH = wish.photo_path ? 220 : 0
  const paddingH = 60 // pt-8 + p-5 + margins
  const h = textH + photoH + paddingH

  return { w, h }
}

// Place cards in a non-overlapping layout with organic randomness
function layoutCards(wishes: Wish[]): Map<string, CardLayout> {
  const layouts = new Map<string, CardLayout>()
  const placed: { x: number; y: number; w: number; h: number }[] = []
  const GAP = 40 // minimum gap between cards

  for (let i = 0; i < wishes.length; i++) {
    const wish = wishes[i]
    const seed = hashCode(wish.id)
    const { w, h } = estimateCardSize(wish, seed)

    // Pin offset: ±50% from center
    const pinOffsetX = (seededRandom(seed + 80) - 0.5) * w * 0.5

    // Small random rotation for visual variety
    const rotation = (seededRandom(seed + 90) - 0.5) * 6

    // Find a non-overlapping position
    let bestX = 0
    let bestY = 0

    if (i === 0) {
      // First card: top-left area with some random offset
      bestX = 80 + seededRandom(seed + 40) * 100
      bestY = 20 + seededRandom(seed + 41) * 40
    } else {
      // Try to place: scan positions, pick first that doesn't overlap
      let found = false

      // Strategy: try positions in a scattered grid pattern
      const cols = Math.max(2, Math.ceil(Math.sqrt(wishes.length + 1)))
      const colW = w + GAP
      const rowH = 450 // generous row height

      // Preferred column and row based on index with randomness
      const preferredCol = i % cols
      const preferredRow = Math.floor(i / cols)

      // Try preferred position first, then nearby positions
      for (let attempt = 0; attempt < 30 && !found; attempt++) {
        let tryCol: number, tryRow: number

        if (attempt === 0) {
          tryCol = preferredCol
          tryRow = preferredRow
        } else {
          // Spiral outward from preferred position
          const spiralAngle = seededRandom(seed + attempt) * Math.PI * 2
          const spiralDist = Math.ceil(attempt / 6)
          tryCol = preferredCol + Math.round(Math.cos(spiralAngle) * spiralDist)
          tryRow = preferredRow + Math.round(Math.sin(spiralAngle) * spiralDist)
        }

        if (tryCol < 0) tryCol = 0
        if (tryRow < 0) tryRow = 0

        // Add random jitter for organic feel
        const jitterX = (seededRandom(seed + attempt * 3 + 50) - 0.5) * 80
        const jitterY = (seededRandom(seed + attempt * 3 + 51) - 0.5) * 60

        const candidateX = tryCol * colW + 80 + jitterX
        const candidateY = tryRow * rowH + 20 + jitterY

        if (candidateX < 0 || candidateY < 0) continue

        // Check overlap with all placed cards
        let overlaps = false
        for (const p of placed) {
          const overlapX = candidateX < p.x + p.w + GAP && candidateX + w + GAP > p.x
          const overlapY = candidateY < p.y + p.h + GAP && candidateY + h + GAP > p.y
          if (overlapX && overlapY) {
            overlaps = true
            break
          }
        }

        if (!overlaps) {
          bestX = candidateX
          bestY = candidateY
          found = true
        }
      }

      // Fallback: place below all existing cards
      if (!found) {
        let maxBottom = 0
        for (const p of placed) {
          maxBottom = Math.max(maxBottom, p.y + p.h + GAP)
        }
        bestX = 80 + (seededRandom(seed + 60) * 200)
        bestY = maxBottom + 20
      }
    }

    // Pin position in absolute coordinates
    const pinX = bestX + w / 2 + pinOffsetX
    const pinY = bestY + 12 // pin sits near top of card

    layouts.set(wish.id, { pinX, pinY, cardW: w, cardH: h, pinOffsetX, rotation })
    placed.push({ x: bestX, y: bestY, w, h })
  }

  return layouts
}

export function usePhysics(wishes: Wish[]) {
  const engineRef = useRef<Matter.Engine | null>(null)
  const cardsRef = useRef<Map<string, { pin: Matter.Body; card: Matter.Body; constraint: Matter.Constraint; pinOffsetX: number }>>(new Map())
  const mouseConstraintRef = useRef<Matter.Constraint | null>(null)
  const mouseBodRef = useRef<Matter.Body | null>(null)
  const rafRef = useRef<number>(0)
  const [cardStates, setCardStates] = useState<Map<string, CardState>>(new Map())
  const [cardLayouts, setCardLayouts] = useState<Map<string, CardLayout>>(new Map())

  // Init engine
  useEffect(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.008 },
    })
    engineRef.current = engine

    const mouseBody = Matter.Bodies.circle(0, 0, 1, {
      isStatic: true,
      collisionFilter: { mask: 0 },
    })
    Matter.Composite.add(engine.world, mouseBody)
    mouseBodRef.current = mouseBody

    let lastTime = performance.now()
    function step() {
      const now = performance.now()
      const delta = Math.min(now - lastTime, 16.667)
      lastTime = now
      Matter.Engine.update(engine, delta)

      // Sync states
      const newStates = new Map<string, CardState>()
      cardsRef.current.forEach((bodies, id) => {
        newStates.set(id, {
          x: bodies.card.position.x,
          y: bodies.card.position.y,
          angle: bodies.card.angle * (180 / Math.PI),
          pinOffsetX: bodies.pinOffsetX,
        })
      })
      setCardStates(newStates)

      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(rafRef.current)
      Matter.Engine.clear(engine)
    }
  }, [])

  // Sync wishes to bodies
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const layouts = layoutCards(wishes)
    setCardLayouts(layouts)

    const existing = cardsRef.current

    // Add new
    wishes.forEach((wish) => {
      if (existing.has(wish.id)) return

      const layout = layouts.get(wish.id)
      if (!layout) return

      const seed = hashCode(wish.id)

      const pin = Matter.Bodies.circle(layout.pinX, layout.pinY, 6, {
        isStatic: true,
        collisionFilter: { mask: 0 },
      })

      const card = Matter.Bodies.rectangle(
        layout.pinX - layout.pinOffsetX,
        layout.pinY + layout.cardH * 0.5,
        layout.cardW,
        layout.cardH,
        {
          mass: 3,
          frictionAir: 0.04, // high air friction = less swinging
          angle: 0,
          restitution: 0.05,
          collisionFilter: { group: -1 },
        },
      )

      const constraint = Matter.Constraint.create({
        bodyA: pin,
        bodyB: card,
        pointB: { x: layout.pinOffsetX, y: -layout.cardH * 0.5 },
        stiffness: 0.95, // very stiff = cards stay put
        damping: 0.15,
        length: 0,
      })

      Matter.Composite.add(engine.world, [pin, card, constraint])
      existing.set(wish.id, { pin, card, constraint, pinOffsetX: layout.pinOffsetX })

      // Gentle initial nudge
      Matter.Body.applyForce(card, card.position, {
        x: (seededRandom(seed + 70) - 0.5) * 0.008,
        y: 0,
      })
    })

    // Remove deleted
    existing.forEach((bodies, id) => {
      if (!wishes.find((w) => w.id === id)) {
        Matter.Composite.remove(engine.world, [bodies.pin, bodies.card, bodies.constraint])
        existing.delete(id)
      }
    })
  }, [wishes])

  // Ambient breeze — very gentle
  useEffect(() => {
    const interval = setInterval(() => {
      cardsRef.current.forEach((bodies) => {
        Matter.Body.applyForce(bodies.card, bodies.card.position, {
          x: (Math.random() - 0.5) * 0.001,
          y: 0,
        })
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const startDrag = useCallback((wishId: string, clientX: number, clientY: number, containerRect: DOMRect) => {
    const engine = engineRef.current
    const bodies = cardsRef.current.get(wishId)
    const mouseBody = mouseBodRef.current
    if (!engine || !bodies || !mouseBody) return

    const x = clientX - containerRect.left
    const y = clientY - containerRect.top

    Matter.Body.setPosition(mouseBody, { x, y })

    const constraint = Matter.Constraint.create({
      bodyA: mouseBody,
      bodyB: bodies.card,
      stiffness: 0.05,
      damping: 0.1,
      length: 0,
    })

    Matter.Composite.add(engine.world, constraint)
    mouseConstraintRef.current = constraint
  }, [])

  const moveDrag = useCallback((clientX: number, clientY: number, containerRect: DOMRect) => {
    const mouseBody = mouseBodRef.current
    if (!mouseBody || !mouseConstraintRef.current) return
    Matter.Body.setPosition(mouseBody, {
      x: clientX - containerRect.left,
      y: clientY - containerRect.top,
    })
  }, [])

  const endDrag = useCallback(() => {
    const engine = engineRef.current
    if (!engine || !mouseConstraintRef.current) return
    Matter.Composite.remove(engine.world, mouseConstraintRef.current)
    mouseConstraintRef.current = null
  }, [])

  return { cardStates, cardLayouts, startDrag, moveDrag, endDrag }
}
