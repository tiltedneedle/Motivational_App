# Morrow — "Poster" direction. Paper, ink, one cobalt, a vermilion stamp. Heavy condensed grotesk, print rules, duotone photographs.
import pathlib, random

OUT = pathlib.Path(__file__).parent
PAPER = "#F3F2ED"; INK = "#101010"; INK2 = "#5A5A56"; RULE = "rgba(16,16,16,0.14)"; RULE2 = "rgba(16,16,16,0.32)"
COBALT = "#1F3BFF"; COBALT_SOFT = "#DCE1FF"; VERM = "#FF4A1C"

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap">'

MOTION = """
    @keyframes slide { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes stamp { 0% { opacity: 0; transform: scale(1.8) rotate(-14deg); } 60% { opacity: 1; transform: scale(0.94) rotate(-8deg); } 100% { transform: scale(1) rotate(-8deg); } }
    @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes growY { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes inkfill { to { stroke-dashoffset: 0; } }
    @keyframes kenburns { from { transform: scale(1.0); } to { transform: scale(1.07); } }
    @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    .kb { animation: kenburns 30s ease-out both; }
    .ticker { animation: ticker 18s linear infinite; }
    .blink { animation: blink 1.1s steps(2, start) infinite; }
    .pop { animation: pop .7s cubic-bezier(.2,.9,.3,1.2) both; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
"""

def helmet():
    return f"""<helmet>
  {FONTS}
  <style>
    body {{ margin: 0; font-family: "Archivo", "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
    a {{ color: {COBALT}; }} a:hover {{ color: {VERM}; }}
    .display {{ font-family: "Archivo", "Arial Narrow", Arial, sans-serif; font-variation-settings: 'wdth' 72; font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em; line-height: 0.9; }}
    .cond {{ font-family: "Archivo", "Arial Narrow", Arial, sans-serif; font-variation-settings: 'wdth' 80; font-weight: 700; }}
    .mono {{ font-family: "IBM Plex Mono", Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }}
    .eyebrow {{ font-family: "IBM Plex Mono", Menlo, Consolas, monospace; font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; }}
    .duo {{ filter: grayscale(1) contrast(1.15) brightness(0.95); }}
{MOTION}
  </style>
</helmet>"""

def doc(body, script=None):
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
{helmet()}
{body}
</x-dc>
{script or ''}
</body>
</html>
"""

def S(d): return f'animation: slide .8s cubic-bezier(.2,.8,.2,1) {d}s both;'
def U(d): return f'animation: up .7s cubic-bezier(.2,.8,.2,1) {d}s both;'
def GROW(d, origin="left"): return f'transform-origin: {origin}; animation: grow 1.1s cubic-bezier(.3,.1,.2,1) {d}s both;'

def root(inner, bg=PAPER, color=INK):
    return f'<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: {bg}; color: {color};">{inner}</div>'

def topbar(left, right, color=INK, delay=0.05):
    return f'<div style="position: absolute; left: 20px; right: 20px; top: 18px; display: flex; justify-content: space-between; align-items: center; color: {color}; {U(delay)}"><div class="eyebrow">{left}</div><div class="eyebrow">{right}</div></div>'

def tabbar(active, dark=False):
    bg = INK if not dark else PAPER; fg = PAPER if not dark else INK
    items = [("today","TODAY"),("goals","GOALS"),("envision","VISION"),("coach","COACH")]
    cells = "".join(
        f'<div style="flex: 1 1 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; height: 100%; {"background: " + COBALT + "; color: " + PAPER + ";" if k==active else ""}">'
        f'<div class="mono" style="font-size: 10.5px; letter-spacing: 0.14em; font-weight: 600;">{l}</div></div>' for k,l in items)
    return f"""
  <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 74px; background: {bg}; color: {fg}; display: flex; align-items: stretch; padding-bottom: 12px; box-sizing: border-box; {U(0.9)}">{cells}
    <div style="flex: 0 0 74px; display: flex; align-items: center; justify-content: center; border-left: 1px solid rgba(255,255,255,0.15);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"><path d="M12 5v14M5 12h14"></path></svg></div>
  </div>"""

def button(label, delay=0.8, bg=INK, fg=PAPER):
    return f'<div style="height: 60px; background: {bg}; color: {fg}; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; {U(delay)}"><span>{label}</span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"><path d="M5 12h14M13 6l6 6-6 6"></path></svg></div>'

def stamp(text, delay, size=118, color=VERM, sub=""):
    return f"""<div style="position: relative; width: {size}px; height: {size}px; animation: stamp .7s cubic-bezier(.2,.9,.2,1) {delay}s both; color: {color};">
      <svg width="{size}" height="{size}" viewBox="0 0 120 120" fill="none" style="position: absolute; inset: 0;">
        <circle cx="60" cy="60" r="56" stroke="currentColor" stroke-width="4"></circle>
        <circle cx="60" cy="60" r="46" stroke="currentColor" stroke-width="1.5"></circle>
        <path id="stamp-arc" d="M60 60 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" fill="none"></path>
        <text font-family="IBM Plex Mono, Menlo, monospace" font-size="9.5" letter-spacing="2.4" fill="currentColor" font-weight="600"><textPath href="#stamp-arc" startOffset="2%">{text}</textPath></text>
      </svg>
      <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"><path d="M4 13l5 5L20 7"></path></svg></div>
    </div>"""

def index_row(n, text, meta, delay, done=False, color=INK):
    return f'<div style="display: flex; align-items: center; gap: 14px; height: 54px; border-top: 1px solid {RULE2}; {S(delay)}"><div class="mono" style="font-size: 12px; font-weight: 600; color: {COBALT}; width: 22px;">{n}</div><div class="cond" style="flex: 1 1 auto; font-size: 20px; letter-spacing: -0.01em; {"text-decoration: line-through; color: " + INK2 + ";" if done else ""}">{text}</div><div class="mono" style="font-size: 11px; color: {INK2}; white-space: nowrap;">{meta}</div></div>'

# ---------------------------------------------------------------- Welcome
ticker_words = " · ".join(["MEET WHO YOU'RE BECOMING", "ONE HONEST DAY", "PLANS, NOT CHATS", "RETURNS COUNT"] * 2)
welcome = root(f"""
  {topbar("Morrow · 2026", "v1", delay=0.05)}
  <div class="display" style="position: absolute; left: 14px; right: 14px; top: 130px; font-size: 104px; letter-spacing: -0.035em; line-height: 0.86; {S(0.2)}">Morrow</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 232px; font-size: 22px; line-height: 27px; font-weight: 600; letter-spacing: -0.02em; {U(0.35)}">Meet who you're becoming.</div>
  <div style="position: absolute; left: 0; right: 0; top: 356px; height: 46px; background: {COBALT}; color: {PAPER}; overflow: hidden; display: flex; align-items: center; {U(0.5)}">
    <div class="ticker mono" style="white-space: nowrap; font-size: 12px; letter-spacing: 0.16em; font-weight: 600; padding-left: 20px;">{ticker_words} · {ticker_words}</div>
  </div>
  <div style="position: absolute; left: 0; right: 0; top: 402px; height: 300px; overflow: hidden; {U(0.6)}">
    <img class="kb duo" src="scene-runner.jpeg" alt="" style="width: 390px; height: 600px; object-fit: cover; margin-top: -120px; display: block; transform-origin: 50% 40%;">
    <div style="position: absolute; inset: 0; background: {COBALT}; mix-blend-mode: screen; opacity: 0.55;"></div>
    <div style="position: absolute; inset: 0; background: {COBALT}; mix-blend-mode: multiply; opacity: 0.25;"></div>
    <div style="position: absolute; left: 20px; bottom: 18px; right: 20px; color: {PAPER}; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 26px;">A future-self coach. It asks, plans, and remembers.</div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column;">
    <div style="display: flex; justify-content: space-between; padding: 14px 20px; border-top: 1px solid {RULE2}; {U(0.9)}"><div class="eyebrow" style="color: {INK2};">Five minutes</div><div class="eyebrow" style="color: {INK2};">No sign‑up yet</div></div>
    {button("Begin the interview", 1.0)}
  </div>
""")
(OUT/"Welcome.dc.html").write_text(doc(welcome), encoding="utf-8")

# ---------------------------------------------------------------- Today
today = root(f"""
  {topbar("Tue 8 Sept · 06:41", "Day 251")}
  <div class="display" style="position: absolute; left: 16px; top: 52px; font-size: 118px; {S(0.15)}">Today</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 172px; font-size: 19px; line-height: 24px; font-weight: 500; letter-spacing: -0.01em; color: {INK2}; {U(0.3)}">The ten‑minute version counts. <span style="color: {INK};">Start with the run.</span></div>

  <div style="position: absolute; left: 20px; right: 20px; top: 246px; background: {INK}; color: {PAPER}; padding: 20px 20px 22px; display: flex; flex-direction: column; gap: 10px; {U(0.45)}">
    <div style="display: flex; justify-content: space-between; align-items: center;"><div class="eyebrow" style="color: {COBALT_SOFT};">Now · Morning peak</div><div class="mono" style="font-size: 11px; opacity: 0.6;">10 MIN</div></div>
    <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 14px;">
      <div class="display" style="font-size: 52px; line-height: 0.92; text-transform: none; letter-spacing: -0.03em;">Ten‑minute<br>run</div>
      <div class="pop" style="width: 66px; height: 66px; border-radius: 50%; background: {COBALT}; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; animation-delay: .9s;"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="{PAPER}" stroke-width="2.6" stroke-linecap="square"><path d="M4 13l5 5L20 7"></path></svg></div>
    </div>
    <div style="font-size: 14px; line-height: 19px; opacity: 0.75;">If it's raining: the stairwell, same ten minutes.</div>
  </div>

  <div style="position: absolute; left: 20px; right: 20px; top: 468px; display: flex; flex-direction: column;">
    <div class="eyebrow" style="color: {INK2}; padding-bottom: 8px; {U(0.6)}">Later today</div>
    {index_row("02", "Write 300 words of the pitch", "45 MIN", 0.7)}
    {index_row("03", "Book the physio", "10 MIN", 0.8)}
    {index_row("04", "Call Dad", "DONE", 0.9, done=True)}
  </div>

  <div style="position: absolute; left: 20px; right: 20px; top: 662px; display: flex; align-items: flex-end; justify-content: space-between; border-top: 1px solid {RULE2}; padding-top: 10px; {U(1.0)}">
    <div style="display: flex; flex-direction: column;"><div class="eyebrow" style="color: {INK2};">Consistency · 28 days</div><div class="display" style="font-size: 64px; color: {COBALT}; letter-spacing: -0.04em; line-height: 0.9; margin-top: 4px;">71</div></div>
    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px; padding-bottom: 4px;"><div class="mono" style="font-size: 11px; color: {INK2};">UP FROM 64 · RETURN #4</div><div style="width: 150px; height: 10px; background: rgba(16,16,16,0.10); position: relative;"><div style="position: absolute; left: 0; top: 0; bottom: 0; width: 71%; background: {COBALT}; {GROW(1.2)}"></div></div></div>
  </div>
""" + tabbar('today'))
(OUT/"Main.dc.html").write_text(doc(today), encoding="utf-8")

# ---------------------------------------------------------------- Interview
interview = root(f"""
  {topbar("The interview", "Q5")}
  <div style="position: absolute; left: 20px; right: 20px; top: 56px; display: flex; align-items: flex-end; justify-content: space-between; {U(0.2)}">
    <div class="display" style="font-size: 96px; color: {COBALT}; letter-spacing: -0.04em;">64<span style="font-size: 40px; letter-spacing: 0;">%</span></div>
    <div class="eyebrow" style="color: {INK2}; padding-bottom: 12px;">Clarity</div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 158px; height: 12px; background: rgba(16,16,16,0.10);"><div style="width: 64%; height: 100%; background: {COBALT}; {GROW(0.4)}"></div></div>
  <div style="position: absolute; left: 20px; right: 20px; top: 190px; display: flex; gap: 12px; align-items: center; padding: 12px 0 14px; border-bottom: 1px solid {RULE2}; {U(0.6)}">
    <div style="flex: 1 1 auto; font-size: 15px; line-height: 20px; color: {INK2}; font-style: italic;">Something about mornings, energy, and not being tired anymore…</div>
    <div class="mono" style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; padding: 9px 12px; background: {INK}; color: {PAPER}; white-space: nowrap;">YES, THAT</div>
  </div>
  <div class="display" style="position: absolute; left: 20px; right: 20px; top: 280px; font-size: 46px; text-transform: none; letter-spacing: -0.03em; line-height: 0.96; {S(0.7)}">When you imagine it working, what is different first?</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 476px; display: flex; flex-direction: column;">
""" + "".join(f'<div style="display: flex; align-items: center; gap: 16px; height: 58px; border-top: 1px solid {RULE2}; {S(0.9 + i*0.08)}"><div class="mono" style="font-size: 12px; font-weight: 600; color: {COBALT}; width: 22px;">{l}</div><div class="cond" style="font-size: 21px; letter-spacing: -0.01em;">{t}</div></div>' for i,(l,t) in enumerate([("A","How my mornings feel"),("B","What my body can do"),("C","The number in my account"),("D","Who I spend evenings with")])) + f"""
    <div style="border-top: 1px solid {RULE2};"></div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0;">{button("Or hold and say it your way", 1.3)}</div>
""")
(OUT/"Interview.dc.html").write_text(doc(interview), encoding="utf-8")

# ---------------------------------------------------------------- Portrait (cobalt page)
portrait = root(f"""
  {topbar("Your goal portrait", "Sept 2026", color=PAPER)}
  <div class="display" style="position: absolute; left: 20px; right: 20px; top: 70px; font-size: 54px; text-transform: none; letter-spacing: -0.03em; line-height: 0.94; {S(0.2)}">Run the Lahore half marathon in March, and feel at home in my body again.</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 402px; padding: 16px 0; border-top: 1px solid rgba(243,242,237,0.35); border-bottom: 1px solid rgba(243,242,237,0.35); font-size: 21px; line-height: 27px; font-weight: 500; letter-spacing: -0.015em; {U(0.5)}">“I'm tired of being the person who cancels.” <span style="opacity: 0.6;">— you, Tuesday.</span></div>
  <div style="position: absolute; left: 20px; right: 20px; top: 520px; display: flex; flex-direction: column; gap: 6px; {U(0.7)}">
    <div class="eyebrow" style="color: {COBALT_SOFT};">Becoming</div>
    <div style="font-size: 22px; line-height: 27px; font-weight: 700; letter-spacing: -0.02em;">Someone who keeps the small promise on the ordinary day.</div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 626px; display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid rgba(243,242,237,0.35); {U(0.85)}">
    <div style="display: flex; flex-direction: column; gap: 4px;"><div class="eyebrow" style="color: {COBALT_SOFT};">First move · Wed 9</div><div style="font-size: 17px; font-weight: 600;">Walk‑run ten minutes after coffee.</div></div>
    <div class="mono" style="font-size: 11px; opacity: 0.7; white-space: nowrap;">+2 THIS WK</div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0;">{button("Make this my Blueprint", 1.0, bg=PAPER, fg=INK)}</div>
""", bg=COBALT, color=PAPER)
(OUT/"Portrait.dc.html").write_text(doc(portrait), encoding="utf-8")

# ---------------------------------------------------------------- Blueprint
def bp_move(text, meta, delay, done=False):
    box = f'<div style="width: 20px; height: 20px; background: {COBALT}; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="{PAPER}" stroke-width="3.5" stroke-linecap="square"><path d="M4 13l5 5L20 7"></path></svg></div>' if done else f'<div style="width: 20px; height: 20px; border: 1.5px solid {INK}; flex: 0 0 auto; box-sizing: border-box;"></div>'
    return f'<div style="display: flex; align-items: center; gap: 14px; height: 50px; border-top: 1px solid {RULE}; {S(delay)}">{box}<div style="flex: 1 1 auto; font-size: 16px; font-weight: 500; {"text-decoration: line-through; color: " + INK2 + ";" if done else ""}">{text}</div><div class="mono" style="font-size: 11px; color: {INK2}; white-space: nowrap;">{meta}</div></div>'
blueprint = root(f"""
  {topbar("Blueprint · v1", "12 weeks")}
  <div class="display" style="position: absolute; left: 16px; top: 48px; font-size: 72px; text-transform: none; letter-spacing: -0.035em; {S(0.15)}">Lahore half<br>marathon</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 190px; display: flex; gap: 4px; height: 14px; {U(0.35)}">""" + "".join(f'<div style="flex: 1 1 0; background: {COBALT if i==0 else "rgba(16,16,16,0.12)"};"></div>' for i in range(12)) + f"""</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 212px; display: flex; justify-content: space-between; {U(0.4)}"><div class="eyebrow" style="color: {COBALT};">Week 1 of 12</div><div class="eyebrow" style="color: {INK2};">Race day · Mar 2027</div></div>
  <div style="position: absolute; left: 20px; right: 20px; top: 252px; display: flex; flex-direction: column;">
    <div style="display: flex; gap: 14px; align-items: flex-start; padding-top: 12px; border-top: 2px solid {INK}; {S(0.5)}">
      <div class="display" style="font-size: 44px; color: {COBALT}; letter-spacing: -0.02em; line-height: 0.9;">01</div>
      <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 4px;"><div class="cond" style="font-size: 22px; letter-spacing: -0.015em;">Run 5 km without stopping</div><div class="mono" style="font-size: 11px; color: {INK2};">BY 4 OCT · 26 DAYS · PROOF: A 5 KM RUN, ANY PACE</div></div>
    </div>
    <div style="margin-top: 10px; display: flex; flex-direction: column;">
      {bp_move("Walk‑run 10 min after coffee", "WED 9", 0.65, done=True)}
      {bp_move("Book the physio for the knee", "THU 10", 0.72)}
      {bp_move("Three 15‑min walk‑runs", "WK 1", 0.79)}
      {bp_move("Evening stretch · 2‑min ok", "DAILY", 0.86)}
    </div>
    <div style="display: flex; gap: 14px; align-items: flex-start; margin-top: 18px; padding-top: 12px; border-top: 2px solid {INK}; opacity: 0.55; {S(1.0)}">
      <div class="display" style="font-size: 44px; letter-spacing: -0.02em; line-height: 0.9;">02</div>
      <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 4px;"><div class="cond" style="font-size: 22px;">Run 10 km on a Sunday</div><div class="mono" style="font-size: 11px; color: {INK2};">BY 8 NOV</div></div>
    </div>
    <div style="display: flex; gap: 14px; align-items: flex-start; margin-top: 18px; padding-top: 12px; border-top: 2px solid {INK}; opacity: 0.35; {S(1.1)}">
      <div class="display" style="font-size: 44px; letter-spacing: -0.02em; line-height: 0.9;">03</div>
      <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 4px;"><div class="cond" style="font-size: 22px;">Race day, 21.1 km</div><div class="mono" style="font-size: 11px; color: {INK2};">MARCH</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0;">{button("Start with the first move", 1.2)}</div>
""")
(OUT/"Blueprint.dc.html").write_text(doc(blueprint), encoding="utf-8")

# ---------------------------------------------------------------- Goal (duotone photo)
goal = root(f"""
  <div style="position: absolute; left: 0; right: 0; top: 0; height: 420px; overflow: hidden; background: {COBALT};">
    <img class="kb duo" src="scene-runner.jpeg" alt="" style="width: 390px; height: 600px; object-fit: cover; margin-top: -60px; display: block; mix-blend-mode: screen; opacity: 0.9; transform-origin: 50% 40%;">
    <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(31,59,255,0) 50%, rgba(31,59,255,0.85) 100%);"></div>
  </div>
  {topbar("← Goal · Health", "179 days", color=PAPER)}
  <div class="display" style="position: absolute; left: 16px; right: 16px; top: 284px; color: {PAPER}; font-size: 66px; text-transform: none; letter-spacing: -0.035em; {S(0.3)}">Lahore half<br>marathon</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 444px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); {U(0.6)}">
    <div style="display: flex; flex-direction: column; gap: 2px; border-right: 1px solid {RULE2}; padding-right: 10px;"><div class="display" style="font-size: 40px; letter-spacing: -0.03em; text-transform: none;">3.2</div><div class="eyebrow" style="color: {INK2};">km longest</div></div>
    <div style="display: flex; flex-direction: column; gap: 2px; border-right: 1px solid {RULE2}; padding: 0 10px;"><div class="display" style="font-size: 40px; letter-spacing: -0.03em; color: {COBALT};">26</div><div class="eyebrow" style="color: {INK2};">days to M1</div></div>
    <div style="display: flex; flex-direction: column; gap: 2px; padding-left: 10px;"><div class="display" style="font-size: 40px; letter-spacing: -0.03em;">14</div><div class="eyebrow" style="color: {INK2};">evidence</div></div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 540px; display: flex; flex-direction: column; gap: 8px; {U(0.8)}">
    <div style="display: flex; justify-content: space-between;"><div class="eyebrow" style="color: {INK2};">The path</div><div class="eyebrow" style="color: {COBALT};">You are here</div></div>
    <div style="position: relative; height: 22px;">
      <div style="position: absolute; left: 0; right: 0; top: 10px; height: 2px; background: rgba(16,16,16,0.18);"></div>
      <div style="position: absolute; left: 0; width: 22%; top: 10px; height: 2px; background: {COBALT}; {GROW(1.0)}"></div>
      <div class="pop" style="position: absolute; left: 22%; top: 3px; width: 16px; height: 16px; margin-left: -8px; background: {COBALT}; animation-delay: 1.8s;"></div>
      <div style="position: absolute; left: 44%; top: 6px; width: 10px; height: 10px; margin-left: -5px; background: {PAPER}; border: 2px solid {INK}; box-sizing: border-box;"></div>
      <div style="position: absolute; left: 86%; top: 6px; width: 10px; height: 10px; margin-left: -5px; background: {PAPER}; border: 2px solid {INK}; box-sizing: border-box;"></div>
      <div style="position: absolute; right: 0; top: 6px; width: 10px; height: 10px; background: {INK};"></div>
    </div>
  </div>
  <div style="position: absolute; left: 20px; right: 0; top: 626px; display: flex; flex-direction: column; gap: 10px; {U(1.0)}">
    <div class="eyebrow" style="color: {INK2};">Anchors</div>
    <div style="display: flex; gap: 8px; height: 84px;">
      <div style="width: 84px; overflow: hidden; flex: 0 0 auto;"><img class="duo" src="scene-kitchen.jpeg" alt="" style="width: 84px; height: 84px; object-fit: cover; display: block;"></div>
      <div style="width: 160px; flex: 0 0 auto; padding: 10px 12px; box-sizing: border-box; border: 1.5px solid {INK}; display: flex; align-items: flex-end;"><div class="cond" style="font-size: 16px; line-height: 19px;">“Slow is smooth, smooth is fast.”</div></div>
      <div style="width: 84px; overflow: hidden; flex: 0 0 auto;"><img class="duo" src="scene-runner.jpeg" alt="" style="width: 84px; height: 84px; object-fit: cover; object-position: 60% 60%; display: block;"></div>
      <div style="width: 48px; flex: 0 0 auto; border: 1.5px dashed {RULE2}; display: flex; align-items: center; justify-content: center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{INK2}" stroke-width="2" stroke-linecap="square"><path d="M12 5v14M5 12h14"></path></svg></div>
    </div>
  </div>
""" + tabbar('goals'))
(OUT/"Goal.dc.html").write_text(doc(goal), encoding="utf-8")

# ---------------------------------------------------------------- Envision (duotone scene)
envision = root(f"""
  <div style="position: absolute; inset: 0; background: {INK};">
    <img class="kb duo" src="scene-kitchen.jpeg" alt="" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; object-fit: cover; object-position: 50% 35%; display: block; opacity: 0.95; transform-origin: 50% 30%;">
    <div style="position: absolute; inset: 0; background: {COBALT}; mix-blend-mode: multiply; opacity: 0.55;"></div>
    <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(16,16,16,0.2) 0%, rgba(16,16,16,0) 30%, rgba(16,16,16,0) 55%, rgba(16,16,16,0.92) 78%, {INK} 100%);"></div>
  </div>
  {topbar("The practice · 1 of 3", "Generated", color=PAPER)}
  <div style="position: absolute; left: 20px; top: 56px; display: flex; gap: 6px; {U(0.3)}">""" + "".join(f'<div style="width: 34px; height: 4px; background: {PAPER if i==0 else "rgba(243,242,237,0.35)"};"></div>' for i in range(3)) + f"""</div>
  <div class="display" style="position: absolute; left: 16px; right: 16px; bottom: 232px; color: {PAPER}; font-size: 42px; text-transform: none; letter-spacing: -0.03em; line-height: 0.96; {S(0.6)}">It's 6:40 and the kitchen is still blue. You lace the left shoe first, like always.</div>
  <div class="mono" style="position: absolute; left: 20px; right: 20px; bottom: 200px; color: rgba(243,242,237,0.7); font-size: 11px; letter-spacing: 0.08em; {U(0.8)}">FROM YOUR WORDS · “THE KITCHEN AT 6:40, BEFORE ANYONE'S UP”</div>
  <div style="position: absolute; left: 20px; right: 20px; bottom: 138px; display: flex; gap: 8px; {U(0.95)}">""" + "".join(f'<div class="mono" style="font-size: 11px; letter-spacing: 0.1em; padding: 10px 12px; border: 1.5px solid rgba(243,242,237,0.6); color: {PAPER};">{t}</div>' for t in ["WARMER","SIMPLER","CLOSER TO HOME"]) + f"""</div>
  <div style="position: absolute; left: 20px; right: 20px; bottom: 84px; display: flex; gap: 8px; {U(1.05)}">
    <div style="flex: 1 1 0; height: 46px; border: 1.5px solid {PAPER}; color: {PAPER}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">Try another</div>
    <div style="flex: 1 1 0; height: 46px; background: {PAPER}; color: {INK}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">Make wallpaper</div>
  </div>
""" + tabbar('envision'))
(OUT/"Envision.dc.html").write_text(doc(envision), encoding="utf-8")

# ---------------------------------------------------------------- Coach (printed letter)
def brief(label, text, delay):
    return f'<div style="display: flex; gap: 14px; padding: 12px 0; border-top: 1px solid {RULE2}; {S(delay)}"><div class="eyebrow" style="width: 78px; flex: 0 0 auto; color: {COBALT}; padding-top: 3px;">{label}</div><div style="font-size: 15px; line-height: 21px; font-weight: 500;">{text}</div></div>'
coach = root(f"""
  <div style="position: absolute; left: 0; right: 0; top: 0; height: 132px; background: {INK}; color: {PAPER};">
    {topbar("Dawn brief · Tue 8 Sept", "06:30", color=PAPER)}
    <div class="display" style="position: absolute; left: 16px; top: 44px; font-size: 76px; {S(0.15)}">Brief</div>
  </div>
  <div class="display" style="position: absolute; left: 20px; right: 20px; top: 154px; font-size: 34px; text-transform: none; letter-spacing: -0.025em; line-height: 0.98; {S(0.35)}">You ran on the day you were sick. That's the one I'll remember.</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 300px; display: flex; flex-direction: column;">
    {brief("Yesterday", 'Two of three moves, plus the two‑minute stretch at 11 pm. Sealed at <span class="mono">71</span>, up from <span class="mono">64</span>. The physio is booked for Thursday.', 0.55)}
    {brief("Today", "Start with the ten‑minute run, before the pitch. The pitch will eat the morning if you let it, and the run makes it better.", 0.7)}
    {brief("If", "If it's raining at 7, then the stairwell, ten floors, twice. Same shoes, same ten minutes.", 0.85)}
    <div style="border-top: 1px solid {RULE2};"></div>
    <div class="pop" style="margin-top: 14px; align-self: flex-start; display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: {COBALT_SOFT}; color: {COBALT}; animation-delay: 1.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"><path d="M4 13l5 5L20 7"></path></svg><div class="mono" style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em;">RUN SET AS FIRST MOVE</div></div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; bottom: 150px; display: flex; gap: 8px; flex-wrap: wrap; {U(1.3)}">""" + "".join(f'<div class="mono" style="font-size: 11px; letter-spacing: 0.08em; padding: 10px 12px; border: 1.5px solid {INK};">{t}</div>' for t in ["I'M STUCK","I DON'T FEEL LIKE IT","SOMETHING CHANGED","CELEBRATE"]) + f"""</div>
  <div style="position: absolute; left: 0; right: 0; bottom: 74px; height: 60px; border-top: 1px solid {RULE2}; display: flex; align-items: center; padding: 0 20px; gap: 12px; {U(1.4)}"><div style="flex: 1 1 auto; font-size: 16px; color: {INK2};">Talk to the coach</div><div class="blink" style="width: 10px; height: 22px; background: {COBALT};"></div></div>
""" + tabbar('coach'))
(OUT/"Coach.dc.html").write_text(doc(coach), encoding="utf-8")

# ---------------------------------------------------------------- Review (bar chart)
random.seed(11)
vals = [52,55,50,58,61,57,60,63,59,66,64,62,67,70,65,63,68,71,69,72,70,66,73,74,71,75,73,71]
bars = "".join(f'<div style="flex: 1 1 0; height: {int((v-40)/40*100)}%; background: {COBALT if i==27 else INK}; opacity: {1 if i==27 else 0.85 - (27-i)*0.015:.2f}; transform-origin: bottom; animation: growY .8s cubic-bezier(.3,.1,.2,1) {0.6 + i*0.03:.2f}s both;"></div>' for i,v in enumerate(vals))
review = root(f"""
  {topbar("Horizon review · Week 36", "1–7 Sept")}
  <div class="display" style="position: absolute; left: 16px; top: 46px; font-size: 168px; color: {COBALT}; letter-spacing: -0.06em; line-height: 0.82; {S(0.15)}">71</div>
  <div style="position: absolute; right: 20px; top: 66px; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; {U(0.4)}">
    <div style="display: flex; flex-direction: column; align-items: flex-end;"><div class="display" style="font-size: 34px; letter-spacing: -0.02em;">+7</div><div class="eyebrow" style="color: {INK2};">This week</div></div>
    <div style="display: flex; flex-direction: column; align-items: flex-end;"><div class="display" style="font-size: 34px; letter-spacing: -0.02em;">#4</div><div class="eyebrow" style="color: {INK2};">Return</div></div>
  </div>
  <div class="eyebrow" style="position: absolute; left: 20px; top: 198px; color: {INK2}; {U(0.5)}">Consistency · last 28 days</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 222px; height: 120px; display: flex; align-items: flex-end; gap: 3px; border-bottom: 2px solid {INK};">{bars}</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 348px; display: flex; justify-content: space-between; {U(0.8)}"><div class="mono" style="font-size: 10px; color: {INK2};">28 DAYS AGO</div><div class="mono" style="font-size: 10px; color: {COBALT};">TODAY</div></div>
  <div class="display" style="position: absolute; left: 20px; right: 20px; top: 388px; font-size: 30px; text-transform: none; letter-spacing: -0.025em; line-height: 1.0; {S(0.9)}">Three runs, all short, all real. The knee held. Next week asks for one more, not two.</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 548px; display: flex; flex-direction: column; {U(1.1)}">
    <div class="eyebrow" style="color: {INK2}; padding-bottom: 8px;">Proposed replan</div>
    <div style="display: flex; align-items: center; gap: 14px; height: 50px; border-top: 1px solid {RULE2};"><div class="mono" style="font-size: 11px; font-weight: 600; color: {COBALT}; width: 44px;">ADD</div><div style="flex: 1 1 auto; font-size: 16px; font-weight: 600;">Fourth walk‑run, Saturday</div></div>
    <div style="display: flex; align-items: center; gap: 14px; height: 50px; border-top: 1px solid {RULE2}; border-bottom: 1px solid {RULE2};"><div class="mono" style="font-size: 11px; font-weight: 600; color: {INK2}; width: 44px;">MOVE</div><div style="flex: 1 1 auto; font-size: 16px; font-weight: 600;">Physio to Tuesday morning</div></div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0;">{button("Review the Replan", 1.3)}</div>
""")
(OUT/"Review.dc.html").write_text(doc(review), encoding="utf-8")

# ---------------------------------------------------------------- Seal (ink page with a vermilion stamp)
seal = root(f"""
  {topbar("Seal the day · 22:14", "Day 251", color=PAPER)}
  <div class="display" style="position: absolute; left: 16px; right: 16px; top: 52px; font-size: 62px; text-transform: none; letter-spacing: -0.035em; line-height: 0.92; color: {PAPER}; {S(0.15)}">Quiet day. The stretch still counted.</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 262px; display: flex; flex-direction: column; gap: 14px; color: {PAPER};">
    <div style="display: flex; flex-direction: column; gap: 8px; {U(0.4)}"><div class="eyebrow" style="opacity: 0.6;">Today, in a word</div><div style="display: flex; gap: 8px;">""" + "".join(f'<div class="mono" style="font-size: 11px; letter-spacing: 0.1em; padding: 10px 12px; border: 1.5px solid {"" + VERM if t=="STEADY" else "rgba(243,242,237,0.45)"}; {"background: " + VERM + "; color: " + INK + ";" if t=="STEADY" else ""}">{t}</div>' for t in ["CALM","TIRED","PROUD","STEADY"]) + f"""</div></div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 12px; border-top: 1px solid rgba(243,242,237,0.25); {U(0.55)}"><div class="eyebrow" style="opacity: 0.6;">One piece of proof</div><div style="font-size: 17px; line-height: 22px; font-weight: 600;">Two‑minute calves at 11 pm, on the bathroom floor.</div></div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 12px; border-top: 1px solid rgba(243,242,237,0.25); {U(0.7)}"><div class="eyebrow" style="opacity: 0.6;">One thing you're glad of</div><div style="font-size: 16px; line-height: 22px; opacity: 0.5;">Type, or hold to speak…</div></div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 40px; display: flex; flex-direction: column; align-items: center; gap: 14px;">
    {stamp("SEALED · 8 SEPT 2026 · MORROW ·", 1.2, size=150)}
    <div class="eyebrow" style="color: rgba(243,242,237,0.6); {U(1.6)}">Hold to seal</div>
  </div>
""", bg=INK, color=PAPER)
(OUT/"Seal.dc.html").write_text(doc(seal), encoding="utf-8")

# ---------------------------------------------------------------- Almanac (square grid)
random.seed(3)
cells = []
for d in range(1, 32):
    for m in range(12):
        past = (m < 8) or (m == 8 and d <= 8)
        delay = f"animation: up .5s ease-out {0.3 + d*0.03:.2f}s both;"
        if (m in (1,3,5,8,10) and d == 31) or (m == 1 and d > 28):
            cells.append('<div></div>'); continue
        if not past:
            cells.append(f'<div style="width: 9px; height: 9px; border: 1px solid rgba(16,16,16,0.18); box-sizing: border-box; {delay}"></div>'); continue
        r = random.random()
        if m == 8 and d == 8:
            cells.append(f'<div style="width: 9px; height: 9px; background: {COBALT}; box-shadow: 0 0 0 3px {COBALT_SOFT}; {delay}"></div>')
        elif r < 0.12:
            cells.append(f'<div style="width: 9px; height: 9px; border: 1px solid rgba(16,16,16,0.35); box-sizing: border-box; {delay}"></div>')
        elif r < 0.8:
            cells.append(f'<div style="width: 9px; height: 9px; background: {INK}; {delay}"></div>')
        else:
            cells.append(f'<div style="width: 9px; height: 9px; background: {VERM}; {delay}"></div>')
months = "".join(f'<div class="mono" style="font-size: 9px; color: {INK2}; text-align: center;">{m}</div>' for m in ["J","F","M","A","M","J","J","A","S","O","N","D"])
almanac = root(f"""
  {topbar("Almanac · 2026", "251 / 365")}
  <div style="position: absolute; left: 16px; right: 20px; top: 44px; display: flex; align-items: flex-end; justify-content: space-between; {S(0.15)}">
    <div style="display: flex; flex-direction: column;"><div class="display" style="font-size: 110px; letter-spacing: -0.05em; line-height: 0.86;">214</div><div class="eyebrow" style="color: {INK2}; margin-left: 4px;">Pieces of evidence</div></div>
    <div style="display: flex; gap: 18px; padding-bottom: 6px;">
      <div style="display: flex; flex-direction: column; align-items: flex-end;"><div class="display" style="font-size: 30px; color: {VERM};">4</div><div class="eyebrow" style="color: {INK2};">Returns</div></div>
      <div style="display: flex; flex-direction: column; align-items: flex-end;"><div class="display" style="font-size: 30px;">19</div><div class="eyebrow" style="color: {INK2};">Best</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 190px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; padding-bottom: 6px; border-bottom: 2px solid {INK}; {U(0.4)}">{months}</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 214px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 7px 6px; justify-items: center;">{''.join(cells)}</div>
  <div style="position: absolute; left: 20px; right: 20px; bottom: 96px; display: flex; gap: 16px; {U(1.4)}">
    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 9px; height: 9px; background: {INK};"></div><div class="mono" style="font-size: 10px; color: {INK2};">EVIDENCE</div></div>
    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 9px; height: 9px; background: {VERM};"></div><div class="mono" style="font-size: 10px; color: {INK2};">SEALED</div></div>
    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 9px; height: 9px; border: 1px solid rgba(16,16,16,0.35); box-sizing: border-box;"></div><div class="mono" style="font-size: 10px; color: {INK2};">QUIET</div></div>
    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 9px; height: 9px; background: {COBALT};"></div><div class="mono" style="font-size: 10px; color: {INK2};">TODAY</div></div>
  </div>
""" + tabbar('goals'))
(OUT/"Almanac.dc.html").write_text(doc(almanac), encoding="utf-8")

# ---------------------------------------------------------------- Paywall
paywall = root(f"""
  {topbar("Your Blueprint is ready", "×")}
  <div class="display" style="position: absolute; left: 16px; right: 16px; top: 52px; font-size: 56px; text-transform: none; letter-spacing: -0.035em; line-height: 0.92; {S(0.15)}">Keep the small promise, every ordinary day.</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 280px; display: flex; flex-direction: column;">
    """ + "".join(f'<div style="display: flex; gap: 14px; align-items: center; height: 46px; border-top: 1px solid {RULE2}; font-size: 16px; font-weight: 600; {S(0.4 + i*0.1)}"><div class="mono" style="font-size: 11px; color: {COBALT}; width: 22px;">0{i+1}</div>{t}</div>' for i,t in enumerate(["Unlimited goals and Replans","Vision Scenes, letters, wallpapers","The coach every morning and evening"])) + f"""
    <div style="border-top: 1px solid {RULE2};"></div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 470px; display: flex; gap: 10px; {U(0.8)}">
    <div style="flex: 1.4 1 0; padding: 16px; background: {INK}; color: {PAPER}; display: flex; flex-direction: column; gap: 2px;"><div class="eyebrow" style="color: {COBALT_SOFT};">Yearly · 7 days free</div><div class="display" style="font-size: 44px; letter-spacing: -0.03em; margin-top: 6px;">$49.99</div><div class="mono" style="font-size: 11px; opacity: 0.7; margin-top: 4px;">$4.17 / MONTH</div></div>
    <div style="flex: 1 1 0; padding: 16px; border: 1.5px solid {INK}; display: flex; flex-direction: column; gap: 2px;"><div class="eyebrow" style="color: {INK2};">Monthly</div><div class="display" style="font-size: 44px; letter-spacing: -0.03em; margin-top: 6px;">$9.99</div><div class="mono" style="font-size: 11px; color: {INK2}; margin-top: 4px;">NO TRIAL</div></div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column;">
    <div class="mono" style="text-align: center; font-size: 10px; letter-spacing: 0.1em; color: {INK2}; padding: 12px 20px; {U(1.0)}">RENEWS AUTOMATICALLY · CANCEL ANY TIME · RESTORE</div>
    <div style="display: flex; justify-content: center; padding-bottom: 12px; font-size: 15px; color: {INK2}; {U(1.05)}">Not now</div>
    {button("Start 7 days free", 1.1, bg=COBALT)}
  </div>
""")
(OUT/"Paywall.dc.html").write_text(doc(paywall), encoding="utf-8")

# ---------------------------------------------------------------- Brand sheet
brand = root(f"""
  {topbar("Morrow · Identity", "Poster")}
  <div class="pop" style="position: absolute; left: 20px; top: 60px; width: 124px; height: 124px; background: {INK}; border-radius: 28px; overflow: hidden; animation-delay: .2s;">
    <div class="display" style="position: absolute; left: 12px; top: 6px; color: {PAPER}; font-size: 92px; letter-spacing: -0.06em; line-height: 1;">M</div>
    <div style="position: absolute; right: 10px; bottom: 10px; width: 34px; height: 34px; border-radius: 50%; background: {VERM};"></div>
  </div>
  <div style="position: absolute; left: 160px; right: 16px; top: 62px; display: flex; flex-direction: column; gap: 4px; {S(0.4)}">
    <div class="display" style="font-size: 62px; letter-spacing: -0.04em;">Morrow</div>
    <div style="font-size: 15px; line-height: 20px; font-weight: 500; color: {INK2};">Meet who you're becoming.</div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 214px; display: flex; flex-direction: column; gap: 10px; {U(0.6)}">
    <div class="eyebrow" style="color: {INK2};">Paper, ink, one cobalt, one stamp</div>
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">
      <div style="height: 64px; background: {PAPER}; border: 1.5px solid {INK};"></div><div style="height: 64px; background: {INK};"></div><div style="height: 64px; background: {COBALT};"></div><div style="height: 64px; background: {VERM};"></div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">""" + "".join(f'<div class="mono" style="font-size: 9.5px; color: {INK2};">{t}</div>' for t in ["PAPER F3F2ED","INK 101010","COBALT 1F3BFF","VERM FF4A1C"]) + f"""</div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 352px; display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 2px solid {INK}; {U(0.8)}">
    <div class="eyebrow" style="color: {INK2};">One family, two widths</div>
    <div class="display" style="font-size: 40px; text-transform: none; letter-spacing: -0.03em;">Archivo condensed, heavy, for statements.</div>
    <div style="font-size: 16px; line-height: 22px; font-weight: 500;">Archivo regular width for everything you read. IBM Plex Mono for numbers, dates and labels.</div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 560px; display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 2px solid {INK}; {U(1.0)}">
    <div style="display: flex; flex-direction: column; gap: 6px;"><div class="eyebrow" style="color: {INK2};">The seal</div><div style="font-size: 15px; line-height: 20px; font-weight: 500; max-width: 190px;">A vermilion rubber stamp closes each day. It thumps in, slightly askew.</div></div>
    {stamp("SEALED · 8 SEPT 2026 · MORROW ·", 1.2, size=110)}
  </div>
  <div style="position: absolute; left: 20px; right: 20px; top: 706px; display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 2px solid {INK}; {U(1.2)}">
    <div class="eyebrow" style="color: {INK2};">Motion</div>
    <div style="font-size: 14px; line-height: 19px; font-weight: 500; color: {INK2};">Type slides in from the left like a press. Bars grow. Stamps thump. A cobalt ticker runs. No drift, no glow.</div>
  </div>
""")
(OUT/"Brand.dc.html").write_text(doc(brand), encoding="utf-8")

# ---------------------------------------------------------------- Alternate directions (low-fi, beside the deliverable)
alt = root(f"""
  {topbar("Alternates", "Low‑fi")}
  <div class="display" style="position: absolute; left: 16px; top: 46px; font-size: 44px; text-transform: none; letter-spacing: -0.03em; line-height: 0.96;">Two other ways this could go</div>
  <div style="position: absolute; left: 20px; right: 20px; top: 160px; display: flex; flex-direction: column; gap: 18px;">
    <div style="display: flex; gap: 14px; align-items: stretch;">
      <div style="width: 120px; height: 180px; flex: 0 0 auto; background: #E9E7E1; position: relative; overflow: hidden; border: 1px solid {RULE2};">
        <div style="position: absolute; left: 22px; top: 30px; width: 76px; height: 76px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FFE8C0, #F5A93B 60%, #B8651C); box-shadow: 0 18px 30px rgba(0,0,0,0.25);"></div>
        <div style="position: absolute; left: 14px; right: 14px; bottom: 34px; height: 8px; background: #101010; border-radius: 4px;"></div>
        <div style="position: absolute; left: 14px; right: 40px; bottom: 18px; height: 6px; background: rgba(16,16,16,0.25); border-radius: 3px;"></div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;"><div class="cond" style="font-size: 20px;">B · Studio object</div><div style="font-size: 14px; line-height: 19px; color: {INK2};">Pale grey studio, one rendered 3D object per screen (the sun as a physical sphere), big tactile buttons with real depth, warm light. The Not Boring / Grassfeld register. Needs a 3D artist or Spline.</div></div>
    </div>
    <div style="display: flex; gap: 14px; align-items: stretch;">
      <div style="width: 120px; height: 180px; flex: 0 0 auto; background: #F6E9DD; position: relative; overflow: hidden; border: 1px solid {RULE2};">
        <div style="position: absolute; left: 16px; top: 22px; width: 88px; height: 60px; border-radius: 22px; background: #F2C8B0;"></div>
        <div style="position: absolute; left: 16px; top: 92px; width: 60px; height: 44px; border-radius: 18px; background: #CFE3D4;"></div>
        <div style="position: absolute; left: 82px; top: 92px; width: 22px; height: 44px; border-radius: 12px; background: #D9D3F2;"></div>
        <div style="position: absolute; left: 16px; right: 16px; bottom: 16px; height: 22px; border-radius: 11px; background: #101010;"></div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;"><div class="cond" style="font-size: 20px;">C · Soft clay</div><div style="font-size: 14px; line-height: 19px; color: {INK2};">Pastel peach, mint and lilac blocks with big rounded shapes, a friendly companion character, rounded type. The Finch / Headspace register: warm and forgiving, at the cost of feeling younger.</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 20px; right: 20px; bottom: 30px; font-size: 13px; line-height: 18px; color: {INK2}; border-top: 1px solid {RULE2}; padding-top: 12px;">The Poster direction on this canvas is the recommendation: highest contrast with the archived Landscape system, cheapest to build (no shaders, no 3D), and it photographs well in an App Store listing.</div>
""")
(OUT/"Alternates.dc.html").write_text(doc(alt), encoding="utf-8")

print("generated:", sorted(p.name for p in OUT.glob("*.dc.html")))
