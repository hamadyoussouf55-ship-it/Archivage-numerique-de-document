"""
Validation stricte des fichiers uploadés :
  - Extension autorisée
  - Type MIME réel (magic bytes) cohérent avec l'extension
  - Taille maximale configurable
"""
import os
import magic  # python-magic
from django.core.exceptions import ValidationError
from django.conf import settings

# Extensions autorisées et leurs MIME types attendus
ALLOWED = {
    '.pdf':  ['application/pdf'],
    '.doc':  ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.xls':  ['application/vnd.ms-excel'],
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.ppt':  ['application/vnd.ms-powerpoint'],
    '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    '.txt':  ['text/plain'],
    '.csv':  ['text/plain', 'text/csv', 'application/csv'],
    '.png':  ['image/png'],
    '.jpg':  ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.gif':  ['image/gif'],
    '.webp': ['image/webp'],
    '.zip':  ['application/zip', 'application/x-zip-compressed'],
}

# Taille maximale : 50 Mo par défaut, surchargeable dans settings.py
MAX_FILE_SIZE = getattr(settings, 'DOCUMENT_MAX_SIZE_MB', 50) * 1024 * 1024


def validate_document_file(fichier):
    """Validateur Django appelé sur le champ `fichier` du modèle Document."""

    # 1. Taille
    if fichier.size > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise ValidationError(
            f"Fichier trop volumineux ({fichier.size // (1024*1024)} Mo). "
            f"Maximum autorisé : {max_mb} Mo."
        )

    # 2. Extension
    ext = os.path.splitext(fichier.name)[1].lower()
    if ext not in ALLOWED:
        raise ValidationError(
            f"Extension « {ext} » non autorisée. "
            f"Extensions acceptées : {', '.join(ALLOWED.keys())}."
        )

    # 3. Type MIME réel (magic bytes) — lit les 2048 premiers octets
    fichier.seek(0)
    raw = fichier.read(2048)
    fichier.seek(0)

    try:
        mime_reel = magic.from_buffer(raw, mime=True)
    except Exception:
        raise ValidationError("Impossible de vérifier le type du fichier.")

    mimes_attendus = ALLOWED[ext]
    if mime_reel not in mimes_attendus:
        raise ValidationError(
            f"Le contenu du fichier ({mime_reel}) ne correspond pas "
            f"à l'extension « {ext} ». Fichier rejeté."
        )
