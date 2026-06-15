import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { documentsAPI, armoiresAPI, entrepriseAPI } from '../services/api'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Upload, FileText, Tag, ChevronRight, X, Plus, Lock } from 'lucide-react'

const STEPS = ['Fichier & Localisation', 'Informations', 'Métadonnées']

export default function NouveauDocumentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultRayon = searchParams.get('rayon') || ''

  const [step,      setStep]      = useState(0)
  const [file,      setFile]      = useState(null)
  const [dragOver,  setDragOver]  = useState(false)
  const [motsCles,  setMotsCles]  = useState([])
  const [motCle,    setMotCle]    = useState('')

  // Cascade IDs
  const [departementId, setDepartementId] = useState('')
  const [serviceId,     setServiceId]     = useState('')
  const [armoireId,     setArmoireId]     = useState('')

  // Pré-sélection via ?rayon=
  const [preselect, setPreselect] = useState({})

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { rayon: defaultRayon, statut: 'ACTIF' }
  })

  // ── Départements ──
  const { data: depts } = useQuery('departements',
    () => entrepriseAPI.getDepartements().then(r => r.data))

  // ── Services filtrés par département ──
  const { data: servicesData } = useQuery(
    ['services-filtre', departementId],
    () => entrepriseAPI.getServices({ departement: departementId }).then(r => r.data),
    { enabled: !!departementId }
  )
  const services = servicesData?.results || []

  // ── Armoires filtrées par service ──
  const { data: armoiresData } = useQuery(
    ['armoires-filtre', serviceId],
    () => armoiresAPI.list({ service: serviceId }).then(r => r.data),
    { enabled: !!serviceId }
  )
  const armoires = armoiresData?.results || []

  // ── Rayons filtrés par armoire ──
  const { data: rayonsData } = useQuery(
    ['rayons', armoireId],
    () => armoiresAPI.getRayons(armoireId).then(r => r.data),
    { enabled: !!armoireId }
  )
  const rayons = rayonsData?.results || rayonsData?.rayons || (Array.isArray(rayonsData) ? rayonsData : [])

  const DOC_TYPES = ['CONTRAT', 'FACTURE', 'RAPPORT', 'COURRIER', 'AUTRE']
  const [typeAutre, setTypeAutre] = useState('')

  // ── Pré-sélection via ?rayon= ──
  const { data: rayonDetail } = useQuery(
    ['rayon-detail', defaultRayon],
    () => armoiresAPI.getRayon(defaultRayon).then(r => r.data),
    { enabled: !!defaultRayon }
  )

  const { data: armoireDetail } = useQuery(
    ['armoire-detail', rayonDetail?.armoire],
    () => armoiresAPI.get(rayonDetail.armoire).then(r => r.data),
    { enabled: !!rayonDetail?.armoire }
  )

  const { data: serviceDetail } = useQuery(
    ['service-detail', armoireDetail?.service],
    () => entrepriseAPI.getService(armoireDetail.service).then(r => r.data),
    { enabled: !!armoireDetail?.service }
  )

  useEffect(() => {
    if (rayonDetail && armoireDetail && serviceDetail) {
      setPreselect({
        departement: serviceDetail.departement,
        departementNom: rayonDetail.departement_nom,
        service: armoireDetail.service,
        serviceNom: armoireDetail.service_nom,
        armoire: rayonDetail.armoire,
        armoireNom: armoireDetail.nom,
        rayon: defaultRayon,
        rayonNom: rayonDetail.nom,
      })
      setDepartementId(serviceDetail.departement)
      setServiceId(armoireDetail.service)
      setArmoireId(rayonDetail.armoire)
      setValue('rayon', defaultRayon)
    }
  }, [rayonDetail, armoireDetail, serviceDetail, defaultRayon, setValue])

  const mutation = useMutation(
    (fd) => documentsAPI.create(fd),
    {
      onSuccess: (res) => {
        toast.success(`Document créé : ${res.data.code_unique}`)
        navigate(`/documents/${res.data.id}`)
      },
      onError: (err) => {
        const msg = err?.response?.data
        const detail = typeof msg === 'object' ? Object.values(msg).flat().join(' | ') : 'Erreur lors de la création'
        toast.error(detail)
      },
    }
  )

  const onSubmit = (data) => {
    if (!file) { toast.error('Sélectionnez un fichier'); return }
    const rayonFinal = preselect.rayon || data.rayon
    if (!rayonFinal) { toast.error('Sélectionnez un rayon'); return }
    if (data.type_doc === 'AUTRE' && !typeAutre.trim()) { toast.error('Précisez le type du document'); return }

    const fd = new FormData()
    fd.append('fichier',       file)
    fd.append('titre',         data.titre)
    fd.append('type_doc',      data.type_doc === 'AUTRE' ? typeAutre.trim() : data.type_doc)
    fd.append('rayon',         rayonFinal)
    fd.append('statut',        data.statut || 'ACTIF')
    if (data.description)   fd.append('metadata.description',   data.description)
    if (data.date_emission) fd.append('metadata.date_emission',  data.date_emission)
    if (motsCles.length)    fd.append('metadata.mots_cles',     JSON.stringify(motsCles))
    mutation.mutate(fd)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const addMotCle = () => {
    if (motCle.trim() && !motsCles.includes(motCle.trim())) {
      setMotsCles([...motsCles, motCle.trim()])
      setMotCle('')
    }
  }

  const stepIcons = [Upload, FileText, Tag]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/documents" style={{ color: '#64748b' }}><ArrowLeft size={18} /></Link>
        <h1 className="page-title">Nouveau document</h1>
      </div>

      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => {
          const Icon = stepIcons[i]
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                onClick={() => i < step && setStep(i)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background:  step === i ? '#eff6ff' : (i < step ? '#f0fdf4' : '#ffffff'),
                  borderColor: step === i ? '#bfdbfe' : (i < step ? '#bbf7d0' : '#e2e8f0'),
                  color:       step === i ? '#1d4ed8' : (i < step ? '#16a34a' : '#94a3b8'),
                  cursor:      i < step ? 'pointer' : 'default',
                }}>
                <Icon size={13} /> {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} style={{ color: '#e2e8f0' }} />}
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── Étape 0 : Fichier & Localisation ── */}
        {step === 0 && (
          <div className="card space-y-5">

            {/* Zone fichier */}
            <div>
              <label className="label">Fichier *</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{ borderColor: dragOver ? '#3b82f6' : '#e2e8f0', background: dragOver ? '#eff6ff' : '#f8fafc' }}>
                <input id="file-input" type="file" className="hidden"
                       onChange={e => setFile(e.target.files[0])}
                       accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={28} style={{ color: '#2563eb' }} />
                    <p className="font-semibold" style={{ color: '#1e293b' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: '#64748b' }}>{(file.size / 1024).toFixed(1)} Ko</p>
                    <button type="button"
                            onClick={e => { e.stopPropagation(); setFile(null) }}
                            className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <X size={12} /> Supprimer
                    </button>
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

            {/* Localisation : cascade Département → Service → Armoire → Rayon */}
            {preselect.rayon ? (
              <div className="p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: '#166534' }}>
                  <Lock size={14} />
                  <span className="font-medium">Emplacement :</span>
                  <span>{preselect.departementNom}</span><ChevronRight size={12} />
                  <span>{preselect.serviceNom}</span><ChevronRight size={12} />
                  <span>{preselect.armoireNom}</span><ChevronRight size={12} />
                  <span className="font-mono">{preselect.rayonNom}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Département */}
                <div>
                  <label className="label">Département *</label>
                  <select className="input" value={departementId}
                    onChange={e => {
                      setDepartementId(e.target.value)
                      setServiceId('')
                      setArmoireId('')
                      setValue('rayon', '')
                    }}>
                    <option value="">Sélectionner le département…</option>
                    {(depts?.results || []).map(d => (
                      <option key={d.id} value={d.id}>{d.code} - {d.nom}</option>
                    ))}
                  </select>
                </div>

                {/* Service */}
                <div>
                  <label className="label">Service *</label>
                  <select className="input" value={serviceId}
                    disabled={!departementId}
                    onChange={e => {
                      setServiceId(e.target.value)
                      setArmoireId('')
                      setValue('rayon', '')
                    }}>
                    <option value="">Sélectionner le service…</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.code} - {s.nom}</option>
                    ))}
                  </select>
                </div>

                {/* Armoire */}
                <div>
                  <label className="label">Armoire *</label>
                  <select className="input" value={armoireId}
                    disabled={!serviceId}
                    onChange={e => {
                      setArmoireId(e.target.value)
                      setValue('rayon', '')
                    }}>
                    <option value="">Sélectionner l'armoire…</option>
                    {armoires.map(a => (
                      <option key={a.id} value={a.id}>{a.nom} ({a.code})</option>
                    ))}
                  </select>
                </div>

                {/* Rayon */}
                <div>
                  <label className="label">Rayon *</label>
                  <select className="input"
                    disabled={!armoireId}
                    {...register('rayon', { required: 'Requis' })}>
                    <option value="">Sélectionner le rayon…</option>
                    {rayons.map(r => (
                      <option key={r.id} value={r.id}>{r.nom} ({r.code})</option>
                    ))}
                  </select>
                  {errors.rayon && <p className="text-red-500 text-xs mt-1">{errors.rayon.message}</p>}
                </div>
              </>
            )}

            <div className="flex justify-end">
              <button type="button"
                      onClick={() => {
                        if (!file) { toast.error('Sélectionnez un fichier'); return }
                        const r = preselect.rayon || watch('rayon')
                        if (!r) { toast.error('Sélectionnez un rayon'); return }
                        setStep(1)
                      }}
                      className="btn-primary flex items-center gap-2">
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 1 : Informations ── */}
        {step === 1 && (
          <div className="card space-y-4">
            <div>
              <label className="label">Titre *</label>
              <input className="input" placeholder="Ex: Contrat de prestation N°2025-001"
                     {...register('titre', { required: 'Requis' })} />
              {errors.titre && <p className="text-red-500 text-xs mt-1">{errors.titre.message}</p>}
            </div>
            <div>
              <label className="label">Type *</label>
              <select className="input" {...register('type_doc', { required: 'Requis' })}
                onChange={e => { if (e.target.value !== 'AUTRE') setTypeAutre('') }}>
                <option value="">Sélectionner le type…</option>
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
              {errors.type_doc && <p className="text-red-500 text-xs mt-1">{errors.type_doc.message}</p>}
            </div>
            {watch('type_doc') === 'AUTRE' && (
              <div>
                <label className="label">Précisez le type *</label>
                <input className="input" placeholder="Ex: Devis, Avenant…"
                       value={typeAutre} onChange={e => setTypeAutre(e.target.value)} />
              </div>
            )}
            <div>
              <label className="label">Statut</label>
              <select className="input" {...register('statut')}>
                <option value="ACTIF">Actif</option>
                <option value="ARCHIVE">Archivé</option>
              </select>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary flex items-center gap-2">
                <ArrowLeft size={15} /> Retour
              </button>
              <button type="button" onClick={() => setStep(2)} className="btn-primary flex items-center gap-2">
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 2 : Métadonnées ── */}
        {step === 2 && (
          <div className="card space-y-4">
            <div>
              <label className="label">Date d'émission</label>
              <input type="date" className="input" {...register('date_emission')} />
            </div>
            <div>
              <label className="label">Mots-clés</label>
              <div className="flex gap-2 mb-2">
                <input className="input flex-1" placeholder="Ajouter un mot-clé"
                       value={motCle} onChange={e => setMotCle(e.target.value)}
                       onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMotCle() } }} />
                <button type="button" onClick={addMotCle} className="btn-secondary px-3">
                  <Plus size={15} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {motsCles.map(mc => (
                  <span key={mc} className="badge-blue flex items-center gap-1.5 px-2.5 py-1 text-xs">
                    {mc}
                    <button type="button" onClick={() => setMotsCles(motsCles.filter(m => m !== mc))}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none h-20" {...register('description')} />
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
                <ArrowLeft size={15} /> Retour
              </button>
              <button type="submit" disabled={mutation.isLoading} className="btn-primary flex items-center gap-2">
                {mutation.isLoading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Upload size={15} /> Enregistrer</>}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  )
}
