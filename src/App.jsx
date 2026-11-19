import { Routes, Route } from "react-router-dom";

import Home from './pages/Home'
import Send from './pages/Send'
import Receive from './pages/Receive'
import Footer from './components/Footer'
import { ToastProvider } from './components/ToastContext'

const App = () => {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-[#080808] px-6 py-8">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/send" element={<Send />} />
          <Route path="/receive" element={<Receive />} />
        </Routes>

        <Footer />
      </main>
    </ToastProvider>
  )
}

export default App