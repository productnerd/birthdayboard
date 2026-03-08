import { useEffect, useRef, useCallback } from 'react'
import Matter from 'matter-js'
import type { Wish } from '../lib/types'
import { updateWishPosition } from '../lib/api'

interface PhysicsCard {
  wishId: string
  pinBody: Matter.Body
  cardBody: Matter.Body
  constraint: Matter.Constraint
}

interface UsePhysicsReturn {
  getCardTransform: (wishId: string) => { x: number; y: number; angle: number } | null
  startDrag: (wishId: string, mouseX: number, mouseY: number) => void
  moveDrag: (mouseX: number, mouseY: number) => void
  endDrag: () => void
}

export function usePhysics(
  wishes: Wish[],
  containerRef: React.RefObject<HTMLDivElement | null>,
): UsePhysicsReturn {
  const engineRef = useRef<Matter.Engine | null>(null)
  const cardsRef = useRef<Map<string, PhysicsCard>>(new Map())
  const dragConstraintRef = useRef<Matter.Constraint | null>(null)
  const dragBodyRef = useRef<Matter.Body | null>(null)
  const mouseBodyRef = useRef<Matter.Body | null>(null)
  const rafRef = useRef<number>(0)
  const transformsRef = useRef<Map<string, { x: number; y: number; angle: number }>>(new Map())

  // Initialize engine
  useEffect(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.3, scale: 0.001 },
    })
    engineRef.current = engine

    // Mouse body for dragging
    const mouseBody = Matter.Bodies.circle(0, 0, 1, { isStatic: true, collisionFilter: { mask: 0 } })
    Matter.Composite.add(engine.world, mouseBody)
    mouseBodyRef.current = mouseBody

    // Physics loop
    let lastTime = performance.now()
    function step() {
      const now = performance.now()
      const delta = Math.min(now - lastTime, 32)
      lastTime = now
      Matter.Engine.update(engine, delta)

      // Update transforms
      cardsRef.current.forEach((card, wishId) => {
        transformsRef.current.set(wishId, {
          x: card.cardBody.position.x,
          y: card.cardBody.position.y,
          angle: card.cardBody.angle * (180 / Math.PI),
        })
      })

      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(rafRef.current)
      Matter.Engine.clear(engine)
    }
  }, [])

  // Sync wishes to physics bodies
  useEffect(() => {
    const engine = engineRef.current
    const container = containerRef.current
    if (!engine || !container) return

    const rect = container.getBoundingClientRect()
    const existing = cardsRef.current

    // Add new wishes
    wishes.forEach((wish) => {
      if (existing.has(wish.id)) return

      const x = (wish.position_x ?? 0.5) * rect.width
      const y = (wish.position_y ?? 0.5) * rect.height

      // Pin (static point at top)
      const pinBody = Matter.Bodies.circle(x, y - 60, 5, {
        isStatic: true,
        collisionFilter: { mask: 0 },
      })

      // Card body
      const cardBody = Matter.Bodies.rectangle(x, y, 200, 150, {
        mass: 0.5,
        frictionAir: 0.08,
        angle: (wish.rotation_deg ?? 0) * (Math.PI / 180),
        collisionFilter: { group: -1 },
      })

      // String constraint (pin to card)
      const constraint = Matter.Constraint.create({
        bodyA: pinBody,
        bodyB: cardBody,
        pointB: { x: 0, y: -60 },
        stiffness: 0.02,
        damping: 0.05,
        length: 10,
      })

      Matter.Composite.add(engine.world, [pinBody, cardBody, constraint])
      existing.set(wish.id, { wishId: wish.id, pinBody, cardBody, constraint })
    })

    // Remove deleted wishes
    existing.forEach((card, id) => {
      if (!wishes.find((w) => w.id === id)) {
        Matter.Composite.remove(engine.world, [card.pinBody, card.cardBody, card.constraint])
        existing.delete(id)
      }
    })
  }, [wishes, containerRef])

  // Ambient sway
  useEffect(() => {
    const interval = setInterval(() => {
      cardsRef.current.forEach((card) => {
        const force = (Math.random() - 0.5) * 0.0003
        Matter.Body.applyForce(card.cardBody, card.cardBody.position, {
          x: force,
          y: 0,
        })
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const getCardTransform = useCallback((wishId: string) => {
    return transformsRef.current.get(wishId) ?? null
  }, [])

  const startDrag = useCallback((wishId: string, mouseX: number, mouseY: number) => {
    const engine = engineRef.current
    const card = cardsRef.current.get(wishId)
    const mouseBody = mouseBodyRef.current
    if (!engine || !card || !mouseBody) return

    Matter.Body.setPosition(mouseBody, { x: mouseX, y: mouseY })

    const constraint = Matter.Constraint.create({
      bodyA: mouseBody,
      bodyB: card.cardBody,
      stiffness: 0.1,
      damping: 0.1,
      length: 0,
    })

    Matter.Composite.add(engine.world, constraint)
    dragConstraintRef.current = constraint
    dragBodyRef.current = card.cardBody
  }, [])

  const moveDrag = useCallback((mouseX: number, mouseY: number) => {
    const mouseBody = mouseBodyRef.current
    if (!mouseBody || !dragConstraintRef.current) return
    Matter.Body.setPosition(mouseBody, { x: mouseX, y: mouseY })
  }, [])

  const endDrag = useCallback(() => {
    const engine = engineRef.current
    const constraint = dragConstraintRef.current
    const container = containerRef.current
    if (!engine || !constraint) return

    Matter.Composite.remove(engine.world, constraint)
    dragConstraintRef.current = null

    // Save position
    if (dragBodyRef.current && container) {
      const rect = container.getBoundingClientRect()
      const body = dragBodyRef.current
      const normX = body.position.x / rect.width
      const normY = body.position.y / rect.height

      // Find which wish this body belongs to
      cardsRef.current.forEach((card) => {
        if (card.cardBody === body) {
          // Also move the pin
          Matter.Body.setPosition(card.pinBody, {
            x: body.position.x,
            y: body.position.y - 60,
          })
          updateWishPosition(card.wishId, normX, normY)
        }
      })
    }
    dragBodyRef.current = null
  }, [containerRef])

  return { getCardTransform, startDrag, moveDrag, endDrag }
}
