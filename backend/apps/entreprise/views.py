from rest_framework import generics, permissions
from .models import Entreprise, Departement, Service, RoleDepartementService
from .serializers import (EntrepriseSerializer, DepartementSerializer,
                           ServiceSerializer, RoleDepartementServiceSerializer)
from apps.accounts.permissions import IsAdmin


class EntrepriseListCreateView(generics.ListCreateAPIView):
    queryset         = Entreprise.objects.all()
    serializer_class = EntrepriseSerializer
    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

class EntrepriseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Entreprise.objects.all()
    serializer_class = EntrepriseSerializer
    permission_classes = [IsAdmin]

class DepartementListCreateView(generics.ListCreateAPIView):
    queryset         = Departement.objects.select_related('entreprise').all()
    serializer_class = DepartementSerializer
    filterset_fields = ['entreprise']
    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

class DepartementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Departement.objects.all()
    serializer_class = DepartementSerializer
    permission_classes = [IsAdmin]

class ServiceListCreateView(generics.ListCreateAPIView):
    queryset         = Service.objects.select_related('departement').all()
    serializer_class = ServiceSerializer
    filterset_fields = ['departement']
    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdmin]

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
