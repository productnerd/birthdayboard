import { useEffect, useRef, useCallback, useState } from 'react'
import Matter from 'matter-js'
import type { Wish } from '../lib/types'

const CARD_W = 300
const CARD_H = 320

export interface CardState {
  x: number
  y: number
  angle: number
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

// Organic pin placement: spiral outward, no overlap
function getPinPositions(wishes: Wish[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const placed: { x: number; y: number }[] = []
  const spacing = CARD_W + 60

  for (let i = 0; i < wishes.length; i++) {
    const seed = hashCode(wishes[i].id)

    if (i === 0) {
      const pos = { x: 500, y: 60 }
      positions.set(wishes[i].id, pos)
      placed.push(pos)
      continue
    }

    // Pick anchor from existing
    const anchorIdx = seed % placed.length
    const anchor = placed[anchorIdx]

    // Try multiple angles to find non-overlapping spot
    let bestCandidate = { x: anchor.x + spacing, y: anchor.y }
    const baseAngle = seededRandom(seed) * Math.PI * 2

    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = baseAngle + (attempt * Math.PI * 2) / 12
      const dist = spacing + seededRandom(seed + attempt + 1) * 100
      const candidate = {
        x: anchor.x + Math.cos(angle) * dist,
        y: anchor.y + Math.sin(angle) * (dist * 0.3) + (seededRandom(seed + attempt + 10) - 0.5) * 60,
      }

      // Check if far enough from all existing
      let tooClose = false
      for (const existing of placed) {
        const dx = candidate.x - existing.x
        const dy = candidate.y - existing.y
        if (Math.abs(dx) < spacing && Math.abs(dy) < CARD_H * 0.8) {
          tooClose = true
          break
        }
      }

      if (!tooClose) {
        bestCandidate = candidate
        break
      }
      bestCandidate = candidate
    }

    // Ensure pins stay in reasonable range — enough margin so cards aren't cropped
    bestCandidate.x = Math.max(CARD_W * 0.6, bestCandidate.x)
    bestCandidate.y = Math.max(40, Math.min(180, bestCandidate.y))

    positions.set(wishes[i].id, bestCandidate)
    placed.push(bestCandidate)
  }

  return positions
}

export function usePhysics(wishes: Wish[]) {
  const engineRef = useRef<Matter.Engine | null>(null)
  const cardsRef = useRef<Map<string, { pin: Matter.Body; card: Matter.Body; constraint: Matter.Constraint; pinOffsetX: number }>>(new Map())
  const mouseConstraintRef = useRef<Matter.Constraint | null>(null)
  const mouseBodRef = useRef<Matter.Body | null>(null)
  const rafRef = useRef<number>(0)
  const [cardStates, setCardStates] = useState<Map<string, CardState>>(new Map())
  const [pinPositions, setPinPositions] = useState<Map<string, { x: number; y: number }>>(new Map())

  // Init engine
  useEffect(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.002 },
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

    const pins = getPinPositions(wishes)
    setPinPositions(pins)

    const existing = cardsRef.current

    // Add new
    wishes.forEach((wish) => {
      if (existing.has(wish.id)) return

      const pinPos = pins.get(wish.id)
      if (!pinPos) return

      const seed = hashCode(wish.id)

      const pin = Matter.Bodies.circle(pinPos.x, pinPos.y, 6, {
        isStatic: true,
        collisionFilter: { mask: 0 },
      })

      // Off-center pin: offset X by up to ±30% of card width
      const pinOffsetX = (seededRandom(seed + 80) - 0.5) * CARD_W * 0.6

      // Place card so the pin attachment point (top of card) starts at pin
      const card = Matter.Bodies.rectangle(
        pinPos.x - pinOffsetX,
        pinPos.y + CARD_H * 0.5,
        CARD_W,
        CARD_H,
        {
          mass: 2,
          frictionAir: 0.03,
          angle: 0,
          restitution: 0.1,
          collisionFilter: { group: -1 },
        },
      )

      // Pin attaches at the very top of the card, off-center
      const constraint = Matter.Constraint.create({
        bodyA: pin,
        bodyB: card,
        pointB: { x: pinOffsetX, y: -CARD_H * 0.5 },
        stiffness: 0.9,
        damping: 0.05,
        length: 0,
      })

      Matter.Composite.add(engine.world, [pin, card, constraint])
      existing.set(wish.id, { pin, card, constraint, pinOffsetX })

      // Small nudge to start swinging
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

  // Ambient breeze
  useEffect(() => {
    const interval = setInterval(() => {
      cardsRef.current.forEach((bodies) => {
        Matter.Body.applyForce(bodies.card, bodies.card.position, {
          x: (Math.random() - 0.5) * 0.0008,
          y: 0,
        })
      })
    }, 3000)
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

  return { cardStates, pinPositions, startDrag, moveDrag, endDrag }
}
