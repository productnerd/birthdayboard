import { useParams } from 'react-router-dom'
import { useState } from 'react'

export default function BoardCreated() {
  const { slug } = useParams<{ slug: string }>()
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/board/${slug}`

  function copyUrl() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen cork-bg flex items-center justify-center p-4">
      <div
        className="paper-card rounded-lg p-8 w-full max-w-md text-center"
        style={{ transform: 'rotate(1deg)' }}
      >
        <h1 className="font-handwriting text-4xl text-amber-900 mb-4">
          Board Created!
        </h1>

        <p className="text-amber-800 text-lg font-hand mb-6">
          Share this link with friends so they can leave birthday wishes:
        </p>

        <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-4 break-all font-mono text-sm text-amber-900">
          {shareUrl}
        </div>

        <button
          onClick={copyUrl}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white font-handwriting text-2xl py-3 rounded-lg transition-colors mb-4"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>

        <a
          href={`#/board/${slug}?addWish=1`}
          className="block w-full border-2 border-amber-700 text-amber-700 hover:bg-amber-50 font-handwriting text-xl py-2 rounded-lg transition-colors text-center"
        >
          Write First Wish
        </a>
      </div>
    </div>
  )
}
