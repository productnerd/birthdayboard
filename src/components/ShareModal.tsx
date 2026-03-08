import { useState } from 'react'

interface Props {
  shareUrl: string
  personName: string
  onClose: () => void
}

export default function ShareModal({ shareUrl, personName, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  function copyUrl() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="paper-card rounded-xl p-6 mx-4 max-w-sm w-full"
        style={{ transform: 'rotate(-1deg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-handwriting text-2xl text-amber-900 mb-2 text-center">
          Wish posted!
        </h3>
        <p className="font-hand text-amber-800 text-center mb-4">
          Know 2-3 more friends who'd want to wish {personName} a happy birthday? Share this link with them!
        </p>

        <div className="bg-amber-50 border border-amber-300 rounded p-2 mb-4 break-all font-mono text-xs text-amber-900">
          {shareUrl}
        </div>

        <button
          onClick={copyUrl}
          className="w-full bg-amber-700 hover:bg-amber-800 text-white font-handwriting text-xl py-2 rounded-lg transition-colors mb-3"
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>

        <button
          onClick={onClose}
          className="w-full font-hand text-amber-700 hover:text-amber-900 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  )
}
