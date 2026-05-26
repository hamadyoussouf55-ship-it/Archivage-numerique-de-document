"""
Tests unitaires — app documents
"""
import tempfile
import os
from datetime import date
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Collaborateur, Entreprise, Departement, Service
from apps.armoires.models import Armoire, Rayon
from .models import Document, MetadataDocument


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_base_data():
    ent  = Entreprise.objects.create(nom='SYGALIN TEST', siret='11111111111111', code='STT')
    dept = Departement.objects.create(nom='DSI', code='DSI', entreprise=ent)
    svc  = Service.objects.create(nom='Dev', code='DEV', departement=dept)
    return ent, dept, svc


def make_user(role, matricule, service):
    return Collaborateur.objects.create_user(
        matricule=matricule, password='Pass123!',
        nom='Doe', prenom='John', email=f'{matricule}@t.com',
        role=role, service=service,
    )


def make_armoire(entreprise):
    return Armoire.objects.create(
        nom='Armoire RH', code='ARM-RH', entreprise=entreprise,
        description='Armoire ressources humaines',
    )


def make_rayon(armoire):
    return Rayon.objects.create(
        code='R01', niveau=1, armoire=armoire, description='Rayon 1'
    )


def make_doc(rayon, createur, titre='Doc test', type_doc='CONTRAT'):
    f = SimpleUploadedFile('test.pdf', b'%PDF-1.4 test content', content_type='application/pdf')
    doc = Document.objects.create(
        titre=titre, type_doc=type_doc, rayon=rayon,
        createur=createur, fichier=f,
        date_creation=date.today(),
    )
    return doc


# ── Tests modèles ─────────────────────────────────────────────────────────────

class DocumentModelTests(TestCase):
    def setUp(self):
        self.ent, self.dept, self.svc = make_base_data()
        self.admin = make_user('ADMIN', 'ADM01', self.svc)
        self.arm   = make_armoire(self.ent)
        self.ray   = make_rayon(self.arm)

    def test_code_unique_auto_generated(self):
        doc = make_doc(self.ray, self.admin)
        self.assertIsNotNone(doc.code_unique)
        self.assertTrue(doc.code_unique.startswith('SYG-'))

    def test_code_unique_format(self):
        doc = make_doc(self.ray, self.admin, type_doc='FACTURE')
        parts = doc.code_unique.split('-')
        # SYG - TYPE - ARMOIRE_CODE - RAYON_CODE - ANNEE - XXXX
        self.assertEqual(parts[0], 'SYG')
        self.assertIn('FACTURE', doc.code_unique)

    def test_statut_default_actif(self):
        doc = make_doc(self.ray, self.admin)
        self.assertEqual(doc.statut, 'ACTIF')

    def test_taille_lisible_property(self):
        doc = make_doc(self.ray, self.admin)
        self.assertIsInstance(doc.taille_lisible, str)

    def test_str_representation(self):
        doc = make_doc(self.ray, self.admin, titre='Mon contrat')
        self.assertIn('Mon contrat', str(doc))

    def tearDown(self):
        # Nettoyage des fichiers uploadés pendant les tests
        for doc in Document.objects.all():
            if doc.fichier and os.path.exists(doc.fichier.path):
                os.remove(doc.fichier.path)


# ── Tests API documents ───────────────────────────────────────────────────────

class DocumentAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ent, self.dept, self.svc = make_base_data()
        self.admin      = make_user('ADMIN',      'ADM01', self.svc)
        self.archiviste = make_user('ARCHIVISTE', 'ARC01', self.svc)
        self.consultant = make_user('CONSULTANT', 'CON01', self.svc)
        self.arm  = make_armoire(self.ent)
        self.ray  = make_rayon(self.arm)
        self.doc  = make_doc(self.ray, self.admin)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    # -- Liste documents --
    def test_admin_can_list_documents(self):
        self._auth(self.admin)
        r = self.client.get(reverse('document-list'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_consultant_can_list_documents(self):
        self._auth(self.consultant)
        r = self.client.get(reverse('document-list'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        r = self.client.get(reverse('document-list'))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    # -- Détail document --
    def test_get_document_detail(self):
        self._auth(self.consultant)
        r = self.client.get(reverse('document-detail', kwargs={'pk': self.doc.pk}))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['code_unique'], self.doc.code_unique)

    # -- Création document --
    def test_admin_can_create_document(self):
        self._auth(self.admin)
        f = SimpleUploadedFile('new.pdf', b'%PDF-1.4', content_type='application/pdf')
        r = self.client.post(reverse('document-list'), {
            'titre': 'Nouveau doc', 'type_doc': 'RAPPORT',
            'rayon': str(self.ray.pk), 'date_creation': date.today().isoformat(),
            'fichier': f,
        }, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn('code_unique', r.data)

    def test_consultant_cannot_create_document(self):
        self._auth(self.consultant)
        f = SimpleUploadedFile('new.pdf', b'%PDF-1.4', content_type='application/pdf')
        r = self.client.post(reverse('document-list'), {
            'titre': 'Test', 'type_doc': 'RAPPORT',
            'rayon': str(self.ray.pk), 'date_creation': date.today().isoformat(),
            'fichier': f,
        }, format='multipart')
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    # -- Suppression --
    def test_admin_can_delete_document(self):
        self._auth(self.admin)
        r = self.client.delete(reverse('document-detail', kwargs={'pk': self.doc.pk}))
        self.assertIn(r.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])

    def test_consultant_cannot_delete_document(self):
        self._auth(self.consultant)
        r = self.client.delete(reverse('document-detail', kwargs={'pk': self.doc.pk}))
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    # -- Stats --
    def test_stats_endpoint_returns_data(self):
        self._auth(self.admin)
        r = self.client.get(reverse('dashboard-stats'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('total_documents', r.data)

    def test_stats_periode_endpoint(self):
        self._auth(self.admin)
        r = self.client.get(reverse('stats-periode'), {'granularite': 'mois'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('totaux', r.data)
        self.assertIn('docs_par_periode', r.data)

    # -- Export --
    def test_export_csv_returns_csv(self):
        self._auth(self.admin)
        r = self.client.get(reverse('document-export-csv'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', r['Content-Type'])

    def tearDown(self):
        for doc in Document.objects.all():
            if doc.fichier and os.path.exists(doc.fichier.path):
                try:
                    os.remove(doc.fichier.path)
                except Exception:
                    pass


class DocumentSearchFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ent, self.dept, self.svc = make_base_data()
        self.admin = make_user('ADMIN', 'ADM01', self.svc)
        self.arm  = make_armoire(self.ent)
        self.ray  = make_rayon(self.arm)
        self.doc1 = make_doc(self.ray, self.admin, titre='Contrat Dupont', type_doc='CONTRAT')
        self.doc2 = make_doc(self.ray, self.admin, titre='Facture Mars', type_doc='FACTURE')
        self.client.force_authenticate(user=self.admin)

    def test_search_by_titre(self):
        r = self.client.get(reverse('document-list'), {'search': 'Dupont'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        codes = [d['code_unique'] for d in r.data['results']]
        self.assertIn(self.doc1.code_unique, codes)
        self.assertNotIn(self.doc2.code_unique, codes)

    def test_filter_by_type(self):
        r = self.client.get(reverse('document-list'), {'type_doc': 'FACTURE'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for d in r.data['results']:
            self.assertEqual(d['type_doc'], 'FACTURE')

    def tearDown(self):
        for doc in Document.objects.all():
            if doc.fichier and os.path.exists(doc.fichier.path):
                try:
                    os.remove(doc.fichier.path)
                except Exception:
                    pass
