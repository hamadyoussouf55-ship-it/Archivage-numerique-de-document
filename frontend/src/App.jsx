import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage           from './pages/LoginPage'
import DashboardPage       from './pages/DashboardPage'
import ArmoiresPage        from './pages/ArmoiresPage'
import ArmoireDetailPage   from './pages/ArmoireDetailPage'
import DocumentsPage       from './pages/DocumentsPage'
import DocumentDetailPage  from './pages/DocumentDetailPage'
import NouveauDocumentPage from './pages/NouveauDocumentPage'
import JournalPage         from './pages/JournalPage'
import AdminPage           from './pages/AdminPage'
import ProfilePage         from './pages/ProfilePage'
import StatistiquesPage    from './pages/StatistiquesPage'
import CorbeillePage       from './pages/CorbeillePage'

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#f8fafc' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
           style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
    </div>
  )
}

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user)   return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index                    element={<DashboardPage />} />
            <Route path="armoires"          element={<ArmoiresPage />} />
            <Route path="armoires/:id"      element={<ArmoireDetailPage />} />
            <Route path="documents"         element={<DocumentsPage />} />
            <Route path="documents/nouveau" element={<NouveauDocumentPage />} />
            <Route path="documents/:id"     element={<DocumentDetailPage />} />
            <Route path="statistiques"      element={<StatistiquesPage />} />
            <Route path="corbeille"         element={<PrivateRoute adminOnly={false}><CorbeillePage /></PrivateRoute>} />
            <Route path="profil"            element={<ProfilePage />} />
            <Route path="journal"           element={<PrivateRoute adminOnly><JournalPage /></PrivateRoute>} />
            <Route path="admin"             element={<PrivateRoute adminOnly><AdminPage /></PrivateRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
