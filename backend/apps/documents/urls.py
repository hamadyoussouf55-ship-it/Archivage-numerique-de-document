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
]
