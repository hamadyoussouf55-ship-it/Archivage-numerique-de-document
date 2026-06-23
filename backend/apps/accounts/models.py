import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class CollaborateurManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        return self.create_user(email, password, **extra_fields)


class Collaborateur(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('ADMIN',      'Administrateur'),
        ('ARCHIVISTE', 'Archiviste'),
        ('CONSULTANT', 'Consultant'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom         = models.CharField(max_length=100)
    prenom      = models.CharField(max_length=100)
    email       = models.EmailField(unique=True)
    matricule   = models.CharField(max_length=50, unique=True)
    role        = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CONSULTANT')
    entreprise  = models.ForeignKey(
        'entreprise.Entreprise', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='collaborateurs'
    )
    departement = models.ForeignKey(
        'entreprise.Departement', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='collaborateurs'
    )
    service     = models.ForeignKey(
        'entreprise.Service', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='collaborateurs'
    )
    is_active   = models.BooleanField(default=True)
    is_principal = models.BooleanField(default=False)
    is_staff    = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom', 'matricule']

    objects = CollaborateurManager()

    class Meta:
        verbose_name = "Collaborateur"
        ordering     = ['nom', 'prenom']

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.matricule})"

    @property
    def full_name(self):
        return f"{self.prenom} {self.nom}"
