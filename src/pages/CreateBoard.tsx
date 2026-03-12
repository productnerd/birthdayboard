import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBoard } from '../lib/api'
import { FONTS } from '../lib/fonts'

export default function CreateBoard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fontIndex, setFontIndex] = useState(FONTS.indexOf('Gloria Hallelujah'))
  const [headline, setHeadline] = useState('Happy Birthday ...')

  const currentFont = FONTS[fontIndex]

  function prevFont() {
    setFontIndex((i) => (i - 1 + FONTS.length) % FONTS.length)
  }

  function nextFont() {
    setFontIndex((i) => (i + 1) % FONTS.length)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)

    try {
      const month = String(form.get('birthday_month')).padStart(2, '0')
      const day = String(form.get('birthday_day')).padStart(2, '0')
      const birthdayDate = `${new Date().getFullYear()}-${month}-${day}`

      const board = await createBoard({
        person_name: form.get('person_name') as string,
        birthday_date: birthdayDate,
        creator_name: form.get('creator_name') as string,
        creator_email: form.get('creator_email') as string,
        prompt_note: form.get('prompt_note') as string,
        headline: headline.trim() || null,
        headline_font: currentFont,
      })
      navigate(`/created/${board.slug}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message
        : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message)
        : String(err)
      setError(msg || 'Something went wrong')
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
          <span className="text-amber-950 text-lg">Who's the birthday person?</span>
          <input
            name="person_name"
            required
            className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. Maria"
          />
        </label>

        <div className="block mb-4">
          <span className="text-amber-950 text-lg">Last day to add wishes</span>
          <div className="flex gap-3 mt-1">
            <select
              name="birthday_month"
              required
              className="flex-1 rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Month</option>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              name="birthday_day"
              required
              className="w-20 rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="block mb-4">
          <span className="text-amber-950 text-lg">Your name (the organizer)</span>
          <input
            name="creator_name"
            required
            className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. Alex"
          />
        </label>

        <label className="block mb-4">
          <span className="text-amber-950 text-lg">Your email (for notifications)</span>
          <input
            name="creator_email"
            type="email"
            required
            className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="you@example.com"
          />
        </label>

        {/* Board headline */}
        <label className="block mb-1">
          <span className="text-amber-950 text-lg">Board headline</span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ fontFamily: `'${currentFont}', cursive` }}
            placeholder="Happy Birthday ..."
          />
        </label>

        {/* Font picker */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevFont}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 transition-colors text-lg"
          >
            &lsaquo;
          </button>
          <span
            className="text-lg text-amber-950 px-2 text-center"
            style={{ fontFamily: `'${currentFont}', cursive` }}
          >
            {currentFont}
          </span>
          <button
            type="button"
            onClick={nextFont}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 transition-colors text-lg"
          >
            &rsaquo;
          </button>
        </div>

        <label className="block mb-6">
          <span className="text-amber-950 text-lg">Prompt for friends (optional)</span>
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
          className="w-full bg-amber-900 hover:bg-amber-950 text-white font-handwriting text-2xl py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Board'}
        </button>
      </form>
    </div>
  )
}
