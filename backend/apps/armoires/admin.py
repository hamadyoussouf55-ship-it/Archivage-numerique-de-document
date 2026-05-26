from django.contrib import admin
from .models import Armoire, Rayon

class RayonInline(admin.TabularInline):
    model = Rayon
    extra = 1

@admin.register(Armoire)
class ArmoireAdmin(admin.ModelAdmin):
    list_display  = ('code', 'nom', 'nombre_rayons', 'nombre_documents')
    search_fields = ('nom', 'code')
    inlines       = [RayonInline]

@admin.register(Rayon)
class RayonAdmin(admin.ModelAdmin):
    list_display  = ('code', 'nom', 'position', 'armoire', 'nombre_documents')
    list_filter   = ('armoire',)
