import os
import mimetypes
from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

from .models import Document, MetadataDocument
from .serializers import (
    DocumentSerializer, DocumentCreateSerializer,
    DocumentListSerializer, MetadataDocumentSerializer,
)
from apps.accounts.permissions import IsAdminOrArchiviste, CanAccessDocument
from apps.armoires.models import Rayon
from apps.journal.utils import enregistrer_action


class DocumentListCreateView(generics.ListCreateAPIView):
    parser_classes  = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['statut', 'type_doc', 'rayon', 'rayon__armoire']
    search_fields   = ['titre', 'code_unique', 'type_doc',
                        'metadata__auteur', 'metadata__destinataire', 'metadata__description']

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
        doc = serializer.save()
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
