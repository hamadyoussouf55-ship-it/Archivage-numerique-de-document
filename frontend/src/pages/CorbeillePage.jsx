import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { documentsAPI } from '../services/api'
import { toast } from 'react-toastify'
import { Trash2, RotateCcw, AlertTriangle, FileText, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function CorbeillePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [confirmPurge, setConfirmPurge] = useState(null)

  const { data, isLoading } = useQuery('corbeille', () => documentsAPI.corbeille().then(r => r.data))

  const restaurer = useMutation((id) => documentsAPI.restaurerDoc(id), {
    onSuccess: () => { toast.success('Document restauré'); qc.invalidateQueries('corbeille') },
    onError: () => toast.error('Erreur lors de la restauration'),
  })

  const purger = useMutation((id) => documentsAPI.purgerDoc(id), {
    onSuccess: () => { toast.success('Document purgé définitivement'); qc.invalidateQueries('corbeille'); setConfirmPurge(null) },
    onError: () => toast.error("Erreur lors de la purge"),
  })

  const docs = (data?.results || data || []).filter(d =>
    !search || d.titre?.toLowerCase().includes(search.toLowerCase()) || d.code_unique?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Trash2 size={20} style={{ color: '#dc2626' }} /> Corbeille
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Documents supprimés — vous pouvez les restaurer ou les purger définitivement.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
               placeholder="Rechercher dans la corbeille…" className="input pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg" style={{ background: '#f8fafc' }} />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="card text-center py-12">
          <Trash2 size={40} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
          <p className="font-semibold" style={{ color: '#64748b' }}>La corbeille est vide</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Les documents supprimés apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="card flex items-center gap-4 py-3 px-4">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: '#fef2f2' }}>
                <FileText size={16} style={{ color: '#dc2626' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate" style={{ color: '#1e293b' }}>{doc.titre}</span>
                  <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{doc.code_unique}</span>
                </div>
                <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                  <span>{doc.type_doc}</span>
                  <span>·</span>
                  <span>Supprimé le {doc.date_numerisation ? format(new Date(doc.date_numerisation), 'dd/MM/yyyy', { locale: fr }) : '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => restaurer.mutate(doc.id)} disabled={restaurer.isLoading}
                  className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3">
                  <RotateCcw size={12} /> Restaurer
                </button>
                {confirmPurge === doc.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => purger.mutate(doc.id)} disabled={purger.isLoading}
                      className="text-xs flex items-center gap-1 py-1.5 px-2 rounded font-semibold"
                      style={{ background: '#dc2626', color: '#fff' }}>
                      <AlertTriangle size={12} /> Confirmer
                    </button>
                    <button onClick={() => setConfirmPurge(null)}
                      className="p-1.5 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmPurge(doc.id)}
                    className="text-xs flex items-center gap-1 py-1.5 px-3 rounded font-semibold"
                    style={{ color: '#dc2626', background: '#fef2f2' }}>
                    <Trash2 size={12} /> Purger
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
