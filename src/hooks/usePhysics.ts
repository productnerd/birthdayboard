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
  cardX: number
  cardY: number
  cardW: number
  cardH: number
  pinOffsetX: number
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

  const charsPerLine = w / 14
  const lines = Math.ceil(wish.message.length / charsPerLine)
  const textH = lines * 28 + 40
  const photoH = wish.photo_path ? 220 : 0
  const paddingH = 60
  const h = textH + photoH + paddingH

  return { w, h }
}

// Truly random placement with collision avoidance — no grid
function layoutCards(wishes: Wish[]): Map<string, CardLayout> {
  const layouts = new Map<string, CardLayout>()
  const placed: { x: number; y: number; w: number; h: number }[] = []
  const GAP = 50

  // Board area grows with number of wishes
  const areaPerCard = 500 * 500
  const totalArea = Math.max(areaPerCard * wishes.length, 1200 * 800)
  const boardW = Math.max(1200, Math.sqrt(totalArea * 1.6))
  const boardH = Math.max(800, Math.sqrt(totalArea / 1.6))

  for (let i = 0; i < wishes.length; i++) {
    const wish = wishes[i]
    const seed = hashCode(wish.id)
    const { w, h } = estimateCardSize(wish, seed)

    // Pin offset: ±50% from center
    const pinOffsetX = (seededRandom(seed + 80) - 0.5) * w * 0.5

    // Try random positions until we find one that doesn't overlap
    let bestX = 0
    let bestY = 0
    let found = false

    for (let attempt = 0; attempt < 80; attempt++) {
      // Pure random position within board area
      const candidateX = seededRandom(seed + attempt * 7 + 100) * (boardW - w - 40) + 20
      const candidateY = seededRandom(seed + attempt * 7 + 101) * (boardH - h - 40) + 20

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
        break
      }
    }

    // Fallback: place below all existing with random X
    if (!found) {
      let maxBottom = 0
      for (const p of placed) {
        maxBottom = Math.max(maxBottom, p.y + p.h + GAP)
      }
      bestX = seededRandom(seed + 60) * (boardW - w - 80) + 40
      bestY = maxBottom + 20
    }

    const pinX = bestX + w / 2 + pinOffsetX
    const pinY = bestY + 12

    layouts.set(wish.id, { pinX, pinY, cardX: bestX, cardY: bestY, cardW: w, cardH: h, pinOffsetX })
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
      gravity: { x: 0, y: 1, scale: 0.06 },
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
          mass: 2,
          frictionAir: 0.12,
          angle: 0,
          restitution: 0.15,
          collisionFilter: { group: -1 },
        },
      )

      const constraint = Matter.Constraint.create({
        bodyA: pin,
        bodyB: card,
        pointB: { x: layout.pinOffsetX, y: -layout.cardH * 0.5 },
        stiffness: 0.9,
        damping: 0.08,
        length: 0,
      })

      Matter.Composite.add(engine.world, [pin, card, constraint])
      existing.set(wish.id, { pin, card, constraint, pinOffsetX: layout.pinOffsetX })

      Matter.Body.applyForce(card, card.position, {
        x: (seededRandom(seed + 70) - 0.5) * 0.005,
        y: 0,
      })
    })

    existing.forEach((bodies, id) => {
      if (!wishes.find((w) => w.id === id)) {
        Matter.Composite.remove(engine.world, [bodies.pin, bodies.card, bodies.constraint])
        existing.delete(id)
      }
    })
  }, [wishes])

  // Ambient breeze
  useEffect(() => {
    const interval = setInterval(() => {
      cardsRef.current.forEach((bodies) => {
        Matter.Body.applyForce(bodies.card, bodies.card.position, {
          x: (Math.random() - 0.5) * 0.003,
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

    // Attach at the click point relative to the card body, not its center
    const offsetX = x - bodies.card.position.x
    const offsetY = y - bodies.card.position.y

    const constraint = Matter.Constraint.create({
      bodyA: mouseBody,
      bodyB: bodies.card,
      pointB: { x: offsetX, y: offsetY },
      stiffness: 0.6,
      damping: 0.3,
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
