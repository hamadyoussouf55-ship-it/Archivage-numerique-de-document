import { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { documentsAPI, armoiresAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft, FileText, Download, Trash2, Move, Tag, Calendar, User,
  MapPin, Hash, Clock, CheckCircle, Archive, X, Save, Plus, Eye,
  History, Upload, RotateCcw, ChevronDown, ChevronRight, Shield,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUT_BADGE = { ACTIF: 'badge-green', ARCHIVE: 'badge-yellow', SUPPRIME: 'badge-red' }

const VERSION_BADGE = (n) => ({
  background: '#eff6ff', color: '#2563eb',
  border: '1px solid #bfdbfe',
  padding: '1px 8px', borderRadius: 20,
  fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
})

// ── Modal Déplacer ────────────────────────────────────────────────────────────
function DeplacerModal({ docId, onClose, onSuccess }) {
  const [armoire, setArmoire] = useState('')
  const [rayon, setRayon]     = useState('')
  const { data: armoires } = useQuery('armoires-list', () => armoiresAPI.list().then(r => r.data))
  const { data: rayons }   = useQuery(['rayons', armoire], () => armoiresAPI.getRayons(armoire).then(r => r.data), { enabled: !!armoire })
  const mutation = useMutation(() => documentsAPI.deplacer(docId, { rayon_id: rayon }), {
    onSuccess: () => { toast.success('Document déplacé !'); onSuccess() },
    onError:   () => toast.error('Erreur lors du déplacement'),
  })
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(30,58,138,0.3)', backdropFilter: 'blur(4px)' }}>
      <div className="card w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title flex items-center gap-2"><Move size={16} style={{ color: '#2563eb' }} /> Déplacer</h2>
          <button onClick={onClose} style={{ color: '#94a3b8' }}><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Armoire cible</label>
            <select className="input" value={armoire} onChange={e => { setArmoire(e.target.value); setRayon('') }}>
              <option value="">Sélectionner…</option>
              {armoires?.results?.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.code})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rayon cible</label>
            <select className="input" value={rayon} onChange={e => setRayon(e.target.value)} disabled={!armoire}>
              <option value="">Sélectionner…</option>
              {rayons?.results?.map(r => <option key={r.id} value={r.id}>{r.code}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button disabled={!rayon || mutation.isLoading} onClick={() => mutation.mutate()} className="btn-primary flex-1 justify-center">
              {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Move size={14} /> Déplacer</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Éditeur métadonnées ───────────────────────────────────────────────────────
function MetadataEditor({ docId, metadata, onSave }) {
  const [motsCles, setMotsCles] = useState(metadata?.mots_cles || [])
  const [motCle, setMotCle]     = useState('')
  const { register, handleSubmit } = useForm({ defaultValues: metadata || {} })
  const mutation = useMutation(
    (data) => documentsAPI.updateMeta(docId, { ...data, mots_cles: motsCles }),
    { onSuccess: () => { toast.success('Métadonnées mises à jour'); onSave() }, onError: () => toast.error('Erreur') }
  )
  const addMot = () => { if (motCle.trim() && !motsCles.includes(motCle.trim())) { setMotsCles([...motsCles, motCle.trim()]); setMotCle('') } }
  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Auteur</label><input className="input" {...register('auteur')} /></div>
        <div><label className="label">Destinataire</label><input className="input" {...register('destinataire')} /></div>
      </div>
      <div><label className="label">Date d'émission</label><input type="date" className="input" {...register('date_emission')} /></div>
      <div>
        <label className="label">Mots-clés</label>
        <div className="flex gap-2 mb-2">
          <input className="input flex-1" value={motCle} placeholder="Ajouter…" onChange={e => setMotCle(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMot())} />
          <button type="button" onClick={addMot} className="btn-secondary px-3"><Plus size={14} /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {motsCles.map(mc => (
            <span key={mc} className="badge-blue flex items-center gap-1.5 px-2.5 py-1 text-xs">
              {mc}<button type="button" onClick={() => setMotsCles(motsCles.filter(m => m !== mc))}><X size={10} /></button>
            </span>
          ))}
        </div>
      </div>
      <div><label className="label">Description</label><textarea className="input resize-none h-20" {...register('description')} /></div>
      <button type="submit" disabled={mutation.isLoading} className="btn-primary">
        {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Enregistrer</>}
      </button>
    </form>
  )
}

// ── Onglet Versions ───────────────────────────────────────────────────────────
function VersionsTab({ docId, canWrite, userRole }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [commentaire, setCommentaire] = useState('')
  const [showUpload, setShowUpload]   = useState(false)
  const [fichier, setFichier]         = useState(null)

  const { data: versionsData, isLoading } = useQuery(
    ['versions', docId],
    () => documentsAPI.getVersions(docId).then(r => r.data),
    { refetchOnWindowFocus: false }
  )

  const uploadMutation = useMutation(
    () => {
      const fd = new FormData()
      fd.append('fichier', fichier)
      fd.append('commentaire', commentaire)
      return documentsAPI.ajouterVersion(docId, fd)
    },
    {
      onSuccess: () => {
        toast.success('Nouvelle version ajoutée !')
        setShowUpload(false); setFichier(null); setCommentaire('')
        qc.invalidateQueries(['versions', docId])
        qc.invalidateQueries(['document', docId])
      },
      onError: () => toast.error('Erreur lors de l\'ajout de la version'),
    }
  )

  const restaurerMutation = useMutation(
    (vId) => documentsAPI.restaurerVersion(docId, vId),
    {
      onSuccess: (_, vId) => {
        toast.success('Version restaurée !')
        qc.invalidateQueries(['versions', docId])
        qc.invalidateQueries(['document', docId])
      },
      onError: () => toast.error('Erreur lors de la restauration'),
    }
  )

  const supprimerMutation = useMutation(
    (vId) => documentsAPI.supprimerVersion(docId, vId),
    {
      onSuccess: () => {
        toast.success('Version supprimée')
        qc.invalidateQueries(['versions', docId])
      },
      onError: (err) => toast.error(err?.response?.data?.detail || 'Erreur suppression'),
    }
  )

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: '#f8fafc' }} />)}
    </div>
  )

  const versions = versionsData?.versions || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
            {versionsData?.nombre_versions || 0} version(s)
          </p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            Version courante : <span className="font-mono font-semibold" style={{ color: '#2563eb' }}>
              v{versionsData?.version_courante || 1}
            </span>
          </p>
        </div>
        {canWrite && (
          <button onClick={() => setShowUpload(!showUpload)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Upload size={13} /> Nouvelle version
          </button>
        )}
      </div>

      {/* Formulaire upload nouvelle version */}
      {showUpload && (
        <div className="p-4 rounded-xl space-y-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
            Ajouter une nouvelle version
          </p>
          <div>
            <label className="label">Fichier</label>
            <input ref={fileRef} type="file" className="input py-1.5" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                   onChange={e => setFichier(e.target.files[0])} />
          </div>
          <div>
            <label className="label">Commentaire (motif de modification)</label>
            <input className="input" placeholder="Ex: Correction des annexes, signature ajoutée…"
                   value={commentaire} onChange={e => setCommentaire(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowUpload(false); setFichier(null); setCommentaire('') }}
                    className="btn-secondary text-xs py-1.5 px-3">Annuler</button>
            <button disabled={!fichier || uploadMutation.isLoading}
                    onClick={() => uploadMutation.mutate()}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              {uploadMutation.isLoading
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Upload size={12} /> Publier</>}
            </button>
          </div>
        </div>
      )}

      {/* Liste des versions */}
      {versions.length === 0 ? (
        <div className="text-center py-8" style={{ color: '#94a3b8' }}>
          <History size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune version enregistrée</p>
          <p className="text-xs mt-1">Ajoutez une nouvelle version pour commencer l'historique</p>
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id}
                 className="flex items-start gap-3 p-3 rounded-xl transition-all"
                 style={{
                   background: v.est_courante ? '#eff6ff' : '#fafafa',
                   border: `1px solid ${v.est_courante ? '#bfdbfe' : '#f1f5f9'}`,
                 }}>
              {/* Numéro version */}
              <div className="flex-shrink-0 mt-0.5">
                <span style={VERSION_BADGE(v.numero_version)}>v{v.numero_version}</span>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>
                    {v.nom_fichier || 'Fichier inconnu'}
                  </span>
                  {v.est_courante && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: '#16a34a', color: '#fff' }}>
                      Courante
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: '#94a3b8' }}>
                  <span className="flex items-center gap-1">
                    <User size={10} /> {v.cree_par_nom || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {v.date_creation ? format(new Date(v.date_creation), 'dd MMM yyyy HH:mm', { locale: fr }) : '—'}
                  </span>
                  <span>{v.taille_lisible}</span>
                </div>
                {v.commentaire && (
                  <p className="text-xs mt-1 italic" style={{ color: '#64748b' }}>
                    « {v.commentaire} »
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {canWrite && !v.est_courante && (
                  <button
                    onClick={() => { if (confirm(`Restaurer la version v${v.numero_version} ?`)) restaurerMutation.mutate(v.id) }}
                    disabled={restaurerMutation.isLoading}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                    title="Restaurer cette version">
                    <RotateCcw size={11} /> Restaurer
                  </button>
                )}
                {userRole === 'ADMIN' && !v.est_courante && (
                  <button
                    onClick={() => { if (confirm(`Supprimer la version v${v.numero_version} ?`)) supprimerMutation.mutate(v.id) }}
                    disabled={supprimerMutation.isLoading}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: '#dc2626', background: '#fef2f2' }}
                    title="Supprimer cette version">
                    <Trash2 size={12} />
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

// ════════════════════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { canWrite, user } = useAuth()
  const [showDeplacer, setShowDeplacer] = useState(false)
  const [editMeta,     setEditMeta]     = useState(false)
  const [downloading,  setDownloading]  = useState(false)
  const [previewing,   setPreviewing]   = useState(false)
  const [activeTab,    setActiveTab]    = useState('infos') // 'infos' | 'versions'

  const { data: doc, isLoading } = useQuery(
    ['document', id],
    () => documentsAPI.get(id).then(r => r.data)
  )

  const deleteMutation = useMutation(() => documentsAPI.delete(id), {
    onSuccess: () => { toast.success('Document supprimé'); navigate('/documents') },
    onError:   () => toast.error('Erreur suppression'),
  })

  const statutMutation = useMutation((statut) => documentsAPI.update(id, { statut }), {
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries(['document', id]) },
  })

  const handleDownload = async () => {
    setDownloading(true)
    try { await documentsAPI.telecharger(id, doc?.nom_fichier); toast.success('Téléchargement démarré') }
    catch { toast.error('Impossible de télécharger ce document') }
    finally { setDownloading(false) }
  }

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const url = await documentsAPI.previsualiser(id)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch { toast.error('Prévisualisation impossible') }
    finally { setPreviewing(false) }
  }

  if (isLoading) return (
    <div className="p-6 space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: '#e2e8f0' }} />)}
    </div>
  )

  if (!doc) return (
    <div className="p-6 text-center py-20" style={{ color: '#94a3b8' }}>
      <FileText size={40} className="mx-auto mb-3 opacity-30" /><p>Document introuvable</p>
      <Link to="/documents" className="text-sm mt-2 inline-block" style={{ color: '#2563eb' }}>← Retour</Link>
    </div>
  )

  const TABS = [
    { key: 'infos',    label: 'Informations',  icon: FileText },
    { key: 'versions', label: 'Versions',       icon: History,  badge: doc.versions?.length || 0 },
  ]

  return (
    <div className="p-6 space-y-5">
      {showDeplacer && (
        <DeplacerModal docId={id} onClose={() => setShowDeplacer(false)}
          onSuccess={() => { setShowDeplacer(false); qc.invalidateQueries(['document', id]) }} />
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/documents" className="mt-1 transition-colors" style={{ color: '#64748b' }}><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{doc.titre}</h1>
            <span className={STATUT_BADGE[doc.statut] || 'badge'}>{doc.statut}</span>
          </div>
          <p className="font-mono text-xs mt-1 font-semibold" style={{ color: '#2563eb' }}>{doc.code_unique}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <button onClick={handlePreview} disabled={previewing} className="btn-secondary text-sm py-1.5 px-3">
            {previewing ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} /> : <><Eye size={14} /> Prévisualiser</>}
          </button>
          <button onClick={handleDownload} disabled={downloading} className="btn-primary text-sm py-1.5 px-3">
            {downloading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Download size={14} /> Télécharger</>}
          </button>
          {canWrite() && (
            <>
              <button onClick={() => setShowDeplacer(true)} className="btn-secondary text-sm py-1.5 px-3"><Move size={14} /> Déplacer</button>
              <button onClick={() => { if (confirm('Supprimer ce document ?')) deleteMutation.mutate() }}
                      className="btn-danger text-sm py-1.5 px-3"><Trash2 size={14} /></button>
            </>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#f1f5f9' }}>
        {TABS.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setActiveTab(key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={activeTab === key
                    ? { background: '#fff', color: '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                    : { color: '#64748b' }}>
            <Icon size={14} />
            {label}
            {badge > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                    style={{ background: activeTab === key ? '#dbeafe' : '#e2e8f0', color: activeTab === key ? '#2563eb' : '#64748b' }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu onglet Informations */}
      {activeTab === 'infos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">

            {/* Infos générales */}
            <div className="card space-y-4">
              <h2 className="section-title" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>Informations générales</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Hash,     label: 'Code unique',   value: doc.code_unique,      blue: true, mono: true },
                  { icon: Tag,      label: 'Type',          value: doc.type_doc },
                  { icon: Calendar, label: 'Date document', value: doc.date_creation ? format(new Date(doc.date_creation), 'dd MMMM yyyy', { locale: fr }) : '—' },
                  { icon: Clock,    label: 'Numérisé le',   value: doc.date_numerisation ? format(new Date(doc.date_numerisation), 'dd MMM yyyy HH:mm', { locale: fr }) : '—' },
                  { icon: User,     label: 'Créé par',      value: doc.createur_nom || '—' },
                  { icon: FileText, label: 'Fichier',       value: `${doc.nom_fichier || '—'}${doc.taille_lisible ? ` (${doc.taille_lisible})` : ''}` },
                ].map(({ icon: Icon, label, value, blue, mono }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#eff6ff' }}>
                      <Icon size={14} style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</p>
                      <p className={`text-sm font-medium mt-0.5 ${mono ? 'font-mono' : ''}`} style={{ color: blue ? '#2563eb' : '#1e293b' }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {canWrite() && (
                <div className="pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Changer le statut</p>
                  <div className="flex gap-2">
                    {['ACTIF', 'ARCHIVE'].map(s => (
                      <button key={s} onClick={() => statutMutation.mutate(s)}
                              disabled={doc.statut === s || statutMutation.isLoading}
                              className="text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40"
                              style={{
                                background: doc.statut === s ? '#eff6ff' : '#ffffff',
                                borderColor: doc.statut === s ? '#bfdbfe' : '#e2e8f0',
                                color: doc.statut === s ? '#2563eb' : '#64748b',
                              }}>
                        {s === 'ACTIF' ? <CheckCircle size={12} className="inline mr-1" /> : <Archive size={12} className="inline mr-1" />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Localisation */}
            <div className="card">
              <h2 className="section-title mb-3 flex items-center gap-2">
                <MapPin size={14} style={{ color: '#2563eb' }} /> Localisation
              </h2>
              <div className="flex items-center gap-2">
                <span className="badge-blue font-mono px-3 py-1.5 text-sm">{doc.armoire_code}</span>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span className="font-mono text-sm px-3 py-1.5 rounded-lg" style={{ background: '#f1f5f9', color: '#475569' }}>{doc.rayon_code}</span>
                <span className="text-xs ml-2" style={{ color: '#94a3b8' }}>{doc.armoire_nom} › {doc.rayon_nom}</span>
              </div>
            </div>

            {/* Métadonnées */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title flex items-center gap-2"><Tag size={14} style={{ color: '#2563eb' }} /> Métadonnées</h2>
                {canWrite() && (
                  <button onClick={() => setEditMeta(!editMeta)} className="text-xs font-semibold" style={{ color: '#2563eb' }}>
                    {editMeta ? 'Annuler' : 'Modifier'}
                  </button>
                )}
              </div>
              {editMeta ? (
                <MetadataEditor docId={id} metadata={doc.metadata}
                  onSave={() => { setEditMeta(false); qc.invalidateQueries(['document', id]) }} />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Auteur',          value: doc.metadata?.auteur || '—' },
                    { label: 'Destinataire',    value: doc.metadata?.destinataire || '—' },
                    { label: "Date d'émission", value: doc.metadata?.date_emission ? format(new Date(doc.metadata.date_emission), 'dd MMMM yyyy', { locale: fr }) : '—' },
                    { label: 'Description',     value: doc.metadata?.description || '—', full: true },
                  ].map(({ label, value, full }) => (
                    <div key={label} className={full ? 'col-span-2' : ''}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>{label}</p>
                      <p className="text-sm" style={{ color: '#1e293b' }}>{value}</p>
                    </div>
                  ))}
                  {doc.metadata?.mots_cles?.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Mots-clés</p>
                      <div className="flex flex-wrap gap-2">
                        {doc.metadata.mots_cles.map(mc => <span key={mc} className="badge-blue text-xs px-2.5 py-1">{mc}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card">
              <h2 className="section-title mb-3">Aperçu</h2>
              <div className="h-40 rounded-lg flex flex-col items-center justify-center gap-3"
                   style={{ background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
                <FileText size={28} style={{ color: '#cbd5e1' }} />
                <button onClick={handlePreview} disabled={previewing} className="btn-secondary text-xs py-1 px-3">
                  <Eye size={12} /> Ouvrir
                </button>
              </div>
            </div>

            {/* Résumé versions dans la sidebar */}
            <div className="card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('versions')}>
              <h2 className="section-title mb-3 flex items-center gap-2">
                <History size={14} style={{ color: '#2563eb' }} /> Versions
              </h2>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold" style={{ color: '#1e293b' }}>{doc.versions?.length || 0}</p>
                <span className="text-xs font-semibold" style={{ color: '#2563eb' }}>Voir l'historique →</span>
              </div>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                {doc.versions?.length > 0 ? `Dernière modification : v${doc.versions[0]?.numero_version}` : 'Aucune version'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenu onglet Versions */}
      {activeTab === 'versions' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-5" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
            <History size={16} style={{ color: '#2563eb' }} />
            <h2 className="section-title">Historique des versions</h2>
          </div>
          <VersionsTab docId={id} canWrite={canWrite()} userRole={user?.role} />
        </div>
      )}
    </div>
  )
}
