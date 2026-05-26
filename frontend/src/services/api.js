import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const { data } = await axios.post('/api/auth/token/refresh/', { refresh })
        localStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:               (data)      => api.post('/auth/login/', data),
  logout:              (data)      => api.post('/auth/logout/', data),
  me:                  ()          => api.get('/auth/me/'),
  changePassword:      (data)      => api.post('/auth/change-password/', data),
  getCollaborateurs:   (params)    => api.get('/auth/collaborateurs/', { params }),
  createCollaborateur: (data)      => api.post('/auth/collaborateurs/', data),
  updateCollaborateur: (id, data)  => api.patch(`/auth/collaborateurs/${id}/`, data),
  deleteCollaborateur: (id)        => api.delete(`/auth/collaborateurs/${id}/`),
}

// ── Entreprise ────────────────────────────────────────────────────────────────
export const entrepriseAPI = {
  getDepartements:     (params)    => api.get('/entreprise/departements/', { params }),
  createDepartement:   (data)      => api.post('/entreprise/departements/', data),
  updateDepartement:   (id, data)  => api.patch(`/entreprise/departements/${id}/`, data),
  deleteDepartement:   (id)        => api.delete(`/entreprise/departements/${id}/`),
  getServices:         (params)    => api.get('/entreprise/services/', { params }),
  createService:       (data)      => api.post('/entreprise/services/', data),
  updateService:       (id, data)  => api.patch(`/entreprise/services/${id}/`, data),
  deleteService:       (id)        => api.delete(`/entreprise/services/${id}/`),
  getRoles:            (params)    => api.get('/entreprise/roles/', { params }),
  createRole:          (data)      => api.post('/entreprise/roles/', data),
  deleteRole:          (id)        => api.delete(`/entreprise/roles/${id}/`),
}

// ── Armoires ──────────────────────────────────────────────────────────────────
export const armoiresAPI = {
  list:          (params)    => api.get('/armoires/', { params }),
  get:           (id)        => api.get(`/armoires/${id}/`),
  create:        (data)      => api.post('/armoires/', data),
  update:        (id, data)  => api.patch(`/armoires/${id}/`, data),
  delete:        (id)        => api.delete(`/armoires/${id}/`),
  getRayons:     (params)    => api.get('/armoires/rayons/', { params }),
  createRayon:   (data)      => api.post('/armoires/rayons/', data),
  updateRayon:   (id, data)  => api.patch(`/armoires/rayons/${id}/`, data),
  deleteRayon:   (id)        => api.delete(`/armoires/rayons/${id}/`),
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsAPI = {
  list:           (params)   => api.get('/documents/', { params }),
  get:            (id)       => api.get(`/documents/${id}/`),
  create:         (data)     => api.post('/documents/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update:         (id, data) => api.patch(`/documents/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete:         (id)       => api.delete(`/documents/${id}/`),
  deplacer:       (id, rayonId) => api.post(`/documents/${id}/deplacer/`, { rayon_id: rayonId }),
  updateMetadata: (id, data) => api.patch(`/documents/${id}/metadata/`, data),
  getStats:       ()         => api.get('/documents/stats/'),
  getStatsPeriode:(params)   => api.get('/documents/stats/periode/', { params }),

  // Export CSV / PDF (téléchargement direct via lien — token dans Authorization header)
  exportCSV: async (params = {}) => {
    const token = localStorage.getItem('access_token')
    const qs = new URLSearchParams(params).toString()
    const response = await fetch(`/api/documents/export/csv/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Erreur export CSV')
    const blob = await response.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `documents_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  },

  exportPDF: async (params = {}) => {
    const token = localStorage.getItem('access_token')
    const qs = new URLSearchParams(params).toString()
    const response = await fetch(`/api/documents/export/pdf/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Erreur export PDF')
    const blob = await response.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `documents_${new Date().toISOString().slice(0,10)}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  },

  // Téléchargement sécurisé — passe par l'API avec le token JWT
  getDownloadUrl:  (id) => `/api/documents/${id}/telecharger/`,
  getPreviewUrl:   (id) => `/api/documents/${id}/previsualiser/`,

  // Pour télécharger en blob avec le token
  download: async (id, nomFichier) => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`/api/documents/${id}/telecharger/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Erreur téléchargement')
    const blob = await response.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = nomFichier || 'document'
    a.click()
    window.URL.revokeObjectURL(url)
  },
}

// ── Journal ───────────────────────────────────────────────────────────────────
export const journalAPI = {
  list: (params) => api.get("/journal/", { params }),

  exportCSV: async (params = {}) => {
    const token = localStorage.getItem("access_token")
    const qs = new URLSearchParams(params).toString()
    const response = await fetch(`/api/journal/export/csv/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error("Erreur export journal CSV")
    const blob = await response.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `journal_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  },

  exportPDF: async (params = {}) => {
    const token = localStorage.getItem("access_token")
    const qs = new URLSearchParams(params).toString()
    const response = await fetch(`/api/journal/export/pdf/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error("Erreur export journal PDF")
    const blob = await response.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `journal_${new Date().toISOString().slice(0,10)}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  },
}

export default api
