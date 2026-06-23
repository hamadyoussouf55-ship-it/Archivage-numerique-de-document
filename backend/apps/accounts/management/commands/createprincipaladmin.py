from django.core.management.base import BaseCommand
from apps.accounts.models import Collaborateur


class Command(BaseCommand):
    help = "Crée l'administrateur principal (is_principal=True)"

    def add_arguments(self, parser):
        parser.add_argument('--email',    required=True)
        parser.add_argument('--nom',      required=True)
        parser.add_argument('--prenom',   required=True)
        parser.add_argument('--matricule', required=True)
        parser.add_argument('--password', required=True)

    def handle(self, *args, **options):
        if Collaborateur.objects.filter(is_principal=True).exists():
            self.stderr.write(self.style.ERROR("Un administrateur principal existe déjà."))
            return
        user = Collaborateur.objects.create_user(
            email=options['email'],
            password=options['password'],
            nom=options['nom'],
            prenom=options['prenom'],
            matricule=options['matricule'],
            role='ADMIN',
            is_principal=True,
            is_staff=True,
        )
        self.stdout.write(self.style.SUCCESS(
            f"Administrateur principal créé : {user.prenom} {user.nom} ({user.email})"
        ))
