"""
Tests unitaires — app journal
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Collaborateur
from apps.entreprise.models import Entreprise, Departement, Service
from .models import JournalAction


def make_base():
    ent   = Entreprise.objects.create(nom='LOG SAS')
    dept  = Departement.objects.create(nom='DSI', code='DSI', entreprise=ent)
    svc   = Service.objects.create(nom='Dev', code='DEV', departement=dept)
    admin = Collaborateur.objects.create_user(
        matricule='ADM01', password='Pass123!',
        nom='A', prenom='B', email='a@log.com',
        role='ADMIN', service=svc,
    )
    archiviste = Collaborateur.objects.create_user(
        matricule='ARC01', password='Pass123!',
        nom='C', prenom='D', email='c@log.com',
        role='ARCHIVISTE', service=svc,
    )
    return admin, archiviste


class JournalModelTests(TestCase):
    def setUp(self):
        self.admin, self.archiviste = make_base()

    def test_create_journal_entry(self):
        j = JournalAction.objects.create(
            auteur=self.admin,
            type_action='CONNEXION',
            details='Test login',
            ip_adresse='127.0.0.1',
        )
        self.assertIsNotNone(j.id)
        self.assertEqual(j.type_action, 'CONNEXION')

    def test_journal_ordering_most_recent_first(self):
        JournalAction.objects.create(auteur=self.admin, type_action='CONNEXION', details='1er')
        JournalAction.objects.create(auteur=self.admin, type_action='CREATION',  details='2eme')
        actions = list(JournalAction.objects.all())
        self.assertEqual(actions[0].details, '2eme')

    def test_str_representation(self):
        j = JournalAction.objects.create(
            auteur=self.admin, type_action='CONSULTATION', details='Voir doc'
        )
        self.assertIn('CONSULTATION', str(j))


class JournalAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin, self.archiviste = make_base()
        JournalAction.objects.create(auteur=self.admin, type_action='CONNEXION',  details='Admin login')
        JournalAction.objects.create(auteur=self.admin, type_action='CREATION',   details='Create doc')
        JournalAction.objects.create(auteur=self.archiviste, type_action='MODIFICATION', details='Edit doc')

    def test_admin_can_list_journal(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(reverse('journal-list'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(r.data['count'], 3)

    def test_archiviste_cannot_list_journal(self):
        self.client.force_authenticate(user=self.archiviste)
        r = self.client.get(reverse('journal-list'))
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_filter_by_type_action(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(reverse('journal-list'), {'type_action': 'CONNEXION'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for action in r.data['results']:
            self.assertEqual(action['type_action'], 'CONNEXION')

    def test_search_by_details(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(reverse('journal-list'), {'search': 'Admin login'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(r.data['count'], 1)

    def test_export_csv_admin_only(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(reverse('journal-export-csv'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', r['Content-Type'])

    def test_export_csv_blocked_for_archiviste(self):
        self.client.force_authenticate(user=self.archiviste)
        r = self.client.get(reverse('journal-export-csv'))
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
