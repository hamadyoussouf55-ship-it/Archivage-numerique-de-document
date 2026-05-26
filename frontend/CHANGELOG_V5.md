# SYGALIN SAS — Changelog v5

## Nouvelles fonctionnalités

### 1. Export CSV & PDF
- `GET /api/documents/export/csv/` — Export CSV des documents (filtrable par statut, type, search)
- `GET /api/documents/export/pdf/` — Export PDF des documents (tableau mis en page)
- `GET /api/journal/export/csv/`   — Export CSV du journal (filtrable par type, auteur, dates)
- `GET /api/journal/export/pdf/`   — Export PDF du journal (limité à 500 entrées)
- Tous les exports respectent les permissions (ADMIN/ARCHIVISTE pour docs, ADMIN pour journal)

### 2. Statistiques par période
- `GET /api/documents/stats/periode/` — Statistiques avancées
  - Paramètres : `debut`, `fin` (ISO 8601), `granularite` (jour|semaine|mois)
  - Retourne : évolution docs, évolution actions, par type, par statut, par type d'action, top créateurs

### 3. Tests unitaires
- `apps/accounts/tests.py`  — Auth, permissions, modèles Collaborateur
- `apps/documents/tests.py` — CRUD docs, codification, permissions, exports, stats, recherche
- `apps/armoires/tests.py`  — CRUD armoires et rayons, permissions
- `apps/journal/tests.py`   — Modèle journal, API, export, filtres

## Installation

```bash
pip install -r requirements.txt      # Ajoute reportlab pour les PDF
python manage.py migrate
```

## Lancer les tests

```bash
# Windows
run_tests.bat

# Linux / Mac
./run_tests.sh

# Ou directement :
python manage.py test apps.accounts apps.documents apps.armoires apps.journal --verbosity=2
```

## Dépendance ajoutée
- `reportlab >= 4.0` — Génération PDF côté serveur
