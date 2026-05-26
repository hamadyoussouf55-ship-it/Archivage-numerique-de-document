from rest_framework.views import APIView
from rest_framework import permissions
from apps.accounts.permissions import IsAdmin
from .models import JournalAction


class JournalExportCSVView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from apps.documents.exports import export_journal_csv
        qs = JournalAction.objects.select_related('auteur', 'document').all()
        type_action = request.query_params.get('type_action')
        auteur      = request.query_params.get('auteur')
        date_debut  = request.query_params.get('date_debut')
        date_fin    = request.query_params.get('date_fin')
        search      = request.query_params.get('search')
        if type_action:
            qs = qs.filter(type_action=type_action)
        if auteur:
            qs = qs.filter(auteur__id=auteur)
        if date_debut:
            qs = qs.filter(date_action__date__gte=date_debut)
        if date_fin:
            qs = qs.filter(date_action__date__lte=date_fin)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(details__icontains=search) |
                Q(auteur__nom__icontains=search) |
                Q(auteur__prenom__icontains=search)
            )
        return export_journal_csv(qs)


class JournalExportPDFView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from apps.documents.exports import export_journal_pdf
        qs = JournalAction.objects.select_related('auteur', 'document').all()
        type_action = request.query_params.get('type_action')
        auteur      = request.query_params.get('auteur')
        date_debut  = request.query_params.get('date_debut')
        date_fin    = request.query_params.get('date_fin')
        if type_action:
            qs = qs.filter(type_action=type_action)
        if auteur:
            qs = qs.filter(auteur__id=auteur)
        if date_debut:
            qs = qs.filter(date_action__date__gte=date_debut)
        if date_fin:
            qs = qs.filter(date_action__date__lte=date_fin)
        return export_journal_pdf(qs[:500])  # limiter à 500 lignes pour le PDF
