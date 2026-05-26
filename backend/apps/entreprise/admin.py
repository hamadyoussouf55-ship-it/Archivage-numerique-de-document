from django.contrib import admin
from .models import Entreprise, Departement, Service, RoleDepartementService

class ServiceInline(admin.TabularInline):
    model = Service
    extra = 1

@admin.register(Entreprise)
class EntrepriseAdmin(admin.ModelAdmin):
    list_display = ('nom', 'adresse')

@admin.register(Departement)
class DepartementAdmin(admin.ModelAdmin):
    list_display  = ('code', 'nom', 'entreprise')
    list_filter   = ('entreprise',)
    inlines       = [ServiceInline]

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display  = ('code', 'nom', 'departement')
    list_filter   = ('departement',)

@admin.register(RoleDepartementService)
class RoleAdmin(admin.ModelAdmin):
    list_display  = ('collaborateur', 'departement', 'service', 'droit')
    list_filter   = ('droit',)
