import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBoard } from '../lib/api'

export default function CreateBoard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const personImage = (form.get('person_image') as File)?.size
      ? (form.get('person_image') as File)
      : undefined

    try {
      const board = await createBoard({
        person_name: form.get('person_name') as string,
        birthday_date: form.get('birthday_date') as string,
        creator_name: form.get('creator_name') as string,
        prompt_note: form.get('prompt_note') as string,
        person_image: personImage,
      })
      navigate(`/created/${board.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen cork-bg flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="paper-card rounded-lg p-8 w-full max-w-md"
        style={{ transform: 'rotate(-1deg)' }}
      >
        <h1 className="font-handwriting text-4xl text-amber-900 mb-6 text-center">
          Create a Birthday Board
        </h1>

        <label className="block mb-4">
          <span className="text-amber-800 text-lg">Who's the birthday person?</span>
          <input
            name="person_name"
            required
            className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. Maria"
          />
        </label>

        <label className="block mb-4">
          <span className="text-amber-800 text-lg">Birthday date</span>
          <input
            name="birthday_date"
            type="date"
            required
            className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <label className="block mb-4">
          <span className="text-amber-800 text-lg">Your name (the organizer)</span>
          <input
            name="creator_name"
            required
            className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. Alex"
          />
        </label>

        <label className="block mb-4">
          <span className="text-amber-800 text-lg">Photo of them (optional)</span>
          <input
            name="person_image"
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-amber-800 font-hand"
          />
        </label>

        <label className="block mb-6">
          <span className="text-amber-800 text-lg">Prompt for friends (optional)</span>
          <textarea
            name="prompt_note"
            rows={2}
            className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. Share your favorite memory!"
          />
        </label>

        {error && (
          <p className="text-red-600 mb-4 font-hand">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white font-handwriting text-2xl py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Board'}
        </button>
      </form>
    </div>
  )
}
