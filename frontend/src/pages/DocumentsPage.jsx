import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { documentsAPI, armoiresAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { Plus, Search, FileText, Filter, Download, Trash2, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUT_BADGE = { ACTIF: 'badge-green', ARCHIVE: 'badge-yellow', SUPPRIME: 'badge-red' }

function FiltersPanel({ filters, setFilters, onClose }) {
  const { data: armoires } = useQuery('armoires-list', () => armoiresAPI.list().then(r => r.data))
  const [local, setLocal] = useState(filters)
  return (
    <div className="fixed inset-0 flex items-center justify-end z-50"
         style={{ background: 'rgba(30,58,138,0.2)', backdropFilter: 'blur(4px)' }}>
      <div className="h-full w-80 p-5 space-y-5 overflow-y-auto shadow-2xl"
           style={{ background: '#ffffff', borderLeft: '1px solid #e2e8f0' }}>
        <div className="flex items-center justify-between">
          <h2 className="section-title">Filtres</h2>
          <button onClick={onClose} style={{ color: '#94a3b8' }}><X size={18} /></button>
        </div>
        <div>
          <label className="label">Statut</label>
          <select className="input" value={local.statut || ''} onChange={e => setLocal({ ...local, statut: e.target.value })}>
            <option value="">Tous</option>
            <option value="ACTIF">Actif</option>
            <option value="ARCHIVE">Archivé</option>
          </select>
        </div>
        <div>
          <label className="label">Type de document</label>
          <input className="input" placeholder="Ex: Contrat, Facture…" value={local.type_doc || ''}
                 onChange={e => setLocal({ ...local, type_doc: e.target.value })} />
        </div>
        <div>
          <label className="label">Armoire</label>
          <select className="input" value={local['rayon__armoire'] || ''} onChange={e => setLocal({ ...local, 'rayon__armoire': e.target.value })}>
            <option value="">Toutes</option>
            {armoires?.results?.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1 justify-center" onClick={() => { setLocal({}); setFilters({}); onClose() }}>Réinitialiser</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => { setFilters(local); onClose() }}>Appliquer</button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const { canWrite } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch]           = useState('')
  const [filters, setFilters]         = useState({})
  const [page, setPage]               = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [downloading, setDownloading] = useState(null)

  const params = { search, page, ...filters }
  const { data, isLoading } = useQuery(['documents', params], () => documentsAPI.list(params).then(r => r.data), { keepPreviousData: true })

  const deleteMutation = useMutation((id) => documentsAPI.delete(id), {
    onSuccess: () => { toast.success('Document supprimé'); qc.invalidateQueries('documents') },
    onError: () => toast.error('Erreur suppression'),
  })

  const handleDownload = async (doc) => {
    setDownloading(doc.id)
    try { await documentsAPI.download(doc.id, doc.nom_fichier); toast.success('Téléchargement démarré') }
    catch { toast.error('Impossible de télécharger') }
    finally { setDownloading(null) }
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="p-6 space-y-5">
      {showFilters && <FiltersPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}

      <div className="flex items-center justify-between">
        <h1 className="page-title">Documents</h1>
        {canWrite() && <Link to="/documents/nouveau" className="btn-primary"><Plus size={16} /> Nouveau document</Link>}
        <button onClick={() => documentsAPI.exportCSV({ search, statut: filterStatut, type_doc: filterType })} className="btn-secondary flex items-center gap-1.5">
          <Download size={14} /> CSV
        </button>
        <button onClick={() => documentsAPI.exportPDF({ search, statut: filterStatut, type_doc: filterType })} className="btn-secondary flex items-center gap-1.5">
          <Download size={14} /> PDF
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                 placeholder="Titre, code, type, auteur…" className="input pl-9" />
        </div>
        <button onClick={() => setShowFilters(true)} className="btn-secondary">
          <Filter size={14} /> Filtres
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white"
                  style={{ background: '#2563eb' }}>{activeFiltersCount}</span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc' }}>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['Code', 'Titre', 'Type', 'Armoire / Rayon', 'Date', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
              {isLoading ? [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-3"><div className="h-4 rounded animate-pulse" style={{ background: '#f1f5f9' }} /></td>
                  ))}
                </tr>
              )) : data?.results?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16" style={{ color: '#94a3b8' }}>
                  <FileText size={32} className="mx-auto mb-3 opacity-30" /><p>Aucun document trouvé</p>
                </td></tr>
              ) : data?.results?.map(doc => (
                <tr key={doc.id} className="group transition-colors"
                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={e  => e.currentTarget.style.background = ''}>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md font-semibold"
                          style={{ background: '#dbeafe', color: '#1d4ed8' }}>{doc.code_unique}</span>
                  </td>
                  <td className="px-5 py-3 max-w-[200px]">
                    <span className="font-medium truncate block" style={{ color: '#1e293b' }}>{doc.titre}</span>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: '#64748b' }}>{doc.type_doc}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: '#64748b' }}>
                    <span className="font-semibold" style={{ color: '#1e293b' }}>{doc.armoire_code}</span>
                    <span className="mx-1 text-gray-300">/</span>{doc.rayon_code}
                  </td>
                  <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#94a3b8' }}>
                    {doc.date_numerisation ? format(new Date(doc.date_numerisation), 'dd MMM yyyy', { locale: fr }) : '—'}
                  </td>
                  <td className="px-5 py-3"><span className={STATUT_BADGE[doc.statut] || 'badge'}>{doc.statut}</span></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/documents/${doc.id}`} className="p-1.5 rounded-lg transition-colors hover:bg-blue-50" style={{ color: '#2563eb' }} title="Voir"><Eye size={15} /></Link>
                      <button onClick={() => handleDownload(doc)} className="p-1.5 rounded-lg transition-colors hover:bg-green-50" style={{ color: '#16a34a' }} title="Télécharger">
                        {downloading === doc.id ? <span className="w-3 h-3 border border-t-transparent rounded-full animate-spin inline-block" /> : <Download size={15} />}
                      </button>
                      {canWrite() && (
                        <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(doc.id) }}
                                className="p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ color: '#dc2626' }} title="Supprimer">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.count > 20 && (
          <div className="flex items-center justify-between px-5 py-3 text-sm"
               style={{ borderTop: '1px solid #f1f5f9', color: '#64748b' }}>
            <span>{data.count} document{data.count > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.previous}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span className="font-semibold px-2" style={{ color: '#1e293b' }}>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!data.next}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
