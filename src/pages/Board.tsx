import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getBoard, getWishes } from '../lib/api'
import type { Board as BoardType, Wish } from '../lib/types'
import AddWishForm from '../components/AddWishForm'
import BoardView from '../components/BoardView'

export default function Board() {
  const { slug } = useParams<{ slug: string }>()
  const [board, setBoard] = useState<BoardType | null>(null)
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [hasPosted, setHasPosted] = useState(false)

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
      {/* Header */}
      <div className="text-center py-6 px-4">
        <h1 className="font-handwriting text-5xl text-amber-950 drop-shadow-sm">
          Happy Birthday, {board.person_name}!
        </h1>
        {board.prompt_note && (
          <p className="font-hand text-xl text-amber-800 mt-2 italic">
            "{board.prompt_note}"
          </p>
        )}
        <p className="font-hand text-amber-700 mt-1">
          — organized by {board.creator_name}
        </p>

        {hasPosted ? (
          <p className="mt-4 font-hand text-lg text-amber-700 italic">
            You've already left your wish!
          </p>
        ) : (
          <button
            onClick={() => setShowForm(!showForm)}
            className="mt-4 bg-amber-700 hover:bg-amber-800 text-white font-handwriting text-xl px-6 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Close' : 'Add a Wish'}
          </button>
        )}
      </div>

      {/* Add wish form */}
      {showForm && (
        <div className="flex justify-center px-4 pb-6">
          <AddWishForm boardId={board.id} onWishAdded={handleWishAdded} />
        </div>
      )}

      {/* Board */}
      <BoardView wishes={wishes} board={board} />
    </div>
  )
}
