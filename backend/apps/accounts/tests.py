"""
Tests unitaires — app accounts
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Collaborateur
from apps.entreprise.models import Entreprise, Departement, Service


def make_entreprise():
    return Entreprise.objects.create(
        nom='SYGALIN SAS TEST'
    )


def make_departement(entreprise):
    return Departement.objects.create(
        nom='DSI', code='DSI', entreprise=entreprise
    )


def make_service(departement):
    return Service.objects.create(
        nom='Dev', code='DEV', departement=departement
    )


def make_user(role='ADMIN', matricule='ADM001', service=None, **kwargs):
    u = Collaborateur.objects.create_user(
        matricule=matricule,
        password='TestPass123!',
        nom='Test', prenom='User',
        email=f'{matricule.lower()}@sygalin.test',
        role=role,
        service=service,
        **kwargs
    )
    return u


class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ent  = make_entreprise()
        self.dept = make_departement(self.ent)
        self.svc  = make_service(self.dept)
        self.admin = make_user(role='ADMIN', matricule='ADM001', service=self.svc)

    def test_login_success(self):
        url = reverse('token_obtain_pair')
        r = self.client.post(url, {'matricule': 'ADM001', 'password': 'TestPass123!'})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('access', r.data)
        self.assertIn('refresh', r.data)

    def test_login_wrong_password(self):
        url = reverse('token_obtain_pair')
        r = self.client.post(url, {'matricule': 'ADM001', 'password': 'WrongPass!'})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unknown_user(self):
        url = reverse('token_obtain_pair')
        r = self.client.post(url, {'matricule': 'ZZZ999', 'password': 'Pass!'})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_requires_auth(self):
        url = reverse('profile')
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_returns_user_data(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('profile')
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data['matricule'], 'ADM001')
        self.assertEqual(r.data['role'], 'ADMIN')

    def test_logout_blacklists_token(self):
        # Login
        url_login = reverse('token_obtain_pair')
        r = self.client.post(url_login, {'matricule': 'ADM001', 'password': 'TestPass123!'})
        refresh = r.data['refresh']
        self.client.force_authenticate(user=self.admin)
        # Logout
        url_logout = reverse('logout')
        r2 = self.client.post(url_logout, {'refresh': refresh})
        self.assertEqual(r2.status_code, status.HTTP_200_OK)


class RolePermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ent  = make_entreprise()
        self.dept = make_departement(self.ent)
        self.svc  = make_service(self.dept)
        self.admin      = make_user('ADMIN',      'ADM001', self.svc)
        self.archiviste = make_user('ARCHIVISTE',  'ARC001', self.svc)
        self.consultant = make_user('CONSULTANT',  'CON001', self.svc)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_access_journal(self):
        self._auth(self.admin)
        r = self.client.get(reverse('journal-list'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_archiviste_cannot_access_journal(self):
        self._auth(self.archiviste)
        r = self.client.get(reverse('journal-list'))
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_consultant_cannot_access_journal(self):
        self._auth(self.consultant)
        r = self.client.get(reverse('journal-list'))
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_full_name_property(self):
        self.assertEqual(self.admin.full_name, 'Test User')


class CollaborateurModelTests(TestCase):
    def setUp(self):
        self.ent  = make_entreprise()
        self.dept = make_departement(self.ent)
        self.svc  = make_service(self.dept)

    def test_create_user_sets_fields(self):
        u = make_user('ARCHIVISTE', 'ARC002', self.svc)
        self.assertEqual(u.matricule, 'ARC002')
        self.assertEqual(u.role, 'ARCHIVISTE')
        self.assertTrue(u.check_password('TestPass123!'))

    def test_superuser_is_admin(self):
        su = Collaborateur.objects.create_superuser(
            matricule='SU001', password='Admin123!',
            nom='Super', prenom='Admin', email='su@sygalin.test',
        )
        self.assertTrue(su.is_superuser)
        self.assertTrue(su.is_staff)
