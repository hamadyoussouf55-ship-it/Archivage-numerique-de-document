"""
Vues pour le versionnement des documents.
"""
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Document, VersionDocument
from .serializers import VersionDocumentSerializer, NouvelleVersionSerializer
from apps.accounts.permissions import IsAdminOrArchiviste


def enregistrer_action_version(auteur, document, version, ip=''):
    """Enregistre une action de versionnement dans le journal."""
    try:
        from apps.journal.models import JournalAction
        JournalAction.objects.create(
            auteur=auteur,
            document=document,
            type_action='MODIFICATION',
            details=f"Nouvelle version v{version.numero_version} — {version.commentaire or 'sans commentaire'}",
            ip_adresse=ip,
        )
    except Exception:
        pass


class DocumentVersionsView(APIView):
    """
    GET  /api/documents/<pk>/versions/   → liste toutes les versions
    POST /api/documents/<pk>/versions/   → crée une nouvelle version
    """
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrArchiviste()]
        return [permissions.IsAuthenticated()]

    def _get_document(self, pk):
        try:
            return Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return None

    def get(self, request, pk):
        doc = self._get_document(pk)
        if not doc:
            return Response({'detail': 'Document introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        versions = doc.versions.select_related('cree_par').order_by('-numero_version')
        serializer = VersionDocumentSerializer(versions, many=True)
        return Response({
            'document': doc.code_unique,
            'titre': doc.titre,
            'version_courante': doc.versions.filter(est_courante=True).values_list('numero_version', flat=True).first(),
            'nombre_versions': versions.count(),
            'versions': serializer.data,
        })

    @transaction.atomic
    def post(self, request, pk):
        doc = self._get_document(pk)
        if not doc:
            return Response({'detail': 'Document introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = NouvelleVersionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        fichier     = serializer.validated_data['fichier']
        commentaire = serializer.validated_data.get('commentaire', '')

        # Calcul du prochain numéro de version
        derniere = doc.versions.order_by('-numero_version').first()
        numero   = (derniere.numero_version + 1) if derniere else 1

        # Si c'est la première version, on crée la v1 à partir du fichier actuel
        if not derniere and doc.fichier:
            VersionDocument.objects.create(
                document       = doc,
                numero_version = 1,
                fichier        = doc.fichier,
                commentaire    = 'Version initiale',
                cree_par       = doc.createur,
                est_courante   = False,
            )
            numero = 2

        # Désactiver l'ancienne version courante
        doc.versions.filter(est_courante=True).update(est_courante=False)

        # Créer la nouvelle version
        nouvelle_version = VersionDocument.objects.create(
            document       = doc,
            numero_version = numero,
            fichier        = fichier,
            commentaire    = commentaire,
            cree_par       = request.user,
            est_courante   = True,
        )

        # Mettre à jour le fichier principal du document
        doc.fichier = fichier
        doc.save()

        # Journal
        enregistrer_action_version(
            auteur   = request.user,
            document = doc,
            version  = nouvelle_version,
            ip       = request.META.get('REMOTE_ADDR', ''),
        )

        return Response(
            VersionDocumentSerializer(nouvelle_version).data,
            status=status.HTTP_201_CREATED
        )


class VersionDetailView(APIView):
    """
    GET    /api/documents/<pk>/versions/<v_pk>/             → détail d'une version
    POST   /api/documents/<pk>/versions/<v_pk>/restaurer/   → restaurer comme version courante
    DELETE /api/documents/<pk>/versions/<v_pk>/             → supprimer une version (ADMIN)
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_objects(self, pk, v_pk):
        try:
            doc     = Document.objects.get(pk=pk)
            version = VersionDocument.objects.get(pk=v_pk, document=doc)
            return doc, version
        except (Document.DoesNotExist, VersionDocument.DoesNotExist):
            return None, None

    def get(self, request, pk, v_pk):
        doc, version = self._get_objects(pk, v_pk)
        if not version:
            return Response({'detail': 'Version introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(VersionDocumentSerializer(version).data)

    @transaction.atomic
    def post(self, request, pk, v_pk):
        """Restaurer une ancienne version comme version courante."""
        if request.user.role not in ['ADMIN', 'ARCHIVISTE']:
            return Response({'detail': 'Permission refusée.'}, status=status.HTTP_403_FORBIDDEN)

        doc, version = self._get_objects(pk, v_pk)
        if not version:
            return Response({'detail': 'Version introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if version.est_courante:
            return Response({'detail': 'Cette version est déjà la version courante.'})

        # Désactiver la version courante
        doc.versions.filter(est_courante=True).update(est_courante=False)

        # Activer la version choisie
        version.est_courante = True
        version.save()

        # Remettre ce fichier sur le document principal
        doc.fichier = version.fichier
        doc.save()

        # Journal
        try:
            from apps.journal.models import JournalAction
            JournalAction.objects.create(
                auteur=request.user, document=doc,
                type_action='MODIFICATION',
                details=f"Restauration de la version v{version.numero_version}",
                ip_adresse=request.META.get('REMOTE_ADDR', ''),
            )
        except Exception:
            pass

        return Response({
            'detail': f'Version v{version.numero_version} restaurée avec succès.',
            'version': VersionDocumentSerializer(version).data,
        })

    def delete(self, request, pk, v_pk):
        """Supprimer une version (ADMIN uniquement, version courante non supprimable)."""
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Seul un administrateur peut supprimer une version.'},
                            status=status.HTTP_403_FORBIDDEN)

        doc, version = self._get_objects(pk, v_pk)
        if not version:
            return Response({'detail': 'Version introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if version.est_courante:
            return Response(
                {'detail': 'Impossible de supprimer la version courante. Restaurez d\'abord une autre version.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        version.delete()
        return Response({'detail': 'Version supprimée.'}, status=status.HTTP_204_NO_CONTENT)
