"""
Export CSV et PDF des listes de documents.
Utilise uniquement des bibliothèques standard + reportlab (PDF) + csv (CSV).
"""
import csv
import io
from datetime import datetime
from django.http import HttpResponse


def export_documents_csv(queryset):
    """Exporte une queryset de documents en CSV."""
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = (
        f'attachment; filename="documents_{datetime.now():%Y%m%d_%H%M}.csv"'
    )

    writer = csv.writer(response, delimiter=';')
    writer.writerow([
        'Code unique', 'Titre', 'Type', 'Statut',
        'Date document', 'Date numerisation',
        'Armoire', 'Rayon',
        'Auteur', 'Createur', 'Taille',
    ])

    for doc in queryset.select_related('rayon', 'rayon__armoire', 'createur', 'metadata'):
        meta = getattr(doc, 'metadata', None)
        writer.writerow([
            doc.code_unique,
            doc.titre,
            doc.type_doc,
            doc.statut,
            doc.date_creation.strftime('%d/%m/%Y') if doc.date_creation else '',
            doc.date_numerisation.strftime('%d/%m/%Y %H:%M') if doc.date_numerisation else '',
            doc.rayon.armoire.nom if doc.rayon and doc.rayon.armoire else '',
            doc.rayon.code if doc.rayon else '',
            meta.auteur if meta else '',
            doc.createur.full_name if doc.createur else '',
            doc.taille_lisible,
        ])

    return response


def export_documents_pdf(queryset):
    """Exporte une queryset de documents en PDF (tableau)."""
    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        # Fallback CSV si reportlab non installé
        return export_documents_csv(queryset)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=2*cm,    bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'],
                                  fontSize=14, textColor=colors.HexColor('#1e3a5f'),
                                  spaceAfter=6, alignment=TA_CENTER)
    sub_style = ParagraphStyle('Sub', parent=styles['Normal'],
                                fontSize=9, textColor=colors.grey,
                                spaceAfter=12, alignment=TA_CENTER)

    elements = [
        Paragraph("SYGALIN SAS — Liste des Documents", title_style),
        Paragraph(f"Exporté le {datetime.now():%d/%m/%Y à %H:%M}", sub_style),
        Spacer(1, 0.3*cm),
    ]

    # En-têtes
    headers = ['Code unique', 'Titre', 'Type', 'Statut', 'Date doc', 'Armoire', 'Rayon', 'Createur']
    data = [headers]

    for doc in queryset.select_related('rayon', 'rayon__armoire', 'createur'):
        titre = doc.titre[:40] + '…' if len(doc.titre) > 40 else doc.titre
        data.append([
            doc.code_unique,
            titre,
            doc.type_doc,
            doc.statut,
            doc.date_creation.strftime('%d/%m/%Y') if doc.date_creation else '',
            doc.rayon.armoire.nom[:15] if doc.rayon and doc.rayon.armoire else '',
            doc.rayon.code if doc.rayon else '',
            doc.createur.full_name[:20] if doc.createur else '',
        ])

    col_widths = [3.8*cm, 5.5*cm, 2.5*cm, 2*cm, 2.2*cm, 3*cm, 2*cm, 3*cm]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        # En-tête
        ('BACKGROUND',   (0, 0), (-1, 0),  colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR',    (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',     (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',     (0, 0), (-1, 0),  8),
        ('ALIGN',        (0, 0), (-1, 0),  'CENTER'),
        # Corps
        ('FONTNAME',     (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',     (0, 1), (-1, -1), 7.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4ff')]),
        ('GRID',         (0, 0), (-1, -1), 0.4, colors.HexColor('#d1d5db')),
        ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',   (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 4),
        ('LEFTPADDING',  (0, 0), (-1, -1), 5),
    ]))

    elements.append(t)
    doc.build(elements)

    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = (
        f'attachment; filename="documents_{datetime.now():%Y%m%d_%H%M}.pdf"'
    )
    return response


def export_journal_csv(queryset):
    """Exporte une queryset d'actions journal en CSV."""
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = (
        f'attachment; filename="journal_{datetime.now():%Y%m%d_%H%M}.csv"'
    )

    writer = csv.writer(response, delimiter=';')
    writer.writerow([
        'Date', 'Heure', 'Type action', 'Utilisateur',
        'Matricule', 'Document (code)', 'Détails', 'IP',
    ])

    for action in queryset.select_related('auteur', 'document'):
        writer.writerow([
            action.date_action.strftime('%d/%m/%Y') if action.date_action else '',
            action.date_action.strftime('%H:%M:%S') if action.date_action else '',
            action.type_action,
            action.auteur.full_name if action.auteur else '',
            action.auteur.matricule if action.auteur else '',
            action.document.code_unique if action.document else '',
            action.details,
            action.ip_adresse or '',
        ])

    return response


def export_journal_pdf(queryset):
    """Exporte le journal en PDF."""
    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER
    except ImportError:
        return export_journal_csv(queryset)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=landscape(A4),
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=2*cm,    bottomMargin=2*cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('T', parent=styles['Title'], fontSize=14,
                                  textColor=colors.HexColor('#1e3a5f'), alignment=TA_CENTER, spaceAfter=4)
    sub_style   = ParagraphStyle('S', parent=styles['Normal'], fontSize=9,
                                  textColor=colors.grey, alignment=TA_CENTER, spaceAfter=12)

    TYPE_COLORS = {
        'CREATION':       '#16a34a',
        'MODIFICATION':   '#2563eb',
        'SUPPRESSION':    '#dc2626',
        'CONSULTATION':   '#64748b',
        'TELECHARGEMENT': '#0891b2',
        'DEPLACEMENT':    '#d97706',
        'CONNEXION':      '#7c3aed',
        'DECONNEXION':    '#9ca3af',
    }

    elements = [
        Paragraph("SYGALIN SAS — Journal d'Actions", title_style),
        Paragraph(f"Exporté le {datetime.now():%d/%m/%Y à %H:%M}", sub_style),
        Spacer(1, 0.3*cm),
    ]

    headers = ['Date', 'Heure', 'Action', 'Utilisateur', 'Document', 'Détails', 'IP']
    data = [headers]

    for action in queryset.select_related('auteur', 'document'):
        details = (action.details or '')[:60]
        data.append([
            action.date_action.strftime('%d/%m/%Y') if action.date_action else '',
            action.date_action.strftime('%H:%M:%S') if action.date_action else '',
            action.type_action,
            action.auteur.full_name[:25] if action.auteur else '',
            action.document.code_unique if action.document else '',
            details + ('…' if len(action.details or '') > 60 else ''),
            action.ip_adresse or '',
        ])

    col_widths = [2.2*cm, 2*cm, 2.8*cm, 4*cm, 3.8*cm, 8*cm, 2.8*cm]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0),  colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR',     (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',      (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0),  8),
        ('ALIGN',         (0, 0), (-1, 0),  'CENTER'),
        ('FONTNAME',      (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',      (0, 1), (-1, -1), 7.5),
        ('ROWBACKGROUNDS',(0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4ff')]),
        ('GRID',          (0, 0), (-1, -1), 0.4, colors.HexColor('#d1d5db')),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 5),
    ]))

    elements.append(t)
    doc.build(elements)
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = (
        f'attachment; filename="journal_{datetime.now():%Y%m%d_%H%M}.pdf"'
    )
    return response
