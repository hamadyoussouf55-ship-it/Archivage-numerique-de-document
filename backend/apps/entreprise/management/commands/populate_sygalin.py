"""
Commande Django pour peupler la base avec toutes les donnees SYGALIN SAS.

Placer dans : apps/entreprise/management/commands/populate_sygalin.py
Creer aussi : apps/entreprise/management/__init__.py  (vide)
              apps/entreprise/management/commands/__init__.py  (vide)

Lancer : python manage.py populate_sygalin
"""
from django.core.management.base import BaseCommand


DEPARTEMENTS = [
    ("Direction Generale",                           "DG"),
    ("Direction Comptabilite et Fiscalite",          "DCF"),
    ("Direction des Ressources Humaines",            "DRHCJ"),
    ("Direction des Systemes d Information",         "DSI"),
    ("Direction Financiere",                         "DFIN"),
    ("Direction Commerciale",                        "DCO"),
    ("Direction Strategies et Formation",            "DSF"),
    ("Direction de la Logistique",                   "DLOG"),
    ("Direction des Reabonnements",                  "DREABO"),
    ("Credit Management",                            "CREDIT-M"),
    ("Direction Technique",                          "DT"),
    ("Controleur",                                   "CTRL"),
    ("Customer Relation Management",                 "CRM"),
    ("Corporate Sales",                              "CS"),
    ("Direction des Ventes",                         "DV"),
    ("Comptabilite",                                 "COMPTA"),
]

# (code_departement, nom_service, code_service)
SERVICES = [
    ("DG",       "Presidence",                          "PRES"),
    ("DG",       "Assistants Direction",                "ASS-DIR"),
    ("DG",       "Projet",                              "PROJET"),
    ("DRHCJ",    "Ressources Humaines",                 "RH"),
    ("DRHCJ",    "Conseil Juridique",                   "CJ"),
    ("DSI",      "Developpement et Maintenance",        "DEV"),
    ("DSI",      "Systemes et Reseaux",                 "SYS-RES"),
    ("DSI",      "Support Technique",                   "SUPPORT"),
    ("DFIN",     "Tresorerie",                          "TRES"),
    ("DFIN",     "Controle des Operations Comptables",  "DCOH"),
    ("DCO",      "Ventes et Distribution",              "VENTES"),
    ("DCO",      "Call et Activation",                  "CALL-ACT"),
    ("DCO",      "Apporteurs Affaires",                 "RAA"),
    ("DSF",      "Strategies",                          "STRAT"),
    ("DSF",      "Formation",                           "FORM"),
    ("DLOG",     "Logistique Boutiques",                "LOG-BQ"),
    ("DLOG",     "Responsable Boutique",                "RBOA"),
    ("DREABO",   "Reabonnements",                       "REABO"),
    ("DREABO",   "Responsable Secteur Reabonnements",   "RSY"),
    ("CREDIT-M", "Credit Management",                   "CM"),
    ("CREDIT-M", "Assistante Credit",                   "ASS-CM"),
    ("DT",       "Direction Technique Service",         "DT-TECH"),
    ("DT",       "Service Apres Vente",                 "SAV"),
    ("CRM",      "Appels et Activations",               "DCAA"),
    ("CRM",      "Departement du Controle",             "DCONTROL"),
    ("CS",       "Corporate Sales Service",             "CS-SVC"),
    ("DV",       "Force de Vente Itinerante",           "FVI"),
    ("DV",       "Brand Ambassador",                    "BA"),
    ("DV",       "Ambassador Manager Senior",           "SBM"),
    ("COMPTA",   "Facturation",                         "FACT"),
    ("COMPTA",   "Tresorerie Comptable",                "TRES-C"),
]

# (nom_armoire, code_armoire, description, code_service, [(nom_rayon, code_rayon, position), ...])
ARMOIRES = [
    ("Armoire Direction Generale", "ARM-DG",
     "Documents Direction Generale et Conseil Juridique", "PRES", [
         ("Proces-verbaux et decisions",    "R-DG-PV",  1),
         ("Contrats et conventions",        "R-DG-CTR", 2),
         ("Courriers et correspondances",   "R-DG-CR",  3),
     ]),
    ("Armoire Comptabilite Fiscalite", "ARM-DCF",
     "Documents comptables et fiscaux", "FACT", [
         ("Factures exercice 2024",         "R-DCF-F24",  1),
         ("Factures exercice 2025",         "R-DCF-F25",  2),
         ("Etats financiers et bilans",     "R-DCF-EF",   3),
         ("Declarations fiscales",          "R-DCF-DECL", 4),
     ]),
    ("Armoire Ressources Humaines", "ARM-RH",
     "Dossiers du personnel et contrats", "RH", [
         ("Contrats de travail CDI CDD",    "R-RH-CTR",  1),
         ("Bulletins de salaire",           "R-RH-PAIE", 2),
         ("Conventions et rapports stage",  "R-RH-STAG", 3),
         ("Documents de formation",         "R-RH-FORM", 4),
     ]),
    ("Armoire Systemes Information", "ARM-DSI",
     "Documentation technique et licences", "DEV", [
         ("Licences logicielles",           "R-DSI-LIC",  1),
         ("Manuels et procedures",          "R-DSI-DOC",  2),
         ("Documents projets informatiques","R-DSI-PROJ", 3),
     ]),
    ("Armoire Direction Financiere", "ARM-DFIN",
     "Documents financiers et budgets", "TRES", [
         ("Budgets previsionnels",          "R-DFIN-BUD",  1),
         ("Documents de tresorerie",        "R-DFIN-TRES", 2),
         ("Rapports financiers mensuels",   "R-DFIN-RPT",  3),
     ]),
    ("Armoire Direction Commerciale", "ARM-DCO",
     "Plans commerciaux et rapports de ventes", "VENTES", [
         ("Plans d action commerciaux",     "R-DCO-PAC", 1),
         ("Rapports de ventes",             "R-DCO-RV",  2),
         ("Dossiers clients entreprises",   "R-DCO-CLI", 3),
     ]),
    ("Armoire Logistique", "ARM-DLOG",
     "Bons de commande stocks et livraisons", "LOG-BQ", [
         ("Bons de commande decodeurs",     "R-LOG-BC",  1),
         ("Etats de stock boutiques",       "R-LOG-STK", 2),
         ("Bons de livraison",              "R-LOG-LIV", 3),
     ]),
    ("Armoire Reabonnements", "ARM-REABO",
     "Dossiers reabonnements et suivi clients", "REABO", [
         ("Dossiers de reabonnement",       "R-REABO-D",   1),
         ("Rapports de suivi mensuel",      "R-REABO-RPT", 2),
     ]),
    ("Armoire Direction Technique", "ARM-DT",
     "Documents techniques et SAV", "DT-TECH", [
         ("Fiches d intervention SAV",      "R-DT-SAV",   1),
         ("Documents equipements",          "R-DT-EQUIP", 2),
     ]),
    ("Armoire Corporate Sales", "ARM-CS",
     "Contrats et dossiers corporate", "CS-SVC", [
         ("Contrats entreprises",           "R-CS-CTR", 1),
         ("Propositions commerciales",      "R-CS-PRO", 2),
     ]),
]

# (matricule, password, nom, prenom, email, role, code_service)
USERS = [
    ("ADMIN001", "Admin@2025", "Administrateur", "Systeme",   "admin@sygalin.com",      "ADMIN",      "DEV"),
    ("ARC001",   "Arc@2025",   "Archiviste",     "Principal", "archiviste@sygalin.com", "ARCHIVISTE", "RH"),
    ("CON001",   "Con@2025",   "Consultant",     "Invite",    "consultant@sygalin.com", "CONSULTANT", "VENTES"),
    ("DG001",    "Dg@2025",    "Directeur",      "General",   "dg@sygalin.com",         "ADMIN",      "PRES"),
    ("RH001",    "Rh@2025",    "Responsable",    "RH",        "rh@sygalin.com",         "ARCHIVISTE", "RH"),
]


class Command(BaseCommand):
    help = "Peuple la base avec toutes les donnees initiales de SYGALIN SAS"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=== Demarrage peuplement SYGALIN SAS ===\n"))
        self._create_entreprise()
        self._create_departements_services()
        self._create_armoires_rayons()
        self._create_users()
        self.stdout.write(self.style.SUCCESS("\n=== Peuplement termine avec succes ! ==="))
        self.stdout.write("\nComptes disponibles :")
        self.stdout.write("  ADMIN      : ADMIN001 / Admin@2025")
        self.stdout.write("  ARCHIVISTE : ARC001   / Arc@2025")
        self.stdout.write("  CONSULTANT : CON001   / Con@2025")

    def _create_entreprise(self):
        from apps.entreprise.models import Entreprise
        self.entreprise, created = Entreprise.objects.get_or_create(
            nom="SYGALIN SAS",
            defaults={"adresse": "Carrefour 140, Ngaoundere, BP 450"}
        )
        self.stdout.write(f"[1/4] Entreprise {'creee' if created else 'existante'} : {self.entreprise.nom}")

    def _create_departements_services(self):
        from apps.entreprise.models import Departement, Service

        self.dept_map = {}
        d_new = 0
        for nom, code in DEPARTEMENTS:
            dept, created = Departement.objects.get_or_create(
                code=code,
                defaults={"nom": nom, "entreprise": self.entreprise}
            )
            if not created:
                dept.nom = nom
                dept.entreprise = self.entreprise
                dept.save()
            self.dept_map[code] = dept
            if created:
                d_new += 1
        self.stdout.write(f"[2/4] Departements : {d_new} crees, {len(DEPARTEMENTS)-d_new} mis a jour")

        self.svc_map = {}
        s_new = 0
        for code_dept, nom_svc, code_svc in SERVICES:
            dept = self.dept_map.get(code_dept)
            if not dept:
                continue
            svc, created = Service.objects.get_or_create(
                code=code_svc,
                defaults={"nom": nom_svc, "departement": dept}
            )
            if not created:
                svc.nom = nom_svc
                svc.departement = dept
                svc.save()
            self.svc_map[code_svc] = svc
            if created:
                s_new += 1
        self.stdout.write(f"      Services     : {s_new} crees, {len(SERVICES)-s_new} mis a jour")
    def _create_armoires_rayons(self):
        from apps.armoires.models import Armoire, Rayon

        a_new = 0
        r_new = 0
        total_rayons = sum(len(a[4]) for a in ARMOIRES)

        for nom, code, description, code_svc, rayons in ARMOIRES:
            svc = self.svc_map.get(code_svc)
            if not svc:
                self.stdout.write(self.style.WARNING(f"  Service {code_svc} introuvable pour {code}, ignore"))
                continue
            arm, created = Armoire.objects.update_or_create(
                code=code,
                defaults={"nom": nom, "description": description, "service": svc}
            )
            if created:
                a_new += 1

            for nom_rayon, code_rayon, position in rayons:
                Rayon.objects.update_or_create(
                    code=code_rayon,
                    defaults={"nom": nom_rayon, "position": position, "armoire": arm}
                )
                if created:
                    r_new += 1

        self.stdout.write(f"[3/4] Armoires : {a_new} creees, {len(ARMOIRES)-a_new} mises a jour")
        self.stdout.write(f"      Rayons   : {r_new} crees, {total_rayons-r_new} mis a jour")

    def _create_users(self):
        from apps.accounts.models import Collaborateur

        u_new = 0
        for matricule, password, nom, prenom, email, role, code_svc in USERS:
            if Collaborateur.objects.filter(matricule=matricule).exists():
                continue
            svc = self.svc_map.get(code_svc)
            try:
                Collaborateur.objects.create_user(
                    matricule=matricule,
                    password=password,
                    nom=nom,
                    prenom=prenom,
                    email=email,
                    role=role,
                    service=svc,
                )
                u_new += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Utilisateur {matricule} ignore : {e}"))

        self.stdout.write(f"[4/4] Utilisateurs : {u_new} crees, {len(USERS)-u_new} existants")
