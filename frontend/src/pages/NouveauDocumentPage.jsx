import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { documentsAPI, armoiresAPI } from '../services/api'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Upload, FileText, Tag, ChevronRight, X, Plus } from 'lucide-react'

const STEPS = ['Fichier & Localisation', 'Informations', 'Métadonnées']

export default function NouveauDocumentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultRayon = searchParams.get('rayon') || ''
  const [step, setStep]         = useState(0)
  const [file, setFile]         = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [motsCles, setMotsCles] = useState([])
  const [motCle, setMotCle]     = useState('')

  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { rayon: defaultRayon, statut: 'ACTIF' } })
  const selectedArmoire = watch('armoire_filter')
  const { data: armoires } = useQuery('armoires-list', () => armoiresAPI.list().then(r => r.data))
  const { data: rayons }   = useQuery(['rayons', selectedArmoire], () => armoiresAPI.getRayons({ armoire: selectedArmoire }).then(r => r.data), { enabled: !!selectedArmoire })

  const mutation = useMutation((fd) => documentsAPI.create(fd), {
    onSuccess: (res) => { toast.success(`Document créé : ${res.data.code_unique}`); navigate(`/documents/${res.data.id}`) },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const onSubmit = (data) => {
    if (!file) { toast.error('Sélectionnez un fichier'); return }
    const fd = new FormData()
    fd.append('fichier', file)
    fd.append('titre', data.titre)
    fd.append('type_doc', data.type_doc)
    fd.append('date_creation', data.date_creation)
    fd.append('rayon', data.rayon)
    fd.append('statut', data.statut)
    if (data.auteur)       fd.append('metadata.auteur', data.auteur)
    if (data.destinataire) fd.append('metadata.destinataire', data.destinataire)
    if (data.description)  fd.append('metadata.description', data.description)
    if (data.date_emission)fd.append('metadata.date_emission', data.date_emission)
    if (motsCles.length)   fd.append('metadata.mots_cles', JSON.stringify(motsCles))
    mutation.mutate(fd)
  }

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }
  const stepIcons = [Upload, FileText, Tag]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/documents" style={{ color: '#64748b' }}><ArrowLeft size={18} /></Link>
        <h1 className="page-title">Nouveau document</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = stepIcons[i]
          return (
            <div key={i} className="flex items-center gap-2">
              <button onClick={() => i < step && setStep(i)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                      style={{
                        background: step === i ? '#eff6ff' : (i < step ? '#f0fdf4' : '#ffffff'),
                        borderColor: step === i ? '#bfdbfe' : (i < step ? '#bbf7d0' : '#e2e8f0'),
                        color: step === i ? '#1d4ed8' : (i < step ? '#16a34a' : '#94a3b8'),
                        cursor: i < step ? 'pointer' : 'default',
                      }}>
                <Icon size={13} /> {s}
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={14} style={{ color: '#e2e8f0' }} />}
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* Step 0 */}
        {step === 0 && (
          <div className="card space-y-5">
            <div>
              <label className="label">Fichier *</label>
              <div onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                   onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                   onClick={() => document.getElementById('file-input').click()}
                   className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                   style={{ borderColor: dragOver ? '#3b82f6' : '#e2e8f0', background: dragOver ? '#eff6ff' : '#f8fafc' }}>
                <input id="file-input" type="file" className="hidden" onChange={e => setFile(e.target.files[0])}
                       accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={28} style={{ color: '#2563eb' }} />
                    <p className="font-semibold" style={{ color: '#1e293b' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{(file.size / 1024).toFixed(1)} Ko</p>
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} className="text-xs text-red-500 flex items-center gap-1 mt-1"><X size={12} /> Supprimer</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2" style={{ color: '#94a3b8' }}>
                    <Upload size={28} className="opacity-50" />
                    <p className="text-sm">Glissez un fichier ou <span style={{ color: '#2563eb' }}>cliquez pour sélectionner</span></p>
                    <p className="text-xs">PDF, Word, Excel, Images</p>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Armoire *</label>
                <select className="input" {...register('armoire_filter', { required: true })}>
                  <option value="">Sélectionner…</option>
                  {armoires?.results?.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.code})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Rayon *</label>
                <select className="input" {...register('rayon', { required: 'Requis' })} disabled={!selectedArmoire}>
                  <option value="">Sélectionner…</option>
                  {rayons?.results?.map(r => <option key={r.id} value={r.id}>{r.nom} ({r.code})</option>)}
                </select>
                {errors.rayon && <p className="text-red-500 text-xs mt-1">{errors.rayon.message}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => { if (!file) { toast.error('Sélectionnez un fichier'); return } setStep(1) }} className="btn-primary">
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="card space-y-4">
            <div>
              <label className="label">Titre *</label>
              <input className="input" placeholder="Ex: Contrat de prestation N°2025-001" {...register('titre', { required: 'Requis' })} />
              {errors.titre && <p className="text-red-500 text-xs mt-1">{errors.titre.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type *</label>
                <input className="input" placeholder="Ex: Contrat, Facture…" {...register('type_doc', { required: 'Requis' })} />
              </div>
              <div>
                <label className="label">Date du document *</label>
                <input type="date" className="input" {...register('date_creation', { required: 'Requis' })} />
              </div>
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" {...register('statut')}>
                <option value="ACTIF">Actif</option>
                <option value="ARCHIVE">Archivé</option>
              </select>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary"><ArrowLeft size={15} /> Retour</button>
              <button type="button" onClick={() => setStep(2)} className="btn-primary">Suivant <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="card space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Auteur</label><input className="input" {...register('auteur')} /></div>
              <div><label className="label">Destinataire</label><input className="input" {...register('destinataire')} /></div>
            </div>
            <div><label className="label">Date d'émission</label><input type="date" className="input" {...register('date_emission')} /></div>
            <div>
              <label className="label">Mots-clés</label>
              <div className="flex gap-2 mb-2">
                <input className="input flex-1" placeholder="Ajouter un mot-clé" value={motCle} onChange={e => setMotCle(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (motCle.trim()) { setMotsCles([...motsCles, motCle.trim()]); setMotCle('') } } }} />
                <button type="button" onClick={() => { if (motCle.trim()) { setMotsCles([...motsCles, motCle.trim()]); setMotCle('') } }} className="btn-secondary px-3"><Plus size={15} /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {motsCles.map(mc => (
                  <span key={mc} className="badge-blue flex items-center gap-1.5 px-2.5 py-1 text-xs">
                    {mc}<button type="button" onClick={() => setMotsCles(motsCles.filter(m => m !== mc))}><X size={11} /></button>
                  </span>
                ))}
              </div>
            </div>
            <div><label className="label">Description</label><textarea className="input resize-none h-20" {...register('description')} /></div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary"><ArrowLeft size={15} /> Retour</button>
              <button type="submit" disabled={mutation.isLoading} className="btn-primary">
                {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Upload size={15} /> Enregistrer</>}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
