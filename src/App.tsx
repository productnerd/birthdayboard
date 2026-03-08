import { Routes, Route } from 'react-router-dom'
import CreateBoard from './pages/CreateBoard'
import BoardCreated from './pages/BoardCreated'
import Board from './pages/Board'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateBoard />} />
      <Route path="/created/:slug" element={<BoardCreated />} />
      <Route path="/board/:slug" element={<Board />} />
    </Routes>
  )
}
