# SYGALIN SAS — Changelog v6

## Correctifs et améliorations prioritaires

### 1. Validation des fichiers uploadés (Sécurité)
**Fichier** : `apps/documents/validators.py`
- Vérification de l'extension (`.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, etc.)
- Vérification du type MIME réel via les magic bytes (python-magic)
- Taille maximale configurable dans `settings.py` (`DOCUMENT_MAX_SIZE_MB = 50`)
- Rejet de tout fichier dont le contenu ne correspond pas à l'extension déclarée

**Installation requise** :
```bash
pip install python-magic
# Windows uniquement : pip install python-magic-bin
```

### 2. Refresh token automatique robuste
**Fichier** : `frontend/src/services/api.js`
- File d'attente des requêtes pendant le refresh (plus de requêtes perdues)
- Évite les boucles infinies sur les endpoints `/token/refresh/` et `/login/`
- Événement `auth:expired` dispatché sur `window` avant la redirection
- Toast de notification "Session expirée" affiché 1.5s avant le redirect

### 3. Dashboard différencié par rôle
**Fichier** : `frontend/src/pages/DashboardPage.jsx`
- **ADMIN** : KPIs complets, 2 graphiques, raccourcis vers journal/admin/stats
- **ARCHIVISTE** : KPIs activité + actions rapides (archiver, parcourir, armoires)
- **CONSULTANT** : Bandeau d'accès lecture, pie chart docs, avertissement permissions

### 4. Documentation API Swagger améliorée
**URL** : `http://localhost:8000/api/docs/`
- Description complète avec tableau des rôles et explication de la codification
- Authentification requise pour accéder à la doc (sécurité)
- Décorateurs `@swagger_auto_schema` sur les vues stats

## Installation

```bash
pip install -r requirements.txt   # ajoute python-magic
python manage.py migrate
python manage.py test --verbosity=2
```

## Accès documentation
- Swagger UI : http://localhost:8000/api/docs/
- ReDoc      : http://localhost:8000/api/redoc/
