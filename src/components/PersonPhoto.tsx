import { getPublicUrl } from '../lib/storage'

interface Props {
  path: string
  name: string
}

export default function PersonPhoto({ path, name }: Props) {
  return (
    <div className="polaroid inline-block" style={{ transform: 'rotate(-3deg)' }}>
      <img
        src={getPublicUrl(path)}
        alt={name}
        className="w-48 h-48 object-cover"
      />
      <p className="font-handwriting text-center text-lg text-gray-700 mt-1">
        {name}
      </p>
    </div>
  )
}
