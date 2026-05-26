import { useQuery } from 'react-query'
import { documentsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { FileText, Archive, Layers, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const BLUES = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#1d4ed8','#1e40af']

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${accent ? '#2563eb' : '#e2e8f0'}` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748b' }}>{label}</p>
          <p className="text-3xl font-display font-bold" style={{ color: '#1e293b' }}>{value ?? '—'}</p>
          {sub && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: '#eff6ff' }}>
          <Icon size={20} style={{ color: '#2563eb' }} />
        </div>
      </div>
    </div>
  )
}

const Tip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-lg" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
      <p style={{ color: '#64748b' }}>{label}</p>
      <p className="font-semibold" style={{ color: '#2563eb' }}>{payload[0].value} docs</p>
    </div>
  )
  return null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, isLoading } = useQuery('stats', () => documentsAPI.getStats().then(r => r.data))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div className="text-sm" style={{ color: '#64748b' }}>
          Bonjour, <span className="font-semibold" style={{ color: '#1e293b' }}>{user?.prenom}</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            {user?.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText}   label="Total documents"   value={stats?.total_documents}    accent />
        <StatCard icon={TrendingUp} label="Actifs"            value={stats?.documents_actifs} />
        <StatCard icon={Archive}    label="Archivés"          value={stats?.documents_archives} />
        <StatCard icon={Layers}     label="Armoires"          value={stats?.total_armoires} sub={`${stats?.total_rayons ?? 0} rayons`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="section-title mb-4">Documents par type</h2>
          {isLoading
            ? <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>Chargement…</div>
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.par_type || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="type_doc" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<Tip />} cursor={{ fill: 'rgba(37,99,235,0.05)' }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
        <div className="card">
          <h2 className="section-title mb-4">Répartition par armoire</h2>
          {isLoading
            ? <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>Chargement…</div>
            : <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie data={stats?.par_armoire || []} dataKey="count" cx="50%" cy="50%" outerRadius={65} strokeWidth={2} stroke="#fff">
                      {(stats?.par_armoire || []).map((_, i) => <Cell key={i} fill={BLUES[i % BLUES.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {(stats?.par_armoire || []).slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: BLUES[i % BLUES.length] }} />
                      <span className="truncate" style={{ color: '#64748b' }}>{item.rayon__armoire__nom || item.rayon__armoire__code}</span>
                      <span className="ml-auto font-mono font-semibold" style={{ color: '#1e293b' }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
          }
        </div>
      </div>

      <div className="card">
        <p className="text-sm" style={{ color: '#64748b' }}>
          <span className="font-semibold" style={{ color: '#1e293b' }}>{stats?.total_armoires}</span> armoires ·{' '}
          <span className="font-semibold" style={{ color: '#1e293b' }}>{stats?.total_rayons}</span> rayons ·{' '}
          <span className="font-semibold" style={{ color: '#1e293b' }}>{stats?.total_documents}</span> documents indexés
        </p>
      </div>
    </div>
  )
}
