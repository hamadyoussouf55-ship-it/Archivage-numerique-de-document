from rest_framework import generics
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import JournalAction
from .serializers import JournalActionSerializer
from apps.accounts.permissions import IsAdmin


class JournalListView(generics.ListAPIView):
    queryset         = JournalAction.objects.select_related('auteur', 'document').all()
    serializer_class = JournalActionSerializer
    permission_classes = [IsAdmin]
    filter_backends  = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['type_action', 'auteur']
    search_fields    = ['details', 'auteur__nom', 'auteur__prenom', 'document__code_unique']
