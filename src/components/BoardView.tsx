import { useRef, useCallback, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import type { Wish } from '../lib/types'
import WishCard from './WishCard'
import { usePhysics } from '../hooks/usePhysics'

interface Props {
  wishes: Wish[]
}

export interface BoardViewHandle {
  fitAll: () => void
  focusWish: (wishId: string) => void
}

const BoardView = forwardRef<BoardViewHandle, Props>(function BoardView({ wishes }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const { cardStates, cardLayouts, startDrag, moveDrag, endDrag } = usePhysics(wishes)

  // Transform state
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)

  // Track pinch gesture
  const lastPinchDist = useRef(0)
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })

  // Track mouse drag-to-pan on canvas
  const isMousePanning = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const isDraggingCard = useRef(false)

  // Calculate board bounds from layouts
  let boardW = 1200, boardH = 800
  cardLayouts.forEach((layout) => {
    boardW = Math.max(boardW, layout.cardX + layout.cardW + 60)
    boardH = Math.max(boardH, layout.cardY + layout.cardH + 60)
  })

  // Fit all wishes in view
  const fitAll = useCallback(() => {
    const container = containerRef.current
    if (!container || cardLayouts.size === 0) return

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0
    cardLayouts.forEach((layout) => {
      minX = Math.min(minX, layout.cardX)
      minY = Math.min(minY, layout.cardY)
      maxX = Math.max(maxX, layout.cardX + layout.cardW)
      maxY = Math.max(maxY, layout.cardY + layout.cardH)
    })

    const contentW = maxX - minX + 80
    const contentH = maxY - minY + 80
    const viewW = container.clientWidth
    const viewH = container.clientHeight

    const newScale = Math.min(1, viewW / contentW, viewH / contentH) * 0.9
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setScale(newScale)
    setTranslateX(viewW / 2 - centerX * newScale)
    setTranslateY(viewH / 2 - centerY * newScale)
  }, [cardLayouts])

  // Focus on a specific wish then zoom out to fit all
  const focusWish = useCallback((wishId: string) => {
    const container = containerRef.current
    const layout = cardLayouts.get(wishId)
    if (!container || !layout) return

    const viewW = container.clientWidth
    const viewH = container.clientHeight
    const cx = layout.cardX + layout.cardW / 2
    const cy = layout.cardY + layout.cardH / 2

    // First zoom in on the new wish
    const zoomScale = Math.min(1, viewW / (layout.cardW + 100))
    setScale(zoomScale)
    setTranslateX(viewW / 2 - cx * zoomScale)
    setTranslateY(viewH / 2 - cy * zoomScale)

    // Then after a moment, zoom out to fit all
    setTimeout(() => fitAll(), 1500)
  }, [cardLayouts, fitAll])

  useImperativeHandle(ref, () => ({ fitAll, focusWish }), [fitAll, focusWish])

  // Fit all on initial load
  useEffect(() => {
    if (cardLayouts.size > 0) {
      fitAll()
    }
  }, [cardLayouts.size > 0])

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = el!.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Zoom toward mouse position — use deltaY magnitude for smooth trackpad
      const zoomFactor = 1 - e.deltaY * 0.002
      setScale(prev => {
        const newScale = Math.min(3, Math.max(0.1, prev * zoomFactor))
        const ratio = newScale / prev
        setTranslateX(tx => mouseX - ratio * (mouseX - tx))
        setTranslateY(ty => mouseY - ratio * (mouseY - ty))
        return newScale
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Touch pinch zoom + pan
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist.current = Math.hypot(dx, dy)
      } else if (e.touches.length === 1) {
        isPanning.current = true
        lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)

        if (lastPinchDist.current > 0) {
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
          const rect = el!.getBoundingClientRect()
          const localX = midX - rect.left
          const localY = midY - rect.top

          const zoomFactor = dist / lastPinchDist.current
          setScale(prev => {
            const newScale = Math.min(3, Math.max(0.1, prev * zoomFactor))
            const ratio = newScale / prev
            setTranslateX(tx => localX - ratio * (localX - tx))
            setTranslateY(ty => localY - ratio * (localY - ty))
            return newScale
          })
        }
        lastPinchDist.current = dist
      } else if (e.touches.length === 1 && isPanning.current) {
        const dx = e.touches[0].clientX - lastPan.current.x
        const dy = e.touches[0].clientY - lastPan.current.y
        setTranslateX(tx => tx + dx)
        setTranslateY(ty => ty + dy)
        lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    function onTouchEnd() {
      lastPinchDist.current = 0
      isPanning.current = false
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const handleCardPointerDown = useCallback(
    (wishId: string, e: React.PointerEvent) => {
      e.stopPropagation()
      isDraggingCard.current = true
      const inner = innerRef.current
      if (!inner) return
      const rect = inner.getBoundingClientRect()
      startDrag(wishId, e.clientX, e.clientY, rect)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [startDrag],
  )

  const handleCardPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingCard.current) return
      const inner = innerRef.current
      if (!inner) return
      moveDrag(e.clientX, e.clientY, inner.getBoundingClientRect())
    },
    [moveDrag],
  )

  const handleCardPointerUp = useCallback(() => {
    isDraggingCard.current = false
    endDrag()
  }, [endDrag])

  // Canvas mouse drag-to-pan
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    // Only left mouse button, and only if not on a card
    if (e.button !== 0 || e.pointerType === 'touch') return
    isMousePanning.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isMousePanning.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    setTranslateX(tx => tx + dx)
    setTranslateY(ty => ty + dy)
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleCanvasPointerUp = useCallback(() => {
    isMousePanning.current = false
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ height: 'calc(100vh - 180px)' }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerLeave={handleCanvasPointerUp}
    >
      <div
        ref={innerRef}
        className="relative"
        style={{
          width: boardW,
          height: boardH,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: 'transform 0.3s ease-out',
        }}
      >
        {wishes.map((wish) => {
          const state = cardStates.get(wish.id)
          const layout = cardLayouts.get(wish.id)
          if (!state || !layout) return null

          const offsetX = state.pinOffsetX
          const cardW = layout.cardW
          const originX = ((cardW / 2 + offsetX) / cardW) * 100

          return (
            <div
              key={wish.id}
              className="absolute cursor-grab active:cursor-grabbing select-none z-10"
              style={{
                left: layout.pinX - (cardW / 2 + offsetX),
                top: layout.pinY - 12,
                transform: `rotate(${state.angle}deg)`,
                transformOrigin: `${originX}% 12px`,
              }}
              onPointerDown={(e) => handleCardPointerDown(wish.id, e)}
              onPointerMove={handleCardPointerMove}
              onPointerUp={handleCardPointerUp}
            >
              <WishCard wish={wish} pinOffsetX={state.pinOffsetX} />
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default BoardView
