from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Collaborateur


class CollaborateurSerializer(serializers.ModelSerializer):
    full_name       = serializers.ReadOnlyField()
    departement_nom = serializers.CharField(source='departement.nom', read_only=True)
    service_nom     = serializers.CharField(source='service.nom',     read_only=True)
    entreprise_nom  = serializers.CharField(source='entreprise.nom',  read_only=True)

    class Meta:
        model  = Collaborateur
        fields = [
            'id', 'nom', 'prenom', 'full_name', 'email', 'matricule', 'role',
            'entreprise', 'entreprise_nom',
            'departement', 'departement_nom',
            'service', 'service_nom',
            'is_active', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']


class CollaborateurCreateSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = Collaborateur
        fields = ['nom', 'prenom', 'email', 'matricule', 'role',
                  'entreprise', 'departement', 'service', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data.pop('password2'):
            raise serializers.ValidationError({"password2": "Les mots de passe ne correspondent pas."})
        return data

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Collaborateur(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CollaborateurUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Collaborateur
        fields = ['nom', 'prenom', 'email', 'matricule', 'role',
                  'entreprise', 'departement', 'service', 'is_active']


class SygalinTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['nom']       = user.nom
        token['prenom']    = user.prenom
        token['email']     = user.email
        token['matricule'] = user.matricule
        token['role']      = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = CollaborateurSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError("Ancien mot de passe incorrect.")
        return value
