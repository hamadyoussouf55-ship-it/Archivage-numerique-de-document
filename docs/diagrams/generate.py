"""Génère les diagrammes drawio pour le projet SYGALIN Archivage Numérique."""

import os, html

DIAGRAMS_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Utilitaires drawio ────────────────────────────────────────────────
ID_COUNTER = [0]
def next_id():
    ID_COUNTER[0] += 1
    return str(ID_COUNTER[0])

def cell(value="", style="", parent="1", vertex=None, edge=None, geometry=None):
    attrs = f'id="{next_id()}"'
    if value: attrs += f' value="{html.escape(value)}"'
    if style: attrs += f' style="{html.escape(style)}"'
    if parent: attrs += f' parent="{parent}"'
    if vertex: attrs += ' vertex="1"'
    if edge: attrs += ' edge="1"'
    geom = ""
    if geometry:
        g = ' '.join(f'{k}="{v}"' for k, v in geometry.items())
        geom = f'<mxGeometry {g} as="geometry"/>'
    return f'<mxCell {attrs}>{" " + geom if geom else ""}</mxCell>'

def rect(x, y, w, h, text, **style_kw):
    s = ";".join(f"{k}={v}" for k, v in style_kw.items())
    return cell(text, s, vertex=True, geometry={"x": x, "y": y, "width": w, "height": h})

def line(x1, y1, x2, y2, text="", **style_kw):
    s = ";".join(f"{k}={v}" for k, v in style_kw.items())
    geom = f'<mxGeometry relative="1" as="geometry"><mxPoint x="{x1}" y="{y1}" as="sourcePoint"/><mxPoint x="{x2}" y="{y2}" as="targetPoint"/></mxGeometry>'
    attrs = f'id="{next_id()}" value="{html.escape(text)}" style="{html.escape(s)}" parent="1" edge="1"'
    return f'<mxCell {attrs}>{" " + geom}</mxCell>'

def wrap(title, cells):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram id="{next_id()}" name="{html.escape(title)}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        {chr(10).join("        " + c for c in cells)}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>'''

# ── Helpers ───────────────────────────────────────────────────────────
FONT = "fontFamily=Helvetica;fontSize=11;"
BLUE = "#2563eb"
LGRAY = "#f1f5f9"
WHITE = "#ffffff"

def uml_class(x, y, w, h, name, attrs, methods):
    """UML class box with sections."""
    lines = [f"<b>{name}</b>"]
    if attrs:
        lines.append("<hr>")
        lines.extend(attrs)
    if methods:
        lines.append("<hr>")
        lines.extend(methods)
    text = "<br>".join(lines)
    style = f"shape=umlClass;whiteSpace=wrap;html=1;{FONT}fillColor={LGRAY};strokeColor={BLUE};rounded=1;overflow=hidden;"
    return rect(x, y, w, h, text, **dict(p.split("=") for p in style.split(";") if "=" in p))

def connector(x1, y1, x2, y2, label="", style=""):
    return line(x1, y1, x2, y2, label, **dict(p.split("=") for p in style.split(";") if "=" in p))

def label(x, y, w, h, text, **kw):
    s = ";".join(f"{k}={v}" for k, v in kw.items())
    return cell(text, s, vertex=True, geometry={"x": x, "y": y, "width": w, "height": h})

def actor(x, y, label_text):
    """Stickman figure for use case diagram."""
    cells = []
    # Head
    cells.append(rect(x-8, y, 16, 16, "", rounded=0, whiteSpace="wrap", html=1, FONT=FONT, fillColor=WHITE, strokeColor=BLUE, shape="ellipse"))
    # Body
    cells.append(line(x, y+16, x, y+50, "", strokeColor=BLUE, strokeWidth=2))
    # Arms
    cells.append(line(x-15, y+28, x+15, y+28, "", strokeColor=BLUE, strokeWidth=2))
    # Legs
    cells.append(line(x, y+50, x-12, y+80, "", strokeColor=BLUE, strokeWidth=2))
    cells.append(line(x, y+50, x+12, y+80, "", strokeColor=BLUE, strokeWidth=2))
    # Label
    cells.append(label(x-40, y+82, 80, 20, f"<b><center>{label_text}</center></b>", textAlign="center", html=1, FONT=FONT, strokeColor="none", fillColor="none"))
    return cells

def use_case(x, y, text):
    """Oval use case shape."""
    style = f"ellipse;whiteSpace=wrap;html=1;{FONT}fillColor={WHITE};strokeColor={BLUE};"
    return rect(x, y, 130, 40, text, **dict(p.split("=") for p in style.split(";") if "=" in p))

def lifeline(x, top, bottom, label_text):
    """Lifeline for sequence diagram."""
    cells = []
    # Actor/object box
    cells.append(rect(x-45, top, 90, 28, label_text, rounded=1, whiteSpace="wrap", html=1, FONT=FONT, fillColor=LGRAY, strokeColor=BLUE))
    # Dashed vertical line
    cells.append(line(x, top+28, x, bottom, "", strokeColor="#94a3b8", strokeWidth=1, dashed=1))
    return cells

def arrow(x1, y1, x2, y2, label_text, style=""):
    default = f"endArrow=block;html=1;{FONT}strokeColor={BLUE};fontSize=10;"
    s = default + style
    return line(x1, y1, x2, y2, label_text, **dict(p.split("=") for p in s.split(";") if "=" in p))

def sync_arrow(x1, y1, x2, y2, label_text):
    """Synchronous message arrow (filled arrowhead)."""
    return arrow(x1, y1, x2, y2, label_text, "endArrow=blockThin;")

def async_arrow(x1, y1, x2, y2, label_text):
    """Asynchronous message arrow (open arrowhead)."""
    return arrow(x1, y1, x2, y2, label_text, "endArrow=open;")

def return_arrow(x1, y1, x2, y2, label_text=""):
    """Return/dashed arrow."""
    return arrow(x1, y1, x2, y2, label_text, "endArrow=open;dashed=1;")

def activation(x, y, h):
    return rect(x-6, y, 12, h, "", rounded=0, whiteSpace="wrap", html=1, fillColor=WHITE, strokeColor=BLUE)

# ═══════════════════════════════════════════════════════════════════════
#  1. CLASS DIAGRAM
# ═══════════════════════════════════════════════════════════════════════
def make_class_diagram():
    c = []

    # ── Entreprise (top) ──
    ex, ey = 120, 40
    c.append(uml_class(ex, ey, 180, 70, "Entreprise", ["+ nom : str", "+ adresse : text"], []))
    # ── Departement ──
    dx, dy = 60, 180
    c.append(uml_class(dx, dy, 180, 85, "Departement", ["+ nom : str", "+ code : str"], []))
    # ── Service ──
    sx, sy = 320, 180
    c.append(uml_class(sx, sy, 180, 85, "Service", ["+ nom : str", "+ code : str"], []))
    # ── Armoire ──
    ax, ay = 50, 330
    c.append(uml_class(ax, ay, 220, 110, "Armoire", ["+ nom : str", "+ code : str", "+ description : text"], ["+ nombre_rayons()", "+ chemin_complet()"]))
    # ── Rayon ──
    rx, ry = 350, 330
    c.append(uml_class(rx, ry, 220, 110, "Rayon", ["+ nom : str", "+ code : str", "+ position : str"], ["+ nombre_documents()", "+ chemin_complet()"]))
    # ── Document ──
    docx, docy = 115, 490
    c.append(uml_class(docx, docy, 220, 130, "Document", ["+ titre : str", "+ type_doc : str", "+ statut : str", "+ fichier : FileField", "+ code_unique : str"], ["+ _generer_code()", "+ taille_lisible()"]))
    # ── MetadataDocument ──
    mx, my = 400, 500
    c.append(uml_class(mx, my, 200, 110, "MetadataDocument", ["+ auteur : str", "+ destinataire : str", "+ description : text", "+ mots_cles : JSON"], []))
    # ── VersionDocument ──
    vx, vy = 60, 680
    c.append(uml_class(vx, vy, 220, 110, "VersionDocument", ["+ numero : int", "+ fichier : FileField", "+ commentaire : text"], []))
    # ── DocumentShare ──
    shx, shy = 350, 680
    c.append(uml_class(shx, shy, 220, 110, "DocumentShare", ["+ cle_securite : str", "+ date_expiration : date", "+ telechargements_max : int"], []))
    # ── Collaborateur ──
    clx, cly = 610, 40
    c.append(uml_class(clx, cly, 200, 110, "Collaborateur", ["+ nom : str", "+ prenom : str", "+ email : str", "+ role : str (ADMIN/…)", "+ matricule : str"], []))
    # ── RoleDepartementService ──
    rdx, rdy = 640, 220
    c.append(uml_class(rdx, rdy, 220, 90, "RoleDepartementService", ["+ droit : str"], []))
    # ── JournalAction ──
    jx, jy = 640, 380
    c.append(uml_class(jx, jy, 220, 110, "JournalAction", ["+ type_action : str", "+ date_action : datetime", "+ ip_adresse : str", "+ details : text"], []))

    # ── Relations ──
    def rel(x1, y1, x2, y2, label, style):
        cc = connector(x1, y1, x2, y2, label, style)
        return cc

    # Entreprise 1---* Departement
    c.append(rel(ex+180, ey+35, dx+90, dy, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};exitX=1;exitY=0.5;"))
    # Departement 1---* Service
    c.append(rel(dx+180, dy+42, sx, sy+42, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Service 1---* Armoire
    c.append(rel(sx+180, sy+42, ax+220, ay+55, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Armoire 1---* Rayon
    c.append(rel(ax+220, ay+55, rx, ry+55, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Rayon 1---* Document
    c.append(rel(rx+220, ry+55, docx+220, docy+65, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Document 1---1 MetadataDocument
    c.append(rel(docx+220, docy+30, mx, my+20, "1    1", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Document 1---* VersionDocument
    c.append(rel(docx+220, docy+100, vx+220, vy+55, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Document 1---* DocumentShare
    c.append(rel(docx, docy+100, shx, shy+55, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Collaborateur 1---* Document (createur)
    c.append(rel(clx, cly+55, docx+220, docy+65, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Collaborateur *---* RoleDepartementService ---* Departement/Service
    c.append(rel(clx+200, cly+20, rdx+220, rdy+30, "*    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    c.append(rel(rdx, rdy+45, dx+180, dy+42, "", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Collaborateur 1---* JournalAction
    c.append(rel(clx+200, cly+80, jx+220, jy+40, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))
    # Document 1---* JournalAction
    c.append(rel(docx+220, docy+110, jx+220, jy+70, "1    ──── *", f"endArrow=open;endFill=1;strokeColor={BLUE};"))

    return wrap("Diagramme de Classes", c)

# ═══════════════════════════════════════════════════════════════════════
#  2. USE CASE DIAGRAM
# ═══════════════════════════════════════════════════════════════════════
def make_use_case_diagram():
    c = []

    # System boundary
    c.append(rect(200, 20, 1050, 750, "<b>Système d'Archivage Numérique</b>", rounded=1, whiteSpace="wrap", html=1, FONT=FONT, fillColor="none", strokeColor=BLUE, strokeWidth=2, fontSize=14, dashPattern="8 4"))

    # ── Actors ──
    for act in actor(80, 60, "Administrateur"):
        c.append(act)
    for act in actor(80, 260, "Archiviste"):
        c.append(act)
    for act in actor(80, 460, "Consultant"):
        c.append(act)

    # ── Use cases (Admin area - top right) ──
    admin_ucs = [
        (320, 40, "Gérer les collaborateurs"),
        (320, 100, "Gérer l'organisation"),
        (320, 160, "Gérer armoires & rayons"),
        (320, 220, "Consulter le journal"),
    ]
    for x, y, text in admin_ucs:
        c.append(use_case(x, y, text))

    # ── Use cases (Admin+Archiviste - middle) ──
    shared_ucs = [
        (530, 100, "Déposer un document"),
        (530, 160, "Modifier un document"),
        (530, 220, "Partager un document"),
        (530, 280, "Versionner un document"),
    ]
    for x, y, text in shared_ucs:
        c.append(use_case(x, y, text))

    # ── Use cases (Déplacer) ──
    c.append(use_case(530, 340, "Déplacer un document"))

    # ── Use cases (All authenticated) ──
    all_ucs = [
        (760, 40, "S'authentifier"),
        (760, 100, "Consulter documents"),
        (760, 160, "Rechercher documents"),
        (760, 220, "Télécharger document"),
        (760, 280, "Prévisualiser document"),
        (760, 340, "Voir les statistiques"),
    ]
    for x, y, text in all_ucs:
        c.append(use_case(x, y, text))

    # ── Connections Actor → Use Cases ──
    # Admin
    c.append(line(115, 100, 320, 60, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 100, 320, 120, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 100, 320, 180, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 100, 320, 240, "", strokeColor=BLUE, strokeWidth=1))
    # Admin to shared
    c.append(line(115, 100, 530, 120, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 100, 530, 180, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 100, 530, 240, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 100, 530, 300, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 100, 530, 360, "", strokeColor=BLUE, strokeWidth=1))
    # Archiviste to shared
    c.append(line(115, 300, 530, 120, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 300, 530, 180, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 300, 530, 240, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 300, 530, 300, "", strokeColor=BLUE, strokeWidth=1))
    c.append(line(115, 300, 530, 360, "", strokeColor=BLUE, strokeWidth=1))
    # All actors to all_ucs
    for ax in [(115, 100), (115, 300), (115, 500)]:
        for ux, uy, _ in all_ucs:
            c.append(line(ax[0], ax[1], ux, uy+20, "", strokeColor=BLUE, strokeWidth=1))

    return wrap("Diagramme de Cas d'Utilisation", c)

# ═══════════════════════════════════════════════════════════════════════
#  3. SEQUENCE - AUTH
# ═══════════════════════════════════════════════════════════════════════
def make_sequence_auth():
    c = []
    top, bottom = 40, 550
    cx, sx, bx, rx = 100, 280, 460, 620  # x-positions for lifelines

    for cell in lifeline(cx, top, bottom, "<b>Utilisateur</b>"):
        c.append(cell)
    for cell in lifeline(sx, top, bottom, "<b>LoginPage</b>"):
        c.append(cell)
    for cell in lifeline(bx, top, bottom, "<b>AuthContext</b>"):
        c.append(cell)
    for cell in lifeline(rx, top, bottom, "<b>API Backend</b>"):
        c.append(cell)

    # Messages
    c.append(sync_arrow(cx, 80, sx, 80, "Saisit email + mot de passe"))
    c.append(sync_arrow(sx, 100, bx, 100, "login(email, password)"))
    c.append(sync_arrow(bx, 120, rx, 120, "POST /api/auth/login/"))
    c.append(return_arrow(rx, 150, bx, 150, "{ access, refresh, user }"))
    c.append(return_arrow(bx, 180, sx, 180, "user"))
    c.append(async_arrow(sx, 200, cx, 200, "Connexion réussie !"))
    c.append(return_arrow(sx, 220, cx, 220, "Redirection vers /"))
    c.append(label(130, 260, 400, 30, "<i>Si identifiants incorrects</i>", html=1, FONT=FONT, strokeColor="none", fillColor="none", textAlign="center"))
    c.append(sync_arrow(cx, 290, sx, 290, "Email + Mot de passe"))
    c.append(sync_arrow(sx, 310, bx, 310, "login(email, password)"))
    c.append(sync_arrow(bx, 330, rx, 330, "POST /api/auth/login/"))
    c.append(return_arrow(rx, 360, bx, 360, "401 Unauthorized"))
    c.append(async_arrow(bx, 380, sx, 380, "Erreur : Identifiants incorrects"))
    c.append(async_arrow(sx, 400, cx, 400, "toast.error()"))

    return wrap("Séquence - Authentification", c)

# ═══════════════════════════════════════════════════════════════════════
#  4. SEQUENCE - DÉPÔT DOCUMENT
# ═══════════════════════════════════════════════════════════════════════
def make_sequence_depot():
    c = []
    top, bottom = 40, 650
    ux, fx, ax, jx = 70, 230, 430, 600  # Utilisateur, Form, API, Journal

    for cell in lifeline(ux, top, bottom, "<b>Utilisateur</b>"):
        c.append(cell)
    for cell in lifeline(fx, top, bottom, "<b>NouveauDocumentPage</b>"):
        c.append(cell)
    for cell in lifeline(ax, top, bottom, "<b>API Backend</b>"):
        c.append(cell)
    for cell in lifeline(jx, top, bottom, "<b>Journal</b>"):
        c.append(cell)

    # Step selection
    c.append(sync_arrow(ux, 80, fx, 80, "Sélectionne Département"))
    c.append(sync_arrow(fx, 100, ax, 100, "GET /services/?dept=X"))
    c.append(return_arrow(ax, 120, fx, 120, "Liste des services"))
    c.append(sync_arrow(ux, 140, fx, 140, "Sélectionne Service"))
    c.append(sync_arrow(fx, 160, ax, 160, "GET /armoires/?service=X"))
    c.append(return_arrow(ax, 180, fx, 180, "Liste des armoires"))
    c.append(sync_arrow(ux, 200, fx, 200, "Sélectionne Armoire"))
    c.append(sync_arrow(fx, 220, ax, 220, "GET /armoires/X/rayons/"))
    c.append(return_arrow(ax, 240, fx, 240, "Liste des rayons"))
    c.append(sync_arrow(ux, 260, fx, 260, "Sélectionne Rayon"))
    c.append(sync_arrow(ux, 290, fx, 290, "Dépose fichier"))
    c.append(sync_arrow(ux, 320, fx, 320, "Remplit infos + métadonnées"))

    # Submit
    c.append(sync_arrow(ux, 360, fx, 360, "Clique 'Enregistrer'"))
    c.append(sync_arrow(fx, 380, ax, 380, "POST /documents/ (multipart)"))
    c.append(return_arrow(ax, 420, fx, 420, "201 Created : Document"))
    c.append(async_arrow(ax, 440, jx, 440, "enregistrer_action(CREATION)"))
    c.append(return_arrow(fx, 470, ux, 470, "Code unique + Redirection"))
    c.append(label(fx, 500, 300, 30, "<i>Le code unique SYG-XXX-… est généré automatiquement</i>", html=1, FONT=FONT, strokeColor="none", fillColor="none"))

    return wrap("Séquence - Dépôt de Document", c)

# ═══════════════════════════════════════════════════════════════════════
#  5. SEQUENCE - DRILL-DOWN HIÉRARCHIQUE
# ═══════════════════════════════════════════════════════════════════════
def make_sequence_drill():
    c = []
    top, bottom = 40, 550
    ux, px, ax = 70, 270, 480

    for cell in lifeline(ux, top, bottom, "<b>Utilisateur</b>"):
        c.append(cell)
    for cell in lifeline(px, top, bottom, "<b>ArmoiresPage</b>"):
        c.append(cell)
    for cell in lifeline(ax, top, bottom, "<b>API Backend</b>"):
        c.append(cell)

    # Level 1: Departements
    c.append(sync_arrow(ux, 80, px, 80, "Ouvre ArmoiresPage"))
    c.append(sync_arrow(px, 100, ax, 100, "GET /entreprise/departements/"))
    c.append(return_arrow(ax, 130, px, 130, "Liste des départements"))
    c.append(async_arrow(px, 150, ux, 150, "Affiche cartes départements"))

    # Level 2: Services
    c.append(sync_arrow(ux, 180, px, 180, "Clique sur un département"))
    c.append(sync_arrow(px, 200, ax, 200, "GET /entreprise/services/?dept=X"))
    c.append(return_arrow(ax, 230, px, 230, "Liste des services"))
    c.append(async_arrow(px, 250, ux, 250, "Affiche cartes services"))

    # Level 3: Armoires
    c.append(sync_arrow(ux, 280, px, 280, "Clique sur un service"))
    c.append(sync_arrow(px, 300, ax, 300, "GET /armoires/?service=X"))
    c.append(return_arrow(ax, 330, px, 330, "Liste des armoires"))
    c.append(async_arrow(px, 350, ux, 350, "Affiche cartes armoires"))

    # Level 4: Rayons
    c.append(sync_arrow(ux, 380, px, 380, "Clique sur une armoire"))
    c.append(sync_arrow(px, 400, ax, 400, "GET /armoires/X/rayons/"))
    c.append(return_arrow(ax, 430, px, 430, "Liste des rayons"))
    c.append(async_arrow(px, 450, ux, 450, "Affiche cartes rayons"))

    # Level 5: Documents
    c.append(sync_arrow(ux, 480, px, 480, "Clique sur un rayon"))
    c.append(sync_arrow(px, 500, ax, 500, "GET /documents/?rayon=X"))
    c.append(return_arrow(ax, 530, px, 530, "Liste des documents"))
    c.append(async_arrow(px, 550, ux, 550, "Affiche cartes documents"))

    return wrap("Séquence - Navigation Hiérarchique", c)

# ═══════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    files = {
        "class-diagram.drawio": make_class_diagram(),
        "use-case-diagram.drawio": make_use_case_diagram(),
        "sequence-auth.drawio": make_sequence_auth(),
        "sequence-depot.drawio": make_sequence_depot(),
        "sequence-drill.drawio": make_sequence_drill(),
    }
    for name, content in files.items():
        path = os.path.join(DIAGRAMS_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"> {name} ({len(content)} bytes)")
