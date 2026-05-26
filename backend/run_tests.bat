@echo off
echo ============================================
echo   SYGALIN SAS - Tests unitaires v5
echo ============================================
call venv\Scripts\activate
python manage.py test apps.accounts apps.documents apps.armoires apps.journal --verbosity=2
