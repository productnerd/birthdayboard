import { useState, type FormEvent } from 'react'
import { createWish } from '../lib/api'
import type { Wish } from '../lib/types'

interface Props {
  boardId: string
  onWishAdded: (wish: Wish) => void
}

export default function AddWishForm({ boardId, onWishAdded }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const photo = (form.get('photo') as File)?.size
      ? (form.get('photo') as File)
      : undefined

    try {
      const wish = await createWish({
        board_id: boardId,
        author_name: form.get('author_name') as string,
        message: form.get('message') as string,
        photo,
      })
      onWishAdded(wish)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="paper-card rounded-lg p-6 w-full max-w-md"
      style={{ transform: 'rotate(1deg)' }}
    >
      <h2 className="font-handwriting text-3xl text-amber-900 mb-4">
        Leave a Wish
      </h2>

      <label className="block mb-3">
        <span className="text-amber-800 font-hand">Your name</span>
        <input
          name="author_name"
          required
          className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Your name"
        />
      </label>

      <label className="block mb-3">
        <span className="text-amber-800 font-hand">Your message</span>
        <textarea
          name="message"
          required
          rows={3}
          className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-handwriting text-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Happy birthday! ..."
        />
      </label>

      <label className="block mb-4">
        <span className="text-amber-800 font-hand">Add a photo (optional)</span>
        <input
          name="photo"
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-amber-800 font-hand"
        />
      </label>

      {error && (
        <p className="text-red-600 mb-3 font-hand">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-700 hover:bg-amber-800 text-white font-handwriting text-xl py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Posting...' : 'Post Wish'}
      </button>
    </form>
  )
}
