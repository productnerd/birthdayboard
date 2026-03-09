import { useEffect, useRef, useCallback, useState } from 'react'
import Matter from 'matter-js'
import type { Wish } from '../lib/types'

const CARD_W = 280
const CARD_H = 350

interface CardState {
  x: number
  y: number
  angle: number
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
      const pos = { x: 600, y: 80 }
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

    // Ensure pin y stays in a reasonable range (pins should be near top area)
    bestCandidate.y = Math.max(40, Math.min(200, bestCandidate.y))

    positions.set(wishes[i].id, bestCandidate)
    placed.push(bestCandidate)
  }

  return positions
}

export function usePhysics(wishes: Wish[]) {
  const engineRef = useRef<Matter.Engine | null>(null)
  const cardsRef = useRef<Map<string, { pin: Matter.Body; card: Matter.Body; constraint: Matter.Constraint }>>(new Map())
  const mouseConstraintRef = useRef<Matter.Constraint | null>(null)
  const mouseBodRef = useRef<Matter.Body | null>(null)
  const rafRef = useRef<number>(0)
  const [cardStates, setCardStates] = useState<Map<string, CardState>>(new Map())
  const [pinPositions, setPinPositions] = useState<Map<string, { x: number; y: number }>>(new Map())

  // Init engine
  useEffect(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
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
      const initialAngle = (seededRandom(seed + 50) - 0.5) * 0.15

      const pin = Matter.Bodies.circle(pinPos.x, pinPos.y, 8, {
        isStatic: true,
        collisionFilter: { mask: 0 },
      })

      const card = Matter.Bodies.rectangle(
        pinPos.x + (seededRandom(seed + 60) - 0.5) * 20,
        pinPos.y + CARD_H * 0.5 + 20,
        CARD_W,
        CARD_H,
        {
          mass: 1,
          frictionAir: 0.04,
          angle: initialAngle,
          restitution: 0.2,
          collisionFilter: { group: -1 },
        },
      )

      const constraint = Matter.Constraint.create({
        bodyA: pin,
        bodyB: card,
        pointB: { x: 0, y: -CARD_H * 0.5 },
        stiffness: 0.4,
        damping: 0.1,
        length: 20,
      })

      Matter.Composite.add(engine.world, [pin, card, constraint])
      existing.set(wish.id, { pin, card, constraint })

      // Give initial nudge for organic feel
      Matter.Body.applyForce(card, card.position, {
        x: (seededRandom(seed + 70) - 0.5) * 0.005,
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
