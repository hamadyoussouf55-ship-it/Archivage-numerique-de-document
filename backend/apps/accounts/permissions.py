from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsAdminOrArchiviste(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('ADMIN', 'ARCHIVISTE')


class IsAdminOrSelf(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return request.user.role == 'ADMIN' or obj == request.user


class CanAccessDocument(BasePermission):
    """
    RÈGLE CORRIGÉE :
    - ADMIN     : accès total (lecture + écriture)
    - ARCHIVISTE: accès total (lecture + écriture)
    - CONSULTANT: accès en LECTURE uniquement à tous les documents
                  (voir, prévisualiser, télécharger) — mais ne peut pas
                  créer, modifier ni supprimer.

    Le filtrage fin par département via RoleDepartementService
    s'applique uniquement si des rôles sont définis pour ce consultant.
    Sans rôle défini → accès à tous les documents en lecture.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Admin et Archiviste : accès total
        if user.role in ('ADMIN', 'ARCHIVISTE'):
            return True

        # Consultant : accès lecture uniquement
        # Vérifier si des rôles département/service sont définis
        from apps.entreprise.models import RoleDepartementService
        roles = RoleDepartementService.objects.filter(collaborateur=user)

        if not roles.exists():
            # Pas de restriction définie → accès lecture à tout
            return True

        # Des rôles sont définis → vérifier que le consultant
        # a au moins un droit sur quelque chose
        return roles.filter(droit__in=('LECTURE', 'ECRITURE', 'ADMIN')).exists()


class CanWriteDocument(BasePermission):
    """Seuls Admin et Archiviste peuvent créer/modifier/supprimer."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('ADMIN', 'ARCHIVISTE')
