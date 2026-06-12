import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authAPI, entrepriseAPI } from '../services/api'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { Users, Plus, Search, Shield, Edit2, Trash2, X, Check, UserCheck, UserX, Building2, Layers } from 'lucide-react'

const ROLE_BADGE = { ADMIN: 'badge-blue', ARCHIVISTE: 'badge-green', CONSULTANT: 'badge-gray' }
const TABS = [{ id: 'users', label: 'Utilisateurs', icon: Users }, { id: 'depts', label: 'Départements', icon: Building2 }, { id: 'services', label: 'Services', icon: Layers }]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(30,58,138,0.25)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title">{title}</h2>
          <button onClick={onClose} style={{ color: '#94a3b8' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CollaborateurModal({ collab, onClose, onSuccess }) {
  const isEdit = !!collab
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: collab || { role: 'CONSULTANT' } })
  const { data: depts }    = useQuery('departements', () => entrepriseAPI.getDepartements().then(r => r.data))
  const { data: services } = useQuery('services',     () => entrepriseAPI.getServices().then(r => r.data))
  const mutation = useMutation(
    (data) => isEdit ? authAPI.updateCollaborateur(collab.id, data) : authAPI.createCollaborateur(data),
    { onSuccess: () => { toast.success(isEdit ? 'Mis à jour !' : 'Créé !'); onSuccess() },
      onError: (e) => toast.error(Object.values(e.response?.data || {}).flat().join(' ') || 'Erreur') }
  )
  return (
    <Modal title={isEdit ? 'Modifier le collaborateur' : 'Nouveau collaborateur'} onClose={onClose}>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Prénom *</label><input className="input" {...register('prenom', { required: true })} />{errors.prenom && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
          <div><label className="label">Nom *</label><input className="input" {...register('nom', { required: true })} /></div>
        </div>
        <div><label className="label">Email *</label><input type="email" className="input" {...register('email', { required: true })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Matricule *</label><input className="input font-mono" {...register('matricule', { required: true })} /></div>
          <div><label className="label">Rôle</label>
            <select className="input" {...register('role')}>
              <option value="CONSULTANT">Consultant</option>
              <option value="ARCHIVISTE">Archiviste</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Département</label>
            <select className="input" {...register('departement')}><option value="">Aucun</option>{depts?.results?.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}</select>
          </div>
          <div><label className="label">Service</label>
            <select className="input" {...register('service')}><option value="">Aucun</option>{services?.results?.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
          </div>
        </div>
        {!isEdit && (
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Mot de passe *</label><input type="password" className="input" {...register('password', { required: true, minLength: 6 })} /></div>
            <div><label className="label">Confirmation *</label><input type="password" className="input" {...register('password2', { required: true })} /></div>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 justify-center">
            {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> {isEdit ? 'Enregistrer' : 'Créer'}</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function OrgModal({ type, item, onClose, onSuccess }) {
  const isEdit = !!item
  const { register, handleSubmit, watch } = useForm({ defaultValues: item || {} })
  const { data: entreprises } = useQuery('entreprises', () => entrepriseAPI.getEntreprises().then(r => r.data), { enabled: type === 'departement' })
  const { data: depts } = useQuery('departements', () => entrepriseAPI.getDepartements().then(r => r.data), { enabled: type === 'service' })
  const mutation = useMutation(
    (data) => type === 'departement' ? (isEdit ? entrepriseAPI.updateDepartement(item.id, data) : entrepriseAPI.createDepartement(data)) : (isEdit ? entrepriseAPI.updateService(item.id, data) : entrepriseAPI.createService(data)),
    { onSuccess: () => { toast.success(isEdit ? 'Mis à jour !' : 'Créé !'); onSuccess() }, onError: (e) => toast.error(Object.values(e.response?.data || {}).flat().join(' ') || 'Erreur') }
  )
  return (
    <Modal title={`${isEdit ? 'Modifier' : 'Nouveau'} ${type === 'departement' ? 'département' : 'service'}`} onClose={onClose}>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div><label className="label">Nom *</label><input className="input" {...register('nom', { required: true })} /></div>
        <div><label className="label">Code *</label><input className="input font-mono uppercase" {...register('code', { required: true })} /></div>
        {type === 'departement' && (
          <div><label className="label">Entreprise *</label>
            <select className="input" {...register('entreprise', { required: true })}><option value="">Sélectionner…</option>{entreprises?.results?.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select>
          </div>
        )}
        {type === 'service' && (
          <div><label className="label">Département *</label>
            <select className="input" {...register('departement', { required: true })}><option value="">Sélectionner…</option>{depts?.results?.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}</select>
          </div>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 justify-center">
            {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> {isEdit ? 'Enregistrer' : 'Créer'}</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminPage() {
  const qc = useQueryClient()
  const [tab, setTab]       = useState('users')
  const [search, setSearch] = useState('')
  const [role, setRole]     = useState('')
  const [modal, setModal]   = useState(null)

  const { data: users }    = useQuery(['collaborateurs', search, role], () => authAPI.getCollaborateurs({ search, ...(role && { role }) }).then(r => r.data))
  const { data: depts }    = useQuery('departements', () => entrepriseAPI.getDepartements().then(r => r.data))
  const { data: services } = useQuery('services',     () => entrepriseAPI.getServices().then(r => r.data))

  const toggleActive = useMutation(({ id, is_active }) => authAPI.updateCollaborateur(id, { is_active }),
    { onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries('collaborateurs') } })
  const deleteUser = useMutation((id) => authAPI.deleteCollaborateur(id),
    { onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries('collaborateurs') } })

  const deleteDept = useMutation((id) => entrepriseAPI.deleteDepartement(id),
    { onSuccess: () => { toast.success('Département supprimé'); qc.invalidateQueries('departements') } })
  const deleteSvc = useMutation((id) => entrepriseAPI.deleteService(id),
    { onSuccess: () => { toast.success('Service supprimé'); qc.invalidateQueries('services') } })

  const close = () => setModal(null)
  const refresh = () => { close(); qc.invalidateQueries('collaborateurs'); qc.invalidateQueries('departements'); qc.invalidateQueries('services') }

  return (
    <div className="p-6 space-y-5">
      {modal?.type === 'user' && <CollaborateurModal collab={modal.item} onClose={close} onSuccess={refresh} />}
      {(modal?.type === 'departement' || modal?.type === 'service') && <OrgModal type={modal.type} item={modal.item} onClose={close} onSuccess={refresh} />}

      <div>
        <h1 className="page-title flex items-center gap-2"><Shield size={20} style={{ color: '#2563eb' }} /> Administration</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Gestion des utilisateurs et de l'organisation</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: '#e2e8f0' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all"
                  style={{ borderBottom: tab === id ? '2px solid #2563eb' : '2px solid transparent', color: tab === id ? '#2563eb' : '#64748b', marginBottom: -1 }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === 'users' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total',  value: users?.count },
              { label: 'Actifs', value: users?.results?.filter(u => u.is_active).length },
              { label: 'Admins', value: users?.results?.filter(u => u.role === 'ADMIN').length },
            ].map(({ label, value }) => (
              <div key={label} className="card text-center py-4">
                <div className="text-2xl font-display font-bold" style={{ color: '#1e293b' }}>{value ?? '—'}</div>
                <div className="text-xs font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#64748b' }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, matricule…" className="input pl-9" />
            </div>
            <select value={role} onChange={e => setRole(e.target.value)} className="input w-44">
              <option value="">Tous les rôles</option>
              <option value="ADMIN">Administrateur</option>
              <option value="ARCHIVISTE">Archiviste</option>
              <option value="CONSULTANT">Consultant</option>
            </select>
            <button onClick={() => setModal({ type: 'user' })} className="btn-primary ml-auto"><Plus size={15} /> Nouveau</button>
          </div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Collaborateur', 'Matricule', 'Rôle', 'Département', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {users?.results?.map(user => (
                  <tr key={user.id} className={`group transition-colors ${!user.is_active ? 'opacity-50' : ''}`}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e  => e.currentTarget.style.background = ''}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                             style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                          {user.prenom?.[0]}{user.nom?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: '#1e293b' }}>{user.full_name}</div>
                          <div className="text-xs" style={{ color: '#94a3b8' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{user.matricule}</td>
                    <td className="px-5 py-3"><span className={ROLE_BADGE[user.role] || 'badge-gray'}>{user.role}</span></td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{user.departement_nom || '—'}</td>
                    <td className="px-5 py-3"><span className={user.is_active ? 'badge-green' : 'badge-red'}>{user.is_active ? 'Actif' : 'Inactif'}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ type: 'user', item: user })} className="p-1.5 rounded hover:bg-blue-50 transition-colors" style={{ color: '#2563eb' }}><Edit2 size={14} /></button>
                        <button onClick={() => toggleActive.mutate({ id: user.id, is_active: !user.is_active })} className="p-1.5 rounded hover:bg-yellow-50 transition-colors" style={{ color: '#ca8a04' }}>
                          {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button onClick={() => { if (confirm(`Supprimer ${user.full_name} ?`)) deleteUser.mutate(user.id) }} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Depts */}
      {tab === 'depts' && (
        <>
          <div className="flex justify-end"><button onClick={() => setModal({ type: 'departement' })} className="btn-primary"><Plus size={15} /> Nouveau département</button></div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['Code', 'Nom', 'Services', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {depts?.results?.map(d => (
                  <tr key={d.id} className="group" onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = ''}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: '#2563eb' }}>{d.code}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: '#1e293b' }}>{d.nom}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{d.services?.length ?? 0} service(s)</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ type: 'departement', item: d })} className="p-1.5 rounded hover:bg-blue-50 transition-colors" style={{ color: '#2563eb' }}><Edit2 size={14} /></button>
                        <button onClick={() => { if (confirm(`Supprimer le département ${d.nom} ?`)) deleteDept.mutate(d.id) }} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Services */}
      {tab === 'services' && (
        <>
          <div className="flex justify-end"><button onClick={() => setModal({ type: 'service' })} className="btn-primary"><Plus size={15} /> Nouveau service</button></div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['Code', 'Nom', 'Département', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {services?.results?.map(s => (
                  <tr key={s.id} className="group" onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = ''}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: '#2563eb' }}>{s.code}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: '#1e293b' }}>{s.nom}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{s.departement_nom || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ type: 'service', item: s })} className="p-1.5 rounded hover:bg-blue-50 transition-colors" style={{ color: '#2563eb' }}><Edit2 size={14} /></button>
                        <button onClick={() => { if (confirm(`Supprimer le service ${s.nom} ?`)) deleteSvc.mutate(s.id) }} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
