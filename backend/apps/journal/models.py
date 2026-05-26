import uuid
from django.db import models


class JournalAction(models.Model):
    TYPE_CHOICES = [
        ('CREATION',       'Creation'),
        ('MODIFICATION',   'Modification'),
        ('SUPPRESSION',    'Suppression'),
        ('CONSULTATION',   'Consultation'),
        ('TELECHARGEMENT', 'Telechargement'),
        ('DEPLACEMENT',    'Deplacement'),
        ('CONNEXION',      'Connexion'),
        ('DECONNEXION',    'Deconnexion'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date_action = models.DateTimeField(auto_now_add=True)
    type_action = models.CharField(max_length=30, choices=TYPE_CHOICES)
    ip_adresse  = models.GenericIPAddressField(null=True, blank=True)
    details     = models.TextField(blank=True)
    auteur      = models.ForeignKey('accounts.Collaborateur', on_delete=models.SET_NULL,
                                     null=True, related_name='actions')
    document    = models.ForeignKey('documents.Document', on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='journal')
    destinataire = models.ForeignKey('accounts.Collaborateur', on_delete=models.SET_NULL,
                                      null=True, blank=True, related_name='actions_recues')

    class Meta:
        verbose_name = "Journal d'action"
        ordering     = ['-date_action']

    def __str__(self):
        return f"{self.date_action:%Y-%m-%d %H:%M} | {self.type_action} | {self.auteur}"
