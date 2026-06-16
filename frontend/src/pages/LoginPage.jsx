import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await login(email, password)
      toast.success('Connexion réussie !')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail
      if (msg?.includes('No active account') || msg?.includes('credentials') || err.response?.status === 401) {
        toast.error('Adresse email ou mot de passe incorrect')
      } else {
        toast.error(msg || 'Erreur de connexion')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f0f4f8' }}>
      {/* Left blue panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12"
           style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
             style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)' }}>
          <span className="font-display font-bold text-3xl text-white">SG</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-white text-center mb-3">SYGALIN SAS</h1>
        <p className="text-center font-mono tracking-widest text-sm mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
          SYSTÈME D'ARCHIVAGE NUMÉRIQUE
        </p>
        <div className="space-y-3 w-full max-w-xs">
          {[
            ['', 'Gestion des armoires et rayons'],
            ['', 'Codification automatique des documents'],
            ['', 'Accès sécurisé par rôle'],
            ['', 'Traçabilité complète des actions'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.08)' }}>
              <span className="text-lg">{icon}</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right white panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: '#2563eb' }}>
              <span className="font-display font-bold text-xl text-white">SG</span>
            </div>
            <h1 className="font-display text-2xl font-bold" style={{ color: '#1e293b' }}>SYGALIN SAS</h1>
          </div>

          <div className="card shadow-lg">
            <h2 className="font-display text-xl font-bold mb-1" style={{ color: '#1e293b' }}>Connexion</h2>
            <p className="text-sm mb-6" style={{ color: '#64748b' }}>Connectez-vous à votre espace</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input pl-10" placeholder="vous@sygalin.com" required />
                </div>
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input pl-10 pr-10" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Se connecter'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs mt-6" style={{ color: '#94a3b8' }}>© 2026 SYGALIN SAS</p>
        </div>
      </div>
    </div>
  )
}
