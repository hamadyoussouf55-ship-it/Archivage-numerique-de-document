import os
import mimetypes
from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

from .models import Document, MetadataDocument, DocumentVersion, DocumentShare
from .serializers import (
    DocumentSerializer, DocumentCreateSerializer,
    DocumentListSerializer, MetadataDocumentSerializer,
    DocumentVersionSerializer, DocumentShareSerializer,
)
from apps.accounts.permissions import IsAdminOrArchiviste, CanAccessDocument
from apps.armoires.models import Rayon
from apps.journal.utils import enregistrer_action
from .utils import indexer_document_texte


class DocumentListCreateView(generics.ListCreateAPIView):
    parser_classes  = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['statut', 'type_doc', 'rayon', 'rayon__armoire']
    search_fields   = ['titre', 'code_unique', 'type_doc',
                        'metadata__auteur', 'metadata__destinataire', 'metadata__description',
                        'metadata__texte_extrait']

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related(
            'rayon', 'rayon__armoire', 'createur', 'metadata'
        ).exclude(statut='SUPPRIME')

        # Tous les utilisateurs authentifiés voient les documents non supprimés.
        # Les droits d'écriture sont gérés par get_permissions() / CanAccessDocument.
        return qs

    def get_serializer_class(self):
        return DocumentCreateSerializer if self.request.method == 'POST' else DocumentListSerializer

    def get_permissions(self):
        return [IsAdminOrArchiviste()] if self.request.method == 'POST' else [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        doc = serializer.save()
        # Indexation texte intégral à la volée
        indexer_document_texte(doc)
        enregistrer_action(
            auteur=self.request.user, type_action='CREATION', document=doc,
            details=f"Document cree : {doc.code_unique}",
            ip=self.request.META.get('REMOTE_ADDR', ''),
        )


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [CanAccessDocument]

    def get_queryset(self):
        return Document.objects.select_related(
            'rayon', 'rayon__armoire', 'createur', 'metadata'
        ).prefetch_related('journal')

    def get_serializer_class(self):
        return DocumentCreateSerializer if self.request.method in ('PUT', 'PATCH') else DocumentSerializer

    def perform_update(self, serializer):
        ancien_fichier = self.get_object().fichier
        doc = serializer.save()
        # Si le fichier a ete remplace/modifie, on re-extrait le texte
        if doc.fichier != ancien_fichier:
            indexer_document_texte(doc)
        enregistrer_action(
            auteur=self.request.user, type_action='MODIFICATION', document=doc,
            details=f"Document modifie : {doc.code_unique}",
            ip=self.request.META.get('REMOTE_ADDR', ''),
        )

    def perform_destroy(self, instance):
        instance.statut = 'SUPPRIME'
        instance.save()
        enregistrer_action(
            auteur=self.request.user, type_action='SUPPRESSION', document=instance,
            details=f"Suppression logique : {instance.code_unique}",
            ip=self.request.META.get('REMOTE_ADDR', ''),
        )


class DocumentDownloadView(APIView):
    """
    Téléchargement sécurisé : vérifie l'authentification ET les permissions
    avant de servir le fichier. Le fichier n'est jamais exposé directement.
    """
    permission_classes = [CanAccessDocument]

    def get(self, request, pk):
        try:
            doc = Document.objects.select_related('rayon', 'rayon__armoire', 'createur').get(pk=pk)
        except Document.DoesNotExist:
            raise Http404("Document introuvable.")

        # Vérifier permission objet
        self.check_object_permissions(request, doc)

        if doc.statut == 'SUPPRIME':
            return Response({"detail": "Document supprime."}, status=404)

        # Construire le chemin complet
        file_path = os.path.join(settings.MEDIA_ROOT, str(doc.fichier))

        if not os.path.exists(file_path):
            return Response({"detail": "Fichier introuvable sur le serveur."}, status=404)

        # Enregistrer dans le journal
        enregistrer_action(
            auteur=request.user, type_action='TELECHARGEMENT', document=doc,
            details=f"Telechargement : {doc.nom_fichier}",
            ip=request.META.get('REMOTE_ADDR', ''),
        )

        # Servir le fichier de manière sécurisée
        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or 'application/octet-stream'

        response = FileResponse(
            open(file_path, 'rb'),
            content_type=content_type,
            as_attachment=True,
            filename=doc.nom_fichier or os.path.basename(file_path),
        )
        return response


class DocumentPreviewView(APIView):
    """
    Prévisualisation sécurisée : sert le fichier en inline (pas en attachment)
    pour affichage dans le navigateur (PDF, images).
    """
    permission_classes = [CanAccessDocument]

    def get(self, request, pk):
        try:
            doc = Document.objects.select_related('rayon', 'rayon__armoire', 'createur').get(pk=pk)
        except Document.DoesNotExist:
            raise Http404

        self.check_object_permissions(request, doc)

        file_path = os.path.join(settings.MEDIA_ROOT, str(doc.fichier))
        if not os.path.exists(file_path):
            return Response({"detail": "Fichier introuvable."}, status=404)

        enregistrer_action(
            auteur=request.user, type_action='CONSULTATION', document=doc,
            details=f"Previsualisation : {doc.nom_fichier}",
            ip=request.META.get('REMOTE_ADDR', ''),
        )

        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or 'application/octet-stream'

        return FileResponse(open(file_path, 'rb'), content_type=content_type)


class DocumentDeplacerView(APIView):
    permission_classes = [IsAdminOrArchiviste]

    def post(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({"detail": "Document introuvable."}, status=404)

        rayon_id = request.data.get('rayon_id')
        if not rayon_id:
            return Response({"detail": "rayon_id requis."}, status=400)
        try:
            nouveau_rayon = Rayon.objects.get(id=rayon_id)
        except Rayon.DoesNotExist:
            return Response({"detail": "Rayon introuvable."}, status=404)

        ancien_code = doc.rayon.code
        doc.rayon   = nouveau_rayon
        doc.save()
        enregistrer_action(
            auteur=request.user, type_action='DEPLACEMENT', document=doc,
            details=f"Deplace de {ancien_code} vers {nouveau_rayon.code}",
            ip=request.META.get('REMOTE_ADDR', ''),
        )
        return Response(DocumentSerializer(doc).data)


class MetadataUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class   = MetadataDocumentSerializer
    permission_classes = [IsAdminOrArchiviste]

    def get_object(self):
        doc = generics.get_object_or_404(Document, pk=self.kwargs['pk'])
        meta, _ = MetadataDocument.objects.get_or_create(document=doc)
        return meta


@swagger_auto_schema(
    operation_summary="Statistiques globales du tableau de bord",
    operation_description="Retourne le nombre total de documents, armoires, rayons et une répartition par type et armoire.",
    tags=["Statistiques"],
)
class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.armoires.models import Armoire
        stats = {
            'total_documents':    Document.objects.exclude(statut='SUPPRIME').count(),
            'documents_actifs':   Document.objects.filter(statut='ACTIF').count(),
            'documents_archives': Document.objects.filter(statut='ARCHIVE').count(),
            'total_armoires':     Armoire.objects.count(),
            'total_rayons':       Rayon.objects.count(),
            'par_type': list(
                Document.objects.exclude(statut='SUPPRIME')
                .values('type_doc').annotate(count=Count('id')).order_by('-count')[:10]
            ),
            'par_armoire': list(
                Document.objects.exclude(statut='SUPPRIME')
                .values('rayon__armoire__nom', 'rayon__armoire__code')
                .annotate(count=Count('id')).order_by('-count')
            ),
        }
        return Response(stats)


# ── Export views ──────────────────────────────────────────────────────────────

class DocumentExportCSVView(APIView):
    """Export CSV de tous les documents (filtrés)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .exports import export_documents_csv
        from django_filters.rest_framework import DjangoFilterBackend
        qs = Document.objects.exclude(statut='SUPPRIME').select_related(
            'rayon', 'rayon__armoire', 'createur', 'metadata'
        )
        # Réappliquer les filtres de la liste
        statut    = request.query_params.get('statut')
        type_doc  = request.query_params.get('type_doc')
        search    = request.query_params.get('search')
        if statut:
            qs = qs.filter(statut=statut)
        if type_doc:
            qs = qs.filter(type_doc__icontains=type_doc)
        if search:
            qs = qs.filter(
                Q(titre__icontains=search) |
                Q(code_unique__icontains=search) |
                Q(type_doc__icontains=search)
            )
        enregistrer_action(
            auteur=request.user, type_action='CONSULTATION', document=None,
            details=f"Export CSV documents ({qs.count()} docs)",
            ip=request.META.get('REMOTE_ADDR', ''),
        )
        return export_documents_csv(qs)


class DocumentExportPDFView(APIView):
    """Export PDF de tous les documents (filtrés)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .exports import export_documents_pdf
        qs = Document.objects.exclude(statut='SUPPRIME').select_related(
            'rayon', 'rayon__armoire', 'createur', 'metadata'
        )
        statut   = request.query_params.get('statut')
        type_doc = request.query_params.get('type_doc')
        search   = request.query_params.get('search')
        if statut:
            qs = qs.filter(statut=statut)
        if type_doc:
            qs = qs.filter(type_doc__icontains=type_doc)
        if search:
            qs = qs.filter(
                Q(titre__icontains=search) |
                Q(code_unique__icontains=search) |
                Q(type_doc__icontains=search)
            )
        enregistrer_action(
            auteur=request.user, type_action='CONSULTATION', document=None,
            details=f"Export PDF documents ({qs.count()} docs)",
            ip=request.META.get('REMOTE_ADDR', ''),
        )
        return export_documents_pdf(qs)


from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction

# ── Corbeille Views ────────────────────────────────────────────────────────────

class DocumentCorbeilleListView(generics.ListAPIView):
    """Liste des documents supprimes logiquement (corbeille)."""
    permission_classes = [IsAdminOrArchiviste]
    serializer_class = DocumentListSerializer

    def get_queryset(self):
        return Document.objects.select_related('rayon', 'rayon__armoire', 'createur').filter(statut='SUPPRIME')


class DocumentRestaurerView(APIView):
    """Restaure un document supprime."""
    permission_classes = [IsAdminOrArchiviste]

    def post(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({"detail": "Document introuvable."}, status=404)

        if doc.statut != 'SUPPRIME':
            return Response({"detail": "Le document n'est pas supprime."}, status=400)

        doc.statut = 'ACTIF'
        doc.save()

        enregistrer_action(
            auteur=request.user, type_action='MODIFICATION', document=doc,
            details=f"Restauration du document depuis la corbeille",
            ip=request.META.get('REMOTE_ADDR', ''),
        )
        return Response({"detail": "Document restaure avec succes."})


class DocumentPurgerView(APIView):
    """Supprime definitivement un document de la base de donnees et du disque."""
    permission_classes = [IsAdminOrArchiviste]

    def delete(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({"detail": "Document introuvable."}, status=404)

        if doc.statut != 'SUPPRIME':
            return Response({"detail": "Le document doit etre dans la corbeille pour etre purge."}, status=400)

        file_path = os.path.join(settings.MEDIA_ROOT, str(doc.fichier))
        nom_fichier = doc.nom_fichier or str(doc.fichier)
        code_unique = doc.code_unique

        # Supprimer le fichier sur le disque s'il existe
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                # Continuer meme si erreur fichier (fichier absent par exemple)
                pass

        doc.delete()

        enregistrer_action(
            auteur=request.user, type_action='SUPPRESSION', document=None,
            details=f"Purge definitive du document {code_unique} ({nom_fichier})",
            ip=request.META.get('REMOTE_ADDR', ''),
        )
        return Response({"detail": "Document purge definitivement."})


# ── Versioning Views ───────────────────────────────────────────────────────────

class DocumentVersionListView(generics.ListAPIView):
    """Liste de toutes les versions d'un document."""
    permission_classes = [CanAccessDocument]
    serializer_class = DocumentVersionSerializer

    def get_queryset(self):
        doc_id = self.kwargs['pk']
        # Verifier l'existence et les permissions
        try:
            doc = Document.objects.get(id=doc_id)
        except Document.DoesNotExist:
            raise Http404("Document introuvable.")
        self.check_object_permissions(self.request, doc)
        return DocumentVersion.objects.filter(document_id=doc_id).select_related('createur')


class DocumentVersionUploadView(APIView):
    """Televerser une nouvelle version pour un document."""
    permission_classes = [IsAdminOrArchiviste]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            doc = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({"detail": "Document introuvable."}, status=404)

        if doc.statut == 'SUPPRIME':
            return Response({"detail": "Impossible d'ajouter une version a un document supprime."}, status=400)

        fichier = request.FILES.get('fichier')
        if not fichier:
            return Response({"detail": "Fichier requis."}, status=400)

        # Valider le fichier avec le validateur
        from .validators import validate_document_file
        try:
            validate_document_file(fichier)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        with transaction.atomic():
            # Determiner le numero de la nouvelle version
            derniere_version = DocumentVersion.objects.filter(document=doc).order_by('-numero_version').first()
            nouveau_numero = (derniere_version.numero_version + 1) if derniere_version else 1

            # Mettre a jour le document principal
            doc.fichier = fichier
            doc.nom_fichier = fichier.name.split('/')[-1]
            doc.taille = fichier.size
            doc.save()

            # Creer la nouvelle version
            version = DocumentVersion.objects.create(
                document=doc,
                numero_version=nouveau_numero,
                fichier=fichier,
                nom_fichier=doc.nom_fichier,
                taille=doc.taille,
                createur=request.user
            )

        # Mettre a jour l'indexation de texte
        indexer_document_texte(doc)

        enregistrer_action(
            auteur=request.user, type_action='MODIFICATION', document=doc,
            details=f"Nouvelle version creee : v{nouveau_numero}",
            ip=request.META.get('REMOTE_ADDR', ''),
        )

        return Response(DocumentVersionSerializer(version).data, status=status.HTTP_201_CREATED)


class DocumentVersionDownloadView(APIView):
    """Telechargement securise d'une version historique specifique."""
    permission_classes = [CanAccessDocument]

    def get(self, request, version_pk):
        try:
            version = DocumentVersion.objects.select_related('document').get(pk=version_pk)
        except DocumentVersion.DoesNotExist:
            raise Http404("Version introuvable.")

        # Verifier permissions sur le document parent
        self.check_object_permissions(request, version.document)

        if version.document.statut == 'SUPPRIME':
            return Response({"detail": "Document supprime."}, status=404)

        file_path = os.path.join(settings.MEDIA_ROOT, str(version.fichier))
        if not os.path.exists(file_path):
            return Response({"detail": "Fichier introuvable sur le serveur."}, status=404)

        enregistrer_action(
            auteur=request.user, type_action='TELECHARGEMENT', document=version.document,
            details=f"Telechargement de la version v{version.numero_version} : {version.nom_fichier}",
            ip=request.META.get('REMOTE_ADDR', ''),
        )

        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or 'application/octet-stream'

        response = FileResponse(
            open(file_path, 'rb'),
            content_type=content_type,
            as_attachment=True,
            filename=version.nom_fichier or os.path.basename(file_path),
        )
        return response


class DocumentVersionRestoreView(APIView):
    """Restaure une version historique specifique en tant que version courante."""
    permission_classes = [IsAdminOrArchiviste]

    def post(self, request, version_pk):
        try:
            version_a_restaurer = DocumentVersion.objects.select_related('document').get(pk=version_pk)
        except DocumentVersion.DoesNotExist:
            return Response({"detail": "Version introuvable."}, status=404)

        doc = version_a_restaurer.document
        if doc.statut == 'SUPPRIME':
            return Response({"detail": "Impossible de restaurer une version sur un document supprime."}, status=400)

        with transaction.atomic():
            # Determiner le numero de la version suivante
            derniere_version = DocumentVersion.objects.filter(document=doc).order_by('-numero_version').first()
            nouveau_numero = (derniere_version.numero_version + 1) if derniere_version else 1

            # Copier le fichier de la version a restaurer vers le document principal
            doc.fichier = version_a_restaurer.fichier
            doc.nom_fichier = version_a_restaurer.nom_fichier
            doc.taille = version_a_restaurer.taille
            doc.save()

            # Creer une nouvelle version N+1 qui a le meme contenu
            nouvelle_version = DocumentVersion.objects.create(
                document=doc,
                numero_version=nouveau_numero,
                fichier=version_a_restaurer.fichier,
                nom_fichier=version_a_restaurer.nom_fichier,
                taille=version_a_restaurer.taille,
                createur=request.user
            )

        # Mettre a jour l'indexation de texte
        indexer_document_texte(doc)

        enregistrer_action(
            auteur=request.user, type_action='MODIFICATION', document=doc,
            details=f"Restauration de la version v{version_a_restaurer.numero_version} en v{nouveau_numero}",
            ip=request.META.get('REMOTE_ADDR', ''),
        )

        return Response(DocumentSerializer(doc).data)


# ── Sharing Views ──────────────────────────────────────────────────────────────

class DocumentShareCreateView(generics.CreateAPIView):
    """Generer un lien de partage externe pour un document."""
    permission_classes = [IsAdminOrArchiviste]
    serializer_class = DocumentShareSerializer

    def perform_create(self, serializer):
        doc_id = self.kwargs['pk']
        try:
            doc = Document.objects.get(id=doc_id)
        except Document.DoesNotExist:
            raise Http404("Document introuvable.")

        # Hasher le mot de passe s'il est fourni
        cle_securite = self.request.data.get('cle_securite')
        hash_cle = make_password(cle_securite) if cle_securite else None

        share = serializer.save(
            document=doc,
            cle_securite=hash_cle,
            cree_par=self.request.user
        )

        enregistrer_action(
            auteur=self.request.user, type_action='MODIFICATION', document=doc,
            details=f"Creation d'un lien de partage externe (id: {share.id})",
            ip=self.request.META.get('REMOTE_ADDR', ''),
        )


class DocumentSharePublicDetailView(APIView):
    """Consulter les details d'un partage de maniere publique."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, share_uuid):
        try:
            share = DocumentShare.objects.select_related('document').get(pk=share_uuid)
        except (DocumentShare.DoesNotExist, ValueError):
            return Response({"detail": "Lien de partage invalide ou expire."}, status=404)

        # Verifier expiration temporelle
        from django.utils import timezone
        if share.date_expiration and share.date_expiration < timezone.now():
            return Response({"detail": "Lien de partage expire."}, status=404)

        # Verifier nombre de telechargements max
        if share.telechargements_max is not None and share.nombre_telechargements >= share.telechargements_max:
            return Response({"detail": "Lien de partage expire (nombre maximum de telechargements atteint)."}, status=404)

        if share.document.statut == 'SUPPRIME':
            return Response({"detail": "Document indisponible."}, status=404)

        return Response({
            "id": share.id,
            "document_titre": share.document.titre,
            "requires_password": share.cle_securite is not None,
            "date_expiration": share.date_expiration,
            "taille": share.document.taille_lisible,
            "nom_fichier": share.document.nom_fichier
        })


class DocumentSharePublicDownloadView(APIView):
    """Telechargement d'un fichier via partage public."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, share_uuid):
        try:
            share = DocumentShare.objects.select_related('document').get(pk=share_uuid)
        except (DocumentShare.DoesNotExist, ValueError):
            return Response({"detail": "Lien de partage invalide."}, status=404)

        # Verifications d'expiration
        from django.utils import timezone
        if share.date_expiration and share.date_expiration < timezone.now():
            return Response({"detail": "Lien de partage expire."}, status=404)

        if share.telechargements_max is not None and share.nombre_telechargements >= share.telechargements_max:
            return Response({"detail": "Lien de partage expire (limite atteinte)."}, status=404)

        if share.document.statut == 'SUPPRIME':
            return Response({"detail": "Document indisponible."}, status=404)

        # Verifier mot de passe si requis
        if share.cle_securite:
            mot_de_passe = request.data.get('mot_de_passe')
            if not mot_de_passe or not check_password(mot_de_passe, share.cle_securite):
                return Response({"detail": "Mot de passe incorrect ou manquant."}, status=401)

        file_path = os.path.join(settings.MEDIA_ROOT, str(share.document.fichier))
        if not os.path.exists(file_path):
            return Response({"detail": "Fichier physique introuvable sur le serveur."}, status=404)

        # Incrementer le compteur de telechargement de maniere atomique
        with transaction.atomic():
            share_locked = DocumentShare.objects.select_for_update().get(id=share.id)
            share_locked.nombre_telechargements += 1
            share_locked.save()

        # Enregistrer dans les logs d'audit (sans auteur puisqu'il s'agit d'un acces externe anonyme)
        enregistrer_action(
            auteur=None, type_action='TELECHARGEMENT', document=share.document,
            details=f"Telechargement externe via partage (Partage ID: {share.id})",
            ip=request.META.get('REMOTE_ADDR', ''),
        )

        content_type, _ = mimetypes.guess_type(file_path)
        content_type = content_type or 'application/octet-stream'

        return FileResponse(
            open(file_path, 'rb'),
            content_type=content_type,
            as_attachment=True,
            filename=share.document.nom_fichier
        )
