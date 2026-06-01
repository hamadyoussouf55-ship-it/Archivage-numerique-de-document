"""
Tests unitaires — app armoires
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Collaborateur
from apps.entreprise.models import Entreprise, Departement, Service
from .models import Armoire, Rayon


def make_base():
    ent  = Entreprise.objects.create(nom='TEST SAS')
    dept = Departement.objects.create(nom='DSI', code='DSI', entreprise=ent)
    svc  = Service.objects.create(nom='Sys', code='SYS', departement=dept)
    admin = Collaborateur.objects.create_user(
        matricule='ADM01', password='Pass123!',
        nom='A', prenom='B', email='a@t.com',
        role='ADMIN', service=svc,
    )
    consultant = Collaborateur.objects.create_user(
        matricule='CON01', password='Pass123!',
        nom='C', prenom='D', email='c@t.com',
        role='CONSULTANT', service=svc,
    )
    return ent, admin, consultant


class ArmoireModelTests(TestCase):
    def setUp(self):
        self.ent, self.admin, self.consultant = make_base()

    def test_armoire_str(self):
        arm = Armoire.objects.create(nom='Armoire A', code='ARM-A')
        self.assertIn('Armoire A', str(arm))

    def test_rayon_str(self):
        arm = Armoire.objects.create(nom='Armoire B', code='ARM-B')
        ray = Rayon.objects.create(code='R01', niveau=1, armoire=arm)
        self.assertIn('R01', str(ray))

    def test_rayon_belongs_to_armoire(self):
        arm = Armoire.objects.create(nom='Armoire C', code='ARM-C')
        ray = Rayon.objects.create(code='R02', niveau=2, armoire=arm)
        self.assertEqual(ray.armoire, arm)


class ArmoireAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ent, self.admin, self.consultant = make_base()

    def test_admin_can_list_armoires(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(reverse('armoire-list'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_consultant_can_list_armoires(self):
        self.client.force_authenticate(user=self.consultant)
        r = self.client.get(reverse('armoire-list'))
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_admin_can_create_armoire(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(reverse('armoire-list'), {
            'nom': 'Armoire Test', 'code': 'ARM-T',
            'description': 'test'
        })
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_consultant_cannot_create_armoire(self):
        self.client.force_authenticate(user=self.consultant)
        r = self.client.post(reverse('armoire-list'), {
            'nom': 'Armoire X', 'code': 'ARM-X',
        })
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_blocked(self):
        r = self.client.get(reverse('armoire-list'))
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
