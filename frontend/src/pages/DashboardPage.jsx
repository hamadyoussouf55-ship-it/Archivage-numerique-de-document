import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { documentsAPI, journalAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  FileText, Archive, Layers, TrendingUp, BookOpen,
  Users, BarChart2, Upload, Eye, Download, Clock, AlertTriangle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const BLUES  = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#1d4ed8','#1e40af']
const GREENS = ['#16a34a','#22c55e','#4ade80']

// ── Composants partagés ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = '#2563eb', to }) {
  const inner = (
    <div className="card h-full" style={{ borderLeft: `4px solid ${color}` }}>
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
  if (to) return <Link to={to} className="block hover:opacity-90 transition-opacity">{inner}</Link>
  return inner
}

function SectionTitle({ children }) {
  return <h2 className="section-title mb-4">{children}</h2>
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-sm shadow-lg" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
      <p style={{ color: '#64748b' }}>{label}</p>
      <p className="font-semibold" style={{ color: '#2563eb' }}>{payload[0].value}</p>
    </div>
  )
}

function LoadingCard({ h = 48 }) {
  return <div className={`h-${h} animate-pulse rounded-lg`} style={{ background: '#f8fafc' }} />
}

// ── Badge rôle ───────────────────────────────────────────────────────────────

const ROLE_STYLE = {
  ADMIN:      { bg: '#dbeafe', color: '#1d4ed8', label: 'Chef de département' },
  ARCHIVISTE: { bg: '#fef3c7', color: '#92400e', label: 'Archiviste'     },
  CONSULTANT: { bg: '#dcfce7', color: '#166534', label: 'Consultant'     },
}

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD ADMIN
// ════════════════════════════════════════════════════════════════════════════

function DashboardAdmin({ stats, isLoading, user }) {
  return (
    <>
      {/* Raccourcis admin - tout en haut */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/documents/nouveau', icon: Upload,     label: 'Nouveau document', color: '#2563eb' },
          { to: '/documents',         icon: FileText,   label: 'Tous les docs',    color: '#16a34a' },
          { to: '/armoires',          icon: Layers,     label: 'Armoires & rayons', color: '#d97706' },
          { to: '/statistiques',      icon: BarChart2,  label: 'Statistiques',     color: '#0891b2' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="card flex items-center gap-3 hover:shadow-md transition-all cursor-pointer py-4"
            style={{ borderColor: '#e2e8f0' }}>
            <div className="p-2.5 rounded-lg" style={{ background: color + '15' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>{label}</span>
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText}   label="Total documents" value={stats?.total_documents}     color="#2563eb" to="/documents" />
        <StatCard icon={TrendingUp} label="Actifs"          value={stats?.documents_actifs}    color="#16a34a" to="/documents?statut=ACTIF" />
        <StatCard icon={Archive}    label="Archivés"        value={stats?.documents_archives}  color="#d97706" to="/documents?statut=ARCHIVE" />
        <StatCard icon={Layers}     label="Armoires"        value={stats?.total_armoires}
          sub={`${stats?.total_rayons ?? 0} rayons`} color="#7c3aed" to="/armoires" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <SectionTitle>Documents par type</SectionTitle>
          {isLoading ? <LoadingCard /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.par_type || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="type_doc" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(37,99,235,0.05)' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <SectionTitle>Répartition par armoire</SectionTitle>
          {isLoading ? <LoadingCard /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={stats?.par_armoire || []} dataKey="count" cx="50%" cy="50%"
                    outerRadius={65} strokeWidth={2} stroke="#fff">
                    {(stats?.par_armoire || []).map((_, i) => <Cell key={i} fill={BLUES[i % BLUES.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {(stats?.par_armoire || []).slice(0,5).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: BLUES[i % BLUES.length] }} />
                    <span className="truncate" style={{ color: '#64748b' }}>{item.rayon__armoire__nom || item.rayon__armoire__code}</span>
                    <span className="ml-auto font-mono font-semibold" style={{ color: '#1e293b' }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD ARCHIVISTE
// ════════════════════════════════════════════════════════════════════════════

function DashboardArchiviste({ stats, isLoading }) {
  return (
    <>
      {/* Actions rapides - tout en haut */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/documents/nouveau', icon: Upload,     label: 'Archiver un document', color: '#2563eb' },
          { to: '/documents',         icon: FileText,   label: 'Tous les documents',   color: '#16a34a' },
          { to: '/armoires',          icon: Layers,     label: 'Armoires & rayons',    color: '#d97706' },
          { to: '/statistiques',      icon: BarChart2,  label: 'Statistiques',         color: '#0891b2' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="card flex items-center gap-3 hover:shadow-md transition-all cursor-pointer py-4"
            style={{ borderColor: '#e2e8f0' }}>
            <div className="p-2.5 rounded-lg" style={{ background: color + '15' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>{label}</span>
          </Link>
        ))}
      </div>

      {/* KPIs orientés activité */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText}   label="Total documents"  value={stats?.total_documents}   color="#2563eb" to="/documents" />
        <StatCard icon={TrendingUp} label="Actifs"           value={stats?.documents_actifs}  color="#16a34a" to="/documents?statut=ACTIF" />
        <StatCard icon={Archive}    label="Archivés"         value={stats?.documents_archives} color="#d97706" to="/documents?statut=ARCHIVE" />
        <StatCard icon={Layers}     label="Armoires"         value={stats?.total_armoires}
          sub={`${stats?.total_rayons ?? 0} rayons`} color="#0891b2" to="/armoires" />
      </div>

      {/* Graphique */}
      <div className="card">
        <SectionTitle>Documents par type</SectionTitle>
        {isLoading ? <LoadingCard /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.par_type || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="type_doc" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(37,99,235,0.05)' }} />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD CONSULTANT
// ════════════════════════════════════════════════════════════════════════════

function DashboardConsultant({ stats, isLoading }) {
  return (
    <>
      {/* Message de bienvenue spécifique */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: '#2563eb' }}>
            <Eye size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1e3a5f' }}>Accès Consultation</p>
            <p className="text-xs mt-0.5" style={{ color: '#3b82f6' }}>
              Vous pouvez consulter, prévisualiser et télécharger les documents archivés.
            </p>
          </div>
        </div>
      </div>

      {/* Accès rapides - tout en haut */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/documents',    icon: FileText, label: 'Parcourir les documents', color: '#2563eb' },
          { to: '/armoires',     icon: Layers,   label: 'Voir les armoires',       color: '#d97706' },
          { to: '/statistiques', icon: BarChart2,label: 'Statistiques',            color: '#0891b2' },
          { to: '/profil',       icon: Users,    label: 'Mon profil',              color: '#7c3aed' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="card flex items-center gap-3 hover:shadow-md transition-all cursor-pointer py-4"
            style={{ borderColor: '#e2e8f0' }}>
            <div className="p-2.5 rounded-lg" style={{ background: color + '15' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>{label}</span>
          </Link>
        ))}
      </div>

      {/* KPIs lecture seule */}
      <div className="grid grid-cols-2 lg: lg:grid-cols-3 gap-4">
        <StatCard icon={FileText}   label="Documents disponibles" value={stats?.total_documents}   color="#2563eb" to="/documents" />
        <StatCard icon={TrendingUp} label="Documents actifs"      value={stats?.documents_actifs}  color="#16a34a" to="/documents?statut=ACTIF" />
        <StatCard icon={Layers}     label="Armoires"              value={stats?.total_armoires}
          sub={`${stats?.total_rayons ?? 0} rayons`} color="#7c3aed" to="/armoires" />
      </div>

      {/* Graphique */}
      <div className="card">
        <SectionTitle>Répartition des documents par type</SectionTitle>
        {isLoading ? <LoadingCard /> : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={stats?.par_type || []} dataKey="count" cx="50%" cy="50%"
                  outerRadius={65} strokeWidth={2} stroke="#fff">
                  {(stats?.par_type || []).map((_, i) => <Cell key={i} fill={BLUES[i % BLUES.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {(stats?.par_type || []).slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: BLUES[i % BLUES.length] }} />
                  <span className="truncate" style={{ color: '#64748b' }}>{item.type_doc}</span>
                  <span className="ml-auto font-mono font-semibold" style={{ color: '#1e293b' }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info permissions */}
      <div className="card flex items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <AlertTriangle size={15} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
        <p className="text-xs" style={{ color: '#92400e' }}>
          En tant que <strong>Consultant</strong>, vous avez accès en lecture seule.
          Pour archiver ou modifier des documents, contactez un Archiviste ou un Administrateur.
        </p>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, isLoading } = useQuery(
    'stats',
    () => documentsAPI.getStats().then(r => r.data)
  )

  const roleStyle = ROLE_STYLE[user?.role] || ROLE_STYLE.CONSULTANT

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm" style={{ color: '#64748b' }}>
            Bonjour, <span className="font-semibold" style={{ color: '#1e293b' }}>{user?.prenom}</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: roleStyle.bg, color: roleStyle.color }}>
            {roleStyle.label}
          </span>
        </div>
      </div>

      {/* Dashboard selon le rôle */}
      {user?.role === 'ADMIN'      && <DashboardAdmin      stats={stats} isLoading={isLoading} user={user} />}
      {user?.role === 'ARCHIVISTE' && <DashboardArchiviste stats={stats} isLoading={isLoading} />}
      {user?.role === 'CONSULTANT' && <DashboardConsultant stats={stats} isLoading={isLoading} />}
    </div>
  )
}
