from django.urls import path
from . import views
from .stats_views import StatsParPeriodeView
from .version_views import DocumentVersionsView, VersionDetailView

urlpatterns = [
    # Liste & création
    path('',                   views.DocumentListCreateView.as_view(), name='document-list'),

    # Stats
    path('stats/',             views.DashboardStatsView.as_view(),     name='dashboard-stats'),
    path('stats/periode/',     StatsParPeriodeView.as_view(),          name='stats-periode'),

    # Exports
    path('export/csv/',        views.DocumentExportCSVView.as_view(),  name='document-export-csv'),
    path('export/pdf/',        views.DocumentExportPDFView.as_view(),  name='document-export-pdf'),

    # Détail document
    path('<uuid:pk>/',         views.DocumentDetailView.as_view(),     name='document-detail'),
    path('<uuid:pk>/telecharger/',   views.DocumentDownloadView.as_view(),  name='document-download'),
    path('<uuid:pk>/previsualiser/', views.DocumentPreviewView.as_view(),   name='document-preview'),
    path('<uuid:pk>/deplacer/',      views.DocumentDeplacerView.as_view(),  name='document-deplacer'),
    path('<uuid:pk>/metadata/',      views.MetadataUpdateView.as_view(),    name='document-metadata'),

    # Versionnement
    path('<uuid:pk>/versions/',                           DocumentVersionsView.as_view(), name='document-versions'),
    path('<uuid:pk>/versions/<uuid:v_pk>/',               VersionDetailView.as_view(),    name='version-detail'),
    path('<uuid:pk>/versions/<uuid:v_pk>/restaurer/',     VersionDetailView.as_view(),    name='version-restaurer'),
]
