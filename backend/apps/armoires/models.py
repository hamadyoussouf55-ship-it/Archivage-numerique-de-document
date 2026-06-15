import uuid
from django.db import models


class Armoire(models.Model):
    """Une armoire appartient à un Service (qui appartient à un Département)"""
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service       = models.ForeignKey('entreprise.Service', on_delete=models.CASCADE, related_name='armoires', null=True)
    nom           = models.CharField(max_length=150)
    code          = models.CharField(max_length=30, unique=True)
    description   = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Armoire"
        ordering     = ['service__departement__nom', 'service__nom', 'code']

    def __str__(self):
        parts = []
        if self.service:
            parts.append(self.service.departement.code)
            parts.append(self.service.code)
        parts.append(self.code)
        return " - ".join(parts) + f" - {self.nom}"

    @property
    def departement(self):
        """Accès au département via le service"""
        return self.service.departement if self.service else None

    @property
    def nombre_rayons(self):
        return self.rayons.count()

    @property
    def nombre_documents(self):
        return sum(r.documents.count() for r in self.rayons.all())

    @property
    def chemin_complet(self):
        """Retourne le chemin hiérarchique complet: Département > Service > Armoire"""
        chemin = []
        if self.service:
            chemin.append(self.service.departement.nom)
            chemin.append(self.service.nom)
        chemin.append(self.nom)
        return " > ".join(chemin)


class Rayon(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    armoire       = models.ForeignKey(Armoire, on_delete=models.CASCADE, related_name='rayons')
    nom           = models.CharField(max_length=150)
    code          = models.CharField(max_length=30, unique=True)
    position      = models.CharField(max_length=20, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Rayon"
        ordering     = ['code']

    def __str__(self):
        return f"{self.armoire.code}-{self.code} - {self.nom}"

    @property
    def service(self):
        return self.armoire.service

    @property
    def departement(self):
        return self.armoire.departement

    @property
    def nombre_documents(self):
        return self.documents.count()

    @property
    def chemin_complet(self):
        """Retourne le chemin complet: Département > Service > Armoire > Rayon"""
        return f"{self.armoire.chemin_complet} > {self.nom}"
