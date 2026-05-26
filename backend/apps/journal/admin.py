from django.contrib import admin
from .models import JournalAction

@admin.register(JournalAction)
class JournalAdmin(admin.ModelAdmin):
    list_display    = ('date_action', 'type_action', 'auteur', 'document', 'ip_adresse')
    list_filter     = ('type_action',)
    search_fields   = ('auteur__nom', 'document__code_unique', 'details')
    readonly_fields = ('date_action', 'auteur', 'document', 'type_action', 'ip_adresse', 'details')

    def has_add_permission(self, request):
        return False
