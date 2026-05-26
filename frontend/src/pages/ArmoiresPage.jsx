import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { armoiresAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { Plus, Search, Archive, Layers, FileText, ChevronRight, Trash2, X } from 'lucide-react'

function ArmoireModal({ onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const mutation = useMutation((data) => armoiresAPI.create(data), {
    onSuccess: () => { toast.success("Armoire créée !"); onSuccess() },
    onError: (e) => toast.error(e.response?.data?.code?.[0] || "Erreur"),
  })
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(30,58,138,0.3)", backdropFilter: "blur(4px)" }}>
      <div className="card w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title">Nouvelle armoire</h2>
          <button onClick={onClose} style={{ color: "#94a3b8" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div><label className="label">Nom *</label>
            <input className="input" placeholder="Ex: Armoire Comptabilité" {...register("nom", { required: true })} />
            {errors.nom && <p className="text-red-500 text-xs mt-1">Requis</p>}
          </div>
          <div><label className="label">Code *</label>
            <input className="input font-mono" placeholder="Ex: ARM-COMPTA" {...register("code", { required: true })} />
          </div>
          <div><label className="label">Description</label>
            <textarea className="input resize-none h-20" {...register("description")} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button type="submit" disabled={mutation.isLoading} className="btn-primary flex-1 justify-center">
              {mutation.isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ArmoiresPage() {
  const { isAdmin } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const { data, isLoading } = useQuery(["armoires", search], () => armoiresAPI.list({ search }).then(r => r.data))
  const deleteMutation = useMutation((id) => armoiresAPI.delete(id), {
    onSuccess: () => { toast.success("Armoire supprimée"); qc.invalidateQueries("armoires") },
    onError: () => toast.error("Impossible (documents liés ?)"),
  })
  return (
    <div className="p-6 space-y-5">
      {showModal && <ArmoireModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); qc.invalidateQueries("armoires") }} />}
      <div className="flex items-center justify-between">
        <h1 className="page-title">Armoires & Rayons</h1>
        {isAdmin() && <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Nouvelle armoire</button>}
      </div>
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une armoire…" className="input pl-9" />
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-xl animate-pulse" style={{ background: "#e2e8f0" }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.results?.map(armoire => (
            <div key={armoire.id} className="card group hover:shadow-md transition-shadow relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                    <Archive size={18} style={{ color: "#2563eb" }} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "#1e293b" }}>{armoire.nom}</div>
                    <div className="font-mono text-xs" style={{ color: "#2563eb" }}>{armoire.code}</div>
                  </div>
                </div>
                {isAdmin() && (
                  <button onClick={() => deleteMutation.mutate(armoire.id)}
                          className="opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {armoire.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: "#64748b" }}>{armoire.description}</p>}
              <div className="flex items-center gap-4 text-xs mb-3" style={{ color: "#94a3b8" }}>
                <span className="flex items-center gap-1"><Layers size={12} /> {armoire.nombre_rayons} rayons</span>
                <span className="flex items-center gap-1"><FileText size={12} /> {armoire.nombre_documents} docs</span>
              </div>
              <Link to={`/armoires/${armoire.id}`} className="flex items-center gap-1 text-xs font-semibold transition-colors" style={{ color: "#2563eb" }}>
                Voir les rayons <ChevronRight size={12} />
              </Link>
            </div>
          ))}
          {data?.results?.length === 0 && (
            <div className="col-span-3 text-center py-16" style={{ color: "#94a3b8" }}>
              <Archive size={32} className="mx-auto mb-3 opacity-30" />
              <p>Aucune armoire trouvée</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}