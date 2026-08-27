from __future__ import annotations

import html
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path


OUT = Path(
    "deliverables/ica_customer_discovery/"
    "GSN_ICA_Aberdeen_External_Leave_Behind_Pack_2026-08-27.docx"
)

NS = (
    'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    'xmlns:o="urn:schemas-microsoft-com:office:office" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
    'xmlns:v="urn:schemas-microsoft-com:vml" '
    'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
    'xmlns:w10="urn:schemas-microsoft-com:office:word" '
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
    'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
    'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
    'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
    'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
    'mc:Ignorable="w14 wp14"'
)

NAVY = "0B2545"
BLUE = "2E74B5"
DARK_BLUE = "1F4D78"
GOLD = "A67C00"
MUTED = "666666"
LIGHT_BLUE = "E8EEF5"
LIGHT_GRAY = "F4F6F9"
WHITE = "FFFFFF"


def esc(text: str) -> str:
    return html.escape(text, quote=False)


def r(text: str, *, bold: bool = False, italic: bool = False, color: str | None = None, size: int | None = None) -> str:
    props = ['<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>']
    if bold:
        props.append("<w:b/>")
    if italic:
        props.append("<w:i/>")
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    if size:
        props.append(f'<w:sz w:val="{size * 2}"/>')
        props.append(f'<w:szCs w:val="{size * 2}"/>')
    space = ' xml:space="preserve"' if text.startswith(" ") or text.endswith(" ") else ""
    return f"<w:r><w:rPr>{''.join(props)}</w:rPr><w:t{space}>{esc(text)}</w:t></w:r>"


def p(
    text: str = "",
    *,
    style: str = "Body",
    bold: bool = False,
    italic: bool = False,
    color: str | None = None,
    size: int | None = None,
    align: str | None = None,
    before: int | None = None,
    after: int | None = None,
    keep_next: bool = False,
) -> str:
    props = [f'<w:pStyle w:val="{style}"/>']
    if align:
        props.append(f'<w:jc w:val="{align}"/>')
    if before is not None or after is not None:
        props.append(f'<w:spacing w:before="{before or 0}" w:after="{after or 0}"/>')
    if keep_next:
        props.append("<w:keepNext/>")
    return f"<w:p><w:pPr>{''.join(props)}</w:pPr>{r(text, bold=bold, italic=italic, color=color, size=size)}</w:p>"


def h1(text: str) -> str:
    return p(text, style="Heading1", color=BLUE, size=16, bold=True, keep_next=True)


def h2(text: str) -> str:
    return p(text, style="Heading2", color=BLUE, size=13, bold=True, keep_next=True)


def h3(text: str) -> str:
    return p(text, style="Heading3", color=DARK_BLUE, size=12, bold=True, keep_next=True)


def bullet(text: str) -> str:
    return (
        '<w:p><w:pPr><w:pStyle w:val="Body"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
        '<w:spacing w:after="80" w:line="300" w:lineRule="auto"/>'
        '</w:pPr>'
        f"{r(text)}</w:p>"
    )


def numbered(text: str) -> str:
    return (
        '<w:p><w:pPr><w:pStyle w:val="Body"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>'
        '<w:spacing w:after="80" w:line="300" w:lineRule="auto"/>'
        '</w:pPr>'
        f"{r(text)}</w:p>"
    )


def callout(label: str, text: str, fill: str = LIGHT_GRAY) -> str:
    return table(
        [[""]],
        widths=[9360],
        fills=[[fill]],
        paragraphs=[[[p(label, style="CalloutLabel"), p(text, style="CalloutBody")]]],
    )


def cell(text: str, width: int, fill: str = WHITE, bold: bool = False) -> str:
    return (
        "<w:tc>"
        "<w:tcPr>"
        f'<w:tcW w:w="{width}" w:type="dxa"/>'
        f'<w:shd w:fill="{fill}"/>'
        '<w:tcMar><w:top w:w="100" w:type="dxa"/><w:start w:w="140" w:type="dxa"/>'
        '<w:bottom w:w="100" w:type="dxa"/><w:end w:w="140" w:type="dxa"/></w:tcMar>'
        "</w:tcPr>"
        f"{p(text, style='TableText', bold=bold)}"
        "</w:tc>"
    )


def rich_cell(paras: list[str], width: int, fill: str = WHITE) -> str:
    return (
        "<w:tc>"
        "<w:tcPr>"
        f'<w:tcW w:w="{width}" w:type="dxa"/>'
        f'<w:shd w:fill="{fill}"/>'
        '<w:tcMar><w:top w:w="100" w:type="dxa"/><w:start w:w="140" w:type="dxa"/>'
        '<w:bottom w:w="100" w:type="dxa"/><w:end w:w="140" w:type="dxa"/></w:tcMar>'
        "</w:tcPr>"
        f"{''.join(paras)}"
        "</w:tc>"
    )


def table(
    rows: list[list[str]],
    *,
    widths: list[int],
    header: bool = False,
    fills: list[list[str]] | None = None,
    paragraphs: list[list[list[str]]] | None = None,
) -> str:
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    out = [
        "<w:tbl>",
        '<w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="D7DBE2"/>'
        '<w:left w:val="single" w:sz="4" w:color="D7DBE2"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="D7DBE2"/>'
        '<w:right w:val="single" w:sz="4" w:color="D7DBE2"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="D7DBE2"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="D7DBE2"/>'
        "</w:tblBorders><w:tblLayout w:type=\"fixed\"/></w:tblPr>",
        f"<w:tblGrid>{grid}</w:tblGrid>",
    ]
    for row_index, row in enumerate(rows):
        out.append("<w:tr>")
        if header and row_index == 0:
            out.append("<w:trPr><w:tblHeader/></w:trPr>")
        for col_index, text in enumerate(row):
            fill = fills[row_index][col_index] if fills else (LIGHT_BLUE if header and row_index == 0 else WHITE)
            if paragraphs:
                out.append(rich_cell(paragraphs[row_index][col_index], widths[col_index], fill=fill))
            else:
                out.append(cell(text, widths[col_index], fill=fill, bold=header and row_index == 0))
        out.append("</w:tr>")
    out.append("</w:tbl>")
    out.append(p("", after=90))
    return "".join(out)


def page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def styles_xml() -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Body">
    <w:name w:val="Body"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="111111"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="0" w:after="160"/><w:jc w:val="left"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="58"/><w:color w:val="{NAVY}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="360" w:line="300" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="27"/><w:color w:val="{MUTED}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Body"/><w:next w:val="Body"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="360" w:after="200"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="32"/><w:color w:val="{BLUE}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Body"/><w:next w:val="Body"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="280" w:after="140"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="26"/><w:color w:val="{BLUE}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Body"/><w:next w:val="Body"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="24"/><w:color w:val="{DARK_BLUE}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TableText">
    <w:name w:val="Table Text"/>
    <w:pPr><w:spacing w:after="60" w:line="280" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="20"/><w:color w:val="111111"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CalloutLabel">
    <w:name w:val="Callout Label"/>
    <w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="22"/><w:color w:val="{NAVY}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CalloutBody">
    <w:name w:val="Callout Body"/>
    <w:pPr><w:spacing w:after="60" w:line="290" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/><w:color w:val="111111"/></w:rPr>
  </w:style>
</w:styles>"""


def numbering_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="270"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
  <w:abstractNum w:abstractNumId="2">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="270"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>"""


def header_xml() -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:spacing w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="D7DBE2"/></w:pBdr></w:pPr>
    {r("GSN | ICA Aberdeen External Leave-Behind Pack", bold=True, color=MUTED, size=9)}
  </w:p>
</w:hdr>"""


def footer_xml() -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="80"/></w:pPr>
    {r("Prepared for discovery use only | Records must come from GSN activity", color=MUTED, size=8)}
  </w:p>
</w:ftr>"""


def content() -> str:
    parts: list[str] = []
    parts.append(p("Customer Enablement Pack", style="Body", bold=True, color=GOLD, after=0))
    parts.append(p("GSN For ICA Aberdeen", style="Title"))
    parts.append(p("A concise leave-behind for testing four association pain stories and one practical first workflow.", style="Subtitle"))
    parts.append(table(
        [
            ["Prepared for", "Igbo Cultural Association in Aberdeen (ICA)"],
            ["Prepared by", "Chuma Nwafor"],
            ["Date", "2026-08-27"],
            ["Purpose", "Give ICA leaders and members a readable way to judge whether GSN solves a real association problem."],
        ],
        widths=[1900, 7460],
    ))
    parts.append(callout(
        "The honest positioning",
        "GSN is not another WhatsApp group. It is a governed community operating layer for selected records, evidence, verification, support, opportunity, and memory. WhatsApp can remain a daily conversation channel."
    ))
    parts.append(h1("1. What We Are Testing"))
    parts.append(p("ICA is the worked example. The same pattern should fit churches, schools, professional bodies, alumni groups, charities, NGOs, welfare groups, project committees, local branches, and cultural associations."))
    parts.append(p("The meeting should not try to prove every GSN feature. It should identify which association pain is strongest and whether one small GSN workflow is worth testing first."))
    for item in [
        "What association work is painful today?",
        "Where does the evidence live now: WhatsApp, paper, spreadsheets, bank notes, memory, or officer files?",
        "Who has authority to confirm the record?",
        "What must stay private?",
        "What small workflow would ICA actually test for 30 days?",
    ]:
        parts.append(bullet(item))
    parts.append(h1("2. The Four Association Stories"))
    parts.append(table(
        [
            ["Story", "Pain", "GSN value to test"],
            ["1. Administrative pain", "Meetings, notices, responses, attendance, decisions, actions, and leadership handover are scattered.", "Preserve the meeting lifecycle as governed association evidence."],
            ["2. Verification pain", "Membership, references, committee checks, welfare support, movement, and trust claims depend on scattered memory.", "Show what the association has confirmed, with privacy and correction boundaries."],
            ["3. Economic opportunity pain", "Member needs, shops, skills, referrals, jobs, supplier requests, and opportunities disappear too quickly.", "Connect demand, response, Spotlight, marketplace visibility, and follow-up inside the association context."],
            ["4. Cultural continuity and memory", "Events, service, identity, handover knowledge, and community impact are easy to lose across phones and committees.", "Keep structured memory that can support reporting, grants, sponsors, AGMs, caseworkers, and future leaders."],
        ],
        widths=[2300, 3500, 3560],
        header=True,
    ))
    story_rows = [
        (
            "Story 1: Administrative Pain",
            "Notice -> purpose/agenda -> Yes/Maybe/No response -> attendance check-in -> summary -> decisions -> action follow-up -> association memory -> monthly report count.",
            [
                "Meeting calls, agendas, dates, venues, links, and officer ownership.",
                "Member responses before the meeting and attendance method counts.",
                "Summaries, decisions, action owners, due dates, corrections, and handover notes.",
            ],
            "This belongs in Governance because it concerns official association acts: who called the meeting, who could see it, who attended, who recorded it, and what becomes permanent.",
            "GSN should not turn every chat message into a minute, silently track members, or treat attendance as proof of contribution."
        ),
        (
            "Story 2: Verification Pain",
            "Member request -> association check -> confirmed Trust Event -> Trust Passport or TrustSlip -> privacy-aware verification -> monthly verification count.",
            [
                "Active membership status, committee/officer confirmation, and membership history where appropriate.",
                "Contribution, service, attendance, responsibility, support, business, or professional-reference evidence.",
                "Approved, pending, declined, corrected, disputed, or unresolved verification cases.",
            ],
            "This belongs in Governance because verification is an authority act. ICA must decide who can confirm what, for which purpose, and with what privacy boundary.",
            "GSN should not create reputation scores, expose private welfare history, or let informal gossip become official proof."
        ),
        (
            "Story 3: Economic Opportunity Pain",
            "Member need -> Demand Box -> trusted response -> Spotlight or marketplace -> follow-up status -> useful opportunity record -> monthly opportunity count.",
            [
                "Member needs, requests, skills, businesses, services, referrals, jobs, grants, contracts, and supplier opportunities.",
                "Response records showing who followed up and whether the request is open, matched, fulfilled, expired, or declined.",
                "Rules for what ICA promotes, what requires review, and what ICA refuses.",
            ],
            "This belongs in Governance when the opportunity affects association trust: who can post, who can promote, and how complaints or corrections are handled.",
            "GSN should not guarantee business quality, jobs, grants, repayment, or commercial success. It should record opportunity flow and confirmed outcomes."
        ),
        (
            "Story 4: Cultural Continuity And Community Memory",
            "Event or activity -> record what happened -> attendance or response -> summary -> decision/outcome -> selected evidence -> community memory -> monthly story pack.",
            [
                "Cultural events, ceremonies, service acts, milestones, volunteer contribution, and leadership handover.",
                "Selected evidence references, privacy and consent rules, and records withheld because they are not sponsor-safe.",
                "Grant, sponsor, council, caseworker, AGM, and future-leader summaries based on recorded facts.",
            ],
            "This belongs in Governance because community memory affects identity, continuity, cultural ownership, privacy, and what the next committee inherits.",
            "GSN is not yet a large-scale picture/video archive. It can preserve structured memory now and selected evidence where product surfaces support it."
        ),
    ]
    for title, flow, contains, fit, limit in story_rows:
        parts.append(h2(title))
        parts.append(callout("Workflow", flow, fill="FFF8E8"))
        parts.append(h3("What It Should Contain"))
        for item in contains:
            parts.append(bullet(item))
        parts.append(h3("Governance Fit"))
        parts.append(p(fit))
        parts.append(h3("What Not To Overclaim"))
        parts.append(p(limit, italic=True))
    parts.append(page_break())
    parts.append(h1("3. The High-Return Addition: One Workflow Card"))
    parts.append(p("The small thing that can give a bigger result is not another large feature list. It is one workflow card that turns whatever pain ICA names into a testable pilot."))
    parts.append(table(
        [
            ["Field", "Answer to capture during or after the session"],
            ["ICA pain named", ""],
            ["Current way ICA handles it", ""],
            ["Where the evidence lives today", ""],
            ["Who should confirm it", ""],
            ["What must stay private", ""],
            ["What GSN record would help", ""],
            ["Executive benefit", ""],
            ["Member benefit", ""],
            ["First 30-day test", ""],
            ["Reason to reject or pause", ""],
        ],
        widths=[2600, 6760],
        header=True,
    ))
    parts.append(h1("4. Monthly Community Value PDF"))
    parts.append(callout(
        "Current product claim",
        "If an association records important activity inside GSN during the week or month, GSN can help produce an aggregate Community Value PDF with much less manual chasing.",
        fill="EAF4EA",
    ))
    parts.append(p("Where it now belongs in GSN: Community Domain -> Governance -> Reports -> Prepare Community Value PDF. An authorised admin can choose Last 7 days, This month, or Last 30 days, then generate a sponsor-safe or director/admin aggregate report."))
    parts.append(h2("What The Current PDF Contains"))
    for item in [
        "Report title, Community Domain name, reporting period, prepared date, and audience.",
        "A recorded-facts boundary: only records captured in GSN are counted.",
        "A privacy boundary: sponsor-safe PDFs omit private beneficiary and member-level detail.",
        "Director/admin aggregate counts and sponsor-safe aggregate counts.",
        "Activity, beneficiary outcome, confirmation, delivery, evidence, and challenge or correction signals where records exist.",
        "The four association value lines: administration, verification, economic opportunity, and cultural/community memory.",
        "A clear statement of what the PDF does not count.",
    ]:
        parts.append(bullet(item))
    parts.append(h2("What It Can Support"))
    for item in [
        "Grant applications and sponsor updates.",
        "Council conversations and community impact discussions.",
        "Caseworker reading where only safe aggregate facts should be shared.",
        "AGM reports, audits, leadership handover, and continuity planning.",
    ]:
        parts.append(bullet(item))
    parts.append(h2("Hard Boundary"))
    for item in [
        "The PDF cannot create credible evidence from activity that was never recorded.",
        "It does not expose private welfare cases, raw phone numbers, private notes, or member stories without consent and role control.",
        "It does not make automatic judgement about who deserves help, trust, credit, or status.",
        "Custom date-picker UI, automatic transcription, full large media archive, and ICA-specific grant narrative templates remain future or staged work.",
    ]:
        parts.append(bullet(item))
    parts.append(page_break())
    parts.append(h1("5. GSN Compared With Current Tools"))
    parts.append(p("The question is not whether WhatsApp, Microsoft 365, Google Workspace, calendars, forms, spreadsheets, or project tools are useful. They are useful. The question is whether they are built around a governed community's trust, contribution, support, verification, opportunity, and memory."))
    parts.append(table(
        [
            ["Association need", "Current tool pattern", "GSN position"],
            ["Official announcements", "Fast in chat, but easily buried or mixed with ordinary conversation.", "Keep selected notices visible, scoped, expiring, and acknowledged."],
            ["Meetings", "Calendar, chat, documents, and memory can scatter the lifecycle.", "Hold notice, purpose, response, attendance, summary, decisions, and follow-up as one governed record."],
            ["Verification", "Private calls and informal references are hard to reuse safely.", "Share confirmed evidence through Trust Passport or TrustSlip with privacy boundaries."],
            ["Opportunity", "Jobs, services, needs, and referrals vanish quickly.", "Use Demand Box, Spotlight, marketplace visibility, and status records to keep opportunity actionable."],
            ["Community memory", "Old phones, old officers, photos, and minutes can fragment history.", "Preserve structured activity and reporting value for future leaders and external conversations."],
        ],
        widths=[2200, 3580, 3580],
        header=True,
    ))
    parts.append(callout(
        "Simple distinction",
        "Chat tools help ICA talk. Office tools help ICA store documents. Finance tools help ICA track money. GSN helps ICA preserve and mobilise community value itself: trust, participation, contribution, support, commerce, demand, verification, and opportunity."
    ))
    parts.append(h1("6. What Can Be Shown Now And What Is Future"))
    parts.append(table(
        [
            ["Can show now / represented in current product direction", "Roadmap / do not sell as already finished"],
            [
                "Notices with expiry; acknowledgements; meeting reminders; Yes/Maybe/No responses; summaries, decisions, attendance counts, QR links, explicit browser Bluetooth/proximity check-ins; contribution-purpose and proof-review language; support/loan and guarantor lanes; Demand Box; Spotlight; marketplace/shop visibility; Trust Events, Trust Passport, TrustSlip, privacy boundaries; Community Domain period summaries; sponsor-safe copy-ready export; deployed Prepare Community Value PDF action.",
                "Silent/background Bluetooth attendance; fraud-proof location or presence proof; formal minutes voting/ratification; automatic bank reconciliation; provider-backed WhatsApp/SMS/email sending; full large-scale picture/video archive; ICA-specific grant narrative template; custom-date UI beyond Last 7 days, This month, and Last 30 days; automatic decisions, trust scores, creditworthiness claims, or behaviour guarantees.",
            ],
        ],
        widths=[4680, 4680],
        header=True,
    ))
    parts.append(h1("7. Suggested 20-Minute Session"))
    for item in [
        "0-2 minutes: Respect, context, no-sales boundary.",
        "2-6 minutes: How ICA works today.",
        "6-10 minutes: One real ICA decision and recent example.",
        "10-13 minutes: Authority, privacy, and refusal risk.",
        "13-18 minutes: Brief GSN explanation, four-story choice, and three-engine fit test.",
        "18-20 minutes: Feedback sheet, tester invitation, stop.",
    ]:
        parts.append(numbered(item))
    parts.append(callout("Hard rule", "At minute 13, move to GSN. At minute 20, stop. The final 5 minutes are product discovery, not a full feature tour.", fill="FFF8E8"))
    parts.append(page_break())
    parts.append(h1("8. Participant Feedback Sheet"))
    parts.append(p("Use this page to collect signal. It is not adoption evidence by itself. It is useful only if it reveals one real decision, one evidence source, one confirmation authority, one privacy boundary, one refusal risk, and one first workflow."))
    parts.append(h2("Part A: ICA First"))
    for item in [
        "How does ICA currently know who is active, reliable, helpful, responsible, or safe to recommend?",
        "Where does that evidence live today: memory, WhatsApp, officer records, contribution lists, event attendance, or personal relationships?",
        "What is one real ICA decision where better evidence or community memory would help?",
        "Which pain does that decision belong to most: administrative, verification, economic opportunity, or cultural/community memory?",
        "Who should be allowed to confirm the evidence?",
        "What must never be public or visible to ordinary members?",
        "What would make ICA refuse to use a system like this?",
    ]:
        parts.append(numbered(item))
        parts.append(p("Response: ________________________________________________________________", after=120))
    parts.append(h2("Part B: After The Brief GSN Explanation"))
    for item in [
        "Based only on the one ICA decision named, GSN sounds: Useful / Unnecessary / Risky / Unclear.",
        "What must GSN show?",
        "What must GSN hide?",
        "If ICA tested only one workflow first, which one would you choose?",
        "Which attractive idea should be treated as future or limited, not over-promised today?",
        "Would you be open to a longer conversation only if this one decision is worth exploring: Yes / Maybe / No?",
    ]:
        parts.append(numbered(item))
        parts.append(p("Response: ________________________________________________________________", after=120))
    parts.append(h1("9. Recommended 30-Day Pilot Shape"))
    parts.append(table(
        [
            ["Decision", "Recommendation"],
            ["Participants", "Executives plus a small group of ordinary members."],
            ["Workflow", "One or two high-value ICA processes only."],
            ["Review", "After 2 weeks and after 30 days."],
            ["Decision", "Continue, change, narrow, or stop."],
            ["Success signal", "Members know where official information lives, executives chase less, records are clearer, privacy is respected, and members see practical or economic value."],
        ],
        widths=[2200, 7160],
        header=True,
    ))
    parts.append(h1("10. Final Decision Questions"))
    for item in [
        "Which of the four pains is strongest for ICA now?",
        "Which one workflow would ICA test first?",
        "Who has authority to confirm the record?",
        "What must stay private or sponsor-safe only?",
        "What would make members refuse or stop using it?",
        "Is there enough pull for a narrow pilot, or only polite interest?",
    ]:
        parts.append(bullet(item))
    parts.append(callout(
        "Unabated truth",
        "GSN is strong enough to demonstrate the association operating-system story, including a real Community Value PDF generated from recorded facts. But the strongest pilot must still begin with one pain, one workflow, one authority model, and one privacy boundary."
    ))
    return "".join(parts)


def document_xml() -> str:
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document {NS}>
  <w:body>
    {content()}
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rId1"/>
      <w:footerReference w:type="default" r:id="rId2"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>"""


def write_docx() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    files = {
        "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>""",
        "word/_rels/document.xml.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>""",
        "word/document.xml": document_xml(),
        "word/styles.xml": styles_xml(),
        "word/numbering.xml": numbering_xml(),
        "word/header1.xml": header_xml(),
        "word/footer1.xml": footer_xml(),
        "word/settings.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
</w:settings>""",
        "docProps/core.xml": f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>GSN ICA Aberdeen External Leave-Behind Pack</dc:title>
  <dc:creator>Chuma Nwafor</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>""",
        "docProps/app.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>Global Support Network</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>1.0</AppVersion>
</Properties>""",
    }
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as docx:
        for name, body in files.items():
            docx.writestr(name, body)
    print(OUT)
    print(os.path.getsize(OUT))


if __name__ == "__main__":
    write_docx()
