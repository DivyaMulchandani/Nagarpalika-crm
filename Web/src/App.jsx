import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './context/LangContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Careers from './pages/Careers'
import Notices from './pages/Notices'
import Results from './pages/Results'
import Contact from './pages/Contact'
import CallLetterCheck from './pages/CallLetter/CallLetterCheck'
import CallLetterResult from './pages/CallLetter/CallLetterResult'
import FeeStatus from './pages/Fee/FeeStatus'
import FeeSuccess from './pages/Fee/FeeSuccess'
import FeeFailure from './pages/Fee/FeeFailure'
import RegistrationStep from './pages/Registration/RegistrationStep'
import FindRegistration from './pages/Registration/FindRegistration'
import ApplicationEntry from './pages/Application/ApplicationEntry'
import ApplicationForm from './pages/Application/ApplicationForm'
import PrintApplication from './pages/Application/PrintApplication'
import ApplyDirect from './pages/Application/ApplyDirect'
import AdvertisementDetail from './pages/AdvertisementDetail'

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
          <Route path="/contact"    element={<Layout><Contact /></Layout>} />

          <Route path="/callletter"                    element={<Layout><CallLetterCheck /></Layout>} />
          <Route path="/callletter/result"             element={<Layout><CallLetterResult /></Layout>} />

          <Route path="/fee"                           element={<Layout><FeeStatus /></Layout>} />
          <Route path="/fee/success"                   element={<Layout><FeeSuccess /></Layout>} />
          <Route path="/fee/failure"                   element={<Layout><FeeFailure /></Layout>} />

          <Route path="/registration"                  element={<Navigate to="/registration/apply/step/1" replace />} />
          <Route path="/registration/apply/step/:step" element={<Layout><RegistrationStep /></Layout>} />
          <Route path="/registration/find"             element={<Layout><FindRegistration /></Layout>} />

          <Route path="/advertisement/:id"              element={<Layout><AdvertisementDetail /></Layout>} />
          <Route path="/apply/:id"                      element={<Layout><ApplyDirect /></Layout>} />

          <Route path="/application"                   element={<Layout><ApplicationEntry /></Layout>} />
          <Route path="/application/apply"             element={<Layout><ApplicationForm /></Layout>} />
          <Route path="/application/print"             element={<Layout><PrintApplication /></Layout>} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  )
}
