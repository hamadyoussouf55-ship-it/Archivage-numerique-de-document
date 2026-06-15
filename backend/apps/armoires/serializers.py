from rest_framework import serializers
from .models import Armoire, Rayon


class RayonSerializer(serializers.ModelSerializer):
    nombre_documents = serializers.ReadOnlyField()
    armoire_nom      = serializers.CharField(source='armoire.nom',  read_only=True)
    armoire_code     = serializers.CharField(source='armoire.code', read_only=True)
    service_nom      = serializers.CharField(source='armoire.service.nom', read_only=True)
    service_code     = serializers.CharField(source='armoire.service.code', read_only=True)
    departement_nom  = serializers.CharField(source='armoire.service.departement.nom', read_only=True)
    departement_code = serializers.CharField(source='armoire.service.departement.code', read_only=True)
    chemin_complet   = serializers.ReadOnlyField()

    class Meta:
        model  = Rayon
        fields = ['id', 'nom', 'code', 'position', 'armoire',
                  'armoire_nom', 'armoire_code', 
                  'service_nom', 'service_code',
                  'departement_nom', 'departement_code',
                  'nombre_documents', 'date_creation', 'chemin_complet']
        read_only_fields = ['id', 'date_creation']


class ArmoireListSerializer(serializers.ModelSerializer):
    nombre_rayons    = serializers.ReadOnlyField()
    nombre_documents = serializers.ReadOnlyField()
    service_nom      = serializers.CharField(source='service.nom', read_only=True)
    service_code     = serializers.CharField(source='service.code', read_only=True)
    departement_nom  = serializers.CharField(source='service.departement.nom', read_only=True)
    departement_code = serializers.CharField(source='service.departement.code', read_only=True)
    chemin_complet   = serializers.ReadOnlyField()

    class Meta:
        model  = Armoire
        fields = ['id', 'nom', 'code', 'description', 'service', 'service_nom', 'service_code',
                  'departement_nom', 'departement_code',
                  'nombre_rayons', 'nombre_documents', 'date_creation', 'chemin_complet']


class ArmoireSerializer(serializers.ModelSerializer):
    rayons           = RayonSerializer(many=True, read_only=True)
    nombre_rayons    = serializers.ReadOnlyField()
    nombre_documents = serializers.ReadOnlyField()
    service_nom      = serializers.CharField(source='service.nom', read_only=True)
    service_code     = serializers.CharField(source='service.code', read_only=True)
    departement_nom  = serializers.CharField(source='service.departement.nom', read_only=True)
    departement_code = serializers.CharField(source='service.departement.code', read_only=True)
    chemin_complet   = serializers.ReadOnlyField()

    class Meta:
        model  = Armoire
        fields = ['id', 'nom', 'code', 'description', 'service', 'service_nom', 'service_code',
                  'departement_nom', 'departement_code',
                  'nombre_rayons', 'nombre_documents', 'rayons', 'date_creation', 'chemin_complet']
        read_only_fields = ['id', 'date_creation']
