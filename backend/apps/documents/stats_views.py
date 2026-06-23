"""
Vues pour les statistiques avancées par période.
"""
from datetime import date, timedelta
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from .models import Document
from apps.journal.models import JournalAction
from apps.armoires.models import Armoire


class StatsParPeriodeView(APIView):
    """
    Statistiques avancées avec filtre par période.
    GET /api/documents/stats/periode/?debut=2024-01-01&fin=2024-12-31&granularite=mois
    granularite: jour | semaine | mois (défaut: mois)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Paramètres de période
        debut_str = request.query_params.get('debut')
        fin_str   = request.query_params.get('fin')
        granularite = request.query_params.get('granularite', 'mois')

        # Valeurs par défaut : 12 derniers mois
        fin   = date.today()
        debut = fin.replace(day=1) - timedelta(days=365)

        try:
            if debut_str:
                debut = date.fromisoformat(debut_str)
            if fin_str:
                fin = date.fromisoformat(fin_str)
        except ValueError:
            pass

        # --- Documents créés par période ---
        qs_docs = Document.objects.filter(
            date_numerisation__date__gte=debut,
            date_numerisation__date__lte=fin,
        ).exclude(statut='SUPPRIME')

        # Filtre par département pour les utilisateurs non-principaux
        user = request.user
        if not user.is_principal and user.departement:
            qs_docs = qs_docs.filter(rayon__armoire__service__departement=user.departement)

        trunc_fn = {'jour': TruncDay, 'semaine': TruncWeek, 'mois': TruncMonth}.get(granularite, TruncMonth)

        docs_par_periode = list(
            qs_docs
            .annotate(periode=trunc_fn('date_numerisation'))
            .values('periode')
            .annotate(count=Count('id'))
            .order_by('periode')
        )

        # --- Actions journal par période ---
        qs_journal = JournalAction.objects.filter(
            date_action__date__gte=debut,
            date_action__date__lte=fin,
        )

        actions_par_periode = list(
            qs_journal
            .annotate(periode=trunc_fn('date_action'))
            .values('periode')
            .annotate(count=Count('id'))
            .order_by('periode')
        )

        # --- Documents par type sur la période ---
        par_type = list(
            qs_docs
            .values('type_doc')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # --- Documents par statut sur la période ---
        par_statut = list(
            qs_docs
            .values('statut')
            .annotate(count=Count('id'))
        )

        # --- Actions par type sur la période ---
        par_type_action = list(
            qs_journal
            .values('type_action')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # --- Top créateurs sur la période ---
        top_createurs = list(
            qs_docs
            .exclude(createur=None)
            .values('createur__prenom', 'createur__nom', 'createur__matricule')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        # --- Taux d'archivage ---
        total    = qs_docs.count()
        archives = qs_docs.filter(statut='ARCHIVE').count()
        actifs   = qs_docs.filter(statut='ACTIF').count()

        # Formatage des dates
        def fmt_date(d):
            if d is None:
                return None
            return d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d)

        docs_par_periode_fmt   = [{'periode': fmt_date(x['periode']), 'count': x['count']} for x in docs_par_periode]
        actions_par_periode_fmt = [{'periode': fmt_date(x['periode']), 'count': x['count']} for x in actions_par_periode]

        return Response({
            'periode': {
                'debut':       debut.isoformat(),
                'fin':         fin.isoformat(),
                'granularite': granularite,
            },
            'totaux': {
                'documents': total,
                'actifs':    actifs,
                'archives':  archives,
                'actions':   qs_journal.count(),
                'taux_archivage': round(archives / total * 100, 1) if total > 0 else 0,
            },
            'docs_par_periode':    docs_par_periode_fmt,
            'actions_par_periode': actions_par_periode_fmt,
            'par_type':            par_type,
            'par_statut':          par_statut,
            'par_type_action':     par_type_action,
            'top_createurs':       top_createurs,
        })
