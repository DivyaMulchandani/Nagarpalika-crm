import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LangProvider } from './context/LangContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Careers from './pages/Careers'
import Notices from './pages/Notices'
import Results from './pages/Results'
import CallLetter from './pages/CallLetter'
import Contact from './pages/Contact'

function Layout({ children }) {
  return (
    <>
      <Header />
      <main id="main" className="container">
        {children}
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"           element={<Layout><Home /></Layout>} />
          <Route path="/about"      element={<Layout><About /></Layout>} />
          <Route path="/careers"    element={<Layout><Careers /></Layout>} />
          <Route path="/notices"    element={<Layout><Notices /></Layout>} />
          <Route path="/results"    element={<Layout><Results /></Layout>} />
          <Route path="/callletter" element={<Layout><CallLetter /></Layout>} />
          <Route path="/contact"    element={<Layout><Contact /></Layout>} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  )
}
