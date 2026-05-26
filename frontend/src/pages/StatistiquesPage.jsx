import { useState } from 'react'
import { useQuery } from 'react-query'
import { documentsAPI } from '../services/api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  BarChart2, TrendingUp, Calendar, Download, Filter, RefreshCw
} from 'lucide-react'
import { format, subMonths, subDays, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

const BLUES  = ['#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe']
const GREENS = ['#15803d','#16a34a','#22c55e','#4ade80']
const REDS   = ['#b91c1c','#dc2626','#ef4444','#f87171']
const MIX    = [...BLUES, ...GREENS, ...REDS]

const PRESET_RANGES = [
  { label: '7 derniers jours',   debut: () => format(subDays(new Date(), 6), 'yyyy-MM-dd'),       fin: () => format(new Date(), 'yyyy-MM-dd'), granularite: 'jour'    },
  { label: '30 derniers jours',  debut: () => format(subDays(new Date(), 29), 'yyyy-MM-dd'),      fin: () => format(new Date(), 'yyyy-MM-dd'), granularite: 'jour'    },
  { label: '3 derniers mois',    debut: () => format(subMonths(new Date(), 3), 'yyyy-MM-dd'),     fin: () => format(new Date(), 'yyyy-MM-dd'), granularite: 'semaine' },
  { label: '6 derniers mois',    debut: () => format(subMonths(new Date(), 6), 'yyyy-MM-dd'),     fin: () => format(new Date(), 'yyyy-MM-dd'), granularite: 'mois'    },
  { label: 'Cette année',        debut: () => format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'), fin: () => format(new Date(), 'yyyy-MM-dd'), granularite: 'mois' },
  { label: '12 derniers mois',   debut: () => format(subMonths(new Date(), 12), 'yyyy-MM-dd'),    fin: () => format(new Date(), 'yyyy-MM-dd'), granularite: 'mois'    },
]

const TYPE_ACTION_COLORS = {
  CREATION: '#16a34a', MODIFICATION: '#2563eb', SUPPRESSION: '#dc2626',
  CONSULTATION: '#64748b', TELECHARGEMENT: '#0891b2', DEPLACEMENT: '#d97706',
  CONNEXION: '#7c3aed', DECONNEXION: '#9ca3af',
}

function KpiCard({ icon: Icon, label, value, sub, color = '#2563eb' }) {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748b' }}>{label}</p>
          <p className="text-3xl font-bold" style={{ color: '#1e293b' }}>{value ?? '—'}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: color + '18' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function TipDoc({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-lg" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
      <p style={{ color: '#64748b' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function StatistiquesPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [preset,       setPreset]       = useState(5)            // index dans PRESET_RANGES
  const [debut,        setDebut]        = useState(() => format(subMonths(new Date(), 12), 'yyyy-MM-dd'))
  const [fin,          setFin]          = useState(today)
  const [granularite,  setGranularite]  = useState('mois')
  const [customMode,   setCustomMode]   = useState(false)

  const params = { debut, fin, granularite }

  const { data: stats, isLoading, refetch } = useQuery(
    ['stats-periode', params],
    () => documentsAPI.getStatsPeriode(params).then(r => r.data),
    { keepPreviousData: true }
  )

  function applyPreset(idx) {
    const p = PRESET_RANGES[idx]
    setPreset(idx)
    setDebut(p.debut())
    setFin(p.fin())
    setGranularite(p.granularite)
    setCustomMode(false)
  }

  function fmtPeriode(str) {
    if (!str) return ''
    try {
      const d = new Date(str)
      if (granularite === 'jour')    return format(d, 'dd/MM', { locale: fr })
      if (granularite === 'semaine') return 'S' + format(d, 'ww', { locale: fr })
      return format(d, 'MMM yy', { locale: fr })
    } catch { return str }
  }

  const docsData    = (stats?.docs_par_periode    || []).map(x => ({ name: fmtPeriode(x.periode), docs: x.count }))
  const actionsData = (stats?.actions_par_periode || []).map(x => ({ name: fmtPeriode(x.periode), actions: x.count }))
  const typeData    = (stats?.par_type || []).map(x => ({ name: x.type_doc, count: x.count }))
  const statutData  = (stats?.par_statut || []).map(x => ({ name: x.statut, value: x.count }))
  const actionTypeData = (stats?.par_type_action || []).map(x => ({ name: x.type_action, count: x.count }))
  const topCreateurs   = stats?.top_createurs || []

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart2 size={22} style={{ color: '#2563eb' }} /> Statistiques
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Analyse détaillée par période</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Sélecteur de période */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={15} style={{ color: '#2563eb' }} />
          <h2 className="section-title">Période d'analyse</h2>
        </div>

        {/* Présets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_RANGES.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                !customMode && preset === i
                  ? 'text-white border-transparent'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              style={!customMode && preset === i
                ? { background: '#2563eb', color: '#fff' }
                : { color: '#475569' }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setCustomMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              customMode ? 'text-white border-transparent' : 'border-gray-200 hover:border-blue-300'
            }`}
            style={customMode ? { background: '#7c3aed', color: '#fff' } : { color: '#475569' }}
          >
            Personnalisé
          </button>
        </div>

        {/* Mode personnalisé */}
        {customMode && (
          <div className="grid grid-cols-3 gap-4 pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
            <div>
              <label className="label">Date de début</label>
              <input type="date" className="input" value={debut} onChange={e => setDebut(e.target.value)} max={fin} />
            </div>
            <div>
              <label className="label">Date de fin</label>
              <input type="date" className="input" value={fin} onChange={e => setFin(e.target.value)} min={debut} max={today} />
            </div>
            <div>
              <label className="label">Granularité</label>
              <select className="input" value={granularite} onChange={e => setGranularite(e.target.value)}>
                <option value="jour">Par jour</option>
                <option value="semaine">Par semaine</option>
                <option value="mois">Par mois</option>
              </select>
            </div>
          </div>
        )}

        {/* Résumé période */}
        {stats && (
          <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
            <Calendar size={11} className="inline mr-1" />
            Du <strong style={{ color: '#1e293b' }}>{format(new Date(stats.periode.debut), 'dd MMM yyyy', { locale: fr })}</strong>
            {' '}au <strong style={{ color: '#1e293b' }}>{format(new Date(stats.periode.fin), 'dd MMM yyyy', { locale: fr })}</strong>
            {' '}· Granularité : <strong style={{ color: '#1e293b' }}>{granularite}</strong>
          </p>
        )}
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse" style={{ background: '#f8fafc' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={TrendingUp}  label="Documents"     value={stats?.totaux?.documents} color="#2563eb" />
          <KpiCard icon={TrendingUp}  label="Actifs"        value={stats?.totaux?.actifs}    color="#16a34a" />
          <KpiCard icon={TrendingUp}  label="Archivés"      value={stats?.totaux?.archives}  color="#d97706" />
          <KpiCard icon={TrendingUp}  label="Actions"       value={stats?.totaux?.actions}   color="#7c3aed" />
          <KpiCard icon={BarChart2}   label="Taux archivage" value={`${stats?.totaux?.taux_archivage ?? 0}%`} color="#0891b2" />
        </div>
      )}

      {/* Graphiques ligne : évolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="section-title mb-4">Évolution des documents</h2>
          {isLoading ? <div className="h-52 animate-pulse rounded" style={{ background: '#f8fafc' }} /> : (
            docsData.length === 0
              ? <div className="h-52 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>Aucune donnée sur cette période</div>
              : <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={docsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<TipDoc />} />
                    <Line type="monotone" dataKey="docs" name="Documents" stroke="#2563eb"
                      strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="section-title mb-4">Évolution des actions</h2>
          {isLoading ? <div className="h-52 animate-pulse rounded" style={{ background: '#f8fafc' }} /> : (
            actionsData.length === 0
              ? <div className="h-52 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>Aucune donnée sur cette période</div>
              : <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={actionsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<TipDoc />} />
                    <Line type="monotone" dataKey="actions" name="Actions" stroke="#7c3aed"
                      strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Documents par type + Statuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="section-title mb-4">Documents par type</h2>
          {isLoading ? <div className="h-48 animate-pulse rounded" style={{ background: '#f8fafc' }} /> : (
            typeData.length === 0
              ? <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>Aucune donnée</div>
              : <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                    <Tooltip content={<TipDoc />} cursor={{ fill: 'rgba(37,99,235,0.05)' }} />
                    <Bar dataKey="count" name="Documents" radius={[0, 4, 4, 0]}>
                      {typeData.map((_, i) => <Cell key={i} fill={BLUES[i % BLUES.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="section-title mb-4">Répartition par statut</h2>
          {isLoading ? <div className="h-48 animate-pulse rounded" style={{ background: '#f8fafc' }} /> : (
            statutData.length === 0
              ? <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>Aucune donnée</div>
              : <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={statutData} dataKey="value" cx="50%" cy="50%" outerRadius={70}
                        strokeWidth={2} stroke="#fff" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                        labelLine={false}>
                        {statutData.map((_, i) => <Cell key={i} fill={MIX[i % MIX.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {statutData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: MIX[i % MIX.length] }} />
                        <span style={{ color: '#64748b' }}>{item.name}</span>
                        <span className="ml-auto font-bold font-mono" style={{ color: '#1e293b' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
          )}
        </div>
      </div>

      {/* Actions par type + Top créateurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="section-title mb-4">Actions par type</h2>
          {isLoading ? <div className="h-48 animate-pulse rounded" style={{ background: '#f8fafc' }} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={actionTypeData} margin={{ top: 0, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<TipDoc />} cursor={{ fill: 'rgba(37,99,235,0.05)' }} />
                <Bar dataKey="count" name="Actions" radius={[4, 4, 0, 0]}>
                  {actionTypeData.map((item, i) => (
                    <Cell key={i} fill={TYPE_ACTION_COLORS[item.name] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="section-title mb-4">Top 5 créateurs</h2>
          {isLoading ? <div className="h-48 animate-pulse rounded" style={{ background: '#f8fafc' }} /> : (
            topCreateurs.length === 0
              ? <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>Aucune donnée</div>
              : <div className="space-y-3">
                  {topCreateurs.map((u, i) => {
                    const max   = topCreateurs[0].count
                    const pct   = Math.round(u.count / max * 100)
                    const name  = `${u.createur__prenom} ${u.createur__nom}`
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium" style={{ color: '#1e293b' }}>{name}</span>
                          <span className="font-mono font-bold" style={{ color: '#2563eb' }}>{u.count}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: BLUES[i % BLUES.length] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
          )}
        </div>
      </div>

      {/* Boutons export */}
      <div className="card">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Download size={16} style={{ color: '#2563eb' }} /> Exporter les données
        </h2>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/documents/export/csv/?debut=${debut}&fin=${fin}`}
            className="btn-secondary flex items-center gap-2"
            target="_blank" rel="noreferrer">
            <Download size={14} /> Documents CSV
          </a>
          <a href={`/api/documents/export/pdf/?debut=${debut}&fin=${fin}`}
            className="btn-secondary flex items-center gap-2"
            target="_blank" rel="noreferrer">
            <Download size={14} /> Documents PDF
          </a>
          <a href={`/api/journal/export/csv/?date_debut=${debut}&date_fin=${fin}`}
            className="btn-secondary flex items-center gap-2"
            target="_blank" rel="noreferrer">
            <Download size={14} /> Journal CSV
          </a>
          <a href={`/api/journal/export/pdf/?date_debut=${debut}&date_fin=${fin}`}
            className="btn-secondary flex items-center gap-2"
            target="_blank" rel="noreferrer">
            <Download size={14} /> Journal PDF
          </a>
        </div>
        <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>
          Les exports appliquent automatiquement les filtres de la période sélectionnée.
        </p>
      </div>
    </div>
  )
}
