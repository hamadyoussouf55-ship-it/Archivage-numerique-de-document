from rest_framework import generics, permissions
from django.db.models import Q
from .models import Entreprise, Departement, Service, RoleDepartementService
from .serializers import (EntrepriseSerializer, DepartementSerializer,
                           ServiceSerializer, RoleDepartementServiceSerializer)
from apps.accounts.permissions import IsAdmin, IsPrincipalAdmin


class EntrepriseListCreateView(generics.ListCreateAPIView):
    queryset         = Entreprise.objects.all()
    serializer_class = EntrepriseSerializer
    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

class EntrepriseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Entreprise.objects.all()
    serializer_class = EntrepriseSerializer
    permission_classes = [IsAdmin]


def _filtrer_par_departement(qs, user):
    if not user.is_principal and user.departement:
        return qs.filter(departement=user.departement)
    return qs


class DepartementListCreateView(generics.ListCreateAPIView):
    queryset         = Departement.objects.select_related('entreprise').all()
    serializer_class = DepartementSerializer
    filterset_fields = ['entreprise']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_principal and user.departement:
            qs = qs.filter(id=user.departement.id)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsPrincipalAdmin()]
        return [permissions.IsAuthenticated()]

class DepartementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Departement.objects.all()
    serializer_class = DepartementSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_principal and user.departement:
            qs = qs.filter(id=user.departement.id)
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsPrincipalAdmin()]

    def perform_destroy(self, instance):
        if instance.services.exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Supprimez d'abord les services de ce département.")
        instance.delete()

class ServiceListCreateView(generics.ListCreateAPIView):
    queryset         = Service.objects.select_related('departement').all()
    serializer_class = ServiceSerializer
    filterset_fields = ['departement']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_principal and user.departement:
            qs = qs.filter(departement=user.departement)
        return qs

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Service.objects.all()
    serializer_class = ServiceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_principal and user.departement:
            qs = qs.filter(departement=user.departement)
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def perform_destroy(self, instance):
        if instance.armoires.exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Supprimez d'abord les armoires de ce service.")
        instance.delete()

class RoleListCreateView(generics.ListCreateAPIView):
    queryset         = RoleDepartementService.objects.select_related('collaborateur','departement','service').all()
    serializer_class = RoleDepartementServiceSerializer
    filterset_fields = ['collaborateur', 'departement', 'service']
    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = RoleDepartementService.objects.all()
    serializer_class = RoleDepartementServiceSerializer
    permission_classes = [IsAdmin]
