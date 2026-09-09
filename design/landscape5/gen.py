# Landscape v5: the first Morrow direction rebuilt for the self-authoring product.
# Living sky over a dark instrument ground; the sun on the ridge; Newsreader italic for the future self
# and Newsreader roman for the user's own words; Instrument Sans for the interface; Geist Mono for readouts.
import pathlib, random

OUT = pathlib.Path(__file__).parent
GROUND = "#0F1219"
SOL = "#FFC466"
PAPER = "#F7F3EC"
INKP = "#15181F"
SUNBTN = "linear-gradient(160deg, #FFD58A, #F5A93B)"

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&family=Instrument+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">'

def grain(alpha):
    return ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 %s 0'/></filter><rect width='140' height='140' filter='url(%%23n)'/></svg>\")" % alpha)

MOTION = """
    @keyframes rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes sunrise { from { transform: translateY(70px) scale(0.85); opacity: 0.4; } to { transform: translateY(0) scale(1); opacity: 1; } }
    @keyframes slowrise { from { transform: translateY(120px); } to { transform: translateY(0); } }
    @keyframes glow { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes drift { 0% { transform: translateX(-30px); } 100% { transform: translateX(30px); } }
    @keyframes twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
    @keyframes kenburns { from { transform: scale(1.0); } to { transform: scale(1.08); } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes drawto { to { stroke-dashoffset: var(--end); } }
    @keyframes travel { to { offset-distance: var(--dist); } }
    @keyframes fillring { to { stroke-dashoffset: 0; } }
    @keyframes pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes caret { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes typeon { from { max-height: 0; } to { max-height: 400px; } }
    .rise { animation: rise 1s cubic-bezier(.22,.7,.2,1) both; }
    .sun-rise { animation: sunrise 2.4s cubic-bezier(.2,.8,.2,1) both, glow 5s ease-in-out 2.4s infinite; }
    .slow-rise { animation: slowrise 14s linear both; }
    .rays { animation: spin 140s linear infinite; }
    .mist { animation: drift 16s ease-in-out infinite alternate; }
    .kb { animation: kenburns 30s ease-out both; }
    .draw { stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: draw 2.2s cubic-bezier(.4,.1,.2,1) .6s both; }
    .draw-short { stroke-dasharray: 400; stroke-dashoffset: 400; animation: draw 1.6s cubic-bezier(.4,.1,.2,1) .8s both; }
    .pop { animation: pop .9s cubic-bezier(.2,.9,.3,1.2) both; }
    .breathe { animation: breathe 4s ease-in-out infinite; }
    .shimmer { background-image: linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 70%); background-size: 200% 100%; animation: shimmer 3.5s ease-in-out 1.6s infinite; }
    .caret { display: inline-block; width: 2px; height: 1em; background: #FFC466; vertical-align: -0.15em; margin-left: 2px; animation: caret 1s steps(1) infinite; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
"""

def helmet(link_color="#7FA9E0", hover=SOL):
    return f"""<helmet>
  {FONTS}
  <style>
    body {{ margin: 0; font-family: "Instrument Sans", "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
    a {{ color: {link_color}; }} a:hover {{ color: {hover}; }}
    .serif {{ font-family: "Newsreader", Georgia, "Times New Roman", serif; }}
    .mono {{ font-family: "Geist Mono", Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }}
    .eyebrow {{ font-family: "Geist Mono", Menlo, Consolas, monospace; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; }}
    .grain {{ background-image: {grain('.07')}; }}
    .grain-photo {{ background-image: {grain('.13')}; }}
    .glass {{ background: rgba(18,21,30,0.62); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 26px 70px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10); }}
    .glass-light {{ background: rgba(255,255,255,0.62); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 10px 30px rgba(40,60,90,0.10); }}
    .contours {{ background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='390' height='420' viewBox='0 0 390 420' fill='none' stroke='rgb(255,255,255)' stroke-opacity='.05' stroke-width='1'><path d='M-20 80 C 80 40, 200 120, 300 70 S 420 60, 460 90'/><path d='M-20 130 C 80 90, 200 170, 300 120 S 420 110, 460 140'/><path d='M-20 180 C 80 140, 200 220, 300 170 S 420 160, 460 190'/><path d='M-20 230 C 80 190, 200 270, 300 220 S 420 210, 460 240'/><path d='M-20 280 C 80 240, 200 320, 300 270 S 420 260, 460 290'/><path d='M-20 330 C 80 290, 200 370, 300 320 S 420 310, 460 340'/><path d='M-20 380 C 80 340, 200 420, 300 370 S 420 360, 460 390'/></svg>"); background-repeat: no-repeat; }}
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

def R(delay):
    return f'animation: rise 1s cubic-bezier(.22,.7,.2,1) {delay}s both;'

DAWN = dict(skyTop='#6B7FD6', skyMid='#F0A878', skyLow='#FFD9B0', glow='rgba(255,185,110,0.85)', sun='#FFC466', sunGlow='rgba(255,196,102,0.6)', sunGlowFar='rgba(255,140,70,0.26)')
DAY = dict(skyTop='#4F97E6', skyMid='#BBD8F5', skyLow='#EAF0F5', glow='rgba(255,240,200,0.6)', sun='#FFE08A', sunGlow='rgba(255,224,138,0.5)', sunGlowFar='rgba(255,224,138,0.18)')
DUSK = dict(skyTop='#2E2A6E', skyMid='#D9724F', skyLow='#FFBE7A', glow='rgba(255,140,80,0.8)', sun='#FFAE52', sunGlow='rgba(255,176,90,0.6)', sunGlowFar='rgba(255,110,60,0.28)')
NIGHT = dict(skyTop='#070911', skyMid='#151C33', skyLow='#2B3658', glow='rgba(160,180,230,0.22)', sun='#E6EAF4', sunGlow='rgba(230,234,244,0.35)', sunGlowFar='rgba(160,180,230,0.14)')

def stars(h, rt, n=90, seed=7):
    random.seed(seed)
    dots = "".join(f'<circle cx="{random.randint(6,384)}" cy="{random.randint(8, rt+40)}" r="{random.choice([0.7,0.9,1.2,1.6])}" fill="white" style="animation: twinkle {random.choice([2.5,3.5,4.5,6])}s ease-in-out {random.random()*4:.1f}s infinite;"></circle>' for _ in range(n))
    return f'<svg style="position: absolute; left: 0; top: 0;" width="390" height="{h}" viewBox="0 0 390 {h}">{dots}</svg>'

def sky(h, c, sun_x, ridge_top=None, night=False, sun_size=60, sun_lift=98, sun_class="sun-rise"):
    rt = ridge_top if ridge_top is not None else h - 220
    sun_y = rt + sun_lift
    return f"""
  <div style="position: absolute; left: 0; top: 0; width: 390px; height: {h}px; background: linear-gradient(180deg, {c['skyTop']} 0%, {c['skyMid']} 52%, {c['skyLow']} 100%);"></div>
  {stars(h, rt) if night else ''}
  <div class="rays" style="position: absolute; left: {sun_x-300}px; top: {sun_y-300}px; width: 600px; height: 600px; background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,235,200,0.09) 0deg 4deg, rgba(255,235,200,0) 4deg 14deg); -webkit-mask-image: radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.6) 40%, transparent 70%); mask-image: radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.6) 40%, transparent 70%);"></div>
  <div style="position: absolute; left: {sun_x-250}px; top: {sun_y-210}px; width: 500px; height: 420px; background: radial-gradient(closest-side, {c['glow']} 0%, rgba(255,196,102,0) 100%);"></div>
  <div class="mist" style="position: absolute; left: 30px; top: {int(h*0.16)}px; width: 250px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.22); filter: blur(16px);"></div>
  <div class="mist" style="position: absolute; left: 190px; top: {int(h*0.30)}px; width: 230px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.16); filter: blur(18px); animation-duration: 22s; animation-direction: alternate-reverse;"></div>
  <div class="grain" style="position: absolute; left: 0; top: 0; width: 390px; height: {h}px;"></div>
  <div class="{sun_class}" style="position: absolute; left: {sun_x}px; top: {sun_y}px; width: {sun_size}px; height: {sun_size}px; margin: -{sun_size//2}px 0 0 -{sun_size//2}px; border-radius: 50%; background: {c['sun']}; box-shadow: 0 0 50px 18px {c['sunGlow']}, 0 0 170px 80px {c['sunGlowFar']};"></div>
  <svg style="position: absolute; left: 0; top: {rt}px;" width="390" height="220" viewBox="0 0 390 220" fill="none">
    <path d="M0 96 C 60 70, 110 110, 170 84 C 230 58, 290 96, 390 60 L390 220 L0 220 Z" fill="{GROUND}" fill-opacity="0.38"></path>
    <path d="M0 128 C 70 100, 140 150, 210 118 C 270 92, 330 128, 390 104 L390 220 L0 220 Z" fill="{GROUND}" fill-opacity="0.72"></path>
    <path d="M0 166 C 80 136, 150 186, 230 152 C 290 128, 340 160, 390 140 L390 220 L0 220 Z" fill="{GROUND}"></path>
    <path d="M0 166 C 80 136, 150 186, 230 152 C 290 128, 340 160, 390 140" stroke="{c['sun']}" stroke-opacity="0.55" stroke-width="1"></path>
  </svg>
  <div class="mist" style="position: absolute; left: 0; top: {rt+116}px; width: 390px; height: 28px; background: rgba(255,255,255,0.12); filter: blur(12px); animation-duration: 20s;"></div>
  <div style="position: absolute; left: 0; top: {rt+150}px; width: 390px; height: 240px; background: linear-gradient(180deg, rgba(255,170,90,0.12) 0%, rgba(255,170,90,0) 100%);"></div>
  <div class="contours" style="position: absolute; left: 0; top: {rt+160}px; width: 390px; height: 420px;"></div>
"""

def tabbar(active):
    def icon(name, on):
        col = SOL if on else "#ECEEF2"; op = "1" if on else "0.5"
        paths = {
            "today": '<path d="M3 15h18"></path><path d="M7 15a5 5 0 0 1 10 0"></path>',
            "goals": '<path d="M4 18c4 0 4-10 8-10s4 10 8 10"></path><circle cx="12" cy="8" r="1.6"></circle>',
            "envision": '<rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="M4 15l4-4 4 4 3-3 5 5"></path>',
            "coach": '<rect x="3" y="6" width="18" height="12" rx="2"></rect><path d="M3 8l9 6 9-6"></path>',
        }[name]
        svg = f'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{col}" stroke-opacity="{op}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{paths}</svg>'
        if on:
            return f'<div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">{svg}<div style="width: 4px; height: 4px; border-radius: 50%; background: {SOL}; box-shadow: 0 0 8px {SOL};"></div></div>'
        return svg
    return f"""
  <div style="position: absolute; left: 18px; right: 18px; bottom: 22px; display: flex; gap: 10px; align-items: center; {R(0.9)}">
    <div style="flex: 1 1 auto; height: 62px; border-radius: 31px; background: rgba(18,21,30,0.74); backdrop-filter: blur(26px); border: 1px solid rgba(255,255,255,0.09); box-shadow: 0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); display: flex; justify-content: space-around; align-items: center; padding: 0 12px;">
      {icon('today', active=='today')}{icon('goals', active=='goals')}{icon('envision', active=='envision')}{icon('coach', active=='coach')}
    </div>
    <div class="breathe" style="width: 62px; height: 62px; border-radius: 50%; background: {SUNBTN}; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; box-shadow: 0 10px 34px rgba(255,196,102,0.35), inset 0 1px 0 rgba(255,255,255,0.5);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F1219" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
    </div>
  </div>"""

def cta(label, delay=0.8, shimmer=True):
    return f'<div class="{"shimmer" if shimmer else ""}" style="height: 60px; border-radius: 999px; background: {SUNBTN}; color: #0F1219; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700; letter-spacing: -0.005em; box-shadow: 0 14px 44px rgba(255,196,102,0.30), inset 0 1px 0 rgba(255,255,255,0.5); {R(delay)}">{label}</div>'

def ghost(label, delay=0.9):
    return f'<div style="height: 44px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #A9B1BE; {R(delay)}">{label}</div>'

def root(inner, bg=GROUND, color="#ECEEF2"):
    return f'<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: {bg}; color: {color};">{inner}</div>'

def topbar(left, right, color="#ECEEF2", delay=0.1, back=False):
    l = f'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6"></path></svg>' if back else f'<div class="eyebrow" style="opacity: 0.85;">{left}</div>'
    return f'<div style="position: absolute; top: 22px; left: 22px; right: 22px; display: flex; justify-content: space-between; align-items: center; color: {color}; {R(delay)}">{l}<div class="mono" style="font-size: 11px; opacity: 0.7; letter-spacing: 0.1em;">{right}</div></div>'

def suncheck(size=64, delay=0.9):
    return f'<div class="pop" style="width: {size}px; height: {size}px; border-radius: 50%; border: 1.5px solid {SOL}; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(255,196,102,0.22), inset 0 0 22px rgba(255,196,102,0.10); animation-delay: {delay}s;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{SOL}" stroke-width="1.7" stroke-linecap="round"><path d="M5 14a7 7 0 0 1 14 0"></path><path d="M3 14h18"></path></svg></div>'

def row_icon(op=0.42):
    return f'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-opacity="{op}" stroke-width="1.5" stroke-linecap="round"><path d="M5 14a7 7 0 0 1 14 0"></path><path d="M3 14h18"></path></svg>'

def sundot(size=10, on=True, delay=0.5, outline=False):
    if outline:
        return f'<div class="pop" style="width: {size}px; height: {size}px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.4); animation-delay: {delay}s;"></div>'
    bg = SOL if on else "rgba(236,238,242,0.35)"; sh = f"box-shadow: 0 0 10px {SOL};" if on else ""
    return f'<div class="pop" style="width: {size}px; height: {size}px; border-radius: 50%; background: {bg}; {sh} animation-delay: {delay}s;"></div>'

def pill(label, delay, letter=None, on=False, dark=False, ghosted=False):
    if dark:
        base = f'background: {"rgba(255,196,102,0.14)" if on else "rgba(255,255,255,0.05)"}; border: 1px solid {"rgba(255,196,102,0.55)" if on else "rgba(255,255,255,0.14)"}; color: {SOL if on else "#ECEEF2"};'
    else:
        base = f'background: {"#101318" if on else "rgba(255,255,255,0.66)"}; border: 1px solid {"#101318" if on else "rgba(255,255,255,0.8)"}; color: {"#F6F4EE" if on else "#101318"}; box-shadow: 0 6px 20px rgba(40,60,90,0.08);'
    if ghosted:
        base = 'background: transparent; border: 1.5px dashed rgba(16,19,24,0.3); color: #5C6473;'
    badge = f'<div class="mono" style="font-size: 12px; opacity: 0.6; width: 14px;">{letter}</div>' if letter else ''
    return f'<div style="display: flex; align-items: center; gap: 16px; height: 54px; padding: 0 18px; border-radius: 18px; {base} {R(delay)}">{badge}<div style="font-size: 17px; font-weight: 600; flex: 1 1 auto;">{label}</div></div>'

# ---------------------------------------------------------------- Welcome
welcome = root(sky(844, DAWN, sun_x=195, ridge_top=430, sun_size=84, sun_lift=96) + f"""
  <div class="eyebrow" style="position: absolute; top: 26px; left: 0; right: 0; text-align: center; color: #101318; opacity: 0.7; {R(0.2)}">Morrow</div>
  <div class="serif" style="position: absolute; left: 0; right: 0; top: 140px; text-align: center; color: #101318; font-size: 96px; line-height: 92px; font-weight: 400; letter-spacing: -0.035em; font-variation-settings: 'opsz' 72; {R(0.5)}">Morrow</div>
  <div class="serif" style="position: absolute; left: 30px; right: 30px; top: 252px; text-align: center; color: #101318; font-style: italic; font-weight: 300; font-size: 30px; line-height: 36px; font-variation-settings: 'opsz' 48; text-wrap: balance; {R(0.8)}">Write your future in your own words. Then live by it.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 520px; display: flex; flex-direction: column; {R(1.0)}">
    <div class="eyebrow" style="color: #8B93A2; padding-bottom: 8px;">Three evenings, honestly timed</div>
    <div style="display: flex; align-items: baseline; gap: 14px; height: 36px; border-top: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 11px; color: {SOL}; width: 64px;">TONIGHT</div><div style="flex: 1 1 auto; font-size: 15px; color: #DDE3EA;">Find it, then write it</div><div class="mono" style="font-size: 11px; color: #8B93A2;">25–35 MIN</div></div>
    <div style="display: flex; align-items: baseline; gap: 14px; height: 36px; border-top: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 11px; color: #8B93A2; width: 64px;">MORNING</div><div style="flex: 1 1 auto; font-size: 15px; color: #DDE3EA;">Put it in order</div><div class="mono" style="font-size: 11px; color: #8B93A2;">15–20 MIN</div></div>
    <div style="display: flex; align-items: baseline; gap: 14px; height: 36px; border-top: 1px solid rgba(255,255,255,0.10); border-bottom: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 11px; color: #8B93A2; width: 64px;">EVENING</div><div style="flex: 1 1 auto; font-size: 15px; color: #DDE3EA;">Make the plan and seal the Book</div><div class="mono" style="font-size: 11px; color: #8B93A2;">20–30 MIN</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 58px; display: flex; flex-direction: column; gap: 4px;">
    {cta("Begin tonight", 1.3)}
    {ghost("I already have a Book", 1.45)}
  </div>
  <div class="mono" style="position: absolute; left: 0; right: 0; bottom: 30px; text-align: center; font-size: 10px; letter-spacing: 0.14em; color: #6F7785; {R(1.5)}">NO SIGN‑UP UNTIL YOUR BOOK EXISTS</div>
""")
(OUT/"Welcome.dc.html").write_text(doc(welcome), encoding="utf-8")

# ---------------------------------------------------------------- Interview (tap-only; the sun travels the arc)
arc = "M55 166 A 140 140 0 0 1 335 166"
interview = f"""<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: linear-gradient(180deg, #4F97E6 0%, #BBD8F5 40%, #EEF1F5 76%, #F7F3EC 100%); color: #101318;">
  <div style="position: absolute; left: 35px; top: -60px; width: 320px; height: 280px; background: radial-gradient(closest-side, rgba(255,236,190,0.9), rgba(255,236,190,0));"></div>
  <div class="mist" style="position: absolute; left: 30px; top: 150px; width: 250px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.4); filter: blur(14px);"></div>
  <div class="grain" style="position: absolute; inset: 0;"></div>
  <svg style="position: absolute; left: 0; top: 30px; overflow: visible;" width="390" height="176" viewBox="0 0 390 176" fill="none">
    <path d="{arc}" stroke="#101318" stroke-opacity="0.14" stroke-width="1.5"></path>
    <path d="{arc}" stroke="#E9A23B" stroke-width="3" stroke-linecap="round" pathLength="100" style="stroke-dasharray: 100; stroke-dashoffset: 100; --end: 58; animation: drawto 2.6s cubic-bezier(.3,.1,.2,1) .4s both;"></path>
  </svg>
  <div style="position: absolute; left: 0; top: 30px; width: 24px; height: 24px; margin: -12px 0 0 -12px; border-radius: 50%; background: {SOL}; box-shadow: 0 0 24px 10px rgba(255,196,102,0.45), 0 0 70px 30px rgba(255,196,102,0.18); offset-path: path('{arc}'); offset-distance: 0%; offset-rotate: 0deg; --dist: 42%; animation: travel 2.6s cubic-bezier(.3,.1,.2,1) .4s both;"></div>
  <div style="position: absolute; left: 0; right: 0; top: 118px; display: flex; flex-direction: column; align-items: center; gap: 2px; {R(0.6)}">
    <div class="mono" style="font-size: 40px; line-height: 42px; font-weight: 500; letter-spacing: -0.03em;">0.42</div>
    <div class="eyebrow" style="color: #5C6473;">Clarity · Question 4</div>
  </div>
  <div style="position: absolute; top: 22px; left: 22px;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#101318" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6"></path></svg></div>
  <div class="glass-light" style="position: absolute; left: 22px; right: 22px; top: 214px; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 20px; {R(0.9)}">
    <div class="serif" style="flex: 1 1 auto; font-style: italic; font-weight: 400; font-size: 17px; line-height: 22px; color: #3B4250; font-variation-settings: 'opsz' 24;">I'm seeing health → finish a race…</div>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 296px; font-size: 40px; line-height: 44px; font-weight: 400; letter-spacing: -0.018em; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(1.1)}">How far?</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 372px; display: flex; flex-direction: column; gap: 8px;">
    {pill("5 km", 1.3, "A")}{pill("10 km", 1.38, "B")}{pill("A half marathon", 1.46, "C", on=True)}{pill("A marathon", 1.54, "D")}{pill("Something else…", 1.62, "+", ghosted=True)}
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 30px; display: flex; flex-direction: column; gap: 10px; {R(1.8)}">
    <div style="display: flex; justify-content: space-between;"><div class="eyebrow" style="color: #5C6473;">Your goals</div><div class="eyebrow" style="color: #5C6473;">0 of 3</div></div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid #101318;"></div>
      <div style="width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid rgba(16,19,24,0.3);"></div>
      <div style="width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid rgba(16,19,24,0.3);"></div>
      <div style="font-size: 13px; color: #5C6473; margin-left: 4px;">Health, then money, then the guitar</div>
    </div>
  </div>
</div>"""
(OUT/"Interview.dc.html").write_text(doc(interview), encoding="utf-8")

# ---------------------------------------------------------------- The Fifteen (night; the sun rises as you write)
fifteen = root(sky(844, NIGHT, sun_x=195, ridge_top=300, sun_size=70, sun_lift=150, night=True, sun_class="slow-rise") + f"""
  <div style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; background: linear-gradient(180deg, rgba(15,18,25,0) 0%, rgba(15,18,25,0) 36%, rgba(15,18,25,0.92) 52%, {GROUND} 62%);"></div>
  {topbar("The Fifteen · the ideal", "8:12 LEFT", delay=0.1)}
  <svg style="position: absolute; left: 0; top: 30px; overflow: visible;" width="390" height="176" viewBox="0 0 390 176" fill="none">
    <path d="{arc}" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"></path>
    <path d="{arc}" stroke="{SOL}" stroke-width="3" stroke-linecap="round" pathLength="100" style="stroke-dasharray: 100; stroke-dashoffset: 100; --end: 55; animation: drawto 14s linear .2s both; filter: drop-shadow(0 0 8px rgba(255,196,102,.7));"></path>
  </svg>
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 232px; font-style: italic; font-weight: 300; font-size: 19px; line-height: 24px; color: #DDE3EA; font-variation-settings: 'opsz' 30; text-align: center; {R(0.4)}">Three to five years on. It went as well as it could. Tell me about a Tuesday.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 432px; bottom: 156px; display: flex; gap: 14px;">
    <div style="flex: 1 1 auto; min-width: 0; overflow: hidden; -webkit-mask-image: linear-gradient(180deg, #000 78%, transparent 100%); mask-image: linear-gradient(180deg, #000 78%, transparent 100%);">
      <div class="serif" style="font-size: 20px; line-height: 30px; font-weight: 400; color: #F3E6D3; font-variation-settings: 'opsz' 24; {R(0.7)}">It's 6:40 and the kitchen is still blue. I lace the left shoe first, like always, and the door is already open before I've decided anything. Rent went out on the first and I didn't look at the balance, because I already knew. Sam is asleep upstairs and the guitar is on the wall<span class="caret"></span></div>
    </div>
    <div style="width: 84px; flex: 0 0 auto; display: flex; flex-direction: column; gap: 10px; padding-top: 6px; border-left: 1px solid rgba(255,255,255,0.10); padding-left: 12px; {R(1.0)}">
      <div class="eyebrow" style="color: #6F7785;">Seeds</div>
      <div class="serif" style="font-style: italic; font-size: 13px; line-height: 17px; color: #8B93A2; font-variation-settings: 'opsz' 20;">“a half marathon”</div>
      <div class="serif" style="font-style: italic; font-size: 13px; line-height: 17px; color: #8B93A2; font-variation-settings: 'opsz' 20;">“three months of breathing room”</div>
      <div class="serif" style="font-style: italic; font-size: 13px; line-height: 17px; color: #8B93A2; font-variation-settings: 'opsz' 20;">“Dad's calm”</div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 96px; display: flex; gap: 8px; {R(1.2)}">
    {''.join(f'<div style="font-size: 13px; font-weight: 600; padding: 9px 13px; border-radius: 999px; border: 1px solid {"rgba(255,196,102,0.55)" if t=="Say it" else "rgba(236,238,242,0.22)"}; {"background: rgba(255,196,102,0.14); color: #FFC466;" if t=="Say it" else "color: #ECEEF2;"}">{t}</div>' for t in ["Say it","Type it","Walk and say it"])}
  </div>
  <div class="eyebrow" style="position: absolute; left: 0; right: 0; bottom: 40px; text-align: center; color: #6F7785; {R(1.3)}">Keep going. Say the next true thing.</div>
""")
(OUT/"Fifteen.dc.html").write_text(doc(fifteen), encoding="utf-8")

# ---------------------------------------------------------------- What I heard (dawn)
def heard_row(text, delay, domain=SOL, merge=False):
    return f"""<div class="glass" style="display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 16px; border-radius: 18px; {R(delay)}">
      <div style="width: 12px; height: 12px; border-radius: 50%; background: {domain}; box-shadow: 0 0 12px {domain}; flex: 0 0 auto;"></div>
      <div class="serif" style="flex: 1 1 auto; font-size: 16px; line-height: 21px; color: #F3E6D3; font-variation-settings: 'opsz' 24;">“{text}”</div>
      <div style="display: flex; gap: 6px; flex: 0 0 auto;">
        <div style="font-size: 12px; font-weight: 700; padding: 7px 10px; border-radius: 999px; background: {SUNBTN}; color: #0F1219;">Keep</div>
        <div style="font-size: 12px; font-weight: 700; padding: 7px 10px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.25);">{"Merge" if merge else "Not a goal"}</div>
      </div>
    </div>"""
heard = root(sky(360, DAWN, sun_x=300, ridge_top=150, sun_size=58, sun_lift=84) + f"""
  {topbar("What I heard", "SITTING 1 · 22:31", color="#101318")}
  <div class="serif" style="position: absolute; left: 22px; right: 40px; top: 66px; color: #101318; font-style: italic; font-weight: 300; font-size: 34px; line-height: 39px; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.4)}">Seven things you want. Two of them might be one.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 330px; display: flex; flex-direction: column; gap: 10px;">
    {heard_row("the door is already open before I've decided", 0.7)}
    {heard_row("didn't look at the balance", 0.8, domain="#4FDCCB")}
    {heard_row("the guitar is on the wall", 0.9, domain="#A98FFF", merge=True)}
    {heard_row("Sam is asleep upstairs", 1.0, domain="#FF8FB0")}
    <div class="eyebrow" style="color: #8B93A2; padding-top: 6px; {R(1.2)}">Every line is yours. I only sorted them.</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px;">{cta("Name the ones you keep", 1.4)}</div>
""")
(OUT/"Heard.dc.html").write_text(doc(heard), encoding="utf-8")

# ---------------------------------------------------------------- Analysis stone (dusk; tap a framing, write a line)
stone_sheet = root(sky(420, DUSK, sun_x=110, ridge_top=180, sun_size=60, sun_lift=92) + f"""
  {topbar("Half marathon · Strategies", "STONE 3 OF 5", color="#FFF3E6")}
  <div style="position: absolute; left: 22px; top: 62px; display: flex; gap: 8px; {R(0.3)}">
    {sundot(10, True, 0.4)}{sundot(10, True, 0.5)}{sundot(10, True, 0.6)}{sundot(10, False, 0.7, outline=True)}{sundot(10, False, 0.8, outline=True)}
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 30px; top: 92px; color: #FFF3E6; font-size: 34px; line-height: 38px; font-weight: 400; letter-spacing: -0.018em; font-variation-settings: 'opsz' 72; text-wrap: balance; text-shadow: 0 2px 20px rgba(60,30,60,0.35); {R(0.5)}">What happens on an ordinary Tuesday because of this?</div>
  <div class="glass" style="position: absolute; left: 18px; right: 18px; top: 330px; border-radius: 28px; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; {R(0.8)}">
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      {''.join(f'<div style="font-size: 13px; font-weight: 600; padding: 9px 13px; border-radius: 999px; border: 1px solid {"rgba(255,196,102,0.55)" if i==1 else "rgba(236,238,242,0.22)"}; {"background: rgba(255,196,102,0.14); color: #FFC466;" if i==1 else "color: #ECEEF2;"}">{t}</div>' for i,t in enumerate(["A small thing daily","A bigger thing three times a week","One long thing at the weekend","Something I stop doing"]))}
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.10);">
      <div class="eyebrow" style="color: #8B93A2;">In your words</div>
      <div class="serif" style="font-size: 20px; line-height: 26px; color: #F3E6D3; font-variation-settings: 'opsz' 28; border-bottom: 2px solid {SOL}; padding-bottom: 6px;">Tuesday, Thursday, Saturday at 6:40, out the back door before the kettle boils<span class="caret"></span></div>
      <div class="mono" style="font-size: 10.5px; color: #8B93A2; letter-spacing: 0.12em;">TIME ✓ · PLACE ✓ · THE BLUEPRINT WILL QUOTE THIS LINE</div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px; display: flex; flex-direction: column; gap: 6px;">
    {cta("Seat the stone", 1.2)}
    {ghost("Go deeper: a paragraph", 1.3)}
  </div>
""")
(OUT/"Stone.dc.html").write_text(doc(stone_sheet), encoding="utf-8")

# ---------------------------------------------------------------- Seal the Book (night; ring fills; the Book rises from the ridge)
sealbook = root(sky(560, NIGHT, sun_x=195, ridge_top=300, sun_size=44, sun_lift=126, night=True) + f"""
  {topbar("Seal the Book", "FIRST EDITION")}
  <div class="serif" style="position: absolute; left: 22px; right: 40px; top: 72px; font-style: italic; font-weight: 300; font-size: 34px; line-height: 39px; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.4)}">Hold, and it's yours. You can rewrite it in ninety days.</div>
  <div style="position: absolute; left: 95px; top: 330px; width: 200px; height: 260px; perspective: 900px; {R(0.8)}">
    <div style="position: absolute; inset: 0; border-radius: 6px 14px 14px 6px; background: linear-gradient(90deg, #E9E2D3 0%, {PAPER} 8%, #FBF8F2 100%); box-shadow: 0 30px 70px rgba(0,0,0,0.55), inset 6px 0 12px rgba(0,0,0,0.08); transform: rotateY(-14deg) rotateX(4deg); color: {INKP}; padding: 22px 20px 20px 26px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      <div><div class="eyebrow" style="color: #8B7F6A;">Morrow · Book</div><div class="serif" style="margin-top: 60px; font-size: 26px; line-height: 30px; font-weight: 400; letter-spacing: -0.015em; font-variation-settings: 'opsz' 40;">A year of the back door</div></div>
      <div class="mono" style="font-size: 10px; color: #8B7F6A; letter-spacing: 0.12em;">SEALED 9 SEPT 2026 · 3 GOALS</div>
    </div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 34px; display: flex; flex-direction: column; align-items: center; gap: 10px; {R(1.2)}">
    <div style="position: relative; width: 116px; height: 116px;">
      <svg width="116" height="116" viewBox="0 0 132 132" fill="none" style="position: absolute; inset: 0; overflow: visible;">
        <circle cx="66" cy="66" r="62" stroke="rgba(255,255,255,0.14)" stroke-width="2"></circle>
        <circle cx="66" cy="66" r="62" stroke="{SOL}" stroke-width="3" stroke-linecap="round" pathLength="100" transform="rotate(-90 66 66)" style="stroke-dasharray: 100; stroke-dashoffset: 100; animation: fillring 1.6s cubic-bezier(.4,.05,.2,1) 1.6s both; filter: drop-shadow(0 0 8px rgba(255,196,102,.7));"></circle>
        <circle cx="66" cy="66" r="50" fill="rgba(255,196,102,0.08)"></circle>
      </svg>
      <div class="breathe" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="{SOL}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3V5z"></path><path d="M7 5v12"></path></svg></div>
    </div>
    <div class="eyebrow" style="color: #8B93A2;">Hold to seal</div>
  </div>
""")
(OUT/"SealBook.dc.html").write_text(doc(sealbook), encoding="utf-8")

# ---------------------------------------------------------------- The Book (a paper page in the dark)
book = root(f"""
  <div style="position: absolute; left: 60px; top: -180px; width: 420px; height: 360px; background: radial-gradient(closest-side, rgba(107,127,214,0.28), rgba(107,127,214,0));"></div>
  {topbar("The Book · first edition", "SUNDAY · 10 MIN", back=True)}
  <div style="position: absolute; left: 18px; right: 18px; top: 64px; bottom: 96px; border-radius: 22px 8px 8px 22px; background: linear-gradient(90deg, #E7E0D1 0%, {PAPER} 5%, #FBF8F2 100%); box-shadow: 0 30px 70px rgba(0,0,0,0.55), inset 8px 0 14px rgba(0,0,0,0.06); color: {INKP}; padding: 30px 26px 26px 34px; box-sizing: border-box; display: flex; flex-direction: column; {R(0.4)}">
    <div class="eyebrow" style="color: #8B7F6A;">Chapter one · the Fifteen</div>
    <div class="serif" style="margin-top: 22px; font-size: 34px; line-height: 40px; font-weight: 400; letter-spacing: -0.02em; font-variation-settings: 'opsz' 60; text-wrap: pretty; {R(0.6)}">It's 6:40 and the kitchen is still blue.</div>
    <div class="serif" style="margin-top: 16px; font-size: 17px; line-height: 27px; font-weight: 400; color: #3B3A36; font-variation-settings: 'opsz' 18; {R(0.8)}">I lace the left shoe first, like always, and the door is already open before I've decided anything. Rent went out on the first and I didn't look at the balance, because I already knew. Sam is asleep upstairs and the guitar is on the wall where I can see it from the table. Nobody is proud of me for any of this and that is the point; it's just Tuesday.</div>
    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px; padding-top: 18px; border-top: 1px solid rgba(21,24,31,0.12); {R(1.0)}">
      <div class="eyebrow" style="color: #8B7F6A;">Contents</div>
      <div style="display: flex; justify-content: space-between; font-size: 14px;"><span class="serif" style="font-size: 16px;">Half marathon</span><span class="mono" style="font-size: 11px; color: #8B7F6A;">MARCH 2027</span></div>
      <div style="display: flex; justify-content: space-between; font-size: 14px;"><span class="serif" style="font-size: 16px;">Three months of breathing room</span><span class="mono" style="font-size: 11px; color: #8B7F6A;">JUNE 2027</span></div>
      <div style="display: flex; justify-content: space-between; font-size: 14px;"><span class="serif" style="font-size: 16px;">Guitar, three times a week</span><span class="mono" style="font-size: 11px; color: #8B7F6A;">A YEAR</span></div>
      <div class="mono" style="font-size: 10px; color: #8B7F6A; letter-spacing: 0.12em; margin-top: 4px;">PAGE 1 OF 9 · SEALED 9 SEPT</div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px; display: flex; gap: 10px; {R(1.2)}">
    <div style="flex: 1 1 auto; height: 48px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.35); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">Still true</div>
    <div style="flex: 1 1 auto; height: 48px; border-radius: 999px; background: {SUNBTN}; color: #0F1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">Something moved</div>
  </div>
""")
(OUT/"Book.dc.html").write_text(doc(book), encoding="utf-8")

# ---------------------------------------------------------------- Portrait (dusk; every line from the user)
portrait = root(sky(400, DUSK, sun_x=292, sun_size=66) + f"""
  {topbar("Your Portrait", "FROM YOUR LINES", color="#FFF3E6")}
  <div class="serif" style="position: absolute; left: 22px; right: 100px; top: 84px; font-style: italic; font-weight: 300; font-size: 26px; line-height: 31px; color: #FFF3E6; font-variation-settings: 'opsz' 40; text-shadow: 0 2px 20px rgba(60,30,60,0.35); {R(0.4)}">“Mine, and it would shame me to drop it.” — your Motives stone.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 366px; display: flex; flex-direction: column;">
    <div class="serif" style="font-size: 36px; line-height: 39px; font-weight: 400; letter-spacing: -0.018em; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.7)}">Half marathon in March, and feel at home in my body again.</div>
    <div style="margin-top: 18px; display: flex; gap: 14px; align-items: stretch; {R(0.9)}">
      <div style="width: 3px; background: {SOL}; border-radius: 2px; flex: 0 0 auto; box-shadow: 0 0 14px rgba(255,196,102,0.7);"></div>
      <div class="serif" style="font-style: italic; font-weight: 300; font-size: 21px; line-height: 27px; color: #F3E6D3; font-variation-settings: 'opsz' 36;">I am becoming someone who is out the back door before the kettle boils.</div>
    </div>
    <div style="margin-top: 18px; display: flex; flex-direction: column; gap: 6px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.10); {R(1.1)}">
      <div style="display: flex; justify-content: space-between; align-items: baseline;"><div class="eyebrow" style="color: {SOL};">First move · Wed 10</div><div class="mono" style="font-size: 11px; color: #8B93A2;">FROM YOUR STRATEGIES LINE</div></div>
      <div style="font-size: 18px; line-height: 23px; font-weight: 500;">Walk‑run ten minutes at 6:40, out the back door.</div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px; display: flex; flex-direction: column; gap: 6px;">
    {cta("Make this my Blueprint", 1.3)}
    {ghost("Not quite, change a line", 1.4)}
  </div>
""")
(OUT/"Portrait.dc.html").write_text(doc(portrait), encoding="utf-8")

# ---------------------------------------------------------------- Blueprint (Path draws; every move shows its source line)
def move(text, date, source, done=False, delay=1.0):
    box = (f'<div style="width: 22px; height: 22px; border-radius: 50%; background: {SUNBTN}; display: flex; align-items: center; justify-content: center; flex: 0 0 auto;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F1219" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"></path></svg></div>'
           if done else '<div style="width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid rgba(236,238,242,0.42); flex: 0 0 auto;"></div>')
    return f"""<div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); {R(delay)}">{box}
      <div style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px;">
        <div style="font-size: 16px; line-height: 20px; font-weight: 500; {"color: #8B93A2; text-decoration: line-through;" if done else ""}">{text}</div>
        <div class="serif" style="font-style: italic; font-size: 13px; line-height: 17px; color: #8B93A2; font-variation-settings: 'opsz' 20;">from “{source}”</div>
      </div><div class="mono" style="font-size: 11px; color: #8B93A2; white-space: nowrap; padding-top: 3px;">{date}</div></div>"""
blueprint = root(f"""
  <div style="position: absolute; left: 0; top: 0; width: 390px; height: 260px; background: linear-gradient(180deg, rgba(217,114,79,0.55) 0%, rgba(46,42,110,0.25) 50%, rgba(15,18,25,0) 100%);"></div>
  <div style="position: absolute; left: 170px; top: -150px; width: 380px; height: 280px; background: radial-gradient(closest-side, rgba(255,174,82,0.45), rgba(255,174,82,0));"></div>
  <div class="grain" style="position: absolute; left: 0; top: 0; width: 390px; height: 260px;"></div>
  <div class="contours" style="position: absolute; left: 0; top: 380px; width: 390px; height: 420px;"></div>
  {topbar("", "BLUEPRINT · V1", back=True)}
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 60px; font-size: 36px; line-height: 40px; font-weight: 400; letter-spacing: -0.018em; font-variation-settings: 'opsz' 72; {R(0.3)}">Half marathon</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 120px; display: flex; flex-direction: column; gap: 8px; {R(0.5)}">
    <div style="display: flex; gap: 5px; align-items: flex-end; height: 18px;">""" + "".join(
        f'<div style="flex: 1 1 auto; height: {18 if i==0 else 12}px; border-radius: 2px; background: {SUNBTN if i==0 else f"rgba(255,255,255,{0.22 if i<4 else 0.14 if i<8 else 0.10})"}; {"box-shadow: 0 0 12px rgba(255,196,102,.5);" if i==0 else ""}"></div>' for i in range(12)) + f"""</div>
    <div style="display: flex; justify-content: space-between;"><div class="eyebrow" style="color: {SOL};">Week 1 of 12</div><div class="eyebrow" style="color: #8B93A2;">Race day · Mar 2027</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 190px; display: flex; gap: 18px;">
    <svg width="26" height="520" viewBox="0 0 26 520" fill="none" style="flex: 0 0 auto; overflow: visible;">
      <path class="draw" d="M13 6 C 24 100, 2 220, 13 318 S 24 400, 13 458" stroke="#ECEEF2" stroke-opacity="0.22" stroke-width="1.5"></path>
      <path class="draw-short" d="M13 6 C 22 60, 8 110, 13 150" stroke="{SOL}" stroke-width="2.5" style="animation-delay: 1.2s;"></path>
      <circle class="pop" cx="13" cy="6" r="7" fill="{SOL}" style="animation-delay: .4s; transform-origin: 13px 6px;"></circle><circle cx="13" cy="6" r="16" fill="{SOL}" fill-opacity="0.16"></circle>
      <circle class="pop" cx="13" cy="318" r="5" fill="{GROUND}" stroke="#ECEEF2" stroke-width="1.5" style="animation-delay: 1.8s; transform-origin: 13px 318px;"></circle>
      <circle class="pop" cx="13" cy="458" r="5" fill="{GROUND}" stroke="#ECEEF2" stroke-opacity="0.6" stroke-width="1.5" style="animation-delay: 2.4s; transform-origin: 13px 458px;"></circle>
    </svg>
    <div style="flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column;">
      <div style="display: flex; flex-direction: column; gap: 6px; {R(0.6)}">
        <div class="eyebrow" style="color: {SOL};">Milestone 1 · by 4 Oct · 26 days</div>
        <div class="serif" style="font-size: 26px; line-height: 30px; font-weight: 400; font-variation-settings: 'opsz' 48;">Run 5 km without stopping</div>
        <div style="font-size: 13px; line-height: 18px; color: #8B93A2;">Proof, in your words: “one 5 km in the ledger, any pace.”</div>
      </div>
      <div style="margin-top: 10px; display: flex; flex-direction: column;">
        {move("Walk‑run 10 min, 6:40, the back door", "WED 10", "Tuesday, Thursday, Saturday at 6:40", done=True, delay=0.8)}
        {move("Book the physio for the knee", "THU 11", "If the knee talks, then I book, not wait", delay=0.9)}
        {move("Three walk‑runs this week", "WK 1", "Tuesday, Thursday, Saturday at 6:40", delay=1.0)}
      </div>
      <div style="margin-top: 22px; display: flex; flex-direction: column; gap: 6px; opacity: 0.55; {R(1.6)}"><div class="eyebrow">Milestone 2 · by 8 Nov</div><div class="serif" style="font-size: 26px; line-height: 30px; font-variation-settings: 'opsz' 48;">Run 10 km on a Sunday</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 160px; background: linear-gradient(180deg, rgba(15,18,25,0), {GROUND} 55%);"></div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px;">{cta("Start with the first move", 1.4)}</div>
""")
(OUT/"Blueprint.dc.html").write_text(doc(blueprint), encoding="utf-8")

# ---------------------------------------------------------------- Today (sky tweak; the sun-arc goal row)
holes = {k: "{{c.%s}}" % k for k in ["skyTop","skyMid","skyLow","glow","sun","sunGlow","sunGlowFar"]}
def goal_arc(name, pct, delay, ink="{{c.skyInk}}"):
    end = int(100 - pct * 100)
    return f"""<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; {R(delay)}">
      <svg width="64" height="40" viewBox="0 0 64 40" fill="none" style="overflow: visible;">
        <path d="M6 36 A 26 26 0 0 1 58 36" stroke="{ink}" stroke-opacity="0.18" stroke-width="3" stroke-linecap="round"></path>
        <path d="M6 36 A 26 26 0 0 1 58 36" stroke="{SOL}" stroke-width="3" stroke-linecap="round" pathLength="100" style="stroke-dasharray: 100; stroke-dashoffset: 100; --end: {end}; animation: drawto 1.4s cubic-bezier(.3,.1,.2,1) {delay+0.3}s both;"></path>
        <circle cx="32" cy="36" r="3" fill="{SOL}"></circle>
      </svg>
      <div style="font-size: 11.5px; font-weight: 600; color: {ink}; opacity: 0.85;">{name}</div>
    </div>"""
today = root(sky(470, holes, sun_x=112, sun_size=64) + f"""
  <div style="position: absolute; top: 20px; left: 22px; right: 22px; display: flex; justify-content: space-between; align-items: center; color: {{{{c.skyInk}}}}; {R(0.1)}">
    <div class="eyebrow" style="opacity: 0.8;">Tue 8 Sept · Day 251</div>
    <div class="mono" style="font-size: 11px; opacity: 0.7; letter-spacing: 0.1em;">RETURN #4</div>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 40px; top: 96px; color: {{{{c.skyInk}}}}; font-style: italic; font-weight: 300; font-size: 38px; line-height: 42px; letter-spacing: -0.012em; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.4)}">“Out the back door before the kettle boils.”</div>
  <div class="eyebrow" style="position: absolute; left: 22px; top: 192px; color: {{{{c.skyInk}}}}; opacity: 0.6; {R(0.5)}">You, in the Book · page 1</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 236px; display: flex; justify-content: space-between;">
    {goal_arc("Half marathon", 0.34, 0.6)}{goal_arc("Breathing room", 0.62, 0.68)}{goal_arc("Guitar", 0.18, 0.76)}{goal_arc("Sleep by 11", 0.80, 0.84)}
  </div>
  <div class="glass" style="position: absolute; left: 18px; right: 18px; top: 356px; border-radius: 28px; padding: 20px 18px 20px 22px; display: flex; align-items: center; gap: 16px; {R(0.8)}">
    <div style="flex: 1 1 auto; display: flex; flex-direction: column; gap: 6px;">
      <div class="eyebrow" style="color: {SOL};">Now · Morning peak</div>
      <div class="serif" style="font-size: 30px; line-height: 33px; font-weight: 400; letter-spacing: -0.012em; font-variation-settings: 'opsz' 60; white-space: nowrap;">Ten‑minute run</div>
      <div style="font-size: 14px; line-height: 19px; color: #B4BBC8;">If it's raining: the stairwell, same ten minutes.</div>
    </div>
    {suncheck(62)}
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 540px; display: flex; flex-direction: column;">
    <div style="display: flex; justify-content: space-between; padding-bottom: 2px; {R(0.9)}"><div class="eyebrow" style="color: #8B93A2;">Later today</div><div class="eyebrow" style="color: #8B93A2;">3 left</div></div>
    <div style="display: flex; align-items: center; gap: 14px; height: 44px; border-bottom: 1px solid rgba(255,255,255,0.08); {R(1.0)}">{row_icon()}<div style="flex: 1 1 auto; font-size: 17px; font-weight: 500;">Move £50 to savings</div><div class="mono" style="font-size: 11.5px; color: #8B93A2;">2 MIN</div></div>
    <div style="display: flex; align-items: center; gap: 14px; height: 44px; border-bottom: 1px solid rgba(255,255,255,0.08); {R(1.1)}">{row_icon()}<div style="flex: 1 1 auto; font-size: 17px; font-weight: 500;">Guitar, twenty minutes</div><div class="mono" style="font-size: 11.5px; color: #8B93A2;">20 MIN</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 652px; display: flex; align-items: flex-end; justify-content: space-between; {R(1.2)}">
    <div style="display: flex; flex-direction: column;">
      <div class="eyebrow" style="color: #8B93A2;">Consistency · 28 days</div>
      <div style="display: flex; align-items: baseline; gap: 10px;"><div class="mono" style="font-size: 64px; line-height: 60px; font-weight: 500; letter-spacing: -0.04em;">71</div><div class="mono" style="font-size: 11px; color: #8B93A2; line-height: 14px;">UP FROM 64</div></div>
    </div>
    <svg width="120" height="48" viewBox="0 0 120 48" fill="none"><path class="draw-short" d="M0 38 C 14 36, 18 28, 30 30 S 46 40, 57 32 S 78 14, 88 16 S 102 10, 120 6" stroke="{SOL}" stroke-width="2"></path><path d="M0 38 C 14 36, 18 28, 30 30 S 46 40, 57 32 S 78 14, 88 16 S 102 10, 120 6 L120 48 L0 48 Z" fill="{SOL}" fill-opacity="0.10"></path><circle class="pop" cx="120" cy="6" r="3.5" fill="{SOL}" style="animation-delay: 2.2s; transform-origin: 120px 6px;"></circle></svg>
  </div>
""" + tabbar('today'))
today_script = """<script data-dc-script data-props='{"phase":{"editor":"enum","options":["dawn","day","dusk","night"],"default":"dawn","section":"Sky"},"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
  renderVals() {
    const phase = this.props.phase ?? 'dawn';
    const skies = {
      dawn:  { skyTop: '#6B7FD6', skyMid: '#F0A878', skyLow: '#FFD9B0', glow: 'rgba(255,185,110,0.85)', sun: '#FFC466', sunGlow: 'rgba(255,196,102,0.6)', sunGlowFar: 'rgba(255,140,70,0.26)', skyInk: '#101318' },
      day:   { skyTop: '#4F97E6', skyMid: '#BBD8F5', skyLow: '#EAF0F5', glow: 'rgba(255,240,200,0.6)', sun: '#FFE08A', sunGlow: 'rgba(255,224,138,0.5)', sunGlowFar: 'rgba(255,224,138,0.18)', skyInk: '#101318' },
      dusk:  { skyTop: '#2E2A6E', skyMid: '#D9724F', skyLow: '#FFBE7A', glow: 'rgba(255,140,80,0.8)', sun: '#FFAE52', sunGlow: 'rgba(255,176,90,0.6)', sunGlowFar: 'rgba(255,110,60,0.28)', skyInk: '#FFF3E6' },
      night: { skyTop: '#070911', skyMid: '#151C33', skyLow: '#2B3658', glow: 'rgba(160,180,230,0.22)', sun: '#E6EAF4', sunGlow: 'rgba(230,234,244,0.35)', sunGlowFar: 'rgba(160,180,230,0.14)', skyInk: '#ECEEF2' }
    };
    return { c: skies[phase] ?? skies.dawn };
  }
}
</script>"""
(OUT/"Main.dc.html").write_text(doc(today, today_script), encoding="utf-8")

# ---------------------------------------------------------------- Envision (photo; the other road)
envision = root(f"""
  <img class="kb" src="scene-kitchen.jpeg" alt="" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; object-fit: cover; object-position: 50% 35%; display: block; transform-origin: 50% 30%;">
  <div style="position: absolute; inset: 0; background: rgba(255,150,70,0.14); mix-blend-mode: multiply;"></div>
  <div class="grain-photo" style="position: absolute; inset: 0;"></div>
  <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,18,25,0.45) 0%, rgba(15,18,25,0) 22%, rgba(15,18,25,0) 42%, rgba(15,18,25,0.9) 72%, {GROUND} 100%);"></div>
  {topbar("The practice · Scene 1 of 3", "FROM YOUR IMPACT LINE")}
  <div style="position: absolute; right: 16px; top: 150px; display: flex; flex-direction: column; gap: 8px; {R(0.6)}">
    <div style="width: 40px; height: 56px; border-radius: 8px; overflow: hidden; outline: 1.5px solid {SOL}; outline-offset: 2px;"><img src="scene-kitchen.jpeg" alt="" style="width: 40px; height: 56px; object-fit: cover; display: block;"></div>
    <div style="width: 40px; height: 56px; border-radius: 8px; overflow: hidden; opacity: 0.7;"><img src="scene-runner.jpeg" alt="" style="width: 40px; height: 56px; object-fit: cover; display: block;"></div>
    <div style="width: 40px; height: 56px; border-radius: 8px; border: 1px solid rgba(236,238,242,0.3); display: flex; align-items: center; justify-content: center; opacity: 0.7;"><div class="mono" style="font-size: 10px;">3</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 214px; display: flex; flex-direction: column; gap: 14px; {R(0.9)}">
    <div class="serif" style="font-style: italic; font-weight: 300; font-size: 28px; line-height: 35px; font-variation-settings: 'opsz' 48; text-wrap: pretty; text-shadow: 0 2px 24px rgba(0,0,0,0.4);">It's 6:40 and the kitchen is still blue. You lace the left shoe first, like always. Ten minutes, and the door is already open.</div>
    <div class="mono" style="font-size: 11px; color: #A9B1BE;">YOUR WORDS · “the kitchen is still blue” · “the back door”</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 148px; display: flex; gap: 8px; {R(1.2)}">""" + "".join(f'<div style="font-size: 13px; padding: 9px 13px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.3); backdrop-filter: blur(8px);">{t}</div>' for t in ["Warmer","Simpler","Closer"]) + f"""<div style="margin-left: auto; font-size: 13px; padding: 9px 13px; border-radius: 999px; border: 1px solid rgba(127,169,224,0.5); color: #BBD8F5; backdrop-filter: blur(8px);">The other road</div></div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 98px; display: flex; gap: 10px; {R(1.3)}">
    <div style="flex: 1 1 auto; height: 44px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.35); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">Try another</div>
    <div style="flex: 1 1 auto; height: 44px; border-radius: 999px; background: {SUNBTN}; color: #0F1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">Make wallpaper</div>
  </div>
""" + tabbar('envision'))
(OUT/"Envision.dc.html").write_text(doc(envision), encoding="utf-8")

# ---------------------------------------------------------------- Coach (the brief quotes the Book)
def brief_row(label, text, delay, last=False):
    return f'<div style="display: flex; gap: 16px; padding: 13px 0; border-top: 1px solid rgba(255,255,255,0.12); {"border-bottom: 1px solid rgba(255,255,255,0.12);" if last else ""} {R(delay)}"><div class="eyebrow" style="width: 74px; flex: 0 0 auto; color: {SOL}; padding-top: 4px;">{label}</div><div style="font-size: 15px; line-height: 22px; color: #DDE3EA;">{text}</div></div>'
coach = root(f"""
  <div style="position: absolute; left: -120px; top: -160px; width: 460px; height: 380px; background: radial-gradient(closest-side, rgba(244,198,166,0.38), rgba(244,198,166,0));"></div>
  <div class="grain" style="position: absolute; left: 0; top: 0; width: 390px; height: 260px;"></div>
  <div class="contours" style="position: absolute; left: 0; top: 420px; width: 390px; height: 420px;"></div>
  {topbar("Dawn brief · Wed 9 Sept", "06:30")}
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 70px; font-style: italic; font-weight: 300; font-size: 34px; line-height: 39px; letter-spacing: -0.012em; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.4)}">“Out the back door before the kettle boils.” Your line. This morning it's raining.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 260px; display: flex; flex-direction: column;">
    {brief_row("Yesterday", 'You sealed the Book at 22:41 and slept by eleven, which is the fourth stone on its own. Consistency <span class="mono">71</span>, up from <span class="mono">64</span>.', 0.7)}
    {brief_row("Today", "The run, before the pitch. You wrote that the pitch eats the morning if you let it.", 0.85)}
    {brief_row("If", "You wrote: <em>if it's raining at 7, then the stairwell, ten floors, twice.</em> It's raining at 7.", 1.0, last=True)}
    <div class="pop" style="margin-top: 16px; display: flex; align-items: center; gap: 10px; align-self: flex-start; padding: 9px 14px 9px 10px; border-radius: 999px; background: rgba(255,196,102,0.14); color: {SOL}; border: 1px solid rgba(255,196,102,0.25); animation-delay: 1.4s;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"></path></svg><div style="font-size: 13px; font-weight: 700;">Stairwell set as your first move</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 112px; display: flex; gap: 8px; flex-wrap: wrap; {R(1.5)}">""" + "".join(f'<div style="font-size: 13px; padding: 9px 13px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.22); background: rgba(255,255,255,0.03);">{t}</div>' for t in ["I'm stuck","I don't feel like it","Something changed","Celebrate with me"]) + f"""</div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px; display: flex; align-items: center; gap: 12px; height: 60px; padding: 0 8px 0 20px; border-radius: 999px; background: rgba(20,24,34,0.9); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 12px 40px rgba(0,0,0,0.35); {R(1.6)}">
    <div style="flex: 1 1 auto; font-size: 16px; color: #6F7785;">Talk to the coach</div>
    <div style="width: 44px; height: 44px; border-radius: 50%; background: {SUNBTN}; display: flex; align-items: center; justify-content: center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1219" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="4" width="6" height="11" rx="3"></rect><path d="M6 11a6 6 0 0 0 12 0M12 17v3"></path></svg></div>
  </div>
""")
(OUT/"Coach.dc.html").write_text(doc(coach), encoding="utf-8")

# ---------------------------------------------------------------- Seal the day (night; ring fills)
seal = root(sky(440, NIGHT, sun_x=300, sun_size=36, night=True) + f"""
  {topbar("Seal the day · 22:14", "DAY 251")}
  <div class="serif" style="position: absolute; left: 22px; right: 40px; top: 96px; color: #ECEEF2; font-style: italic; font-weight: 300; font-size: 36px; line-height: 41px; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.4)}">Quiet day. The stairwell still counted.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 398px; display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-direction: column; gap: 8px; {R(0.7)}">
      <div class="eyebrow" style="color: #8B93A2;">Today, in a word</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">""" + "".join(f'<div style="font-size: 14px; font-weight: 600; padding: 9px 14px; border-radius: 999px; border: 1px solid {"rgba(255,196,102,0.6)" if t=="Steady" else "rgba(236,238,242,0.22)"}; {"background: rgba(255,196,102,0.14); color: #FFC466; box-shadow: 0 0 20px rgba(255,196,102,0.15);" if t=="Steady" else ""}">{t}</div>' for t in ["Calm","Tired","Proud","Steady"]) + f"""</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.10); {R(0.9)}">
      <div class="eyebrow" style="color: #8B93A2;">One piece of proof · your rule: “one run in the ledger, any pace”</div>
      <div style="font-size: 17px; line-height: 23px; font-weight: 500;">Ten floors, twice, in the rain.</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.10); {R(1.1)}">
      <div class="eyebrow" style="color: #8B93A2;">One thing you're glad of</div>
      <div style="font-size: 16px; line-height: 22px; color: #8B93A2;">Type, or hold to speak…</div>
    </div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 34px; display: flex; flex-direction: column; align-items: center; gap: 10px; {R(1.3)}">
    <div style="position: relative; width: 116px; height: 116px;">
      <svg width="116" height="116" viewBox="0 0 132 132" fill="none" style="position: absolute; inset: 0; overflow: visible;">
        <circle cx="66" cy="66" r="62" stroke="rgba(255,255,255,0.14)" stroke-width="2"></circle>
        <circle cx="66" cy="66" r="62" stroke="{SOL}" stroke-width="3" stroke-linecap="round" pathLength="100" transform="rotate(-90 66 66)" style="stroke-dasharray: 100; stroke-dashoffset: 100; animation: fillring 1.6s cubic-bezier(.4,.05,.2,1) 1.6s both; filter: drop-shadow(0 0 8px rgba(255,196,102,.7));"></circle>
        <circle cx="66" cy="66" r="50" fill="rgba(255,196,102,0.08)"></circle>
      </svg>
      <div class="breathe" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="{SOL}" stroke-width="1.7" stroke-linecap="round"><path d="M5 14a7 7 0 0 1 14 0"></path><path d="M3 14h18"></path></svg></div>
    </div>
    <div class="eyebrow" style="color: #8B93A2;">Hold to seal</div>
  </div>
""")
(OUT/"Seal.dc.html").write_text(doc(seal), encoding="utf-8")

# ---------------------------------------------------------------- Horizon Review (Sunday)
review = root(sky(300, DAWN, sun_x=70, ridge_top=110, sun_size=54, sun_lift=90) + f"""
  {topbar("Horizon review · Week 37", "SUNDAY · AFTER THE READING", color="#101318")}
  <div style="position: absolute; left: 22px; right: 22px; top: 290px; display: flex; flex-direction: column;">
    <div style="display: flex; align-items: flex-end; justify-content: space-between; {R(0.5)}">
      <div style="display: flex; flex-direction: column;">
        <div class="eyebrow" style="color: #8B93A2;">Consistency</div>
        <div class="mono" style="font-size: 112px; line-height: 100px; font-weight: 500; letter-spacing: -0.06em;">71</div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 14px; padding-bottom: 8px;">
        <div style="display: flex; flex-direction: column; align-items: flex-end;"><div class="mono" style="font-size: 26px; line-height: 28px; font-weight: 500; color: {SOL};">+7</div><div class="eyebrow" style="color: #8B93A2;">This week</div></div>
        <div style="display: flex; flex-direction: column; align-items: flex-end;"><div class="mono" style="font-size: 26px; line-height: 28px; font-weight: 500;">#4</div><div class="eyebrow" style="color: #8B93A2;">Return</div></div>
      </div>
    </div>
    <svg width="346" height="110" viewBox="0 0 346 110" fill="none" style="margin-top: 10px; overflow: visible; {R(0.8)}">
      <rect x="0" y="34" width="346" height="34" fill="#7FA9E0" fill-opacity="0.10"></rect>
      <path d="M0 78 C 30 76, 50 60, 80 66 S 130 88, 160 70 S 210 40, 250 42 S 310 30, 346 22 L346 110 L0 110 Z" fill="{SOL}" fill-opacity="0.10"></path>
      <path class="draw" d="M0 78 C 30 76, 50 60, 80 66 S 130 88, 160 70 S 210 40, 250 42 S 310 30, 346 22" stroke="{SOL}" stroke-width="2.5" style="animation-delay: 1s;"></path>
      <circle class="pop" cx="346" cy="22" r="5" fill="{SOL}" style="animation-delay: 3s; transform-origin: 346px 22px; filter: drop-shadow(0 0 8px rgba(255,196,102,.8));"></circle>
      <text x="0" y="104" font-family="Geist Mono, Menlo, monospace" font-size="10" fill="#6F7785" letter-spacing="1.4">28 DAYS AGO</text>
      <text x="346" y="104" font-family="Geist Mono, Menlo, monospace" font-size="10" fill="#6F7785" letter-spacing="1.4" text-anchor="end">TODAY</text>
      <text x="4" y="46" font-family="Geist Mono, Menlo, monospace" font-size="9" fill="#7FA9E0" letter-spacing="1.2">YOUR USUAL RANGE</text>
    </svg>
    <div class="serif" style="margin-top: 16px; font-style: italic; font-weight: 300; font-size: 23px; line-height: 29px; font-variation-settings: 'opsz' 40; color: #F3E6D3; text-wrap: pretty; {R(1.1)}">Three runs, all short, all real. You said “something moved” on the guitar chapter, so the plan asks for twenty minutes, not an hour.</div>
    <div style="margin-top: 18px; display: flex; flex-direction: column; {R(1.3)}">
      <div style="display: flex; align-items: center; gap: 12px; height: 46px; border-top: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 11px; color: {SOL}; width: 44px;">ADD</div><div style="flex: 1 1 auto; font-size: 15px; font-weight: 500;">Fourth walk‑run, Saturday</div></div>
      <div style="display: flex; align-items: center; gap: 12px; height: 46px; border-top: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 11px; color: #8B93A2; width: 44px;">EDIT</div><div style="flex: 1 1 auto; font-size: 15px; font-weight: 500;">Guitar: twenty minutes, three times</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px;">{cta("Review the Replan", 1.5)}</div>
""")
(OUT/"Review.dc.html").write_text(doc(review), encoding="utf-8")

# ---------------------------------------------------------------- Almanac (year grid with wave reveal)
random.seed(3)
cells = []
for d in range(1, 32):
    for m in range(12):
        past = (m < 8) or (m == 8 and d <= 8)
        delay = f"animation: rise .6s ease-out {0.4 + d*0.035:.2f}s both;"
        if (m in (1,3,5,8,10) and d == 31) or (m == 1 and d > 28):
            cells.append('<div></div>'); continue
        if not past:
            cells.append(f'<div style="width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.06); {delay}"></div>'); continue
        r = random.random()
        if m == 8 and d == 8:
            cells.append(f'<div class="breathe" style="width: 7px; height: 7px; border-radius: 50%; background: {SOL}; box-shadow: 0 0 12px {SOL};"></div>')
        elif r < 0.12:
            cells.append(f'<div style="width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.10); {delay}"></div>')
        elif r < 0.45:
            cells.append(f'<div style="width: 6px; height: 6px; border-radius: 50%; background: rgba(236,238,242,0.55); {delay}"></div>')
        elif r < 0.8:
            cells.append(f'<div style="width: 6px; height: 6px; border-radius: 50%; background: #ECEEF2; {delay}"></div>')
        else:
            cells.append(f'<div style="width: 6px; height: 6px; border-radius: 50%; background: #ECEEF2; box-shadow: 0 0 0 2px rgba(255,196,102,0.55); {delay}"></div>')
months = "".join(f'<div class="mono" style="font-size: 9px; color: #6F7785; text-align: center;">{m}</div>' for m in ["J","F","M","A","M","J","J","A","S","O","N","D"])
almanac = root(f"""
  <div style="position: absolute; left: 60px; top: -200px; width: 420px; height: 360px; background: radial-gradient(closest-side, rgba(107,127,214,0.32), rgba(107,127,214,0));"></div>
  <div class="grain" style="position: absolute; left: 0; top: 0; width: 390px; height: 300px;"></div>
  {topbar("Almanac · 2026", "251 / 365")}
  <div style="position: absolute; left: 22px; right: 22px; top: 60px; display: flex; align-items: flex-end; justify-content: space-between; {R(0.3)}">
    <div style="display: flex; flex-direction: column; gap: 2px;"><div class="mono" style="font-size: 72px; line-height: 66px; font-weight: 500; letter-spacing: -0.05em;">214</div><div class="eyebrow" style="color: #8B93A2;">Pieces of evidence</div></div>
    <div style="display: flex; gap: 22px;">
      <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;"><div class="mono" style="font-size: 26px; line-height: 28px; font-weight: 500; color: {SOL};">4</div><div class="eyebrow" style="color: #8B93A2;">Returns</div></div>
      <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;"><div class="mono" style="font-size: 26px; line-height: 28px; font-weight: 500;">1</div><div class="eyebrow" style="color: #8B93A2;">Books</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 178px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.10); {R(0.4)}">{months}</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 206px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 9px 6px; justify-items: center;">{''.join(cells)}</div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 112px; display: flex; gap: 16px; flex-wrap: wrap; {R(1.6)}">
    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 6px; height: 6px; border-radius: 50%; background: #ECEEF2;"></div><div class="mono" style="font-size: 10.5px; color: #8B93A2;">EVIDENCE</div></div>
    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 6px; height: 6px; border-radius: 50%; background: #ECEEF2; box-shadow: 0 0 0 2px rgba(255,196,102,0.55);"></div><div class="mono" style="font-size: 10.5px; color: #8B93A2;">SEALED</div></div>
    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.10);"></div><div class="mono" style="font-size: 10.5px; color: #8B93A2;">QUIET</div></div>
    <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 6px; height: 6px; border-radius: 50%; background: {SOL};"></div><div class="mono" style="font-size: 10.5px; color: #8B93A2;">TODAY</div></div>
  </div>
""" + tabbar('goals'))
(OUT/"Almanac.dc.html").write_text(doc(almanac), encoding="utf-8")

# ---------------------------------------------------------------- Paywall (the user's own I will)
paywall = root(sky(380, DAWN, sun_x=195, sun_size=72, sun_lift=84) + f"""
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; align-items: center; color: #101318; {R(0.1)}">
    <div class="eyebrow" style="opacity: 0.8;">Your Blueprint is ready</div>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 88px; color: #101318; font-style: italic; font-weight: 300; font-size: 30px; line-height: 35px; font-variation-settings: 'opsz' 60; text-wrap: balance; text-align: center; {R(0.4)}">“I will be out the back door before the kettle boils.”</div>
  <div class="eyebrow" style="position: absolute; left: 0; right: 0; top: 232px; text-align: center; color: #101318; opacity: 0.6; {R(0.5)}">Your last page. The first Book is free, forever.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 372px; display: flex; flex-direction: column;">
    """ + "".join(f'<div style="display: flex; gap: 12px; align-items: center; height: 42px; {"border-bottom: 1px solid rgba(255,255,255,0.10);" if i<2 else ""} font-size: 15px; font-weight: 500; color: #DDE3EA; {R(0.7 + i*0.1)}"><span style="color: {SOL};">—</span> {t}</div>' for i,t in enumerate(["Every goal's Blueprint and Replans","Scenes, the other road, letters, wallpapers","The coach every morning and evening"])) + f"""
    <div style="margin-top: 16px; display: flex; gap: 10px; {R(1.1)}">
      <div style="flex: 1.4 1 0; padding: 14px 14px; border-radius: 20px; border: 1.5px solid {SOL}; background: rgba(255,196,102,0.08); box-shadow: 0 0 36px rgba(255,196,102,0.16); display: flex; flex-direction: column; gap: 4px;">
        <div class="eyebrow" style="color: {SOL};">Yearly</div>
        <div style="display: flex; align-items: baseline; gap: 6px;"><div class="mono" style="font-size: 30px; line-height: 32px; font-weight: 500; letter-spacing: -0.03em;">$49.99</div><div class="mono" style="font-size: 12px; color: #A9B1BE; white-space: nowrap;">/ yr</div></div>
        <div class="mono" style="font-size: 11.5px; color: #A9B1BE; white-space: nowrap;">7 days free · $4.17/mo</div>
      </div>
      <div style="flex: 1 1 0; padding: 14px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.14); display: flex; flex-direction: column; gap: 4px;">
        <div class="eyebrow" style="color: #8B93A2;">Monthly</div>
        <div style="display: flex; align-items: baseline; gap: 6px;"><div class="mono" style="font-size: 30px; line-height: 32px; font-weight: 500; letter-spacing: -0.03em;">$9.99</div><div class="mono" style="font-size: 12px; color: #A9B1BE; white-space: nowrap;">/ mo</div></div>
        <div class="mono" style="font-size: 11.5px; color: #A9B1BE;">no trial</div>
      </div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px; display: flex; flex-direction: column; gap: 6px;">
    {cta("Start 7 days free", 1.3)}
    {ghost("Not now", 1.4)}
    <div class="mono" style="text-align: center; font-size: 10.5px; line-height: 16px; color: #6F7785; {R(1.5)}">RENEWS AUTOMATICALLY · CANCEL ANY TIME · RESTORE PURCHASES</div>
  </div>
""")
(OUT/"Paywall.dc.html").write_text(doc(paywall), encoding="utf-8")

# ---------------------------------------------------------------- Brand sheet
brand = root(f"""
  <div class="grain" style="position: absolute; inset: 0;"></div>
  {topbar("Landscape v5 · identity", "TOKENS")}
  <div style="position: absolute; left: 22px; right: 22px; top: 60px; display: flex; flex-direction: column; gap: 22px;">
    <div style="display: flex; align-items: center; gap: 16px; {R(0.3)}">
      <div style="position: relative; width: 72px; height: 72px; border-radius: 18px; background: linear-gradient(180deg, #6B7FD6, #F0A878 60%, #0F1219 61%); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);"><div style="position: absolute; left: 22px; top: 30px; width: 28px; height: 28px; border-radius: 50%; background: {SOL}; box-shadow: 0 0 20px {SOL};"></div></div>
      <div><div class="serif" style="font-size: 40px; line-height: 40px; letter-spacing: -0.03em; font-variation-settings: 'opsz' 72;">Morrow</div><div class="mono" style="font-size: 10.5px; color: #8B93A2; letter-spacing: 0.12em;">THE SUN ON THE RIDGE</div></div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px; {R(0.5)}">
      <div class="eyebrow" style="color: #8B93A2;">Three voices</div>
      <div class="serif" style="font-style: italic; font-weight: 300; font-size: 24px; line-height: 28px; font-variation-settings: 'opsz' 40;">The future self, in italic.</div>
      <div class="serif" style="font-size: 20px; line-height: 26px; font-variation-settings: 'opsz' 24; color: #F3E6D3;">The user's own words, in roman. Never anything else in this face.</div>
      <div style="font-size: 16px; line-height: 22px; font-weight: 500;">The interface and the coach, in Instrument Sans.</div>
      <div class="mono" style="font-size: 13px; color: #A9B1BE;">READOUTS 06:40 · 71 · DAY 251 IN GEIST MONO</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px; {R(0.7)}">
      <div class="eyebrow" style="color: #8B93A2;">Sky phases</div>
      <div style="display: flex; gap: 8px;">
        {''.join(f'<div style="flex: 1 1 0; height: 54px; border-radius: 12px; background: linear-gradient(180deg, {c["skyTop"]}, {c["skyMid"]} 55%, {c["skyLow"]});"></div>' for c in [DAWN, DAY, DUSK, NIGHT])}
      </div>
      <div style="display: flex; gap: 8px;">{''.join(f'<div class="mono" style="flex: 1 1 0; font-size: 9.5px; color: #8B93A2; letter-spacing: 0.1em;">{n}</div>' for n in ["DAWN","DAY","DUSK","NIGHT · WRITING"])}</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px; {R(0.9)}">
      <div class="eyebrow" style="color: #8B93A2;">Marks</div>
      <div style="display: flex; gap: 14px; align-items: center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{SOL}" stroke-width="1.6" stroke-linecap="round"><path d="M5 14a7 7 0 0 1 14 0"></path><path d="M3 14h18"></path></svg>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round"><path d="M4 18c4 0 4-10 8-10s4 10 8 10"></path><circle cx="12" cy="8" r="1.6"></circle></svg>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3V5z"></path><path d="M7 5v12"></path></svg>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="2.5" fill="#ECEEF2" stroke="none"></circle></svg>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round"><path d="M4 12a8 8 0 1 1 3 6.2"></path><path d="M4 18v-6h6"></path></svg>
      </div>
      <div class="mono" style="font-size: 9px; color: #6F7785; letter-spacing: 0.06em;">HORIZON · PATH · BOOK · SEAL · RETURN</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px; {R(1.1)}">
      <div class="eyebrow" style="color: #8B93A2;">The one rule</div>
      <div style="font-size: 15px; line-height: 21px; color: #DDE3EA;">The sun rises when the user writes. Every glow on every screen is earned by something they did, never decoration.</div>
    </div>
  </div>
""")
(OUT/"Brand.dc.html").write_text(doc(brand), encoding="utf-8")

print("generated:", sorted(p.name for p in OUT.glob("*.dc.html")))
