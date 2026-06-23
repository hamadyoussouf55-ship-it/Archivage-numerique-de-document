from rest_framework import generics
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import JournalAction
from .serializers import JournalActionSerializer
from apps.accounts.permissions import IsAdmin


class JournalListView(generics.ListAPIView):
    serializer_class = JournalActionSerializer
    permission_classes = [IsAdmin]
    filter_backends  = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['type_action', 'auteur']
    search_fields    = ['details', 'auteur__nom', 'auteur__prenom', 'document__code_unique']

    def get_queryset(self):
        user = self.request.user
        qs = JournalAction.objects.select_related('auteur', 'document').all()
        if not user.is_principal and user.departement:
            qs = qs.filter(
                Q(auteur__departement=user.departement) |
                Q(document__rayon__armoire__service__departement=user.departement)
            )
        return qs
