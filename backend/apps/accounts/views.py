from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Collaborateur
from .serializers import (
    CollaborateurSerializer, CollaborateurCreateSerializer,
    CollaborateurUpdateSerializer, SygalinTokenSerializer,
    ChangePasswordSerializer,
)
from .permissions import IsAdmin


class LoginView(TokenObtainPairView):
    serializer_class   = SygalinTokenSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data["refresh"])
            token.blacklist()
            return Response({"detail": "Deconnexion reussie."})
        except Exception:
            return Response({"detail": "Token invalide."}, status=400)


class MeView(APIView):
    def get(self, request):
        return Response(CollaborateurSerializer(request.user).data)


class ChangePasswordView(APIView):
    def post(self, request):
        s = ChangePasswordSerializer(data=request.data, context={'request': request})
        if s.is_valid():
            request.user.set_password(s.validated_data['new_password'])
            request.user.save()
            return Response({"detail": "Mot de passe mis a jour."})
        return Response(s.errors, status=400)


class CollaborateurListCreateView(generics.ListCreateAPIView):
    queryset = Collaborateur.objects.select_related('entreprise', 'departement', 'service').all()
    filter_backends  = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['role', 'is_active', 'departement', 'service']
    search_fields    = ['nom', 'prenom', 'email', 'matricule']

    def get_serializer_class(self):
        return CollaborateurCreateSerializer if self.request.method == 'POST' else CollaborateurSerializer

    def get_permissions(self):
        return [IsAdmin()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'ADMIN' and not user.is_principal:
            qs = qs.filter(departement=user.departement)
        return qs


class CollaborateurDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Collaborateur.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        return CollaborateurUpdateSerializer if self.request.method in ('PUT', 'PATCH') else CollaborateurSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'ADMIN' and not user.is_principal:
            qs = qs.filter(departement=user.departement)
        return qs

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        if instance.is_principal:
            raise PermissionDenied("Impossible de supprimer l'administrateur principal.")
        if instance.role == 'ADMIN' and not self.request.user.is_principal:
            raise PermissionDenied("Seul l'administrateur principal peut supprimer un administrateur.")
        instance.delete()
