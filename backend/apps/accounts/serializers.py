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
            'is_principal',
            'entreprise', 'entreprise_nom',
            'departement', 'departement_nom',
            'service', 'service_nom',
            'is_active', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined', 'is_principal']


class CollaborateurCreateSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = Collaborateur
        fields = ['nom', 'prenom', 'email', 'matricule', 'role',
                  'entreprise', 'departement', 'service', 'password', 'password2']

    def validate_role(self, value):
        request = self.context.get('request')
        if request and value == 'ADMIN' and not request.user.is_principal:
            raise serializers.ValidationError("Seul l'administrateur principal peut créer des administrateurs.")
        return value

    def validate_departement(self, value):
        request = self.context.get('request')
        if not request:
            return value
        # Chef de département : département obligatoire et forcé au sien
        if request.user.role == 'ADMIN' and not request.user.is_principal:
            if not request.user.departement:
                raise serializers.ValidationError("Vous n'avez pas de département rattaché.")
            return request.user.departement.id
        # Principal admin : libre choix, mais requis pour les non-principaux
        role = self.initial_data.get('role')
        if role and role != 'ADMIN' and not value:
            raise serializers.ValidationError("Le département est obligatoire.")
        return value

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

    def validate_role(self, value):
        request = self.context.get('request')
        if request and value == 'ADMIN' and not request.user.is_principal:
            raise serializers.ValidationError("Seul l'administrateur principal peut attribuer le rôle ADMIN.")
        return value

    def validate_is_active(self, value):
        instance = self.instance
        if instance and instance.is_principal and value is False:
            raise serializers.ValidationError("Impossible de désactiver l'administrateur principal.")
        return value

    def validate_departement(self, value):
        request = self.context.get('request')
        if not request:
            return value
        # Chef de département : ne peut changer le département d'un collaborateur
        if request.user.role == 'ADMIN' and not request.user.is_principal:
            if not request.user.departement:
                raise serializers.ValidationError("Vous n'avez pas de département rattaché.")
            instance = self.instance
            if instance and instance.departement_id != request.user.departement_id:
                raise serializers.ValidationError("Vous ne pouvez modifier que les collaborateurs de votre département.")
            return request.user.departement.id
        return value


class SygalinTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['nom']       = user.nom
        token['prenom']    = user.prenom
        token['email']     = user.email
        token['matricule'] = user.matricule
        token['role']      = user.role
        token['is_principal'] = user.is_principal
        return token

    def validate(self, attrs):
        email    = attrs.get('email')
        password = attrs.get('password')

        try:
            user = Collaborateur.objects.get(email=email)
        except Collaborateur.DoesNotExist:
            raise serializers.ValidationError("Adresse email incorrecte")

        if not user.check_password(password):
            raise serializers.ValidationError("Mot de passe incorrect")

        if not user.is_active:
            raise serializers.ValidationError("Compte désactivé")

        refresh = self.get_token(user)
        return {
            'refresh': str(refresh),
            'access':  str(refresh.access_token),
            'user':    CollaborateurSerializer(user).data,
        }


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError("Ancien mot de passe incorrect.")
        return value
