from rest_framework import serializers
from .models import JournalAction


class JournalActionSerializer(serializers.ModelSerializer):
    auteur_nom        = serializers.CharField(source='auteur.full_name',        read_only=True)
    document_code     = serializers.CharField(source='document.code_unique',    read_only=True)
    document_titre    = serializers.CharField(source='document.titre',          read_only=True)
    type_action_label = serializers.CharField(source='get_type_action_display', read_only=True)

    class Meta:
        model  = JournalAction
        fields = [
            'id', 'date_action', 'type_action', 'type_action_label',
            'ip_adresse', 'details',
            'auteur', 'auteur_nom',
            'document', 'document_code', 'document_titre',
        ]
        read_only_fields = fields
