import { useState } from 'react'
import { useQuery } from 'react-query'
import { journalAPI, authAPI } from '../services/api'
import { Search, BookOpen, Filter, ChevronLeft, ChevronRight, X, Download } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPE_BADGE = {
  CREATION:       'badge-green',
  MODIFICATION:   'badge-blue',
  SUPPRESSION:    'badge-red',
  CONSULTATION:   'badge-gray',
  TELECHARGEMENT: 'badge-blue',
  DEPLACEMENT:    'badge-yellow',
  CONNEXION:      'badge-gray',
  DECONNEXION:    'badge-gray',
}

export default function JournalPage() {
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [page, setPage]             = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const params = { search, page, ...(filterType && { type_action: filterType }), ...(filterUser && { auteur: filterUser }) }
  const { data, isLoading } = useQuery(['journal', params], () => journalAPI.list(params).then(r => r.data), { keepPreviousData: true })
  const { data: users }     = useQuery('collaborateurs', () => authAPI.getCollaborateurs().then(r => r.data))
  const activeFilters = [filterType, filterUser].filter(Boolean).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><BookOpen size={22} style={{ color: '#2563eb' }} /> Journal d'actions</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Traçabilité complète de toutes les opérations</p>
        </div>
        {data && <span className="text-sm" style={{ color: '#64748b' }}><span className="font-semibold" style={{ color: '#1e293b' }}>{data.count}</span> actions</span>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Rechercher dans le journal…" className="input pl-9" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary">
          <Filter size={14} /> Filtres
          {activeFilters > 0 && <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold text-white" style={{ background: '#2563eb' }}>{activeFilters}</span>}
        </button>
        {activeFilters > 0 && <button onClick={() => { setFilterType(''); setFilterUser('') }} className="text-xs flex items-center gap-1" style={{ color: '#64748b' }}><X size={13} /> Réinitialiser</button>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => journalAPI.exportCSV({ type_action: filterType, auteur: filterUser })} className="btn-secondary flex items-center gap-1.5">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => journalAPI.exportPDF({ type_action: filterType, auteur: filterUser })} className="btn-secondary flex items-center gap-1.5">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card grid grid-cols-2 gap-4">
          <div>
            <label className="label">Type d'action</label>
            <select className="input" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
              <option value="">Tous</option>
              {Object.keys(TYPE_BADGE).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Utilisateur</label>
            <select className="input" value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1) }}>
              <option value="">Tous</option>
              {users?.results?.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.matricule})</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc' }}>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                {['Date & Heure', 'Action', 'Utilisateur', 'Document', 'Détails', 'IP'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
              {isLoading ? [...Array(10)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 rounded animate-pulse" style={{ background: '#f1f5f9' }} /></td>)}</tr>
              )) : data?.results?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16" style={{ color: '#94a3b8' }}>
                  <BookOpen size={32} className="mx-auto mb-3 opacity-30" /><p>Aucune action enregistrée</p>
                </td></tr>
              ) : data?.results?.map(action => (
                <tr key={action.id} className="transition-colors"
                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={e  => e.currentTarget.style.background = ''}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-xs" style={{ color: '#1e293b' }}>{action.date_action ? format(new Date(action.date_action), 'dd MMM yyyy', { locale: fr }) : '—'}</div>
                    <div className="text-xs" style={{ color: '#94a3b8' }}>{action.date_action ? format(new Date(action.date_action), 'HH:mm:ss') : ''}</div>
                  </td>
                  <td className="px-5 py-3"><span className={TYPE_BADGE[action.type_action] || 'badge-gray'}>{action.type_action_label || action.type_action}</span></td>
                  <td className="px-5 py-3 text-xs font-semibold" style={{ color: '#1e293b' }}>{action.auteur_nom || '—'}</td>
                  <td className="px-5 py-3">
                    {action.document_code
                      ? <div><span className="font-mono text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{action.document_code}</span>
                          {action.document_titre && <div className="text-xs mt-0.5 truncate max-w-[140px]" style={{ color: '#64748b' }}>{action.document_titre}</div>}
                        </div>
                      : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs max-w-[200px]"><span className="truncate block" style={{ color: '#64748b' }}>{action.details || '—'}</span></td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: '#94a3b8' }}>{action.ip_adresse || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.count > 20 && (
          <div className="flex items-center justify-between px-5 py-3 text-sm" style={{ borderTop: '1px solid #f1f5f9', color: '#64748b' }}>
            <span>{data.count} entrées</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.previous} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span className="font-semibold px-2" style={{ color: '#1e293b' }}>Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!data.next} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
