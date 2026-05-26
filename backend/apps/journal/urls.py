from django.urls import path
from . import views
from .export_views import JournalExportCSVView, JournalExportPDFView

urlpatterns = [
    path('',           views.JournalListView.as_view(),    name='journal-list'),
    path('export/csv/', JournalExportCSVView.as_view(),    name='journal-export-csv'),
    path('export/pdf/', JournalExportPDFView.as_view(),    name='journal-export-pdf'),
]
