from rest_framework import serializers
from .models import Entreprise, Departement, Service, RoleDepartementService


class ServiceSerializer(serializers.ModelSerializer):
    departement_nom = serializers.CharField(source='departement.nom', read_only=True)

    class Meta:
        model  = Service
        fields = ['id', 'nom', 'code', 'departement', 'departement_nom']


class DepartementSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model  = Departement
        fields = ['id', 'nom', 'code', 'entreprise', 'services']


class EntrepriseSerializer(serializers.ModelSerializer):
    departements = DepartementSerializer(many=True, read_only=True)

    class Meta:
        model  = Entreprise
        fields = ['id', 'nom', 'adresse', 'logo', 'departements']


class RoleDepartementServiceSerializer(serializers.ModelSerializer):
    collaborateur_nom = serializers.CharField(source='collaborateur.full_name', read_only=True)
    departement_nom   = serializers.CharField(source='departement.nom', read_only=True)
    service_nom       = serializers.CharField(source='service.nom',     read_only=True)
    droit_label       = serializers.CharField(source='get_droit_display', read_only=True)

    class Meta:
        model  = RoleDepartementService
        fields = [
            'id', 'collaborateur', 'collaborateur_nom',
            'departement', 'departement_nom',
            'service', 'service_nom',
            'droit', 'droit_label',
        ]
