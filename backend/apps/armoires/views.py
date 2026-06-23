from rest_framework import generics, permissions
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Armoire, Rayon
from .serializers import ArmoireSerializer, ArmoireListSerializer, RayonSerializer
from apps.accounts.permissions import IsAdmin, IsAdminOrArchiviste


class ArmoireListCreateView(generics.ListCreateAPIView):
    queryset        = Armoire.objects.select_related('service', 'service__departement').prefetch_related('rayons').all()
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['service', 'service__departement']
    search_fields   = ['nom', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_principal and user.departement:
            qs = qs.filter(service__departement=user.departement)
        return qs

    def get_serializer_class(self):
        return ArmoireListSerializer if self.request.method == 'GET' else ArmoireSerializer

    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]


class ArmoireDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Armoire.objects.select_related('service', 'service__departement').prefetch_related('rayons').all()
    serializer_class = ArmoireSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_principal and user.departement:
            qs = qs.filter(service__departement=user.departement)
        return qs

    def get_permissions(self):
        return [permissions.IsAuthenticated()] if self.request.method == 'GET' else [IsAdmin()]

    def perform_destroy(self, instance):
        if instance.rayons.exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Supprimez d'abord les rayons de cette armoire.")
        instance.delete()


class RayonParArmoireView(generics.ListCreateAPIView):
    """
    GET  /api/armoires/<pk>/rayons/  → liste les rayons d'une armoire
    POST /api/armoires/<pk>/rayons/  → crée un rayon dans cette armoire
    """
    serializer_class = RayonSerializer

    def get_queryset(self):
        return Rayon.objects.filter(armoire=self.kwargs['pk']).select_related('armoire', 'armoire__service', 'armoire__service__departement')

    def get_permissions(self):
        return [IsAdminOrArchiviste()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        armoire = Armoire.objects.get(pk=self.kwargs['pk'])
        serializer.save(armoire=armoire)


class RayonListCreateView(generics.ListCreateAPIView):
    queryset         = Rayon.objects.select_related('armoire', 'armoire__service', 'armoire__service__departement').all()
    serializer_class = RayonSerializer
    filter_backends  = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['armoire', 'armoire__service', 'armoire__service__departement']
    search_fields    = ['nom', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_principal and user.departement:
            qs = qs.filter(armoire__service__departement=user.departement)
        return qs

    def get_permissions(self):
        return [IsAdminOrArchiviste()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]


class RayonDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Rayon.objects.select_related('armoire', 'armoire__service', 'armoire__service__departement').all()
    serializer_class = RayonSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_principal and user.departement:
            qs = qs.filter(armoire__service__departement=user.departement)
        return qs

    def get_permissions(self):
        return [permissions.IsAuthenticated()] if self.request.method == 'GET' else [IsAdminOrArchiviste()]

    def perform_destroy(self, instance):
        if instance.documents.exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Supprimez d'abord les documents de ce rayon.")
        instance.delete()
