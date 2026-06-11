import uuid
from django.db import models
from .validators import validate_document_file
from django.utils import timezone


def document_upload_path(instance, filename):
    now = timezone.now()
    return f"documents/{now.year}/{now.month:02d}/{filename}"


class Document(models.Model):
    STATUT_CHOICES = [
        ('ACTIF',    'Actif'),
        ('ARCHIVE',  'Archive'),
        ('SUPPRIME', 'Supprime'),
    ]

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code_unique       = models.CharField(max_length=80, unique=True, editable=False)
    titre             = models.CharField(max_length=255)
    type_doc          = models.CharField(max_length=100)
    date_creation     = models.DateField(help_text="Date du document original")
    date_numerisation = models.DateTimeField(auto_now_add=True)
    fichier           = models.FileField(upload_to=document_upload_path)
    nom_fichier       = models.CharField(max_length=255, editable=False, blank=True)
    taille            = models.BigIntegerField(editable=False, default=0)
    chemin_stockage   = models.CharField(max_length=500, editable=False, blank=True)
    statut            = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIF')
    rayon             = models.ForeignKey('armoires.Rayon', on_delete=models.PROTECT, related_name='documents')
    createur          = models.ForeignKey('accounts.Collaborateur', on_delete=models.SET_NULL,
                                          null=True, related_name='documents_crees')

    class Meta:
        verbose_name = "Document"
        ordering     = ['-date_numerisation']

    def __str__(self):
        return f"{self.code_unique} - {self.titre}"

    def save(self, *args, **kwargs):
        if self.fichier:
            self.nom_fichier    = self.fichier.name.split('/')[-1]
            self.chemin_stockage = self.fichier.name
            try:
                self.taille = self.fichier.size
            except Exception:
                self.taille = 0
        if not self.code_unique:
            from django.db import transaction
            from apps.armoires.models import Rayon
            try:
                with transaction.atomic():
                    # Verrouille le rayon pour bloquer d'autres écritures simultanées sur le même rayon
                    Rayon.objects.select_for_update().get(id=self.rayon_id)
                    self.code_unique = self._generer_code()
                    super().save(*args, **kwargs)
            except Exception:
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def _generer_code(self):
        try:
            rayon   = self.rayon
            armoire = rayon.armoire
            annee   = self.date_creation.year if self.date_creation else timezone.now().year
            type_code = (self.type_doc or 'DOC')[:3].upper()
            seq = Document.objects.filter(
                rayon__armoire=armoire, date_creation__year=annee
            ).count() + 1
            return f"SYG-{type_code}-{armoire.code}-{rayon.code}-{annee}-{seq:04d}"
        except Exception:
            return f"SYG-{uuid.uuid4().hex[:8].upper()}"

    @property
    def taille_lisible(self):
        t = self.taille
        for unit in ['o', 'Ko', 'Mo', 'Go']:
            if t < 1024:
                return f"{t:.1f} {unit}"
            t /= 1024
        return f"{t:.1f} To"


def version_upload_path(instance, filename):
    now = timezone.now()
    return f"documents/versions/{now.year}/{now.month:02d}/{filename}"


class VersionDocument(models.Model):
    """Historique des versions d'un document."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document        = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    numero_version  = models.PositiveIntegerField()
    fichier         = models.FileField(upload_to=version_upload_path)
    nom_fichier     = models.CharField(max_length=255, blank=True)
    taille          = models.BigIntegerField(default=0)
    commentaire     = models.TextField(blank=True, help_text="Motif ou description de la modification")
    cree_par        = models.ForeignKey('accounts.Collaborateur', on_delete=models.SET_NULL,
                                        null=True, related_name='versions_creees')
    date_creation   = models.DateTimeField(auto_now_add=True)
    est_courante    = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Version de document"
        ordering     = ['-numero_version']
        unique_together = [['document', 'numero_version']]

    def __str__(self):
        return f"{self.document.code_unique} — v{self.numero_version}"

    def save(self, *args, **kwargs):
        if self.fichier:
            self.nom_fichier = self.fichier.name.split('/')[-1]
            try:
                self.taille = self.fichier.size
            except Exception:
                self.taille = 0
        super().save(*args, **kwargs)

    @property
    def taille_lisible(self):
        t = self.taille
        for unit in ['o', 'Ko', 'Mo', 'Go']:
            if t < 1024:
                return f"{t:.1f} {unit}"
            t /= 1024
        return f"{t:.1f} To"


class MetadataDocument(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document      = models.OneToOneField(Document, on_delete=models.CASCADE, related_name='metadata')
    auteur        = models.CharField(max_length=200, blank=True)
    date_emission = models.DateField(null=True, blank=True)
    mots_cles     = models.JSONField(default=list, blank=True)
    destinataire  = models.CharField(max_length=200, blank=True)
    description   = models.TextField(blank=True)
    texte_extrait = models.TextField(blank=True, default='')

    class Meta:
        verbose_name = "Metadonnee"

    def __str__(self):
        return f"Metadonnees - {self.document.code_unique}"


class DocumentShare(models.Model):
    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document              = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='partages')
    cle_securite          = models.CharField(max_length=128, null=True, blank=True, help_text="Mot de passe hashe")
    date_expiration       = models.DateTimeField(null=True, blank=True)
    nombre_telechargements = models.IntegerField(default=0)
    telechargements_max   = models.IntegerField(null=True, blank=True)
    cree_par              = models.ForeignKey('accounts.Collaborateur', on_delete=models.SET_NULL, null=True, related_name='partages_crees')
    date_creation         = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Partage de Document"
        ordering     = ['-date_creation']

    def __str__(self):
        return f"Partage - {self.document.code_unique} ({self.id})"
