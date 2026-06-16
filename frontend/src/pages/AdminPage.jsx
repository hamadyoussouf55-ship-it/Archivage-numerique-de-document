import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authAPI, entrepriseAPI, armoiresAPI } from '../services/api'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { Users, Plus, Search, Shield, Edit2, Trash2, X, Check, UserCheck, UserX, Building2, Layers, Archive, Hash, ChevronDown, ChevronRight } from 'lucide-react'

const ROLE_BADGE = { ADMIN: 'badge-blue', ARCHIVISTE: 'badge-green', CONSULTANT: 'badge-gray' }
const TABS = [
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'depts', label: 'Départements', icon: Building2 },
  { id: 'services', label: 'Services', icon: Layers },
  { id: 'armoires', label: 'Armoires', icon: Archive },
  { id: 'rayons', label: 'Rayons', icon: Hash },
]

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
  const { register, handleSubmit } = useForm({ defaultValues: item || {} })
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

function ArmoireModal({ item, onClose, onSuccess }) {
  const isEdit = !!item
  const { register, handleSubmit } = useForm({ defaultValues: item || {} })
  const { data: services } = useQuery('services', () => entrepriseAPI.getServices().then(r => r.data))
  const mutation = useMutation(
    (data) => isEdit ? armoiresAPI.update(item.id, data) : armoiresAPI.create(data),
    { onSuccess: () => { toast.success(isEdit ? 'Mis à jour !' : 'Créée !'); onSuccess() }, onError: (e) => toast.error(Object.values(e.response?.data || {}).flat().join(' ') || 'Erreur') }
  )
  return (
    <Modal title={`${isEdit ? 'Modifier' : 'Nouvelle'} armoire`} onClose={onClose}>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div><label className="label">Nom *</label><input className="input" {...register('nom', { required: true })} /></div>
        <div><label className="label">Code *</label><input className="input font-mono uppercase" {...register('code', { required: true })} /></div>
        <div><label className="label">Description</label><textarea className="input" {...register('description')} rows={3} /></div>
        <div><label className="label">Service *</label>
          <select className="input" {...register('service', { required: true })}><option value="">Sélectionner…</option>{services?.results?.map(s => <option key={s.id} value={s.id}>{s.departement_nom} - {s.nom} ({s.code})</option>)}</select>
        </div>
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

function RayonModal({ item, onClose, onSuccess }) {
  const isEdit = !!item
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: item || {} })
  const { data: armoires } = useQuery('armoires-all', () => armoiresAPI.list().then(r => r.data))
  const mutation = useMutation(
    (data) => {
      const payload = { nom: data.nom, code: data.code, position: data.position, armoire: data.armoire }
      return isEdit ? armoiresAPI.updateRayon(item.id, payload) : armoiresAPI.createRayon(data.armoire, payload)
    },
    { onSuccess: () => { toast.success(isEdit ? 'Rayon mis à jour !' : 'Rayon créé !'); onSuccess() }, onError: (e) => toast.error(Object.values(e.response?.data || {}).flat().join(' ') || 'Erreur') }
  )
  return (
    <Modal title={`${isEdit ? 'Modifier' : 'Nouveau'} rayon`} onClose={onClose}>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div><label className="label">Nom *</label><input className="input" {...register('nom', { required: true })} />{errors.nom && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Code *</label><input className="input font-mono uppercase" {...register('code', { required: true })} />{errors.code && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
          <div><label className="label">Position</label><input className="input" {...register('position')} /></div>
        </div>
        <div><label className="label">Armoire *</label>
          <select className="input" {...register('armoire', { required: true })}><option value="">Sélectionner…</option>{(armoires?.results || []).map(a => <option key={a.id} value={a.id}>{a.nom} ({a.code})</option>)}</select>
          {errors.armoire && <p className="text-red-500 text-xs mt-1">Requis</p>}
        </div>
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

function ExpandIcon({ expanded }) {
  return expanded ? <ChevronDown size={14} style={{ color: '#2563eb' }} /> : <ChevronRight size={14} style={{ color: '#94a3b8' }} />
}

export default function AdminPage() {
  const qc = useQueryClient()
  const [tab, setTab]       = useState('users')
  const [search, setSearch] = useState('')
  const [role, setRole]     = useState('')
  const [modal, setModal]   = useState(null)

  const [expandDept, setExpandDept] = useState(null)
  const [expandSvc, setExpandSvc]   = useState(null)
  const [expandArm, setExpandArm]   = useState(null)

  const { data: users }     = useQuery(['collaborateurs', search, role], () => authAPI.getCollaborateurs({ search, ...(role && { role }) }).then(r => r.data))
  const { data: depts }     = useQuery('departements', () => entrepriseAPI.getDepartements().then(r => r.data))
  const { data: services }  = useQuery('services',     () => entrepriseAPI.getServices().then(r => r.data))
  const { data: armoires }  = useQuery('armoires',     () => armoiresAPI.list().then(r => r.data))

  // Rayons data — load all with pagination support
  const { data: rayonsData } = useQuery('rayons-all', () => armoiresAPI.listRayons().then(r => r.data))
  const rayons = rayonsData?.results || []

  const toggleActive = useMutation(({ id, is_active }) => authAPI.updateCollaborateur(id, { is_active }),
    { onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries('collaborateurs') } })
  const deleteUser = useMutation((id) => authAPI.deleteCollaborateur(id),
    { onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries('collaborateurs') } })

  const deleteDept = useMutation((id) => entrepriseAPI.deleteDepartement(id),
    { onSuccess: () => { toast.success('Département supprimé'); qc.invalidateQueries('departements') },
      onError: (e) => toast.error(e.response?.data?.detail || 'Erreur') })
  const deleteSvc = useMutation((id) => entrepriseAPI.deleteService(id),
    { onSuccess: () => { toast.success('Service supprimé'); qc.invalidateQueries('services') },
      onError: (e) => toast.error(e.response?.data?.detail || 'Erreur') })
  const deleteArmoire = useMutation((id) => armoiresAPI.delete(id),
    { onSuccess: () => { toast.success('Armoire supprimée'); qc.invalidateQueries('armoires') },
      onError: (e) => toast.error(e.response?.data?.detail || 'Erreur') })
  const deleteRayon = useMutation((id) => armoiresAPI.deleteRayon(id),
    { onSuccess: () => { toast.success('Rayon supprimé'); qc.invalidateQueries('rayons-all') },
      onError: (e) => toast.error(e.response?.data?.detail || 'Erreur') })

  const close = () => setModal(null)
  const refresh = () => { close(); qc.invalidateQueries('collaborateurs'); qc.invalidateQueries('departements'); qc.invalidateQueries('services'); qc.invalidateQueries('armoires'); qc.invalidateQueries('rayons-all') }

  return (
    <div className="p-6 space-y-5">
      {modal?.type === 'user' && <CollaborateurModal collab={modal.item} onClose={close} onSuccess={refresh} />}
      {(modal?.type === 'departement' || modal?.type === 'service') && <OrgModal type={modal.type} item={modal.item} onClose={close} onSuccess={refresh} />}
      {modal?.type === 'armoire' && <ArmoireModal item={modal.item} onClose={close} onSuccess={refresh} />}
      {modal?.type === 'rayon' && <RayonModal item={modal.item} onClose={close} onSuccess={refresh} />}

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
                        {user.role !== 'ADMIN' && (
                          <button onClick={() => { if (confirm(`Supprimer ${user.full_name} ?`)) deleteUser.mutate(user.id) }} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Départements */}
      {tab === 'depts' && (
        <>
          <div className="flex justify-end"><button onClick={() => setModal({ type: 'departement' })} className="btn-primary"><Plus size={15} /> Nouveau département</button></div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['', 'Code', 'Nom', 'Services', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {depts?.results?.map(d => (
                  <>
                    <tr key={d.id} className="group cursor-pointer" onClick={() => setExpandDept(expandDept === d.id ? null : d.id)}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = ''}>
                      <td className="px-4 py-3 w-8"><ExpandIcon expanded={expandDept === d.id} /></td>
                      <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: '#2563eb' }}>{d.code}</td>
                      <td className="px-5 py-3 font-semibold" style={{ color: '#1e293b' }}>{d.nom}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{d.services?.length ?? 0} service(s)</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); setModal({ type: 'departement', item: d }) }} className="p-1.5 rounded hover:bg-blue-50 transition-colors" style={{ color: '#2563eb' }}><Edit2 size={14} /></button>
                          <button onClick={e => {
                            e.stopPropagation()
                            const count = d.services?.length ?? 0
                            if (count > 0) { toast.error(`Supprimez d'abord les ${count} service(s) de ce département.`); return }
                            if (confirm(`Supprimer le département ${d.nom} ?`)) deleteDept.mutate(d.id)
                          }} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    {expandDept === d.id && (
                      <tr key={`${d.id}-children`}>
                        <td colSpan={5} className="p-0" style={{ background: '#f8fafc' }}>
                          <div className="py-2 px-10">
                            <table className="w-full text-sm">
                              <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Code</th>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Nom</th>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Nb armoires</th>
                              </tr></thead>
                              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                                {services?.results?.filter(s => s.departement === d.id).map(s => (
                                  <tr key={s.id} className="group cursor-pointer" onClick={() => setExpandSvc(expandSvc === s.id ? null : s.id)}
                                      onMouseOver={e => e.currentTarget.style.background = '#ffffff'}
                                      onMouseOut={e => e.currentTarget.style.background = ''}>
                                    <td className="py-2 font-mono text-xs" style={{ color: '#2563eb' }}>{s.code}</td>
                                    <td className="py-2 font-semibold text-xs" style={{ color: '#1e293b' }}>{s.nom}</td>
                                    <td className="py-2 text-xs" style={{ color: '#64748b' }}>
                                      {armoires?.results?.filter(a => a.service === s.id).length ?? 0} armoire(s)
                                    </td>
                                  </tr>
                                ))}
                                {(!services?.results?.filter(s => s.departement === d.id).length) && (
                                  <tr><td colSpan={3} className="py-3 text-xs text-center" style={{ color: '#94a3b8' }}>Aucun service</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
                {['', 'Code', 'Nom', 'Département', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {services?.results?.map(s => {
                  const nbArmoires = armoires?.results?.filter(a => a.service === s.id).length ?? 0
                  return (
                  <>
                    <tr key={s.id} className="group cursor-pointer" onClick={() => setExpandSvc(expandSvc === s.id ? null : s.id)}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = ''}>
                      <td className="px-4 py-3 w-8"><ExpandIcon expanded={expandSvc === s.id} /></td>
                      <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: '#2563eb' }}>{s.code}</td>
                      <td className="px-5 py-3 font-semibold" style={{ color: '#1e293b' }}>{s.nom}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{s.departement_nom || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); setModal({ type: 'service', item: s }) }} className="p-1.5 rounded hover:bg-blue-50 transition-colors" style={{ color: '#2563eb' }}><Edit2 size={14} /></button>
                          <button onClick={e => {
                            e.stopPropagation()
                            if (nbArmoires > 0) { toast.error(`Supprimez d'abord les ${nbArmoires} armoire(s) de ce service.`); return }
                            if (confirm(`Supprimer le service ${s.nom} ?`)) deleteSvc.mutate(s.id)
                          }} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    {expandSvc === s.id && (
                      <tr key={`${s.id}-children`}>
                        <td colSpan={5} className="p-0" style={{ background: '#f8fafc' }}>
                          <div className="py-2 px-10">
                            <table className="w-full text-sm">
                              <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Code</th>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Nom</th>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Nb rayons</th>
                              </tr></thead>
                              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                                {armoires?.results?.filter(a => a.service === s.id).map(a => {
                                  const nbRayons = a.nombre_rayons ?? rayons.filter(r => r.armoire === a.id).length ?? 0
                                  return (
                                  <tr key={a.id} className="group cursor-pointer" onClick={() => setExpandArm(expandArm === a.id ? null : a.id)}
                                      onMouseOver={e => e.currentTarget.style.background = '#ffffff'}
                                      onMouseOut={e => e.currentTarget.style.background = ''}>
                                    <td className="py-2 font-mono text-xs" style={{ color: '#2563eb' }}>{a.code}</td>
                                    <td className="py-2 font-semibold text-xs" style={{ color: '#1e293b' }}>{a.nom}</td>
                                    <td className="py-2 text-xs" style={{ color: '#64748b' }}>{nbRayons} rayon(s)</td>
                                    {expandArm === a.id && (
                                      <td colSpan={3} className="p-0">
                                        <div className="py-1 px-4">
                                          <div className="text-xs font-semibold" style={{ color: '#64748b' }}>Rayons :</div>
                                          {rayons.filter(r => r.armoire === a.id).map(r => (
                                            <div key={r.id} className="flex items-center gap-3 py-1 text-xs">
                                              <span className="font-mono" style={{ color: '#2563eb' }}>{r.code}</span>
                                              <span style={{ color: '#1e293b' }}>{r.nom}</span>
                                              {r.position && <span style={{ color: '#94a3b8' }}>Position : {r.position}</span>}
                                            </div>
                                          ))}
                                          {!rayons.filter(r => r.armoire === a.id).length && (
                                            <div className="text-xs py-1" style={{ color: '#94a3b8' }}>Aucun rayon</div>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                )})}
                                {!armoires?.results?.filter(a => a.service === s.id).length && (
                                  <tr><td colSpan={3} className="py-3 text-xs text-center" style={{ color: '#94a3b8' }}>Aucune armoire</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )})}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Armoires */}
      {tab === 'armoires' && (
        <>
          <div className="flex justify-end"><button onClick={() => setModal({ type: 'armoire' })} className="btn-primary"><Plus size={15} /> Nouvelle armoire</button></div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['', 'Code', 'Nom', 'Département', 'Service', 'Rayons', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {armoires?.results?.map(a => {
                  const nbRayons = a.nombre_rayons ?? rayons.filter(r => r.armoire === a.id).length ?? 0
                  return (
                  <>
                    <tr key={a.id} className="group cursor-pointer" onClick={() => setExpandArm(expandArm === a.id ? null : a.id)}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = ''}>
                      <td className="px-4 py-3 w-8"><ExpandIcon expanded={expandArm === a.id} /></td>
                      <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: '#2563eb' }}>{a.code}</td>
                      <td className="px-5 py-3 font-semibold" style={{ color: '#1e293b' }}>{a.nom}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{a.departement_code ? `${a.departement_code} - ${a.departement_nom}` : '—'}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{a.service_code ? `${a.service_code} - ${a.service_nom}` : '—'}</td>
                      <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{nbRayons} rayon(s)</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); setModal({ type: 'armoire', item: a }) }} className="p-1.5 rounded hover:bg-blue-50 transition-colors" style={{ color: '#2563eb' }}><Edit2 size={14} /></button>
                          <button onClick={e => {
                            e.stopPropagation()
                            if (nbRayons > 0) { toast.error(`Supprimez d'abord les ${nbRayons} rayon(s) de cette armoire.`); return }
                            if (confirm(`Supprimer l'armoire ${a.nom} ?`)) deleteArmoire.mutate(a.id)
                          }} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    {expandArm === a.id && (
                      <tr key={`${a.id}-children`}>
                        <td colSpan={7} className="p-0" style={{ background: '#f8fafc' }}>
                          <div className="py-2 px-10">
                            <table className="w-full text-sm">
                              <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Code</th>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Nom</th>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Position</th>
                                <th className="text-left py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Nb documents</th>
                              </tr></thead>
                              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                                {rayons.filter(r => r.armoire === a.id).map(r => (
                                  <tr key={r.id}>
                                    <td className="py-2 font-mono text-xs" style={{ color: '#2563eb' }}>{r.code}</td>
                                    <td className="py-2 font-semibold text-xs" style={{ color: '#1e293b' }}>{r.nom}</td>
                                    <td className="py-2 text-xs" style={{ color: '#64748b' }}>{r.position || '—'}</td>
                                    <td className="py-2 text-xs" style={{ color: '#64748b' }}>{r.nombre_documents ?? 0}</td>
                                  </tr>
                                ))}
                                {!rayons.filter(r => r.armoire === a.id).length && (
                                  <tr><td colSpan={4} className="py-3 text-xs text-center" style={{ color: '#94a3b8' }}>Aucun rayon</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )})}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Rayons */}
      {tab === 'rayons' && (
        <>
          <div className="flex justify-end"><button onClick={() => setModal({ type: 'rayon' })} className="btn-primary"><Plus size={15} /> Nouveau rayon</button></div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['Code', 'Nom', 'Position', 'Armoire', 'Département', 'Service', 'Nb docs', ''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                {rayons.map(r => (
                  <tr key={r.id} className="group"
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = ''}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: '#2563eb' }}>{r.code}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: '#1e293b' }}>{r.nom}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{r.position || '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{r.armoire_nom || '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{r.departement_nom || '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{r.service_nom || '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>{r.nombre_documents ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ type: 'rayon', item: r })} className="p-1.5 rounded hover:bg-blue-50 transition-colors" style={{ color: '#2563eb' }}><Edit2 size={14} /></button>
                        <button onClick={() => {
                          const count = r.nombre_documents ?? 0
                          if (count > 0) { toast.error(`Supprimez d'abord les ${count} document(s) de ce rayon.`); return }
                          if (confirm(`Supprimer le rayon ${r.nom} ?`)) deleteRayon.mutate(r.id)
                        }} className="p-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rayons.length && (
                  <tr><td colSpan={8} className="py-8 text-sm text-center" style={{ color: '#94a3b8' }}>Aucun rayon</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
