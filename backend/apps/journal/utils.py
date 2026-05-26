from .models import JournalAction


def enregistrer_action(auteur, type_action, details='', ip='', document=None, destinataire=None):
    JournalAction.objects.create(
        auteur=auteur, type_action=type_action, details=details,
        ip_adresse=ip or None, document=document, destinataire=destinataire,
    )
