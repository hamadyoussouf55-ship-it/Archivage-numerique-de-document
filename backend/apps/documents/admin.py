from django.contrib import admin
from .models import Document, MetadataDocument

class MetadataInline(admin.StackedInline):
    model = MetadataDocument
    extra = 0

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display    = ('code_unique', 'titre', 'type_doc', 'statut', 'rayon', 'createur', 'date_numerisation')
    list_filter     = ('statut', 'type_doc', 'rayon__armoire')
    search_fields   = ('code_unique', 'titre', 'type_doc')
    readonly_fields = ('code_unique', 'date_numerisation', 'nom_fichier', 'taille', 'chemin_stockage')
    inlines         = [MetadataInline]

@admin.register(MetadataDocument)
class MetadataAdmin(admin.ModelAdmin):
    list_display  = ('document', 'auteur', 'date_emission', 'destinataire')
    search_fields = ('auteur', 'destinataire')
