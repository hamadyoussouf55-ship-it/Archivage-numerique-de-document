import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { useMutation } from 'react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { User, Lock, Shield, Building2, Save, Eye, EyeOff } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const pwdMutation = useMutation(
    (data) => authAPI.changePassword(data),
    {
      onSuccess: () => { toast.success('Mot de passe modifié avec succès'); reset() },
      onError: (e) => toast.error(e.response?.data?.old_password?.[0] || 'Erreur'),
    }
  )

  const ROLE_LABEL = { ADMIN: 'Chef de département', ARCHIVISTE: 'Archiviste', CONSULTANT: 'Consultant' }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="page-title">Mon profil</h1>

      {/* Fiche profil */}
      <div className="card space-y-5">
        <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
               style={{ background: '#dbeafe', color: '#1d4ed8', border: '3px solid #bfdbfe' }}>
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div>
            <h2 className="section-title">{user?.full_name}</h2>
            <p className="text-sm" style={{ color: '#64748b' }}>{user?.email}</p>
            <span className="inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold mt-1"
                  style={{ background: '#dbeafe', color: '#1d4ed8' }}>
              {ROLE_LABEL[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {[
            { icon: User,      label: 'Nom complet',  value: user?.full_name },
            { icon: Shield,    label: 'Matricule',    value: user?.matricule, mono: true },
            { icon: Building2, label: 'Département',  value: user?.departement_nom || '—' },
            { icon: Building2, label: 'Service',      value: user?.service_nom || '—' },
          ].map(({ icon: Icon, label, value, mono }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                   style={{ background: '#eff6ff' }}>
                <Icon size={14} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p className="label mb-0.5">{label}</p>
                <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`} style={{ color: '#1e293b' }}>
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Changer le mot de passe */}
      <div className="card space-y-4">
        <h2 className="section-title flex items-center gap-2">
          <Lock size={16} style={{ color: '#2563eb' }} /> Changer le mot de passe
        </h2>

        <form onSubmit={handleSubmit(d => pwdMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Mot de passe actuel</label>
            <div className="relative">
              <input type={showOld ? 'text' : 'password'} className="input pr-10"
                     placeholder="••••••••"
                     {...register('old_password', { required: 'Requis' })} />
              <button type="button" onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#94a3b8' }}>
                {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.old_password && <p className="text-red-500 text-xs mt-1">{errors.old_password.message}</p>}
          </div>

          <div>
            <label className="label">Nouveau mot de passe</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} className="input pr-10"
                     placeholder="Minimum 6 caractères"
                     {...register('new_password', { required: 'Requis', minLength: { value: 6, message: 'Minimum 6 caractères' } })} />
              <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#94a3b8' }}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.new_password && <p className="text-red-500 text-xs mt-1">{errors.new_password.message}</p>}
          </div>

          <button type="submit" disabled={pwdMutation.isLoading} className="btn-primary">
            {pwdMutation.isLoading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Save size={14} /> Enregistrer le nouveau mot de passe</>}
          </button>
        </form>
      </div>
    </div>
  )
}
