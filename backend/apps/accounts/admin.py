from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Collaborateur

@admin.register(Collaborateur)
class CollaborateurAdmin(UserAdmin):
    list_display  = ('matricule', 'full_name', 'email', 'role', 'departement', 'is_active')
    list_filter   = ('role', 'is_active', 'departement')
    search_fields = ('nom', 'prenom', 'email', 'matricule')
    ordering      = ('nom',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informations', {'fields': ('nom', 'prenom', 'matricule')}),
        ('Organisation', {'fields': ('entreprise', 'departement', 'service', 'role')}),
        ('Permissions',  {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates',        {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'nom', 'prenom', 'matricule', 'role', 'password1', 'password2')}),
    )
