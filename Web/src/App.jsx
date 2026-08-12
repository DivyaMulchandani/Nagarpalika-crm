import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { LangProvider } from './context/LangContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import SessionTimer from './components/SessionTimer'
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
import ApplicationsList from './pages/Applications/ApplicationsList'
import ApplicationDetail from './pages/Applications/ApplicationDetail'
import Profile from './pages/Profile/Profile'

function Layout({ children }) {
  return (
    <>
      <Header />
      <main id="main" className="container">
        {children}
      </main>
      <Footer />
      <SessionTimer />
    </>
  )
}

// Registration (OTR) is only for new candidates — logged-in users are
// redirected to their applications instead.
function GuestOnly({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/application" replace />
  return children
}

// Auth-protected route: waits for the session check, then either renders the
// page or sends the visitor to login with a redirect back to where they were.
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/registration/find?redirect=${redirect}`} replace />
  }
  return children
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
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

            <Route path="/registration"                  element={<Layout><GuestOnly><RegistrationStep /></GuestOnly></Layout>} />
            <Route path="/registration/apply"            element={<Navigate to="/registration" replace />} />
            <Route path="/registration/apply/step/*"     element={<Navigate to="/registration" replace />} />
            <Route path="/registration/find"             element={<Layout><FindRegistration /></Layout>} />

            <Route path="/advertisement/:slug"           element={<Layout><AdvertisementDetail /></Layout>} />
            <Route path="/apply/:slug"                   element={<Layout><ApplyDirect /></Layout>} />

            <Route path="/application"                   element={<Layout><RequireAuth><ApplicationEntry /></RequireAuth></Layout>} />
            <Route path="/application/apply"             element={<Layout><RequireAuth><ApplicationForm /></RequireAuth></Layout>} />
            <Route path="/application/print"             element={<Layout><RequireAuth><PrintApplication /></RequireAuth></Layout>} />

            <Route path="/profile"                       element={<Layout><RequireAuth><Profile /></RequireAuth></Layout>} />
            <Route path="/applications"                  element={<Layout><RequireAuth><ApplicationsList /></RequireAuth></Layout>} />
            <Route path="/applications/:ref"             element={<Layout><RequireAuth><ApplicationDetail /></RequireAuth></Layout>} />

            <Route path="/login"                         element={<Navigate to="/registration/find" replace />} />
            <Route path="*"                              element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer position="top-right" autoClose={4000} newestOnTop closeOnClick theme="colored" />
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  )
}
