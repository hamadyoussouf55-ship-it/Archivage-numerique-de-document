from django.urls import path
from . import views
from .stats_views import StatsParPeriodeView

urlpatterns = [
    path('',                              views.DocumentListCreateView.as_view(),  name='document-list'),
    path('stats/',                        views.DashboardStatsView.as_view(),      name='dashboard-stats'),
    path('stats/periode/',                StatsParPeriodeView.as_view(),           name='stats-periode'),
    path('export/csv/',                   views.DocumentExportCSVView.as_view(),   name='document-export-csv'),
    path('export/pdf/',                   views.DocumentExportPDFView.as_view(),   name='document-export-pdf'),
    path('<uuid:pk>/',                    views.DocumentDetailView.as_view(),      name='document-detail'),
    path('<uuid:pk>/telecharger/',        views.DocumentDownloadView.as_view(),    name='document-download'),
    path('<uuid:pk>/previsualiser/',      views.DocumentPreviewView.as_view(),     name='document-preview'),
    path('<uuid:pk>/deplacer/',           views.DocumentDeplacerView.as_view(),    name='document-deplacer'),
    path('<uuid:pk>/metadata/',           views.MetadataUpdateView.as_view(),      name='document-metadata'),

    # Corbeille
    path('corbeille/',                    views.DocumentCorbeilleListView.as_view(), name='document-corbeille-list'),
    path('<uuid:pk>/restaurer/',          views.DocumentRestaurerView.as_view(),     name='document-restaurer'),
    path('<uuid:pk>/purger/',             views.DocumentPurgerView.as_view(),        name='document-purger'),

    # Versionnage
    path('<uuid:pk>/versions/',           views.DocumentVersionListView.as_view(),   name='document-versions'),
    path('<uuid:pk>/versions/upload/',    views.DocumentVersionUploadView.as_view(),  name='document-version-upload'),
    path('versions/<uuid:version_pk>/telecharger/', views.DocumentVersionDownloadView.as_view(), name='document-version-download'),
    path('versions/<uuid:version_pk>/restaurer/',   views.DocumentVersionRestoreView.as_view(),   name='document-version-restore'),

    # Partage externe public
    path('<uuid:pk>/partager/',           views.DocumentShareCreateView.as_view(),   name='document-share-create'),
    path('partager/<uuid:share_uuid>/',   views.DocumentSharePublicDetailView.as_view(), name='document-share-public-detail'),
    path('partager/<uuid:share_uuid>/download/', views.DocumentSharePublicDownloadView.as_view(), name='document-share-public-download'),
]
