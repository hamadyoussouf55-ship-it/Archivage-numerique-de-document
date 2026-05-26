#!/bin/bash
echo "============================================"
echo "  SYGALIN SAS - Tests unitaires v5"
echo "============================================"
source venv/bin/activate
python manage.py test apps.accounts apps.documents apps.armoires apps.journal --verbosity=2
