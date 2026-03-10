import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getBoard, getWishes } from '../lib/api'
import type { Board as BoardType, Wish } from '../lib/types'
import AddWishForm from '../components/AddWishForm'
import BoardView from '../components/BoardView'
import ShareModal from '../components/ShareModal'

export default function Board() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const [board, setBoard] = useState<BoardType | null>(null)
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(searchParams.get('addWish') === '1')
  const [hasPosted, setHasPosted] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/board/${slug}`

  useEffect(() => {
    if (!slug) return
    setHasPosted(localStorage.getItem(`bb-posted-${slug}`) === '1')
    loadBoard()
  }, [slug])

  async function loadBoard() {
    const b = await getBoard(slug!)
    if (!b) return
    setBoard(b)
    const w = await getWishes(b.id)
    setWishes(w)
    setLoading(false)
  }

  function handleWishAdded(wish: Wish) {
    setWishes(prev => [...prev, wish])
    setShowForm(false)
    setHasPosted(true)
    localStorage.setItem(`bb-posted-${slug}`, '1')
    setShowShareModal(true)
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl)
  }

  if (loading) {
    return (
      <div className="min-h-screen cork-bg flex items-center justify-center">
        <p className="font-handwriting text-3xl text-amber-900">Loading...</p>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="min-h-screen cork-bg flex items-center justify-center">
        <p className="font-handwriting text-3xl text-amber-900">Board not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen cork-bg">
      {/* Share button — top right */}
      <button
        onClick={() => { copyShareUrl(); setShowShareModal(true) }}
        className="fixed top-4 right-4 z-50 bg-amber-900/90 hover:bg-amber-950 text-white font-hand px-4 py-2 rounded-lg transition-colors text-sm"
      >
        Share Board
      </button>

      {/* Header */}
      <div className="text-center py-6 px-4">
        <h1 className="font-handwriting text-5xl text-amber-950 drop-shadow-sm">
          Happy Birthday, {board.person_name}!
        </h1>
        {board.prompt_note && (
          <p className="font-hand text-xl text-amber-950 mt-2 italic">
            "{board.prompt_note}"
          </p>
        )}
        <p className="font-hand text-amber-950 mt-1">
          — organized by {board.creator_name}
        </p>

        {hasPosted ? (
          <p className="mt-4 font-hand text-lg text-amber-950 italic">
            You've already left your wish!
          </p>
        ) : !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 bg-amber-900 hover:bg-amber-950 text-white font-handwriting text-xl px-6 py-2 rounded-lg transition-colors"
          >
            Add a Wish
          </button>
        )}
      </div>

      {/* Board — always behind the form */}
      <BoardView wishes={wishes} />

      {/* Add wish form — overlays on top */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <AddWishForm boardId={board.id} onWishAdded={handleWishAdded} />
        </div>
      )}

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          shareUrl={shareUrl}
          personName={board.person_name}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
