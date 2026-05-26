import uuid
from django.db import models


class Entreprise(models.Model):
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom     = models.CharField(max_length=200)
    adresse = models.TextField(blank=True)
    logo    = models.ImageField(upload_to='logos/', null=True, blank=True)

    class Meta:
        verbose_name = "Entreprise"

    def __str__(self):
        return self.nom


class Departement(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entreprise = models.ForeignKey(Entreprise, on_delete=models.CASCADE, related_name='departements')
    nom        = models.CharField(max_length=100)
    code       = models.CharField(max_length=20, unique=True)

    class Meta:
        verbose_name = "Departement"
        ordering     = ['nom']

    def __str__(self):
        return f"{self.code} - {self.nom}"


class Service(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    departement = models.ForeignKey(Departement, on_delete=models.CASCADE, related_name='services')
    nom         = models.CharField(max_length=100)
    code        = models.CharField(max_length=20, unique=True)

    class Meta:
        verbose_name = "Service"
        ordering     = ['nom']

    def __str__(self):
        return f"{self.code} - {self.nom}"


class RoleDepartementService(models.Model):
    DROIT_CHOICES = [
        ('LECTURE',  'Lecture seule'),
        ('ECRITURE', 'Lecture et ecriture'),
        ('ADMIN',    'Administration complete'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    collaborateur = models.ForeignKey(
        'accounts.Collaborateur', on_delete=models.CASCADE,
        related_name='roles_dept_service'
    )
    departement   = models.ForeignKey(
        Departement, on_delete=models.CASCADE,
        related_name='roles', null=True, blank=True
    )
    service       = models.ForeignKey(
        Service, on_delete=models.CASCADE,
        related_name='roles', null=True, blank=True
    )
    droit         = models.CharField(max_length=20, choices=DROIT_CHOICES, default='LECTURE')

    class Meta:
        verbose_name    = "Role Departement/Service"
        unique_together = [['collaborateur', 'departement', 'service']]

    def __str__(self):
        scope = self.service or self.departement
        return f"{self.collaborateur} - {scope} ({self.droit})"
