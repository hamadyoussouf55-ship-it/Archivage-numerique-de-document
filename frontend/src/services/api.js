import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Intercepteur requête : injecte le token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Intercepteur réponse : refresh automatique ───────────────────────────────
let isRefreshing  = false
let failedQueue   = []   // requêtes en attente pendant le refresh

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Ignore les erreurs non-401 ou les retries déjà faits
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Évite de refresh en boucle sur l'endpoint de refresh lui-même
    if (original.url?.includes('/token/refresh/') || original.url?.includes('/auth/login/')) {
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Si un refresh est déjà en cours, mettre la requête en file d'attente
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }).catch((err) => Promise.reject(err))
    }

    original._retry  = true
    isRefreshing     = true

    try {
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) throw new Error('No refresh token')

      const { data } = await axios.post('/api/auth/token/refresh/', { refresh })
      const newToken  = data.access

      localStorage.setItem('access_token', newToken)
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`
      original.headers.Authorization            = `Bearer ${newToken}`

      processQueue(null, newToken)
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.clear()
      // Notification douce avant redirect
      window.dispatchEvent(new CustomEvent('auth:expired'))
      setTimeout(() => { window.location.href = '/login' }, 1500)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
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
  getEntreprises:      (params)    => api.get('/entreprise/', { params }),
  getDepartements:     (params)    => api.get('/entreprise/departements/', { params }),
  createDepartement:   (data)      => api.post('/entreprise/departements/', data),
  updateDepartement:   (id, data)  => api.patch(`/entreprise/departements/${id}/`, data),
  deleteDepartement:   (id)        => api.delete(`/entreprise/departements/${id}/`),
  getServices:         (params)    => api.get('/entreprise/services/', { params }),
  getService:          (id)        => api.get(`/entreprise/services/${id}/`),
  createService:       (data)      => api.post('/entreprise/services/', data),
  updateService:       (id, data)  => api.patch(`/entreprise/services/${id}/`, data),
  deleteService:       (id)        => api.delete(`/entreprise/services/${id}/`),
}

// ── Armoires ──────────────────────────────────────────────────────────────────
export const armoiresAPI = {
  list:         (params)    => api.get('/armoires/', { params }),
  get:          (id)        => api.get(`/armoires/${id}/`),
  create:       (data)      => api.post('/armoires/', data),
  update:       (id, data)  => api.patch(`/armoires/${id}/`, data),
  delete:       (id)        => api.delete(`/armoires/${id}/`),
  getRayons:    (id)        => api.get(`/armoires/${id}/rayons/`),
  getRayon:     (id)        => api.get(`/armoires/rayons/${id}/`),
  createRayon:  (id, data)  => api.post(`/armoires/${id}/rayons/`, data),
  deleteRayon:  (id)        => api.delete(`/armoires/rayons/${id}/`),
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsAPI = {
  list:         (params)    => api.get('/documents/', { params }),
  getTypes:     ()          => api.get('/documents/types/'),
  get:          (id)        => api.get(`/documents/${id}/`),
  create:       (data)      => api.post('/documents/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:       (id, data)  => api.patch(`/documents/${id}/`, data),
  delete:       (id)        => api.delete(`/documents/${id}/`),
  deplacer:     (id, data)  => api.post(`/documents/${id}/deplacer/`, data),
  updateMeta:   (id, data)  => api.patch(`/documents/${id}/metadata/`, data),

  getStats:       ()         => api.get('/documents/stats/'),
  getStatsPeriode:(params)   => api.get('/documents/stats/periode/', { params }),

  // Export CSV / PDF sécurisé via le token JWT
  exportCSV: async (params = {}) => {
    const token = localStorage.getItem('access_token')
    const qs    = new URLSearchParams(params).toString()
    const res   = await fetch(`/api/documents/export/csv/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Erreur export CSV')
    const blob = await res.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `documents_${new Date().toISOString().slice(0,10)}.csv`
    })
    a.click()
    window.URL.revokeObjectURL(url)
  },

  exportPDF: async (params = {}) => {
    const token = localStorage.getItem('access_token')
    const qs    = new URLSearchParams(params).toString()
    const res   = await fetch(`/api/documents/export/pdf/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Erreur export PDF')
    const blob = await res.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `documents_${new Date().toISOString().slice(0,10)}.pdf`
    })
    a.click()
    window.URL.revokeObjectURL(url)
  },

  // Versionnement
  getVersions:      (docId)         => api.get(`/documents/${docId}/versions/`),
  ajouterVersion:   (docId, data)   => api.post(`/documents/${docId}/versions/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  restaurerVersion: (docId, vId)    => api.post(`/documents/${docId}/versions/${vId}/restaurer/`),
  supprimerVersion: (docId, vId)    => api.delete(`/documents/${docId}/versions/${vId}/`),

  // Téléchargement / prévisualisation sécurisés
  telecharger: async (id, nomFichier) => {
    const token = localStorage.getItem('access_token')
    const res   = await fetch(`/api/documents/${id}/telecharger/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Erreur téléchargement')
    const blob = await res.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: nomFichier })
    a.click()
    window.URL.revokeObjectURL(url)
  },

  previsualiser: async (id) => {
    const token = localStorage.getItem('access_token')
    const res   = await fetch(`/api/documents/${id}/previsualiser/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Erreur prévisualisation')
    const blob = await res.blob()
    return window.URL.createObjectURL(blob)
  },
}

// ── Journal ───────────────────────────────────────────────────────────────────
export const journalAPI = {
  list: (params) => api.get('/journal/', { params }),

  exportCSV: async (params = {}) => {
    const token = localStorage.getItem('access_token')
    const qs    = new URLSearchParams(params).toString()
    const res   = await fetch(`/api/journal/export/csv/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Erreur export journal CSV')
    const blob = await res.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `journal_${new Date().toISOString().slice(0,10)}.csv`
    })
    a.click()
    window.URL.revokeObjectURL(url)
  },

  exportPDF: async (params = {}) => {
    const token = localStorage.getItem('access_token')
    const qs    = new URLSearchParams(params).toString()
    const res   = await fetch(`/api/journal/export/pdf/?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Erreur export journal PDF')
    const blob = await res.blob()
    const url  = window.URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `journal_${new Date().toISOString().slice(0,10)}.pdf`
    })
    a.click()
    window.URL.revokeObjectURL(url)
  },
}

export default api
