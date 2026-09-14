from __future__ import annotations

import json
import re
import textwrap
import zipfile
from pathlib import Path
from urllib.parse import quote

DOC_DATE = "2026-09-14"
PACK_NAME = "GSN Community Setup Pack"
AUTHENTICITY_LINE = (
    f"GSN Original Community Setup Material | Source-controlled in gmfn_mvp/docs | Document date: {DOC_DATE}"
)
WATERMARK_TEXT = f"GSN ORIGINAL | {DOC_DATE}"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/chumanwafor216-svg/gmfn-mvp/main"

REPO_ROOT = Path(__file__).resolve().parents[3]
GUIDE_DIR = REPO_ROOT / "docs" / "gsn-user-guide"
REAL_LIFE_DIR = GUIDE_DIR / "real-life-capability-bank"
PACK_DIR = REPO_ROOT / "docs" / "community-setup-pack"
QR_DIR = PACK_DIR / "qr-codes"
QR_INDEX_PATH = PACK_DIR / f"GSN_COMMUNITY_SETUP_QR_DOWNLOAD_INDEX_{DOC_DATE}.md"

TITLE_MAP = {
    PACK_DIR / f"GSN_CORE_CAPABILITY_SET_{DOC_DATE}.md": (
        f"{PACK_NAME}: GSN Core Capabilities ({DOC_DATE})"
    ),
    PACK_DIR / f"GSN_COMMUNITY_SETUP_DEPLOYMENT_PACK_INDEX_{DOC_DATE}.md": (
        f"{PACK_NAME}: Deployment Pack Index ({DOC_DATE})"
    ),
    PACK_DIR / f"GSN_COMMUNITY_SETUP_CLIENT_HANDOVER_MAP_{DOC_DATE}.md": (
        f"{PACK_NAME}: Client Handover Map ({DOC_DATE})"
    ),
    PACK_DIR / f"GSN_COMMUNITY_SETUP_STORY_BANK_{DOC_DATE}.md": (
        f"{PACK_NAME}: Community Setup Story Bank ({DOC_DATE})"
    ),
    GUIDE_DIR / "GSN_SELF_SERVICE_USER_GUIDE.md": (
        f"{PACK_NAME}: What to Set Up, What It Does, and How to Use It ({DOC_DATE})"
    ),
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_MASTER_CAPABILITY_BANK.md": (
        f"{PACK_NAME}: GSN in Real Life Master Capability Bank ({DOC_DATE})"
    ),
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_AUDIENCE_PICK_LISTS.md": (
        f"{PACK_NAME}: Audience Pick Lists for Community Setup ({DOC_DATE})"
    ),
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_CHURCH_FAITH_GROUP_COPY.md": (
        f"{PACK_NAME}: Church and Faith Group Real-Life Copy ({DOC_DATE})"
    ),
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_SCHOOL_YOUTH_ORGANISATION_COPY.md": (
        f"{PACK_NAME}: School and Youth Organisation Real-Life Copy ({DOC_DATE})"
    ),
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_NGO_CHARITY_COMMUNITY_ORGANISATION_COPY.md": (
        f"{PACK_NAME}: NGO, Charity and Community Organisation Real-Life Copy ({DOC_DATE})"
    ),
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_COOPERATIVE_MARKET_BUSINESS_NETWORK_COPY.md": (
        f"{PACK_NAME}: Cooperative, Market and Business Network Real-Life Copy ({DOC_DATE})"
    ),
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_FAMILY_DIASPORA_ASSOCIATION_COPY.md": (
        f"{PACK_NAME}: Family, Diaspora and Association Real-Life Copy ({DOC_DATE})"
    ),
}

QR_TARGETS = [
    {
        "id": "setup-guide-pdf",
        "title": "What to Set Up, What It Does, and How to Use It",
        "path": GUIDE_DIR / "GSN_SELF_SERVICE_USER_GUIDE.pdf",
        "audience": "Leaders, admins and members",
    },
    {
        "id": "core-capability-set",
        "title": "GSN Core Capability Set",
        "path": PACK_DIR / f"GSN_CORE_CAPABILITY_SET_{DOC_DATE}.pdf",
        "audience": "Public app surfaces, first conversations and client handover",
    },
    {
        "id": "deployment-pack-index",
        "title": "Community Setup Deployment Pack Index",
        "path": PACK_DIR / f"GSN_COMMUNITY_SETUP_DEPLOYMENT_PACK_INDEX_{DOC_DATE}.pdf",
        "audience": "GSN setup team and community leaders",
    },
    {
        "id": "client-handover-map",
        "title": "Client Handover Map",
        "path": PACK_DIR / f"GSN_COMMUNITY_SETUP_CLIENT_HANDOVER_MAP_{DOC_DATE}.pdf",
        "audience": "Community owners, coordinators and client admins",
    },
    {
        "id": "story-bank",
        "title": "Community Setup Story Bank",
        "path": PACK_DIR / f"GSN_COMMUNITY_SETUP_STORY_BANK_{DOC_DATE}.pdf",
        "audience": "Sales, onboarding and community champions",
    },
    {
        "id": "master-capability-bank-pdf",
        "title": "GSN in Real Life Master Capability Bank",
        "path": REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_MASTER_CAPABILITY_BANK.pdf",
        "audience": "Full setup/readiness conversations",
    },
    {
        "id": "audience-pick-lists-pdf",
        "title": "Audience Pick Lists",
        "path": REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_AUDIENCE_PICK_LISTS.pdf",
        "audience": "Quick first-send version for all audiences",
    },
    {
        "id": "church-faith-group-pdf",
        "title": "Church and Faith Group Copy",
        "path": REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_CHURCH_FAITH_GROUP_COPY.pdf",
        "audience": "Churches and faith groups",
    },
    {
        "id": "school-youth-organisation-pdf",
        "title": "School and Youth Organisation Copy",
        "path": REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_SCHOOL_YOUTH_ORGANISATION_COPY.pdf",
        "audience": "Schools and youth organisations",
    },
    {
        "id": "ngo-charity-community-organisation-pdf",
        "title": "NGO, Charity and Community Organisation Copy",
        "path": REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_NGO_CHARITY_COMMUNITY_ORGANISATION_COPY.pdf",
        "audience": "NGOs, charities and community bodies",
    },
    {
        "id": "cooperative-market-business-network-pdf",
        "title": "Cooperative, Market and Business Network Copy",
        "path": REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_COOPERATIVE_MARKET_BUSINESS_NETWORK_COPY.pdf",
        "audience": "Cooperatives, markets and business groups",
    },
    {
        "id": "family-diaspora-association-pdf",
        "title": "Family, Diaspora and Association Copy",
        "path": REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_FAMILY_DIASPORA_ASSOCIATION_COPY.pdf",
        "audience": "Families, diaspora groups and associations",
    },
]

QR_BY_DOCUMENT = {
    PACK_DIR / f"GSN_CORE_CAPABILITY_SET_{DOC_DATE}.md": "core-capability-set",
    PACK_DIR / f"GSN_COMMUNITY_SETUP_DEPLOYMENT_PACK_INDEX_{DOC_DATE}.md": "deployment-pack-index",
    PACK_DIR / f"GSN_COMMUNITY_SETUP_CLIENT_HANDOVER_MAP_{DOC_DATE}.md": "client-handover-map",
    PACK_DIR / f"GSN_COMMUNITY_SETUP_STORY_BANK_{DOC_DATE}.md": "story-bank",
    GUIDE_DIR / "GSN_SELF_SERVICE_USER_GUIDE.md": "setup-guide-pdf",
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_MASTER_CAPABILITY_BANK.md": "master-capability-bank-pdf",
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_AUDIENCE_PICK_LISTS.md": "audience-pick-lists-pdf",
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_CHURCH_FAITH_GROUP_COPY.md": "church-faith-group-pdf",
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_SCHOOL_YOUTH_ORGANISATION_COPY.md": "school-youth-organisation-pdf",
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_NGO_CHARITY_COMMUNITY_ORGANISATION_COPY.md": "ngo-charity-community-organisation-pdf",
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_COOPERATIVE_MARKET_BUSINESS_NETWORK_COPY.md": "cooperative-market-business-network-pdf",
    REAL_LIFE_DIR / "GSN_IN_REAL_LIFE_FAMILY_DIASPORA_ASSOCIATION_COPY.md": "family-diaspora-association-pdf",
}


def relative_repo_path(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def public_url_for(path: Path) -> str:
    rel = quote(relative_repo_path(path), safe="/._-")
    if path.suffix.lower() == ".md":
        return f"{GITHUB_WEB_BASE}/{rel}"
    return f"{GITHUB_RAW_BASE}/{rel}"


def qr_png_path(entry: dict[str, object]) -> Path:
    return QR_DIR / f"{entry['id']}.png"


def qr_entry_by_id(entry_id: str) -> dict[str, object]:
    for entry in QR_TARGETS:
        if entry["id"] == entry_id:
            return entry
    raise KeyError(entry_id)


def draw_qr_png(value: str, out: Path) -> None:
    from PIL import Image, ImageDraw
    from reportlab.graphics.barcode import qr as reportlab_qr

    widget = reportlab_qr.QrCodeWidget(value)
    matrix = widget.qr
    matrix.make()
    modules = matrix.getModuleCount()
    quiet_zone = 4
    box = 10
    size = (modules + quiet_zone * 2) * box
    image = Image.new("RGB", (size, size), "white")
    draw = ImageDraw.Draw(image)
    for row in range(modules):
        for col in range(modules):
            if matrix.isDark(row, col):
                x0 = (col + quiet_zone) * box
                y0 = (row + quiet_zone) * box
                draw.rectangle((x0, y0, x0 + box - 1, y0 + box - 1), fill="#0B2545")
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)


def ensure_qr_assets() -> list[dict[str, str]]:
    assets = []
    for entry in QR_TARGETS:
        url = public_url_for(entry["path"])
        png = qr_png_path(entry)
        draw_qr_png(url, png)
        assets.append(
            {
                "id": str(entry["id"]),
                "title": str(entry["title"]),
                "audience": str(entry["audience"]),
                "path": relative_repo_path(entry["path"]),
                "url": url,
                "qr_png": relative_repo_path(png),
            }
        )
    return assets


def write_qr_index(assets: list[dict[str, str]]) -> None:
    lines = [
        f"# {PACK_NAME}: QR Download Index ({DOC_DATE})",
        "",
        f"Document date: {DOC_DATE}",
        f"Pack: {PACK_NAME}",
        f"Authenticity mark: {AUTHENTICITY_LINE}",
        "",
        "Use this sheet when a community leader, admin, member or supporter needs to receive the pack on a phone without typing file names or folder paths.",
        "",
        "Truth boundary: these QR codes point to the latest files on the repository main branch. They work for outside recipients only when the linked files are publicly reachable or mirrored to a public download location.",
        "",
        "| Article | Who should receive it | QR code | Direct link |",
        "| --- | --- | --- | --- |",
    ]
    for asset in assets:
        qr_rel = Path(asset["qr_png"]).relative_to("docs/community-setup-pack").as_posix()
        lines.append(
            f"| {asset['title']} | {asset['audience']} | ![{asset['title']} QR]({qr_rel}) | [Open/download]({asset['url']}) |"
        )
    QR_INDEX_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def configure_docx_document():
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Inches, Pt

    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        header = section.header.paragraphs[0]
        header.text = f"{PACK_NAME} | {DOC_DATE}"
        header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        footer = section.footer.paragraphs[0]
        footer.text = f"{AUTHENTICITY_LINE} | Page "
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        page_field = OxmlElement("w:fldSimple")
        page_field.set(qn("w:instr"), "PAGE")
        footer._p.append(page_field)

    styles = doc.styles
    styles["Normal"].font.name = "Aptos"
    styles["Normal"].font.size = Pt(9.5)
    return doc


def add_qr_page_to_docx(doc, entry: dict[str, object]) -> None:
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Inches, Pt, RGBColor

    url = public_url_for(entry["path"])
    qr_path = qr_png_path(entry)
    doc.add_page_break()
    heading = doc.add_paragraph()
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = heading.add_run("Scan to download this GSN article")
    run.bold = True
    run.font.size = Pt(16)
    run.font.color.rgb = RGBColor(11, 37, 69)

    caption = doc.add_paragraph()
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = caption.add_run(str(entry["title"]))
    title_run.bold = True

    image_paragraph = doc.add_paragraph()
    image_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    image_paragraph.add_run().add_picture(str(qr_path), width=Inches(1.8))

    audience = doc.add_paragraph()
    audience.alignment = WD_ALIGN_PARAGRAPH.CENTER
    audience.add_run(f"For: {entry['audience']}")

    link_paragraph = doc.add_paragraph()
    link_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for line in textwrap.wrap(url, width=82):
        link_paragraph.add_run(line)
        link_paragraph.add_run().add_break()

    note = doc.add_paragraph()
    note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    note.add_run("QR access depends on the file being publicly reachable or shared through an approved public mirror.")


def build_qr_index_docx(assets: list[dict[str, str]]) -> Path:
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Inches, Pt, RGBColor

    doc = configure_docx_document()
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run(f"{PACK_NAME}: QR Download Index ({DOC_DATE})")
    run.bold = True
    run.font.size = Pt(22)
    run.font.color.rgb = RGBColor(11, 37, 69)

    intro = doc.add_paragraph()
    intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
    intro.add_run("Scan a code to open or download the matching GSN setup article on a phone.")

    warning = doc.add_paragraph()
    warning.alignment = WD_ALIGN_PARAGRAPH.CENTER
    warning.add_run("Truth boundary: external access works only when the linked repository files are public or mirrored to public hosting.")

    for index, asset in enumerate(assets):
        if index and index % 3 == 0:
            doc.add_page_break()
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(asset["title"])
        r.bold = True
        r.font.color.rgb = RGBColor(11, 37, 69)
        doc.add_paragraph(f"Audience: {asset['audience']}")
        image_p = doc.add_paragraph()
        image_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        image_p.add_run().add_picture(str(REPO_ROOT / asset["qr_png"]), width=Inches(1.25))
        url_p = doc.add_paragraph()
        url_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        url_run = url_p.add_run(asset["url"])
        url_run.font.size = Pt(7)

    out = QR_INDEX_PATH.with_suffix(".docx")
    doc.save(out)
    add_docx_watermark(out)
    return out


def build_qr_index_pdf(assets: list[dict[str, str]]) -> Path:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Image as PlatypusImage
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

    out = QR_INDEX_PATH.with_suffix(".pdf")
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=20,
        textColor=colors.HexColor("#0B2545"),
        alignment=1,
        spaceAfter=8,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.4,
        leading=10.4,
        spaceAfter=4,
    )
    label = ParagraphStyle(
        "Label",
        parent=body,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#0B2545"),
        alignment=1,
    )
    small = ParagraphStyle("Small", parent=body, fontSize=6.4, leading=7.4, alignment=1)

    story = [
        Paragraph(f"{PACK_NAME}: QR Download Index ({DOC_DATE})", title),
        Paragraph("Scan a code to open or download the matching GSN setup article on a phone.", body),
        Paragraph("Truth boundary: external access works only when the linked repository files are public or mirrored to public hosting.", body),
        Spacer(1, 0.1 * inch),
    ]
    for index, asset in enumerate(assets):
        if index and index % 3 == 0:
            story.append(PageBreak())
        story.append(Paragraph(asset["title"], label))
        story.append(Paragraph(f"Audience: {asset['audience']}", body))
        story.append(PlatypusImage(str(REPO_ROOT / asset["qr_png"]), width=1.25 * inch, height=1.25 * inch))
        story.append(Paragraph(asset["url"], small))
        story.append(Spacer(1, 0.12 * inch))

    SimpleDocTemplate(
        str(out),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    ).build(story, onFirstPage=pdf_page_mark, onLaterPages=pdf_page_mark)
    return out


def ensure_markdown_identity(path: Path, title: str) -> None:
    text = path.read_text(encoding="utf-8-sig")
    lines = text.splitlines()
    if lines and lines[0].startswith("# "):
        lines[0] = f"# {title}"
    else:
        lines.insert(0, f"# {title}")

    metadata = [
        f"Document date: {DOC_DATE}",
        f"Pack: {PACK_NAME}",
        f"Authenticity mark: {AUTHENTICITY_LINE}",
    ]
    body = "\n".join(lines).strip() + "\n"
    existing_lines = set(body.splitlines())
    for item in reversed(metadata):
        if item not in existing_lines:
            body = body.replace("\n\n", f"\n\n{item}\n", 1)
            existing_lines.add(item)
    path.write_text(body, encoding="utf-8")


def markdown_to_docx(md_path: Path, qr_entry: dict[str, object] | None = None) -> Path:
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt, RGBColor

    doc = configure_docx_document()

    for raw in md_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("# "):
            paragraph = doc.add_paragraph()
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = paragraph.add_run(line[2:])
            run.font.name = "Aptos Display"
            run.font.size = Pt(22)
            run.font.color.rgb = RGBColor(11, 37, 69)
            run.bold = True
        elif line.startswith("## "):
            paragraph = doc.add_heading(line[3:], level=1)
            for run in paragraph.runs:
                run.font.color.rgb = RGBColor(11, 37, 69)
        elif line.startswith("### "):
            doc.add_heading(line[4:], level=2)
        elif line.startswith("- "):
            doc.add_paragraph(line[2:].replace("**", ""), style="List Bullet")
        elif re.match(r"^\d+\. ", line):
            doc.add_paragraph(re.sub(r"^\d+\. ", "", line), style="List Number")
        else:
            doc.add_paragraph(line.replace("**", ""))

    if qr_entry:
        add_qr_page_to_docx(doc, qr_entry)

    out = md_path.with_suffix(".docx")
    doc.save(out)
    add_docx_watermark(out)
    return out


def add_docx_watermark(docx_path: Path) -> None:
    try:
        from lxml import etree
    except Exception:
        return

    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    v_ns = "urn:schemas-microsoft-com:vml"
    o_ns = "urn:schemas-microsoft-com:office:office"

    def tag(ns: str, name: str) -> str:
        return f"{{{ns}}}{name}"

    with zipfile.ZipFile(docx_path, "r") as zin:
        headers = [
            name for name in zin.namelist() if re.fullmatch(r"word/header\d+\.xml", name)
        ]
        if not headers:
            return
        header = sorted(headers, key=lambda name: int(re.findall(r"\d+", name)[0]))[0]
        root = etree.fromstring(zin.read(header))
        paragraph = etree.Element(tag(w_ns, "p"))
        run = etree.SubElement(paragraph, tag(w_ns, "r"))
        pict = etree.SubElement(run, tag(w_ns, "pict"))
        shape = etree.SubElement(
            pict,
            tag(v_ns, "shape"),
            {
                "id": "GSNCommunitySetupWatermark",
                tag(o_ns, "spid"): "_x0000_s1025",
                "type": "#_x0000_t136",
                "style": (
                    "position:absolute;margin-left:0;margin-top:0;"
                    "width:468pt;height:468pt;rotation:315;"
                    "z-index:-251654144;"
                    "mso-position-horizontal:center;"
                    "mso-position-vertical:center;mso-wrap-edited:f;"
                ),
                "fillcolor": "#C9CED6",
                "stroked": "f",
            },
        )
        etree.SubElement(shape, tag(v_ns, "fill"), {"opacity": "0.12"})
        etree.SubElement(
            shape,
            tag(v_ns, "textpath"),
            {"style": 'font-family:"Aptos";font-size:1pt', "string": WATERMARK_TEXT},
        )
        etree.SubElement(shape, tag(v_ns, "path"), {"textpathok": "t"})
        root.append(paragraph)
        overrides = {
            header: etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone="yes")
        }
        parts = [(info, zin.read(info.filename)) for info in zin.infolist()]

    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zout:
        for info, data in parts:
            zout.writestr(info, overrides.get(info.filename, data))


def pdf_page_mark(canvas, doc_obj):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch

    canvas.saveState()
    canvas.setFillColor(colors.Color(0.08, 0.14, 0.22, alpha=0.08))
    canvas.setFont("Helvetica-Bold", 34)
    canvas.translate(letter[0] / 2, letter[1] / 2)
    canvas.rotate(38)
    canvas.drawCentredString(0, 0, WATERMARK_TEXT)
    canvas.restoreState()

    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(letter[0] / 2, 0.35 * inch, AUTHENTICITY_LINE)
    canvas.drawRightString(letter[0] - 0.75 * inch, 0.35 * inch, f"Page {doc_obj.page}")
    canvas.restoreState()


def markdown_to_pdf(md_path: Path, qr_entry: dict[str, object] | None = None) -> Path:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Image as PlatypusImage
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

    def esc(value: str) -> str:
        return (
            value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("**", "")
        )

    out = md_path.with_suffix(".pdf")
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.7,
        leading=10.8,
        spaceAfter=5,
    )
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0B2545"),
        spaceBefore=10,
        spaceAfter=6,
    )
    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=20,
        textColor=colors.HexColor("#0B2545"),
        spaceAfter=8,
    )
    centered = ParagraphStyle("Centered", parent=body, alignment=1, spaceAfter=7)
    small_centered = ParagraphStyle("SmallCentered", parent=body, fontSize=6.8, leading=7.8, alignment=1)

    story = []
    for raw in md_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            story.append(Spacer(1, 3))
        elif line.startswith("# "):
            story.append(Paragraph(esc(line[2:]), title))
        elif line.startswith("## "):
            story.append(Paragraph(esc(line[3:]), h1))
        elif line.startswith("### "):
            story.append(Paragraph(esc(line[4:]), h1))
        elif line.startswith("- "):
            story.append(Paragraph("- " + esc(line[2:]), body))
        else:
            story.append(Paragraph(esc(line), body))

    if qr_entry:
        url = public_url_for(qr_entry["path"])
        story.append(PageBreak())
        story.append(Paragraph("Scan to download this GSN article", h1))
        story.append(Paragraph(esc(str(qr_entry["title"])), centered))
        story.append(
            PlatypusImage(str(qr_png_path(qr_entry)), width=1.7 * inch, height=1.7 * inch)
        )
        story.append(Paragraph(f"For: {esc(str(qr_entry['audience']))}", centered))
        story.append(Paragraph(esc(url), small_centered))
        story.append(
            Paragraph(
                "QR access depends on the file being publicly reachable or shared through an approved public mirror.",
                small_centered,
            )
        )

    SimpleDocTemplate(
        str(out),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    ).build(story, onFirstPage=pdf_page_mark, onLaterPages=pdf_page_mark)
    return out


def update_pack_manifest(assets: list[dict[str, str]]) -> None:
    manifest_path = PACK_DIR / "pack_manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    else:
        manifest = {
            "pack_name": PACK_NAME,
            "document_date": DOC_DATE,
            "status": "maintained_source_pack",
        }
    manifest["qr_download_index"] = {
        "path": relative_repo_path(QR_INDEX_PATH),
        "distribution": [
            relative_repo_path(QR_INDEX_PATH.with_suffix(".docx")),
            relative_repo_path(QR_INDEX_PATH.with_suffix(".pdf")),
        ],
    }
    manifest["qr_assets"] = assets
    manifest["transfer_rule"] = [
        "Give the audience the PDF/DOCX with the QR page when they may be reading on paper or another device.",
        "Give the QR download index when one person needs to distribute multiple GSN setup articles to members by phone.",
        "Replace GitHub raw/blob URLs with public hosted URLs if the repository is private or if clients should not touch GitHub.",
    ]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

def main() -> None:
    assets = ensure_qr_assets()
    write_qr_index(assets)
    update_pack_manifest(assets)
    rendered = [
        str(build_qr_index_docx(assets).relative_to(REPO_ROOT)),
        str(build_qr_index_pdf(assets).relative_to(REPO_ROOT)),
    ]
    for path, title in TITLE_MAP.items():
        if not path.exists():
            continue
        ensure_markdown_identity(path, title)
        qr_entry = qr_entry_by_id(QR_BY_DOCUMENT[path]) if path in QR_BY_DOCUMENT else None
        rendered.append(str(markdown_to_docx(path, qr_entry).relative_to(REPO_ROOT)))
        rendered.append(str(markdown_to_pdf(path, qr_entry).relative_to(REPO_ROOT)))

    print(
        json.dumps(
            {
                "document_date": DOC_DATE,
                "qr_assets": assets,
                "qr_index": str(QR_INDEX_PATH.relative_to(REPO_ROOT)),
                "rendered": rendered,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()