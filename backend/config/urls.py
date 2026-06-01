from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

schema_view = get_schema_view(
    openapi.Info(
        title="SYGALIN SAS — API Archivage Numérique",
        default_version='v1',
        description="""
## Système d'Archivage Numérique — SYGALIN SAS

API REST complète pour la gestion des documents archivés.

### Authentification
Toutes les routes (sauf `/api/auth/login/`) nécessitent un token **JWT Bearer**.

1. Appeler `POST /api/auth/login/` avec `matricule` + `password`
2. Récupérer le champ `access` dans la réponse
3. L'injecter dans le header : `Authorization: Bearer <token>`

### Rôles
| Rôle | Droits |
|------|--------|
| **ADMIN** | Accès total (CRUD + journal + export + administration) |
| **ARCHIVISTE** | Créer / modifier / supprimer des documents |
| **CONSULTANT** | Lecture, téléchargement, prévisualisation uniquement |

### Codification automatique
Chaque document reçoit un code unique : `SYG-[TYPE]-[ARMOIRE]-[RAYON]-[ANNEE]-[XXXX]`
        """,
        contact=openapi.Contact(email="admin@sygalin.com"),
        license=openapi.License(name="Projet académique — DUT Génie Informatique"),
    ),
    public=False,
    permission_classes=[permissions.IsAuthenticated],
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/',               include('apps.accounts.urls')),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Métier
    path('api/entreprise/', include('apps.entreprise.urls')),
    path('api/armoires/',   include('apps.armoires.urls')),
    path('api/documents/',  include('apps.documents.urls')),
    path('api/journal/',    include('apps.journal.urls')),

    # Documentation API
    path('api/docs/',  schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc',   cache_timeout=0), name='schema-redoc'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
