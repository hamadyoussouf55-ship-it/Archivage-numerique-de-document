import uuid
from django.db import models


class Armoire(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom           = models.CharField(max_length=150)
    code          = models.CharField(max_length=30, unique=True)
    description   = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Armoire"
        ordering     = ['code']

    def __str__(self):
        return f"{self.code} - {self.nom}"

    @property
    def nombre_rayons(self):
        return self.rayons.count()

    @property
    def nombre_documents(self):
        return sum(r.documents.count() for r in self.rayons.all())


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
        return f"{self.code} - {self.nom}"

    @property
    def nombre_documents(self):
        return self.documents.count()
