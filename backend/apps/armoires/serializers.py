from rest_framework import serializers
from .models import Armoire, Rayon


class RayonSerializer(serializers.ModelSerializer):
    nombre_documents = serializers.ReadOnlyField()
    armoire_nom      = serializers.CharField(source='armoire.nom',  read_only=True)
    armoire_code     = serializers.CharField(source='armoire.code', read_only=True)

    class Meta:
        model  = Rayon
        fields = ['id', 'nom', 'code', 'position', 'armoire',
                  'armoire_nom', 'armoire_code', 'nombre_documents', 'date_creation']
        read_only_fields = ['id', 'date_creation']


class ArmoireListSerializer(serializers.ModelSerializer):
    nombre_rayons    = serializers.ReadOnlyField()
    nombre_documents = serializers.ReadOnlyField()

    class Meta:
        model  = Armoire
        fields = ['id', 'nom', 'code', 'description', 'nombre_rayons', 'nombre_documents', 'date_creation']


class ArmoireSerializer(serializers.ModelSerializer):
    rayons           = RayonSerializer(many=True, read_only=True)
    nombre_rayons    = serializers.ReadOnlyField()
    nombre_documents = serializers.ReadOnlyField()

    class Meta:
        model  = Armoire
        fields = ['id', 'nom', 'code', 'description',
                  'nombre_rayons', 'nombre_documents', 'rayons', 'date_creation']
        read_only_fields = ['id', 'date_creation']
