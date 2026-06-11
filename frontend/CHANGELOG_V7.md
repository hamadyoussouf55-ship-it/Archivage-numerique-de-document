# SYGALIN SAS — Changelog v7

## Versionnement des documents

### Backend

**Nouveau modèle** : `VersionDocument`
- Chaque document peut avoir N versions
- Chaque version conserve : fichier, numéro, commentaire, auteur, date, flag `est_courante`
- La version courante est automatiquement mise à jour lors de l'ajout

**Nouveaux endpoints** :
| Méthode | URL | Description |
|---------|-----|-------------|
| GET     | `/api/documents/<id>/versions/`               | Liste toutes les versions |
| POST    | `/api/documents/<id>/versions/`               | Ajouter une nouvelle version |
| GET     | `/api/documents/<id>/versions/<v_id>/`        | Détail d'une version |
| POST    | `/api/documents/<id>/versions/<v_id>/restaurer/` | Restaurer une version |
| DELETE  | `/api/documents/<id>/versions/<v_id>/`        | Supprimer une version (ADMIN) |

**Règles métier** :
- ADMIN et ARCHIVISTE peuvent ajouter/restaurer des versions
- Seul un ADMIN peut supprimer une version
- La version courante ne peut pas être supprimée
- Lors du premier ajout de version, la v1 est créée automatiquement à partir du fichier actuel
- Chaque ajout enregistre une action dans le journal de traçabilité

**9 nouveaux tests** dans `apps/documents/tests.py`

### Frontend

**`DocumentDetailPage.jsx`** — refactorisée avec onglets :
- Onglet **Informations** : identique à l'ancienne page
- Onglet **Versions** : liste chronologique des versions avec :
  - Badge version (v1, v2, …)
  - Badge "Courante" sur la version active
  - Commentaire de modification
  - Auteur + date
  - Bouton **Restaurer** (ADMIN/ARCHIVISTE, versions non courantes)
  - Bouton **Supprimer** (ADMIN uniquement, versions non courantes)
  - Formulaire upload nouvelle version avec commentaire

**`api.js`** — 4 nouvelles méthodes :
- `getVersions(docId)`
- `ajouterVersion(docId, formData)`
- `restaurerVersion(docId, vId)`
- `supprimerVersion(docId, vId)`

## Migration

```bash
python manage.py makemigrations documents
python manage.py migrate
python manage.py test apps.documents --verbosity=2
```
