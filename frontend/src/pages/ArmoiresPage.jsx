import { useState, createElement } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { armoiresAPI, documentsAPI, entrepriseAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import {
  Building2, Layers, Archive, FileText, ChevronRight,
  Home, Hash, MapPin, ArrowLeft, Plus, X, Check,
} from 'lucide-react'

const LEVELS = ['departement', 'service', 'armoire', 'rayon', 'document']

const LEVEL_ICONS = {
  departement: Building2,
  service: Layers,
  armoire: Archive,
  rayon: Hash,
  document: FileText,
}

const CREATE_LABELS = {
  departement: 'Nouveau département',
  service: 'Nouveau service',
  armoire: 'Nouvelle armoire',
  rayon: 'Nouveau rayon',
  document: 'Nouveau document',
}

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

function DepartementModal({ onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const { data: entreprises } = useQuery('entreprises', () => entrepriseAPI.getEntreprises().then(r => r.data))
  const mutation = useMutation(
    (data) => {
      const firstEnt = entreprises?.results?.[0]
      return entrepriseAPI.createDepartement({ ...data, entreprise: firstEnt?.id })
    },
    { onSuccess: () => { toast.success('Département créé !'); onSuccess() }, onError: (e) => toast.error(Object.values(e.response?.data || {}).flat().join(' ') || 'Erreur') }
  )
  return (
    <Modal title="Nouveau département" onClose={onClose}>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div><label className="label">Nom *</label><input className="input" {...register('nom', { required: true })} />{errors.nom && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
        <div><label className="label">Code *</label><input className="input font-mono uppercase" {...register('code', { required: true })} />{errors.code && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 justify-center">
            {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> Créer</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ServiceModal({ departementId, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const mutation = useMutation(
    (data) => entrepriseAPI.createService({ ...data, departement: departementId }),
    { onSuccess: () => { toast.success('Service créé !'); onSuccess() }, onError: (e) => toast.error(Object.values(e.response?.data || {}).flat().join(' ') || 'Erreur') }
  )
  return (
    <Modal title="Nouveau service" onClose={onClose}>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div><label className="label">Nom *</label><input className="input" {...register('nom', { required: true })} />{errors.nom && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
        <div><label className="label">Code *</label><input className="input font-mono uppercase" {...register('code', { required: true })} />{errors.code && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 justify-center">
            {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> Créer</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ArmoireModal({ serviceId, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const mutation = useMutation(
    (data) => armoiresAPI.create({ ...data, service: serviceId }),
    { onSuccess: () => { toast.success('Armoire créée !'); onSuccess() }, onError: (e) => toast.error(Object.values(e.response?.data || {}).flat().join(' ') || 'Erreur') }
  )
  return (
    <Modal title="Nouvelle armoire" onClose={onClose}>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div><label className="label">Nom *</label><input className="input" {...register('nom', { required: true })} />{errors.nom && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
        <div><label className="label">Code *</label><input className="input font-mono uppercase" {...register('code', { required: true })} />{errors.code && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
        <div><label className="label">Description</label><textarea className="input" {...register('description')} rows={3} /></div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 justify-center">
            {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> Créer</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function RayonModal({ armoireId, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const mutation = useMutation(
    (data) => armoiresAPI.createRayon(armoireId, { ...data, armoire: armoireId }),
    { onSuccess: () => { toast.success('Rayon créé !'); onSuccess() }, onError: (e) => toast.error(Object.values(e.response?.data || {}).flat().join(' ') || 'Erreur') }
  )
  return (
    <Modal title="Nouveau rayon" onClose={onClose}>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div><label className="label">Nom *</label><input className="input" {...register('nom', { required: true })} />{errors.nom && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Code *</label><input className="input font-mono" {...register('code', { required: true })} />{errors.code && <p className="text-red-500 text-xs mt-1">Requis</p>}</div>
          <div><label className="label">Position</label><input type="number" className="input" {...register('position')} /></div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 justify-center">
            {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> Créer</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function ArmoiresPage() {
  const { isAdmin, canWrite } = useAuth()
  const qc = useQueryClient()
  const [path, setPath] = useState([])
  const [createModal, setCreateModal] = useState(null)

  const current = path[path.length - 1] || null
  const levelIdx = current ? LEVELS.indexOf(current.type) + 1 : 0
  const currentLevel = LEVELS[levelIdx]

  const breadcrumbs = [
    { label: 'Accueil', onClick: () => setPath([]) },
    ...path.map((item, i) => ({
      label: item.label,
      onClick: () => setPath(path.slice(0, i + 1)),
    })),
  ]

  // ── Requêtes ────────────────────────────────────────────────────
  const { data: depts } = useQuery('departements', () =>
    entrepriseAPI.getDepartements().then(r => r.data), { enabled: levelIdx === 0 }
  )

  const { data: services } = useQuery(
    ['services', current?.id],
    () => entrepriseAPI.getServices({ departement: current.id }).then(r => r.data),
    { enabled: current?.type === 'departement' }
  )

  const { data: armoires } = useQuery(
    ['armoires-par-service', current?.id],
    () => armoiresAPI.list({ service: current.id }).then(r => r.data),
    { enabled: current?.type === 'service' }
  )

  const { data: rayons } = useQuery(
    ['rayons', current?.id],
    () => armoiresAPI.getRayons(current.id).then(r => r.data),
    { enabled: current?.type === 'armoire' }
  )

  const { data: documents } = useQuery(
    ['documents', 'rayon', current?.id],
    () => documentsAPI.list({ rayon: current.id }).then(r => r.data),
    { enabled: current?.type === 'rayon' }
  )

  const items = current?.type === 'departement' ? services?.results
    : current?.type === 'service' ? armoires?.results
    : current?.type === 'armoire' ? (Array.isArray(rayons) ? rayons : rayons?.results || [])
    : current?.type === 'rayon' ? documents?.results
    : depts?.results || []

  const listTitle = currentLevel === 'departement' ? 'Départements'
    : currentLevel === 'service' ? 'Services'
    : currentLevel === 'armoire' ? 'Armoires'
    : currentLevel === 'rayon' ? 'Rayons'
    : 'Documents'

  const parentLabel = path[path.length - 1]?.label || ''

  function drill(item) {
    setPath([...path, {
      id: item.id,
      type: currentLevel,
      label: `${item.code || ''} ${item.nom || item.titre || ''}`,
    }])
  }

  function handleBack() {
    setPath(path.slice(0, -1))
  }

  function closeCreate() {
    setCreateModal(null)
  }

  function refreshCurrent() {
    if (current?.type === 'departement') qc.invalidateQueries(['services', current.id])
    else if (current?.type === 'service') qc.invalidateQueries(['armoires-par-service', current.id])
    else if (current?.type === 'armoire') qc.invalidateQueries(['rayons', current.id])
    else if (current?.type === 'rayon') qc.invalidateQueries(['documents', 'rayon', current.id])
    else qc.invalidateQueries('departements')
    closeCreate()
  }

  const canCreate = currentLevel === 'departement' ? isAdmin()
    : currentLevel === 'service' ? isAdmin()
    : currentLevel === 'armoire' ? isAdmin()
    : currentLevel === 'rayon' ? isAdmin()
    : canWrite()

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {path.length > 0 && (
          <button onClick={handleBack}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: '#64748b' }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} style={{ color: '#cbd5e1' }} />}
              <button
                onClick={crumb.onClick}
                className={`text-xs font-semibold transition-colors ${i < breadcrumbs.length - 1 ? 'hover:text-blue-600' : ''}`}
                style={{ color: i < breadcrumbs.length - 1 ? '#64748b' : '#2563eb' }}>
                {crumb.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
            {createElement(current ? LEVEL_ICONS[currentLevel] : Home, { size: 20, style: { color: '#2563eb' } })}
          </div>
          <div>
            <h1 className="page-title">
              {current ? `${listTitle} de ${parentLabel}` : 'Classement hiérarchique'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
              Département <ChevronRight size={10} className="inline" /> Service <ChevronRight size={10} className="inline" /> Armoire <ChevronRight size={10} className="inline" /> Rayon <ChevronRight size={10} className="inline" /> Document
            </p>
          </div>
        </div>
        {canCreate && (
          currentLevel === 'document' ? (
            <Link to={`/documents/nouveau${current?.id ? `?rayon=${current.id}` : ''}`}
              className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={14} /> Nouveau document
            </Link>
          ) : (
            <button onClick={() => setCreateModal(currentLevel)}
              className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={14} /> {CREATE_LABELS[currentLevel]}
            </button>
          )
        )}
      </div>

      {/* Items */}
      {(!items || items.length === 0) ? (
        <div className="text-center py-16" style={{ color: '#94a3b8' }}>
          {createElement(LEVEL_ICONS[currentLevel], { size: 36, className: 'mx-auto mb-3 opacity-30' })}
          <p className="text-sm">Aucun élément trouvé</p>
          {current && <p className="text-xs mt-1">Ce {currentLevel} ne contient aucun élément</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => {
            const detail = current?.type === 'armoire'
              ? item.chemin_complet
              : item.description || ''

            return (
              <div key={item.id}
                onClick={() => currentLevel !== 'document' && drill(item)}
                className={`card transition-all ${currentLevel !== 'document' ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 group' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eff6ff' }}>
                    {createElement(LEVEL_ICONS[currentLevel], { size: 18, style: { color: '#2563eb' } })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm truncate" style={{ color: '#1e293b' }}>
                        {item.nom || item.titre}
                      </div>
                      {currentLevel !== 'document' && (
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: '#2563eb' }} />
                      )}
                    </div>
                    {item.code && (
                      <div className="font-mono text-xs mt-0.5" style={{ color: '#2563eb' }}>{item.code}</div>
                    )}
                    {item.code_unique && (
                      <div className="font-mono text-xs mt-0.5" style={{ color: '#2563eb' }}>{item.code_unique}</div>
                    )}
                    {detail && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: '#64748b' }}>{detail}</p>
                    )}
                    {/* Stats badges for armoires */}
                    {current?.type === 'service' && (
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#94a3b8' }}>
                        <span><Layers size={10} className="inline mr-1" />{item.nombre_rayons ?? 0} rayons</span>
                        <span><FileText size={10} className="inline mr-1" />{item.nombre_documents ?? 0} docs</span>
                      </div>
                    )}
                    {/* Position for rayons */}
                    {current?.type === 'armoire' && item.position && (
                      <div className="text-xs mt-1 flex items-center gap-1" style={{ color: '#94a3b8' }}>
                        <MapPin size={10} /> Position {item.position}
                      </div>
                    )}
                    {/* Type badge for documents */}
                    {current?.type === 'rayon' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: '#eff6ff', color: '#2563eb' }}>{item.type_doc}</span>
                        <span className="text-xs" style={{ color: '#94a3b8' }}>{item.taille_lisible}</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Link to document detail */}
                {current?.type === 'rayon' && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <Link to={`/documents/${item.id}`}
                      className="text-xs font-semibold flex items-center gap-1 transition-colors"
                      style={{ color: '#2563eb' }}
                      onClick={e => e.stopPropagation()}>
                      Voir le détail <ChevronRight size={10} />
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create modals */}
      {createModal === 'departement' && (
        <DepartementModal onClose={closeCreate} onSuccess={refreshCurrent} />
      )}
      {createModal === 'service' && (
        <ServiceModal departementId={current.id} onClose={closeCreate} onSuccess={refreshCurrent} />
      )}
      {createModal === 'armoire' && (
        <ArmoireModal serviceId={current.id} onClose={closeCreate} onSuccess={refreshCurrent} />
      )}
      {createModal === 'rayon' && (
        <RayonModal armoireId={current.id} onClose={closeCreate} onSuccess={refreshCurrent} />
      )}
    </div>
  )
}
