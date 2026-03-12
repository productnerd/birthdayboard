import { useState, useRef, type FormEvent } from 'react'
import { createWish } from '../lib/api'
import { compressImage } from '../lib/compress'
import type { Wish } from '../lib/types'
import { FONTS } from '../lib/fonts'

interface Props {
  boardId: string
  onWishAdded: (wish: Wish) => void
}

export default function AddWishForm({ boardId, onWishAdded }: Props) {
  const [loading, setLoading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [fontIndex, setFontIndex] = useState(0)
  const [message, setMessage] = useState('')
  const photoRef = useRef<HTMLInputElement>(null)

  const currentFont = FONTS[fontIndex]
  const textareaFontSize = currentFont === 'Reenie Beanie' ? '1.5rem' : '1.25rem'
  const busy = loading || compressing

  function prevFont() {
    setFontIndex((i) => (i - 1 + FONTS.length) % FONTS.length)
  }

  function nextFont() {
    setFontIndex((i) => (i + 1) % FONTS.length)
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setCompressing(true)
    const compressed = await compressImage(file)
    setPhoto(compressed)
    setCompressing(false)
  }

  function removePhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    if (photoRef.current) photoRef.current.value = ''
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)

    try {
      const wish = await createWish({
        board_id: boardId,
        author_name: form.get('author_name') as string,
        message: form.get('message') as string,
        font_family: currentFont,
        photo: photo || undefined,
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
      <label className="block mb-3">
        <span className="text-amber-950 font-hand">Your name</span>
        <input
          name="author_name"
          required
          className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 font-hand text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Your name"
        />
      </label>

      <label className="block mb-1">
        <span className="text-amber-950 font-hand">Your message</span>
        <textarea
          name="message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 block w-full rounded border border-amber-300 bg-amber-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{ fontFamily: `'${currentFont}', cursive`, fontSize: textareaFontSize }}
          placeholder="Happy birthday! ..."
        />
      </label>

      {/* Font picker */}
      <div className="flex items-center justify-between mb-3">
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

      <div className="block mb-4">
        {!photoPreview && <span className="text-amber-950 font-hand">Add a photo or GIF (optional)</span>}
        <input
          ref={photoRef}
          name="photo"
          type="file"
          accept="image/*,.gif"
          className="hidden"
          onChange={handlePhotoChange}
        />
        {photoPreview ? (
          <div className="relative inline-block mt-2">
            <img
              src={photoPreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded border border-amber-300"
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs leading-none hover:bg-red-600"
            >
              &times;
            </button>
            {compressing && <span className="text-xs text-amber-950 ml-2">Compressing...</span>}
          </div>
        ) : (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="px-4 py-2 rounded border border-amber-300 bg-amber-50 text-amber-950 font-hand hover:bg-amber-100 transition-colors"
            >
              Choose Photo
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-600 mb-3 font-hand">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-amber-900 hover:bg-amber-950 text-white font-handwriting text-xl py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Posting...' : compressing ? 'Preparing image...' : 'Post Wish'}
      </button>
    </form>
  )
}
