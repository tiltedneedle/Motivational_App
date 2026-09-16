"""
The progress report, as a PDF, from the screenshots already taken.

    python scripts/progress-report.py            -> scripts/shots/progress/Morrow - progress report.pdf

Reads the two overview sheets, the three full-page captures and a few journey
sheets from scripts/shots/progress and scripts/shots/journey, and sets them
with short captions: what each shows and what it proves. Run `pnpm shots`,
`node scripts/fixtures/filled.mjs` and `pnpm journey` first if the images are
stale.
"""
from datetime import date
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "scripts" / "shots"
PROGRESS = SHOTS / "progress"
JOURNEY = SHOTS / "journey"
OUT = PROGRESS / "Morrow - progress report.pdf"

INK = colors.HexColor("#15181F")
INK2 = colors.HexColor("#5A5750")
INK3 = colors.HexColor("#8A8578")
CORAL = colors.HexColor("#C8431F")
LINE = colors.HexColor("#E2DACB")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=INK, alignment=TA_LEFT, spaceAfter=4)
H2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=INK, spaceBefore=6, spaceAfter=4)
LABEL = ParagraphStyle("label", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=CORAL, spaceAfter=2)
BODY = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica", fontSize=10, leading=14, textColor=INK2)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8.5, leading=11.5, textColor=INK3)
BULLET = ParagraphStyle("bullet", parent=BODY, leftIndent=10, bulletIndent=0, spaceAfter=1)

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm
CONTENT_W = PAGE_W - 2 * MARGIN


def fitted(path: Path, max_w: float, max_h: float) -> Image:
    """An image scaled to fit the box, keeping its proportions."""
    with PILImage.open(path) as im:
        w, h = im.size
    scale = min(max_w / w, max_h / h)
    return Image(str(path), width=w * scale, height=h * scale)


def folded(path: Path, parts: int, max_w: float, max_h: float) -> Table:
    """A long capture cut into `parts` columns, read left to right, so a page nine
    times taller than it is wide is not a ribbon. The cuts are written next to the
    image so they can be regenerated."""
    with PILImage.open(path) as im:
        w, h = im.size
        step = h // parts
        cells = []
        for i in range(parts):
            box = (0, i * step, w, h if i == parts - 1 else (i + 1) * step)
            piece = im.crop(box)
            out = path.with_name(path.stem + f".fold-{i + 1}.png")
            piece.save(out)
            cells.append(fitted(out, max_w / parts - 4, max_h))
    t = Table([cells], colWidths=[max_w / parts] * parts)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
    return t


def bullets(lines):
    return [Paragraph(f"&bull; {t}", BULLET) for t in lines]


def section(label, title, body, image, points, image_h):
    """One labelled section: a heading, a sentence, the image, the steps under it."""
    return [
        Paragraph(label, LABEL),
        Paragraph(title, H2),
        Paragraph(body, BODY),
        Spacer(1, 6),
        fitted(image, CONTENT_W, image_h),
        Spacer(1, 6),
        *bullets(points),
    ]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(INK3)
    canvas.drawString(MARGIN, 10 * mm, "Morrow  ·  progress report  ·  " + date.today().strftime("%d %B %Y"))
    canvas.drawRightString(PAGE_W - MARGIN, 10 * mm, str(doc.page))
    canvas.restoreState()


story = []

# ---------------------------------------------------------------- cover + status
story += [
    Spacer(1, 30 * mm),
    Paragraph("Morrow", H1),
    Paragraph("Progress report", ParagraphStyle("sub", parent=H2, fontSize=18, leading=22, textColor=INK2, spaceBefore=0)),
    Paragraph(date.today().strftime("%d %B %Y"), SMALL),
    Spacer(1, 10 * mm),
    Paragraph(
        "Morrow is the Self Authoring method rebuilt as an app: three volumes — Past, Present and Future — "
        "written in the person's own words, and a Book, a plan and a daily practice that come out of them. "
        "This report shows where the build stands, with screenshots from the working app.",
        BODY,
    ),
    Spacer(1, 8 * mm),
    Paragraph("WHERE IT STANDS", LABEL),
]

status = [
    ["Area", "State"],
    ["The three volumes (Past, Present, Future)", "Built, walked end to end, verified"],
    ["The Book, the Portrait, the plan, Today, the coach", "Built and verified"],
    ["Interruptions: Back, Not now, killing the app mid-sentence", "Every screen resumes where it left off"],
    ["Accessibility (axe) and small phones", "0 issues on 34 screens; every screen read at 320 × 568"],
    ["Account sync against the live Supabase project", "Round-trips; 45/45"],
    ["Automated checks, every run", "339 end-to-end, 70 cold-open, 476 unit, 54 database"],
    ["The Declaration (one witness, no feed)", "Built today; under test"],
    ["Native build on a phone", "Waiting on a Mac / Android SDK and a device"],
    ["AI provider, payments, emailed sign-in code", "On honest fallbacks; waiting on keys"],
]
t = Table(status, colWidths=[CONTENT_W * 0.55, CONTENT_W * 0.45])
t.setStyle(
    TableStyle(
        [
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("LEADING", (0, 0), (-1, -1), 12),
            ("TEXTCOLOR", (0, 0), (-1, -1), INK),
            ("TEXTCOLOR", (1, 1), (1, -1), INK2),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ]
    )
)
story += [t, PageBreak()]

# ---------------------------------------------------------------- the beginning
story += section(
    "1 · THE FIRST EVENING",
    "A new person, a fresh install",
    "What someone sees before they have written a word. Every step here has been walked by the automated suite and read by eye.",
    PROGRESS / "Morrow - 1 - the beginning.png",
    [
        "Welcome (three pages) and a plain consent screen that says what stays on the phone and what is sent to an AI service, and when.",
        "\"Work on your: Past / Present / Future\" — the person chooses, and a fourth door explains all three and suggests an order without enforcing one.",
        "The Interview's first question; the Present deck of plain first-person statements; the Past's doorway with the helplines one tap away.",
        "The Fifteen: a timed, dark writing room with a ten-minute floor and a way to say it rather than type it.",
    ],
    PAGE_H * 0.52,
)
story.append(PageBreak())

# ---------------------------------------------------------------- filled up
story += section(
    "2 · FILLED UP",
    "The same person with all three volumes written",
    "The chooser marks all three \"Written\"; the writing shows up where it was promised to.",
    PROGRESS / "Morrow - 2 - filled up.png",
    [
        "Today: a greeting, the Book's own first sentence, the morning's Now card, and the tab bar to the Book, Envision, the Coach and You.",
        "Present's closing screen prints every card with the person's two lines; Past's Book question shows all three parts of each event and lets any of them be changed.",
        "The Book, second edition, and the reading view; the Portrait with its if-then; the Obstacles stone offering the written faults back as chips.",
        "Progress, the coach, letters to a future self, the evening seal, and Settings, which counts what Morrow holds and exports all of it.",
    ],
    PAGE_H * 0.56,
)
story.append(PageBreak())

# ---------------------------------------------------------------- the Book, folded into three columns
story += [
    Paragraph("3 · THE BOOK, SECOND EDITION", LABEL),
    Paragraph("One page, read in three columns", H2),
    Paragraph(
        "The spine, the Fifteen, the goals with their five lines each, then \"What I am like\" and \"Where I came from\" — the two new "
        "volumes printed into the Book the person sealed — and the I will line to close. The page is long; it is cut into columns here.",
        BODY,
    ),
    Spacer(1, 6),
    folded(PROGRESS / "Morrow - 3 - the Book, second edition, full page.png", 3, CONTENT_W, PAGE_H * 0.66),
    Spacer(1, 6),
    *bullets(
        [
            "Nothing in the Book is generated: the app's words are headings, the person's words are the text, and the authorship ratio is checked twice — in the app and again in the database — before a seal is accepted.",
            "A second edition is one hold away once the other volumes are written; the first edition stays as it was.",
        ]
    ),
    PageBreak(),
]

# ---------------------------------------------------------------- the two volumes' closing screens
story += [
    Paragraph("4 · PRESENT AND PAST, WRITTEN", LABEL),
    Paragraph("The two closing screens, in full", H2),
    Paragraph(
        "Left: Present — each card the person kept, with the sign to watch for and the answer in their own words. Right: the Past's Book "
        "question — every part of each event, the choice to let it join the Book or keep it private, and \"Change this\" on each.",
        BODY,
    ),
    Spacer(1, 6),
]
two = Table(
    [[
        fitted(PROGRESS / "Morrow - 4 - Present written, full page.png", CONTENT_W * 0.36, PAGE_H * 0.62),
        folded(PROGRESS / "Morrow - 5 - Past written, full page.png", 2, CONTENT_W * 0.60, PAGE_H * 0.62),
    ]],
    colWidths=[CONTENT_W * 0.38, CONTENT_W * 0.62],
)
two.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
story += [
    two,
    Spacer(1, 6),
    *bullets(
        [
            "A line written in crisis is kept on the phone and held out of the Book, and the screen says so rather than overriding quietly.",
            "Each fault's answer is offered back on that goal's Obstacles stone; each virtue sits on the page of the goal it was paired with.",
        ]
    ),
    PageBreak(),
]

# ---------------------------------------------------------------- the journey
story += [
    Paragraph("5 · THE JOURNEY, FRAME BY FRAME", LABEL),
    Paragraph("How it is verified", H2),
    Paragraph(
        "The automated walk takes a screenshot after every tap. These two sheets are frames from it — the first evening through the sealed Book, "
        "and the Past walked to its Book question with a second edition sealed from there. All 192 frames are read by eye after every change.",
        BODY,
    ),
    Spacer(1, 6),
]
j_row = Table(
    [[fitted(JOURNEY / "_sheet-2.png", CONTENT_W * 0.49, PAGE_H * 0.5), fitted(JOURNEY / "_sheet-10.png", CONTENT_W * 0.49, PAGE_H * 0.5)]],
    colWidths=[CONTENT_W / 2] * 2,
)
j_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
story += [
    j_row,
    Spacer(1, 8),
    *bullets(
        [
            "339 end-to-end checks walk every screen of all three volumes, including Back, \"Not now\", the phone's back button, and killing the app mid-sentence and coming back.",
            "70 cold-open checks: every route opened on a fresh install and with links that point at nothing — a stale notification must still land on a screen with a way out.",
            "476 unit tests, 54 checks against a real Postgres, an accessibility pass with zero issues across 34 screens, and a 45/45 sync round-trip against the live account service.",
            "All of it runs as one command, and it has passed on the exact build the demo serves.",
        ]
    ),
    PageBreak(),
]

# ---------------------------------------------------------------- how it was built, and what is next
story += [
    Paragraph("6 · HOW IT GOT HERE", LABEL),
    Paragraph("The steps, in order", H2),
    *bullets(
        [
            "The Future volume first: the Interview, the Fifteen, the read-back, the five stones per goal, the Portrait, the sealed Book, and Today with its plan and evening seal.",
            "The account: sign-in by emailed link, push and pull of the whole store against the live Supabase project, delete-account, all behind row-level security.",
            "The other two volumes, named plainly Past and Present, each built to follow the source method's own moves: pick, narrow, write twice; periods, events, what they made of you.",
            "Then twelve rounds of verification the way a person uses it — half-finished volumes, screens outside the volumes, cold opens, the smallest phone, the whole journey by eye — each round finding and fixing real defects.",
            "The Declaration: the I will line across the person's own photo, kept private, shared, or sent to one named witness. No feed.",
        ]
    ),
    Spacer(1, 8),
    Paragraph("7 · WHAT IS NEXT", LABEL),
    Paragraph("Waiting on things only the client can supply", H2),
    *bullets(
        [
            "A native build on a phone — a Mac with Xcode or an Android SDK. Everything is verified on the web build; the hardware back button, VoiceOver and TalkBack, and large type can only be checked on a device.",
            "A model endpoint key: the AI-assisted read-back and scenes run on the app's own fallbacks until then, and the screens say so.",
            "RevenueCat keys for purchases, and Supabase Pro or SMTP for the six-digit sign-in code (the emailed link works today).",
            "A hosting token if a shareable web link is wanted; the demo runs from any machine with one command until then.",
        ]
    ),
    Spacer(1, 10),
    Paragraph(
        "The full account of every decision, every round and every check is kept in the repository's PROGRESS.md, so anyone can pick the work up from exactly where it stands.",
        SMALL,
    ),
]

doc = SimpleDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=MARGIN,
    rightMargin=MARGIN,
    topMargin=MARGIN,
    bottomMargin=16 * mm,
    title="Morrow — progress report",
    author="Morrow build",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT, f"{OUT.stat().st_size / 1024:.0f} KB")
