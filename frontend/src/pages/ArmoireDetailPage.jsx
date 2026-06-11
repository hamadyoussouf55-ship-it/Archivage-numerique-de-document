import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { armoiresAPI, documentsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Plus, Layers, FileText, Hash, MapPin, Trash2, X, ChevronRight, FolderOpen } from 'lucide-react'

function RayonModal({ armoireId, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const mutation = useMutation(
    (data) => armoiresAPI.createRayon(armoireId, { ...data, armoire: armoireId }),
    { onSuccess: () => { toast.success('Rayon créé !'); onSuccess() }, onError: () => toast.error('Erreur création rayon') }
  )
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(30,58,138,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title">Nouveau rayon</h2>
          <button onClick={onClose} style={{ color: '#94a3b8' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nom *</label>
            <input className="input" {...register('nom', { required: true })} />
            {errors.nom && <p className="text-red-500 text-xs mt-1">Requis</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code *</label>
              <input className="input font-mono" {...register('code', { required: true })} />
            </div>
            <div>
              <label className="label">Position</label>
              <input type="number" className="input" {...register('position')} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 justify-center">
              {mutation.isLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ArmoireDetailPage() {
  const { id } = useParams()
  const { canWrite } = useAuth()
  const qc = useQueryClient()
  const [selectedRayon, setSelectedRayon] = useState(null)
  const [showModal, setShowModal] = useState(false)

  // Récupère l'armoire avec ses rayons (imbriqués dans le serializer)
  const { data: armoire, isLoading } = useQuery(
    ['armoire', id],
    () => armoiresAPI.get(id).then(r => r.data)
  )

  // Récupère les documents du rayon sélectionné
  const { data: documents } = useQuery(
    ['documents', 'rayon', selectedRayon],
    () => documentsAPI.list({ rayon: selectedRayon }).then(r => r.data),
    { enabled: !!selectedRayon }
  )

  const deleteRayon = useMutation(
    (rid) => armoiresAPI.deleteRayon(rid),
    {
      onSuccess: () => { toast.success('Rayon supprimé'); qc.invalidateQueries(['armoire', id]) },
      onError:   () => toast.error('Impossible de supprimer (documents liés ?)'),
    }
  )

  if (isLoading) return (
    <div className="p-6">
      <div className="h-48 rounded-xl animate-pulse" style={{ background: '#e2e8f0' }} />
    </div>
  )

  if (!armoire) return (
    <div className="p-6 text-center py-20" style={{ color: '#94a3b8' }}>
      <p>Armoire introuvable</p>
      <Link to="/armoires" className="text-sm mt-2 inline-block" style={{ color: '#2563eb' }}>← Retour</Link>
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      {showModal && (
        <RayonModal
          armoireId={id}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries(['armoire', id]) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/armoires" style={{ color: '#64748b' }}><ArrowLeft size={18} /></Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
            <FolderOpen size={18} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h1 className="page-title">{armoire.nom}</h1>
            <p className="font-mono text-xs mt-0.5" style={{ color: '#2563eb' }}>{armoire.code}</p>
          </div>
        </div>
        {canWrite() && (
          <button onClick={() => setShowModal(true)} className="btn-primary ml-auto flex items-center gap-2">
            <Plus size={16} /> Nouveau rayon
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Liste rayons */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="section-title flex items-center gap-2">
            <Layers size={16} style={{ color: '#2563eb' }} />
            Rayons ({armoire.rayons?.length ?? 0})
          </h2>

          {armoire.rayons?.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: '#94a3b8' }}>Aucun rayon</p>
          )}

          {armoire.rayons?.map(rayon => (
            <div key={rayon.id}
                 onClick={() => setSelectedRayon(rayon.id === selectedRayon ? null : rayon.id)}
                 className="w-full text-left p-3 rounded-xl border transition-all group cursor-pointer"
                 style={{
                   background:   selectedRayon === rayon.id ? '#eff6ff' : '#ffffff',
                   borderColor:  selectedRayon === rayon.id ? '#bfdbfe' : '#e2e8f0',
                   boxShadow:    selectedRayon === rayon.id ? '0 0 0 2px #bfdbfe' : 'none',
                 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash size={14} style={{ color: '#2563eb' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#1e293b' }}>{rayon.nom}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs" style={{ color: '#2563eb' }}>{rayon.code}</span>
                      {rayon.position && (
                        <span className="text-xs" style={{ color: '#94a3b8' }}>
                          <MapPin size={9} className="inline" /> {rayon.position}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}>
                    <FileText size={11} /> {rayon.nombre_documents ?? 0}
                  </span>
                  {canWrite() && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Supprimer le rayon ${rayon.nom} ?`)) deleteRayon.mutate(rayon.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Documents du rayon sélectionné */}
        <div className="lg:col-span-2">
          {!selectedRayon ? (
            <div className="card h-full flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
              <Layers size={36} className="mb-3 opacity-30" />
              <p className="text-sm">Sélectionnez un rayon pour voir ses documents</p>
            </div>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">
                  Rayon <span style={{ color: '#2563eb' }}>
                    {armoire.rayons?.find(r => r.id === selectedRayon)?.code}
                  </span>
                </h2>
                {canWrite() && (
                  <Link to={`/documents/nouveau?rayon=${selectedRayon}`} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                    <Plus size={13} /> Ajouter
                  </Link>
                )}
              </div>

              {!documents ? (
                <div className="h-12 animate-pulse rounded-lg" style={{ background: '#f1f5f9' }} />
              ) : documents.results?.length === 0 ? (
                <div className="text-center py-10" style={{ color: '#94a3b8' }}>
                  <FileText size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun document dans ce rayon</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.results?.map(doc => (
                    <Link key={doc.id} to={`/documents/${doc.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border transition-all group hover:shadow-sm"
                          style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.background = '#eff6ff' }}
                          onMouseOut={e  => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
                        <FileText size={14} style={{ color: '#2563eb' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>{doc.titre}</div>
                        <div className="font-mono text-xs" style={{ color: '#2563eb' }}>{doc.code_unique}</div>
                      </div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>{doc.type_doc}</div>
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#2563eb' }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
