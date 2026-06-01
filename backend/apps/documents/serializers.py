from rest_framework import serializers
from .models import Document, MetadataDocument


class MetadataDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MetadataDocument
        fields = ['id', 'auteur', 'date_emission', 'mots_cles', 'destinataire', 'description', 'texte_extrait']


class DocumentListSerializer(serializers.ModelSerializer):
    rayon_code   = serializers.CharField(source='rayon.code',         read_only=True)
    armoire_code = serializers.CharField(source='rayon.armoire.code', read_only=True)
    armoire_nom  = serializers.CharField(source='rayon.armoire.nom',  read_only=True)
    taille_lisible = serializers.ReadOnlyField()

    class Meta:
        model  = Document
        fields = ['id', 'code_unique', 'titre', 'type_doc',
                  'date_creation', 'date_numerisation', 'statut',
                  'rayon', 'rayon_code', 'armoire_code', 'armoire_nom',
                  'taille', 'taille_lisible', 'nom_fichier']


class DocumentSerializer(serializers.ModelSerializer):
    metadata       = MetadataDocumentSerializer(read_only=True)
    rayon_nom      = serializers.CharField(source='rayon.nom',          read_only=True)
    rayon_code     = serializers.CharField(source='rayon.code',         read_only=True)
    armoire_nom    = serializers.CharField(source='rayon.armoire.nom',  read_only=True)
    armoire_code   = serializers.CharField(source='rayon.armoire.code', read_only=True)
    createur_nom   = serializers.CharField(source='createur.full_name', read_only=True)
    taille_lisible = serializers.ReadOnlyField()

    class Meta:
        model  = Document
        fields = [
            'id', 'code_unique', 'titre', 'type_doc',
            'date_creation', 'date_numerisation',
            'fichier', 'nom_fichier', 'taille', 'taille_lisible',
            'statut', 'rayon', 'rayon_nom', 'rayon_code',
            'armoire_nom', 'armoire_code',
            'createur', 'createur_nom', 'metadata',
        ]
        read_only_fields = ['id', 'code_unique', 'date_numerisation',
                            'nom_fichier', 'taille', 'taille_lisible']


class DocumentCreateSerializer(serializers.ModelSerializer):
    metadata = MetadataDocumentSerializer(required=False)

    class Meta:
        model  = Document
        fields = ['titre', 'type_doc', 'date_creation', 'fichier', 'rayon', 'statut', 'metadata']

    def create(self, validated_data):
        metadata_data = validated_data.pop('metadata', None)
        request  = self.context.get('request')
        document = Document.objects.create(
            createur=request.user if request else None,
            **validated_data
        )
        MetadataDocument.objects.create(document=document, **(metadata_data or {}))
        return document

    def update(self, instance, validated_data):
        metadata_data = validated_data.pop('metadata', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if metadata_data:
            meta, _ = MetadataDocument.objects.get_or_create(document=instance)
            for attr, value in metadata_data.items():
                setattr(meta, attr, value)
            meta.save()
        return instance


from .models import DocumentVersion, DocumentShare

class DocumentVersionSerializer(serializers.ModelSerializer):
    createur_nom = serializers.CharField(source='createur.full_name', read_only=True)
    class Meta:
        model = DocumentVersion
        fields = ['id', 'numero_version', 'nom_fichier', 'taille', 'date_creation', 'createur_nom', 'fichier']
        read_only_fields = ['id', 'numero_version', 'nom_fichier', 'taille', 'date_creation', 'createur_nom']


class DocumentShareSerializer(serializers.ModelSerializer):
    document_titre = serializers.CharField(source='document.titre', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.full_name', read_only=True)
    class Meta:
        model = DocumentShare
        fields = ['id', 'cle_securite', 'date_expiration', 'nombre_telechargements', 'telechargements_max', 'cree_par_nom', 'date_creation', 'document_titre']
        read_only_fields = ['id', 'nombre_telechargements', 'cree_par_nom', 'date_creation']
        extra_kwargs = {
            'cle_securite': {'write_only': True}
        }
