from rest_framework import generics, permissions
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Armoire, Rayon
from .serializers import ArmoireSerializer, ArmoireListSerializer, RayonSerializer
from apps.accounts.permissions import IsAdmin, IsAdminOrArchiviste


class ArmoireListCreateView(generics.ListCreateAPIView):
    queryset        = Armoire.objects.prefetch_related('rayons').all()
    filter_backends = [SearchFilter]
    search_fields   = ['nom', 'code']

    def get_serializer_class(self):
        return ArmoireListSerializer if self.request.method == 'GET' else ArmoireSerializer

    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]


class ArmoireDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Armoire.objects.prefetch_related('rayons').all()
    serializer_class = ArmoireSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()] if self.request.method == 'GET' else [IsAdmin()]


class RayonParArmoireView(generics.ListCreateAPIView):
    """
    GET  /api/armoires/<pk>/rayons/  → liste les rayons d'une armoire
    POST /api/armoires/<pk>/rayons/  → crée un rayon dans cette armoire
    """
    serializer_class = RayonSerializer

    def get_queryset(self):
        return Rayon.objects.filter(armoire=self.kwargs['pk']).select_related('armoire')

    def get_permissions(self):
        return [IsAdminOrArchiviste()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        armoire = Armoire.objects.get(pk=self.kwargs['pk'])
        serializer.save(armoire=armoire)


class RayonListCreateView(generics.ListCreateAPIView):
    queryset         = Rayon.objects.select_related('armoire').all()
    serializer_class = RayonSerializer
    filter_backends  = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['armoire']
    search_fields    = ['nom', 'code']

    def get_permissions(self):
        return [IsAdminOrArchiviste()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]


class RayonDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Rayon.objects.select_related('armoire').all()
    serializer_class = RayonSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()] if self.request.method == 'GET' else [IsAdminOrArchiviste()]
