import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Archive, FileText, BookOpen, BarChart2,
  Settings, LogOut, ChevronRight, Shield, User, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { to: '/armoires',  icon: Archive,         label: 'Armoires & Rayons' },
  { to: '/documents',    icon: FileText,   label: 'Documents' },
  { to: '/statistiques', icon: BarChart2,  label: 'Statistiques' },
  { to: '/journal',   icon: BookOpen,        label: 'Journal',         adminOnly: true },
  { to: '/admin',     icon: Settings,        label: 'Administration',  adminOnly: true },
  { to: '/profil',    icon: User,            label: 'Mon profil' },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const handleLogout = async () => { await logout(); navigate('/login') }
  const visible = navItems.filter(i => !i.adminOnly || isAdmin())

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f4f8' }}>

      {/* ── Sidebar bleu foncé ── */}
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-200"
        style={{
          width: open ? 240 : 60,
          background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
          boxShadow: '2px 0 12px rgba(30,58,138,0.15)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
               style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}>
            SG
          </div>
          {open && (
            <div className="overflow-hidden">
              <div className="font-display font-bold text-white text-sm leading-tight">SYGALIN SAS</div>
              <div className="text-xs font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>
                ARCHIVAGE NUMÉRIQUE
              </div>
            </div>
          )}
          <button onClick={() => setOpen(!open)}
                  className="ml-auto flex-shrink-0 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  onMouseOver={e => e.currentTarget.style.color = '#fff'}
                  onMouseOut={e  => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
            {open ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visible.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to} to={to} end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group
                 ${isActive ? 'nav-active' : 'nav-inactive'}`
              }
            >
              <Icon size={16} className="flex-shrink-0" />
              {open && <span className="text-sm">{label}</span>}
              {open && (
                <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {open && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg"
                 style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                   style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.full_name}</div>
                <div className="flex items-center gap-1">
                  <Shield size={9} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{user?.role}</span>
                </div>
              </div>
            </div>
          )}
          <button onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm transition-all"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  onMouseOver={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
                  onMouseOut={e  => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent' }}>
            <LogOut size={15} />
            {open && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto" style={{ background: '#f0f4f8' }}>
        <Outlet />
      </main>
    </div>
  )
}
