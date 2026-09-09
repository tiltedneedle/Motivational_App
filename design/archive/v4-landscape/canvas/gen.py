# Generates the Morrow artboards (.dc.html) from shared parts. v4: bolder type, punchier skies, choreographed motion.
import pathlib, random

OUT = pathlib.Path(__file__).parent
GROUND = "#0F1219"
SOL = "#FFC466"
SUNBTN = "linear-gradient(160deg, #FFD58A, #F5A93B)"

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&family=Instrument+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">'

def grain(alpha):
    return ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 %s 0'/></filter><rect width='140' height='140' filter='url(%%23n)'/></svg>\")" % alpha)

MOTION = """
    @keyframes rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes sunrise { from { transform: translateY(70px) scale(0.85); opacity: 0.4; } to { transform: translateY(0) scale(1); opacity: 1; } }
    @keyframes glow { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes drift { 0% { transform: translateX(-30px); } 100% { transform: translateX(30px); } }
    @keyframes twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
    @keyframes kenburns { from { transform: scale(1.0); } to { transform: scale(1.08); } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes travel { to { offset-distance: 64%; } }
    @keyframes fillring { to { stroke-dashoffset: 0; } }
    @keyframes pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .rise { animation: rise 1s cubic-bezier(.22,.7,.2,1) both; }
    .sun-rise { animation: sunrise 2.4s cubic-bezier(.2,.8,.2,1) both, glow 5s ease-in-out 2.4s infinite; }
    .rays { animation: spin 140s linear infinite; }
    .mist { animation: drift 16s ease-in-out infinite alternate; }
    .kb { animation: kenburns 30s ease-out both; }
    .draw { stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: draw 2.2s cubic-bezier(.4,.1,.2,1) .6s both; }
    .draw-short { stroke-dasharray: 400; stroke-dashoffset: 400; animation: draw 1.6s cubic-bezier(.4,.1,.2,1) .8s both; }
    .pop { animation: pop .9s cubic-bezier(.2,.9,.3,1.2) both; }
    .breathe { animation: breathe 4s ease-in-out infinite; }
    .shimmer { background-image: linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 70%); background-size: 200% 100%; animation: shimmer 3.5s ease-in-out 1.6s infinite; }
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

def R(delay):  # staggered reveal
    return f'animation: rise 1s cubic-bezier(.22,.7,.2,1) {delay}s both;'

def sky(h, c, sun_x, ridge_top=None, night=False, sun_size=60, sun_lift=98):
    rt = ridge_top if ridge_top is not None else h - 220
    sun_y = rt + sun_lift
    stars = ""
    if night:
        random.seed(7)
        dots = "".join(f'<circle cx="{random.randint(6,384)}" cy="{random.randint(8, rt+40)}" r="{random.choice([0.7,0.9,1.2,1.6])}" fill="white" style="animation: twinkle {random.choice([2.5,3.5,4.5,6])}s ease-in-out {random.random()*4:.1f}s infinite;"></circle>' for _ in range(90))
        stars = f'<svg style="position: absolute; left: 0; top: 0;" width="390" height="{h}" viewBox="0 0 390 {h}">{dots}</svg>'
    return f"""
  <div style="position: absolute; left: 0; top: 0; width: 390px; height: {h}px; background: linear-gradient(180deg, {c['skyTop']} 0%, {c['skyMid']} 52%, {c['skyLow']} 100%);"></div>
  {stars}
  <div class="rays" style="position: absolute; left: {sun_x-300}px; top: {sun_y-300}px; width: 600px; height: 600px; background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,235,200,0.09) 0deg 4deg, rgba(255,235,200,0) 4deg 14deg); -webkit-mask-image: radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.6) 40%, transparent 70%); mask-image: radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.6) 40%, transparent 70%);"></div>
  <div style="position: absolute; left: {sun_x-250}px; top: {sun_y-210}px; width: 500px; height: 420px; background: radial-gradient(closest-side, {c['glow']} 0%, rgba(255,196,102,0) 100%);"></div>
  <div class="mist" style="position: absolute; left: 30px; top: {int(h*0.16)}px; width: 250px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.22); filter: blur(16px);"></div>
  <div class="mist" style="position: absolute; left: 190px; top: {int(h*0.30)}px; width: 230px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.16); filter: blur(18px); animation-duration: 22s; animation-direction: alternate-reverse;"></div>
  <div class="grain" style="position: absolute; left: 0; top: 0; width: 390px; height: {h}px;"></div>
  <div class="sun-rise" style="position: absolute; left: {sun_x}px; top: {sun_y}px; width: {sun_size}px; height: {sun_size}px; margin: -{sun_size//2}px 0 0 -{sun_size//2}px; border-radius: 50%; background: {c['sun']}; box-shadow: 0 0 50px 18px {c['sunGlow']}, 0 0 170px 80px {c['sunGlowFar']};"></div>
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

def root(inner, bg=GROUND, color="#ECEEF2"):
    return f'<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: {bg}; color: {color};">{inner}</div>'

def suncheck(size=64):
    return f'<div class="pop" style="width: {size}px; height: {size}px; border-radius: 50%; border: 1.5px solid {SOL}; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(255,196,102,0.22), inset 0 0 22px rgba(255,196,102,0.10); animation-delay: .9s;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{SOL}" stroke-width="1.7" stroke-linecap="round"><path d="M5 14a7 7 0 0 1 14 0"></path><path d="M3 14h18"></path></svg></div>'

def row_icon():
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-opacity="0.42" stroke-width="1.5" stroke-linecap="round"><path d="M5 14a7 7 0 0 1 14 0"></path><path d="M3 14h18"></path></svg>'

DAWN = dict(skyTop='#6B7FD6', skyMid='#F0A878', skyLow='#FFD9B0', glow='rgba(255,185,110,0.85)', sun='#FFC466', sunGlow='rgba(255,196,102,0.6)', sunGlowFar='rgba(255,140,70,0.26)')
DUSK = dict(skyTop='#2E2A6E', skyMid='#D9724F', skyLow='#FFBE7A', glow='rgba(255,140,80,0.8)', sun='#FFAE52', sunGlow='rgba(255,176,90,0.6)', sunGlowFar='rgba(255,110,60,0.28)')
NIGHT = dict(skyTop='#070911', skyMid='#151C33', skyLow='#2B3658', glow='rgba(160,180,230,0.22)', sun='#E6EAF4', sunGlow='rgba(230,234,244,0.35)', sunGlowFar='rgba(160,180,230,0.14)')

# ---------------------------------------------------------------- Welcome (showpiece hero)
welcome = root(sky(844, DAWN, sun_x=195, ridge_top=430, sun_size=84, sun_lift=96) + f"""
  <div class="eyebrow" style="position: absolute; top: 26px; left: 0; right: 0; text-align: center; color: #101318; opacity: 0.7; {R(0.2)}">Morrow</div>
  <div class="serif" style="position: absolute; left: 0; right: 0; top: 150px; text-align: center; color: #101318; font-size: 92px; line-height: 92px; font-weight: 400; letter-spacing: -0.03em; font-variation-settings: 'opsz' 72; {R(0.5)}">Morrow</div>
  <div class="serif" style="position: absolute; left: 30px; right: 30px; top: 262px; text-align: center; color: #101318; font-style: italic; font-weight: 300; font-size: 30px; line-height: 36px; font-variation-settings: 'opsz' 48; text-wrap: balance; {R(0.8)}">Meet who you're becoming.</div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 96px; display: flex; flex-direction: column; gap: 10px;">
    {cta("Begin the interview", 1.2)}
    <div style="height: 44px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #A9B1BE; {R(1.35)}">I already have an account</div>
  </div>
  <div class="mono" style="position: absolute; left: 0; right: 0; bottom: 40px; text-align: center; font-size: 10px; letter-spacing: 0.14em; color: #6F7785; {R(1.5)}">FIVE MINUTES · NO SIGN‑UP YET</div>
""")
(OUT/"Welcome.dc.html").write_text(doc(welcome), encoding="utf-8")

# ---------------------------------------------------------------- Today (with sky tweak)
holes = {k: "{{c.%s}}" % k for k in ["skyTop","skyMid","skyLow","glow","sun","sunGlow","sunGlowFar"]}
today = root(sky(470, holes, sun_x=112, sun_size=64) + f"""
  <div style="position: absolute; top: 20px; left: 22px; right: 22px; display: flex; justify-content: space-between; align-items: center; color: {{{{c.skyInk}}}}; {R(0.1)}">
    <div class="eyebrow" style="opacity: 0.8;">Tue 8 Sept · Dawn · 06:41</div>
    <div style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid currentColor; opacity: 0.75; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">M</div>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 40px; top: 104px; color: {{{{c.skyInk}}}}; font-style: italic; font-weight: 300; font-size: 40px; line-height: 44px; letter-spacing: -0.012em; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.4)}">Today, the ten‑minute version counts.</div>

  <div style="position: absolute; left: 18px; right: 18px; top: 350px; border-radius: 28px; background: rgba(18,21,30,0.60); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.13); box-shadow: 0 26px 70px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10); padding: 20px 18px 20px 22px; display: flex; align-items: center; gap: 16px; {R(0.7)}">
    <div style="flex: 1 1 auto; display: flex; flex-direction: column; gap: 6px;">
      <div class="eyebrow" style="color: {SOL};">Now · Morning peak</div>
      <div class="serif" style="font-size: 30px; line-height: 33px; font-weight: 400; letter-spacing: -0.012em; font-variation-settings: 'opsz' 60; white-space: nowrap;">Ten‑minute run</div>
      <div style="font-size: 14px; line-height: 19px; color: #B4BBC8;">If it's raining: the stairwell, same ten minutes.</div>
    </div>
    {suncheck(62)}
  </div>

  <div style="position: absolute; left: 22px; right: 22px; top: 534px; display: flex; flex-direction: column;">
    <div class="eyebrow" style="color: #8B93A2; padding-bottom: 2px; {R(0.9)}">Later today</div>
    <div style="display: flex; align-items: center; gap: 14px; height: 44px; border-bottom: 1px solid rgba(255,255,255,0.08); {R(1.0)}">{row_icon()}<div style="flex: 1 1 auto; font-size: 17px; font-weight: 500;">Write 300 words of the pitch</div><div class="mono" style="font-size: 11.5px; color: #8B93A2;">45 MIN</div></div>
    <div style="display: flex; align-items: center; gap: 14px; height: 44px; border-bottom: 1px solid rgba(255,255,255,0.08); {R(1.1)}">{row_icon()}<div style="flex: 1 1 auto; font-size: 17px; font-weight: 500;">Book the physio</div><div class="mono" style="font-size: 11.5px; color: #8B93A2;">10 MIN</div></div>
  </div>

  <div style="position: absolute; left: 22px; right: 22px; top: 652px; display: flex; align-items: flex-end; justify-content: space-between; {R(1.2)}">
    <div style="display: flex; flex-direction: column; gap: 0;">
      <div class="eyebrow" style="color: #8B93A2;">Consistency · 28 days</div>
      <div style="display: flex; align-items: baseline; gap: 10px;"><div class="mono" style="font-size: 64px; line-height: 60px; font-weight: 500; letter-spacing: -0.04em;">71</div><div class="mono" style="font-size: 11px; color: #8B93A2; line-height: 14px;">UP FROM 64<br>RETURN #4</div></div>
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

# ---------------------------------------------------------------- Interview (the sun travels the arc)
arc = "M55 166 A 140 140 0 0 1 335 166"
interview = f"""<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: linear-gradient(180deg, #4F97E6 0%, #BBD8F5 40%, #EEF1F5 76%, #F7F3EC 100%); color: #101318;">
  <div style="position: absolute; left: 35px; top: -60px; width: 320px; height: 280px; background: radial-gradient(closest-side, rgba(255,236,190,0.9), rgba(255,236,190,0));"></div>
  <div class="mist" style="position: absolute; left: 30px; top: 150px; width: 250px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.4); filter: blur(14px);"></div>
  <div class="mist" style="position: absolute; left: 180px; top: 250px; width: 230px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.3); filter: blur(16px); animation-duration: 22s; animation-direction: alternate-reverse;"></div>
  <div class="grain" style="position: absolute; inset: 0;"></div>
  <svg style="position: absolute; left: 0; top: 30px; overflow: visible;" width="390" height="176" viewBox="0 0 390 176" fill="none">
    <path d="{arc}" stroke="#101318" stroke-opacity="0.14" stroke-width="1.5"></path>
    <path d="{arc}" stroke="#E9A23B" stroke-width="3" stroke-linecap="round" pathLength="100" style="stroke-dasharray: 64 100; stroke-dashoffset: 64; animation: draw 2.6s cubic-bezier(.3,.1,.2,1) .4s both;"></path>
  </svg>
  <div style="position: absolute; left: 0; top: 30px; width: 24px; height: 24px; margin: -12px 0 0 -12px; border-radius: 50%; background: {SOL}; box-shadow: 0 0 24px 10px rgba(255,196,102,0.45), 0 0 70px 30px rgba(255,196,102,0.18); offset-path: path('{arc}'); offset-distance: 0%; offset-rotate: 0deg; animation: travel 2.6s cubic-bezier(.3,.1,.2,1) .4s both;"></div>
  <div style="position: absolute; left: 0; right: 0; top: 126px; display: flex; flex-direction: column; align-items: center; gap: 2px; {R(0.6)}">
    <div class="mono" style="font-size: 40px; line-height: 42px; font-weight: 500; letter-spacing: -0.03em;">0.64</div>
    <div class="eyebrow" style="color: #5C6473;">Clarity</div>
  </div>
  <div style="position: absolute; top: 22px; left: 22px;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#101318" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6"></path></svg></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 228px; display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 16px; border-radius: 20px; background: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.7); box-shadow: 0 10px 30px rgba(40,60,90,0.10); backdrop-filter: blur(14px); {R(0.9)}">
    <div class="serif" style="flex: 1 1 auto; font-style: italic; font-weight: 400; font-size: 17px; line-height: 22px; color: #3B4250; font-variation-settings: 'opsz' 24;">Something about mornings, and energy, and not being tired anymore…</div>
    <div style="font-size: 13px; font-weight: 700; padding: 9px 13px; border-radius: 999px; background: #101318; color: #F6F4EE; white-space: nowrap;">Yes, that</div>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 334px; font-size: 40px; line-height: 44px; font-weight: 400; letter-spacing: -0.018em; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(1.1)}">When you imagine it working, what is different first?</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 480px; display: flex; flex-direction: column; gap: 8px;">
""" + "".join(f'<div style="display: flex; align-items: center; gap: 16px; height: 54px; padding: 0 18px; border-radius: 18px; background: rgba(255,255,255,0.66); border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 6px 20px rgba(40,60,90,0.08); {R(1.3 + i*0.08)}"><div class="mono" style="font-size: 12px; color: #8B93A2; width: 14px;">{l}</div><div style="font-size: 17px; font-weight: 600;">{t}</div></div>' for i,(l,t) in enumerate([("A","How my mornings feel"),("B","What my body can do"),("C","The number in my account"),("D","Who I spend evenings with")])) + f"""
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px; display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 8px 0 20px; border-radius: 999px; background: #101318; color: #F6F4EE; box-shadow: 0 14px 34px rgba(16,19,24,0.25); {R(1.7)}">
    <div style="flex: 1 1 auto; font-size: 15px; opacity: 0.85;">Or hold and say it your way</div>
    <div style="width: 42px; height: 42px; border-radius: 50%; background: {SUNBTN}; display: flex; align-items: center; justify-content: center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1219" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="4" width="6" height="11" rx="3"></rect><path d="M6 11a6 6 0 0 0 12 0M12 17v3"></path></svg></div>
  </div>
</div>"""
(OUT/"Interview.dc.html").write_text(doc(interview), encoding="utf-8")

# ---------------------------------------------------------------- Portrait (dusk)
portrait = root(sky(400, DUSK, sun_x=292, sun_size=66) + f"""
  <div class="eyebrow" style="position: absolute; top: 22px; left: 22px; color: #FFF3E6; opacity: 0.85; {R(0.1)}">Your Goal Portrait</div>
  <div class="serif" style="position: absolute; left: 22px; right: 100px; top: 90px; font-style: italic; font-weight: 300; font-size: 26px; line-height: 31px; color: #FFF3E6; font-variation-settings: 'opsz' 40; text-shadow: 0 2px 20px rgba(60,30,60,0.35); {R(0.4)}">“I'm tired of being the person who cancels.” — you, Tuesday.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 366px; display: flex; flex-direction: column;">
    <div class="serif" style="font-size: 36px; line-height: 39px; font-weight: 400; letter-spacing: -0.018em; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.7)}">Run the Lahore half marathon in March, and feel at home in my body again.</div>
    <div style="margin-top: 18px; display: flex; gap: 14px; align-items: stretch; {R(0.9)}">
      <div style="width: 3px; background: {SOL}; border-radius: 2px; flex: 0 0 auto; box-shadow: 0 0 14px rgba(255,196,102,0.7);"></div>
      <div class="serif" style="font-style: italic; font-weight: 300; font-size: 21px; line-height: 27px; color: #F3E6D3; font-variation-settings: 'opsz' 36;">I am becoming someone who keeps the small promise on the ordinary day.</div>
    </div>
    <div style="margin-top: 18px; display: flex; flex-direction: column; gap: 6px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.10); {R(1.1)}">
      <div style="display: flex; justify-content: space-between; align-items: baseline;"><div class="eyebrow" style="color: {SOL};">First move · Wed 9</div><div class="mono" style="font-size: 11px; color: #8B93A2;">+2 THIS WEEK</div></div>
      <div style="font-size: 18px; line-height: 23px; font-weight: 500;">Walk‑run ten minutes after coffee.</div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px; display: flex; flex-direction: column; gap: 6px;">
    {cta("Make this my Blueprint", 1.3)}
    <div style="height: 44px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #A9B1BE; {R(1.4)}">Not quite, change a line</div>
  </div>
""")
(OUT/"Portrait.dc.html").write_text(doc(portrait), encoding="utf-8")

# ---------------------------------------------------------------- Blueprint
def move(text, date, done=False, extra="", delay=1.0):
    box = (f'<div style="width: 22px; height: 22px; border-radius: 50%; background: {SUNBTN}; display: flex; align-items: center; justify-content: center; flex: 0 0 auto;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F1219" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"></path></svg></div>'
           if done else '<div style="width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid rgba(236,238,242,0.42); flex: 0 0 auto;"></div>')
    txt = f'<div style="flex: 1 1 auto; font-size: 16px; line-height: 20px; font-weight: 500; {"color: #8B93A2; text-decoration: line-through;" if done else ""}">{text}</div>'
    return f'<div style="display: flex; align-items: center; gap: 12px; min-height: 50px; border-bottom: 1px solid rgba(255,255,255,0.08); {R(delay)}">{box}{txt}{extra}<div class="mono" style="font-size: 11px; color: #8B93A2; white-space: nowrap;">{date}</div></div>'

blueprint = root(f"""
  <div style="position: absolute; left: 0; top: 0; width: 390px; height: 260px; background: linear-gradient(180deg, rgba(217,114,79,0.55) 0%, rgba(46,42,110,0.25) 50%, rgba(15,18,25,0) 100%);"></div>
  <div style="position: absolute; left: 170px; top: -150px; width: 380px; height: 280px; background: radial-gradient(closest-side, rgba(255,174,82,0.45), rgba(255,174,82,0));"></div>
  <div class="grain" style="position: absolute; left: 0; top: 0; width: 390px; height: 260px;"></div>
  <div class="contours" style="position: absolute; left: 0; top: 380px; width: 390px; height: 420px;"></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; align-items: center; {R(0.1)}">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6"></path></svg>
    <div class="eyebrow" style="opacity: 0.85;">Blueprint · v1</div>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4z"></path></svg>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 60px; font-size: 36px; line-height: 40px; font-weight: 400; letter-spacing: -0.018em; font-variation-settings: 'opsz' 72; {R(0.3)}">Lahore half marathon</div>
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
        <div style="font-size: 13px; line-height: 18px; color: #8B93A2;">Proof: one 5 km run in the ledger, any pace.</div>
      </div>
      <div style="margin-top: 12px; display: flex; flex-direction: column;">
        {move("Walk‑run 10 min after coffee", "WED 9", done=True, delay=0.8)}
        {move("Book the physio for the knee", "THU 10", delay=0.9)}
        {move("Three 15‑min walk‑runs", "WK 1", extra='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC466" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"></path></svg>', delay=1.0)}
        {move("Evening stretch", "DAILY", extra='<div class="mono" style="font-size: 10px; padding: 3px 8px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.25); color: #A9B1BE; white-space: nowrap;">2‑MIN OK</div>', delay=1.1)}
      </div>
      <div style="margin-top: 26px; display: flex; flex-direction: column; gap: 6px; opacity: 0.55; {R(1.6)}"><div class="eyebrow">Milestone 2 · by 8 Nov</div><div class="serif" style="font-size: 26px; line-height: 30px; font-variation-settings: 'opsz' 48;">Run 10 km on a Sunday</div></div>
      <div style="margin-top: 96px; display: flex; flex-direction: column; gap: 6px; opacity: 0.35; {R(2.2)}"><div class="eyebrow">Milestone 3 · March</div><div class="serif" style="font-size: 26px; line-height: 30px; font-variation-settings: 'opsz' 48;">Race day, 21.1 km</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 160px; background: linear-gradient(180deg, rgba(15,18,25,0), {GROUND} 55%);"></div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 28px;">{cta("Start with the first move", 1.4)}</div>
""")
(OUT/"Blueprint.dc.html").write_text(doc(blueprint), encoding="utf-8")

# ---------------------------------------------------------------- Goal (photo, Ken Burns)
goal = root(f"""
  <div style="position: absolute; left: 0; top: 0; width: 390px; height: 480px; overflow: hidden;">
    <img class="kb" src="scene-runner.jpeg" alt="" style="width: 390px; height: 600px; object-fit: cover; display: block; margin-top: -50px; transform-origin: 50% 40%;">
    <div class="grain-photo" style="position: absolute; inset: 0;"></div>
    <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,18,25,0.40) 0%, rgba(15,18,25,0) 28%, rgba(15,18,25,0) 48%, rgba(15,18,25,0.90) 80%, {GROUND} 100%);"></div>
  </div>
  <div class="contours" style="position: absolute; left: 0; top: 470px; width: 390px; height: 420px;"></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; align-items: center; {R(0.1)}">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6"></path></svg>
    <div class="eyebrow" style="opacity: 0.9;">Goal · Health</div>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 322px; display: flex; flex-direction: column; gap: 8px;">
    <div class="eyebrow" style="color: {SOL}; {R(0.4)}">March 2027 · 179 days</div>
    <div class="serif" style="font-size: 50px; line-height: 50px; font-weight: 400; letter-spacing: -0.025em; font-variation-settings: 'opsz' 72; text-wrap: balance; text-shadow: 0 2px 24px rgba(0,0,0,0.35); {R(0.6)}">Lahore half marathon</div>
    <div class="serif" style="font-style: italic; font-weight: 300; font-size: 19px; line-height: 24px; color: #DDE3EA; font-variation-settings: 'opsz' 30; {R(0.8)}">…and feel at home in my body again.</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 500px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; {R(1.0)}">
    <div style="display: flex; flex-direction: column; gap: 4px; padding-right: 8px; border-right: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 30px; line-height: 32px; font-weight: 500; letter-spacing: -0.03em;">3.2<span style="font-size: 13px; color: #8B93A2;"> km</span></div><div class="eyebrow" style="color: #8B93A2;">Longest run</div></div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding-right: 8px; border-right: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 30px; line-height: 32px; font-weight: 500; letter-spacing: -0.03em;">26<span style="font-size: 13px; color: #8B93A2;"> days</span></div><div class="eyebrow" style="color: #8B93A2;">Milestone 1</div></div>
    <div style="display: flex; flex-direction: column; gap: 4px;"><div class="mono" style="font-size: 30px; line-height: 32px; font-weight: 500; letter-spacing: -0.03em;">14</div><div class="eyebrow" style="color: #8B93A2;">Evidence</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 580px; display: flex; flex-direction: column; gap: 6px; {R(1.2)}">
    <div style="display: flex; justify-content: space-between; align-items: baseline;"><div class="eyebrow" style="color: #8B93A2;">The path</div><div class="mono" style="font-size: 11px; color: #8B93A2;">YOU ARE HERE</div></div>
    <svg width="346" height="64" viewBox="0 0 346 64" fill="none" style="overflow: visible;">
      <path class="draw" d="M6 44 C 60 34, 100 54, 150 36 S 240 14, 300 22 S 330 18, 340 12" stroke="#ECEEF2" stroke-opacity="0.22" stroke-width="1.5" style="animation-delay: 1.3s;"></path>
      <path class="draw-short" d="M6 44 C 30 40, 48 46, 66 42" stroke="{SOL}" stroke-width="2.5" stroke-linecap="round" style="animation-delay: 1.6s;"></path>
      <circle class="pop" cx="66" cy="42" r="6" fill="{SOL}" style="animation-delay: 2.2s; transform-origin: 66px 42px;"></circle><circle cx="66" cy="42" r="14" fill="{SOL}" fill-opacity="0.18"></circle>
      <circle cx="150" cy="36" r="4" fill="{GROUND}" stroke="#ECEEF2" stroke-width="1.5"></circle>
      <circle cx="300" cy="22" r="4" fill="{GROUND}" stroke="#ECEEF2" stroke-opacity="0.6" stroke-width="1.5"></circle>
      <circle cx="340" cy="12" r="4" fill="{GROUND}" stroke="#ECEEF2" stroke-opacity="0.6" stroke-width="1.5"></circle>
    </svg>
  </div>
  <div style="position: absolute; left: 22px; right: 0; top: 672px; display: flex; flex-direction: column; gap: 10px; {R(1.4)}">
    <div class="eyebrow" style="color: #8B93A2;">Anchors</div>
    <div style="display: flex; gap: 10px; align-items: stretch; height: 92px;">
      <div style="width: 92px; border-radius: 14px; overflow: hidden; flex: 0 0 auto; box-shadow: 0 8px 20px rgba(0,0,0,0.3);"><img src="scene-kitchen.jpeg" alt="" style="width: 92px; height: 92px; object-fit: cover; display: block;"></div>
      <div style="width: 150px; border-radius: 14px; flex: 0 0 auto; padding: 12px 14px; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); display: flex; align-items: flex-end;"><div class="serif" style="font-style: italic; font-weight: 300; font-size: 15px; line-height: 19px; color: #DDE3EA; font-variation-settings: 'opsz' 24;">“Slow is smooth, smooth is fast.”</div></div>
      <div style="width: 92px; border-radius: 14px; overflow: hidden; flex: 0 0 auto; box-shadow: 0 8px 20px rgba(0,0,0,0.3);"><img src="scene-runner.jpeg" alt="" style="width: 92px; height: 92px; object-fit: cover; object-position: 60% 60%; display: block;"></div>
      <div style="width: 52px; border-radius: 14px; flex: 0 0 auto; border: 1px dashed rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B93A2" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg></div>
    </div>
  </div>
""")
(OUT/"Goal.dc.html").write_text(doc(goal), encoding="utf-8")

# ---------------------------------------------------------------- Envision (photo, Ken Burns)
envision = root(f"""
  <img class="kb" src="scene-kitchen.jpeg" alt="" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; object-fit: cover; object-position: 50% 35%; display: block; transform-origin: 50% 30%;">
  <div style="position: absolute; inset: 0; background: rgba(255,150,70,0.14); mix-blend-mode: multiply;"></div>
  <div class="grain-photo" style="position: absolute; inset: 0;"></div>
  <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,18,25,0.45) 0%, rgba(15,18,25,0) 22%, rgba(15,18,25,0) 42%, rgba(15,18,25,0.9) 72%, {GROUND} 100%);"></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; align-items: center; {R(0.2)}">
    <div class="eyebrow" style="opacity: 0.9;">The practice · Scene 1 of 3</div>
    <div class="mono" style="font-size: 11px; padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.35); backdrop-filter: blur(10px);">generated</div>
  </div>
  <div style="position: absolute; right: 16px; top: 150px; display: flex; flex-direction: column; gap: 8px; {R(0.6)}">
    <div style="width: 40px; height: 56px; border-radius: 8px; overflow: hidden; outline: 1.5px solid {SOL}; outline-offset: 2px;"><img src="scene-kitchen.jpeg" alt="" style="width: 40px; height: 56px; object-fit: cover; display: block;"></div>
    <div style="width: 40px; height: 56px; border-radius: 8px; overflow: hidden; opacity: 0.7;"><img src="scene-runner.jpeg" alt="" style="width: 40px; height: 56px; object-fit: cover; display: block;"></div>
    <div style="width: 40px; height: 56px; border-radius: 8px; border: 1px solid rgba(236,238,242,0.3); display: flex; align-items: center; justify-content: center; opacity: 0.7;"><div class="mono" style="font-size: 10px;">3</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 214px; display: flex; flex-direction: column; gap: 14px; {R(0.9)}">
    <div class="serif" style="font-style: italic; font-weight: 300; font-size: 28px; line-height: 35px; font-variation-settings: 'opsz' 48; text-wrap: pretty; text-shadow: 0 2px 24px rgba(0,0,0,0.4);">It's 6:40 and the kitchen is still blue. You lace the left shoe first, like always. Ten minutes, you tell yourself, and the door is already open.</div>
    <div class="mono" style="font-size: 11px; color: #A9B1BE;">FROM YOUR WORDS · “the kitchen at 6:40, before anyone's up”</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 148px; display: flex; gap: 8px; {R(1.2)}">""" + "".join(f'<div style="font-size: 13px; padding: 9px 13px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.3); backdrop-filter: blur(8px);">{t}</div>' for t in ["warmer","simpler","closer to home"]) + f"""</div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 98px; display: flex; gap: 10px; {R(1.3)}">
    <div style="flex: 1 1 auto; height: 44px; border-radius: 999px; border: 1px solid rgba(236,238,242,0.35); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">Try another</div>
    <div style="flex: 1 1 auto; height: 44px; border-radius: 999px; background: {SUNBTN}; color: #0F1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">Make wallpaper</div>
  </div>
""" + tabbar('envision'))
(OUT/"Envision.dc.html").write_text(doc(envision), encoding="utf-8")

# ---------------------------------------------------------------- Coach
def brief_row(label, text, delay, last=False):
    return f'<div style="display: flex; gap: 16px; padding: 13px 0; border-top: 1px solid rgba(255,255,255,0.12); {"border-bottom: 1px solid rgba(255,255,255,0.12);" if last else ""} {R(delay)}"><div class="eyebrow" style="width: 74px; flex: 0 0 auto; color: {SOL}; padding-top: 4px;">{label}</div><div style="font-size: 15px; line-height: 22px; color: #DDE3EA;">{text}</div></div>'
coach = root(f"""
  <div style="position: absolute; left: -120px; top: -160px; width: 460px; height: 380px; background: radial-gradient(closest-side, rgba(244,198,166,0.38), rgba(244,198,166,0));"></div>
  <div class="grain" style="position: absolute; left: 0; top: 0; width: 390px; height: 260px;"></div>
  <div class="contours" style="position: absolute; left: 0; top: 420px; width: 390px; height: 420px;"></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; align-items: center; {R(0.1)}">
    <div class="eyebrow" style="opacity: 0.85;">Dawn brief · Tue 8 Sept</div>
    <div style="display: flex; align-items: center; gap: 10px;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="{SOL}" stroke-width="1.7" stroke-linecap="round"><path d="M3 15h18"></path><path d="M7 15a5 5 0 0 1 10 0"></path></svg><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-opacity="0.7" stroke-width="1.6" stroke-linecap="round"><path d="M11 5L6 9H3v6h3l5 4V5z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path></svg></div>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 70px; font-style: italic; font-weight: 300; font-size: 34px; line-height: 39px; letter-spacing: -0.012em; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.4)}">You ran on the day you were sick. That's the one I'll remember.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 222px; display: flex; flex-direction: column;">
    {brief_row("Yesterday", 'Two of three moves, plus the two‑minute stretch at 11 pm. You sealed the day at <span class="mono">71</span>, up from <span class="mono">64</span>. The physio is booked for Thursday.', 0.7)}
    {brief_row("Today", "Start with the ten‑minute run, before the pitch. The pitch will eat the morning if you let it, and the run makes it better.", 0.85)}
    {brief_row("If", "If it's raining at 7, then the stairwell, ten floors, twice. Same shoes, same ten minutes.", 1.0, last=True)}
    <div class="pop" style="margin-top: 16px; display: flex; align-items: center; gap: 10px; align-self: flex-start; padding: 9px 14px 9px 10px; border-radius: 999px; background: rgba(255,196,102,0.14); color: {SOL}; border: 1px solid rgba(255,196,102,0.25); animation-delay: 1.4s;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"></path></svg><div style="font-size: 13px; font-weight: 700;">Run set as your first move</div></div>
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
  <div style="position: absolute; top: 22px; left: 22px; right: 22px; display: flex; justify-content: space-between; align-items: center; color: #ECEEF2; {R(0.1)}">
    <div class="eyebrow" style="opacity: 0.8;">Seal the day · 22:14</div>
    <div class="mono" style="font-size: 11px; opacity: 0.6;">DAY 251</div>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 40px; top: 96px; color: #ECEEF2; font-style: italic; font-weight: 300; font-size: 36px; line-height: 41px; font-variation-settings: 'opsz' 72; text-wrap: balance; {R(0.4)}">Quiet day. The stretch still counted.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 398px; display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-direction: column; gap: 8px; {R(0.7)}">
      <div class="eyebrow" style="color: #8B93A2;">Today, in a word</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">""" + "".join(f'<div style="font-size: 14px; font-weight: 600; padding: 9px 14px; border-radius: 999px; border: 1px solid {"rgba(255,196,102,0.6)" if t=="Steady" else "rgba(236,238,242,0.22)"}; {"background: rgba(255,196,102,0.14); color: #FFC466; box-shadow: 0 0 20px rgba(255,196,102,0.15);" if t=="Steady" else ""}">{t}</div>' for t in ["Calm","Tired","Proud","Steady"]) + f"""</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.10); {R(0.9)}">
      <div class="eyebrow" style="color: #8B93A2;">One piece of proof</div>
      <div style="font-size: 17px; line-height: 23px; font-weight: 500;">Two‑minute calves at 11 pm, on the bathroom floor.</div>
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
        <circle cx="66" cy="66" r="62" stroke="{SOL}" stroke-width="3" stroke-linecap="round" pathLength="100" transform="rotate(-90 66 66)" style="stroke-dasharray: 100; stroke-dashoffset: 100; animation: fillring 3.2s cubic-bezier(.4,.05,.2,1) 1.6s both; filter: drop-shadow(0 0 8px rgba(255,196,102,.7));"></circle>
        <circle cx="66" cy="66" r="50" fill="rgba(255,196,102,0.08)"></circle>
      </svg>
      <div class="breathe" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="{SOL}" stroke-width="1.7" stroke-linecap="round"><path d="M5 14a7 7 0 0 1 14 0"></path><path d="M3 14h18"></path></svg></div>
    </div>
    <div class="eyebrow" style="color: #8B93A2;">Hold to seal</div>
  </div>
""")
(OUT/"Seal.dc.html").write_text(doc(seal), encoding="utf-8")

# ---------------------------------------------------------------- Horizon Review (weekly, showpiece numbers)
review = root(sky(300, DAWN, sun_x=70, ridge_top=110, sun_size=54, sun_lift=90) + f"""
  <div style="position: absolute; top: 22px; left: 22px; right: 22px; display: flex; justify-content: space-between; align-items: center; color: #101318; {R(0.1)}">
    <div class="eyebrow" style="opacity: 0.8;">Horizon review · Week 36</div>
    <div class="mono" style="font-size: 11px; opacity: 0.7;">1 – 7 SEPT</div>
  </div>
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
    <div class="serif" style="margin-top: 16px; font-style: italic; font-weight: 300; font-size: 23px; line-height: 29px; font-variation-settings: 'opsz' 40; color: #F3E6D3; text-wrap: pretty; {R(1.1)}">Three runs, all short, all real. The knee held. Next week the plan asks for one more, not two.</div>
    <div style="margin-top: 18px; display: flex; flex-direction: column; {R(1.3)}">
      <div style="display: flex; align-items: center; gap: 12px; height: 46px; border-top: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 11px; color: {SOL}; width: 44px;">ADD</div><div style="flex: 1 1 auto; font-size: 15px; font-weight: 500;">Fourth walk‑run, Saturday</div></div>
      <div style="display: flex; align-items: center; gap: 12px; height: 46px; border-top: 1px solid rgba(255,255,255,0.10);"><div class="mono" style="font-size: 11px; color: #8B93A2; width: 44px;">MOVE</div><div style="flex: 1 1 auto; font-size: 15px; font-weight: 500;">Physio to Tuesday morning</div></div>
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
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; align-items: center; {R(0.1)}">
    <div class="eyebrow" style="opacity: 0.85;">Almanac · 2026</div>
    <div class="mono" style="font-size: 11px; opacity: 0.6;">251 / 365</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 60px; display: flex; align-items: flex-end; justify-content: space-between; {R(0.3)}">
    <div style="display: flex; flex-direction: column; gap: 2px;"><div class="mono" style="font-size: 72px; line-height: 66px; font-weight: 500; letter-spacing: -0.05em;">214</div><div class="eyebrow" style="color: #8B93A2;">Pieces of evidence</div></div>
    <div style="display: flex; gap: 22px;">
      <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;"><div class="mono" style="font-size: 26px; line-height: 28px; font-weight: 500; color: {SOL};">4</div><div class="eyebrow" style="color: #8B93A2;">Returns</div></div>
      <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;"><div class="mono" style="font-size: 26px; line-height: 28px; font-weight: 500;">19</div><div class="eyebrow" style="color: #8B93A2;">Best stretch</div></div>
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

# ---------------------------------------------------------------- Brand sheet
brand = root(f"""
  <div class="grain" style="position: absolute; inset: 0;"></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; {R(0.1)}"><div class="eyebrow" style="opacity: 0.85;">Morrow · Identity</div><div class="eyebrow" style="color: #8B93A2;">v4</div></div>
  <div class="pop" style="position: absolute; left: 22px; top: 70px; width: 132px; height: 132px; border-radius: 30px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.45); animation-delay: .3s;">
    <div style="position: absolute; inset: 0; background: linear-gradient(180deg, #6B7FD6 0%, #F0A878 55%, #FFD9B0 100%);"></div>
    <div class="breathe" style="position: absolute; left: 66px; top: 78px; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 50%; background: {SOL}; box-shadow: 0 0 26px 10px rgba(255,196,102,0.6);"></div>
    <svg style="position: absolute; left: 0; top: 60px;" width="132" height="72" viewBox="0 0 132 72" fill="none"><path d="M0 34 C 30 20, 60 44, 90 30 C 110 22, 122 30, 132 26 L132 72 L0 72 Z" fill="{GROUND}"></path></svg>
  </div>
  <div style="position: absolute; left: 176px; top: 84px; display: flex; flex-direction: column; gap: 6px; {R(0.5)}">
    <div class="serif" style="font-size: 54px; line-height: 54px; font-weight: 400; letter-spacing: -0.025em; font-variation-settings: 'opsz' 72;">Morrow</div>
    <div class="serif" style="font-style: italic; font-weight: 300; font-size: 17px; line-height: 22px; color: #B4BBC8; font-variation-settings: 'opsz' 24;">Meet who you're becoming.</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 232px; display: flex; flex-direction: column; gap: 10px; {R(0.7)}">
    <div class="eyebrow" style="color: #8B93A2;">The sky, four times a day</div>
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">
      <div style="height: 64px; border-radius: 14px; background: linear-gradient(180deg, #6B7FD6, #F0A878 55%, #FFD9B0);"></div>
      <div style="height: 64px; border-radius: 14px; background: linear-gradient(180deg, #4F97E6, #BBD8F5 55%, #EAF0F5);"></div>
      <div style="height: 64px; border-radius: 14px; background: linear-gradient(180deg, #2E2A6E, #D9724F 55%, #FFBE7A);"></div>
      <div style="height: 64px; border-radius: 14px; background: linear-gradient(180deg, #070911, #151C33 55%, #2B3658); border: 1px solid rgba(255,255,255,0.08);"></div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">""" + "".join(f'<div class="mono" style="font-size: 10px; color: #8B93A2;">{t}</div>' for t in ["DAWN","DAY","DUSK","NIGHT"]) + f"""</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 366px; display: flex; flex-direction: column; gap: 10px; {R(0.9)}">
    <div class="eyebrow" style="color: #8B93A2;">Ground and sun</div>
    <div style="display: flex; gap: 8px;">
      <div style="flex: 1 1 0; height: 44px; border-radius: 12px; background: #0F1219; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; padding: 0 12px;"><div class="mono" style="font-size: 10px; color: #8B93A2;">GROUND #0F1219</div></div>
      <div style="flex: 1 1 0; height: 44px; border-radius: 12px; background: {SUNBTN}; display: flex; align-items: center; padding: 0 12px;"><div class="mono" style="font-size: 10px; color: #0F1219;">SOL #FFC466</div></div>
      <div style="flex: 1 1 0; height: 44px; border-radius: 12px; background: #ECEEF2; display: flex; align-items: center; padding: 0 12px;"><div class="mono" style="font-size: 10px; color: #0F1219;">INK #ECEEF2</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 470px; display: flex; flex-direction: column; gap: 12px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.10); {R(1.1)}">
    <div class="eyebrow" style="color: #8B93A2;">Two voices</div>
    <div class="serif" style="font-style: italic; font-weight: 300; font-size: 26px; line-height: 31px; font-variation-settings: 'opsz' 48;">The future self speaks in Newsreader.</div>
    <div style="font-size: 17px; line-height: 23px; color: #DDE3EA; font-weight: 500;">The present self and the interface speak in Instrument Sans.</div>
    <div class="mono" style="font-size: 13px; color: #B4BBC8;">Geist Mono for numbers · 06:41 · 71 · WK 1</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 694px; display: flex; flex-direction: column; gap: 12px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.10); {R(1.3)}">
    <div class="eyebrow" style="color: #8B93A2;">Glyphs</div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{SOL}" stroke-width="1.6" stroke-linecap="round"><path d="M3 15h18"></path><path d="M7 15a5 5 0 0 1 10 0"></path></svg>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round"><path d="M5 14a7 7 0 0 1 14 0"></path><path d="M3 14h18"></path></svg>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round"><path d="M4 18c4 0 4-10 8-10s4 10 8 10"></path><circle cx="12" cy="8" r="1.6"></circle></svg>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="M4 15l4-4 4 4 3-3 5 5"></path></svg>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"></rect><path d="M3 8l9 6 9-6"></path></svg>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8"></circle><path d="M12 4a8 8 0 0 1 8 8"></path><circle cx="12" cy="12" r="2.5" fill="#ECEEF2" stroke="none"></circle></svg>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ECEEF2" stroke-width="1.6" stroke-linecap="round"><path d="M4 12a8 8 0 1 1 3 6.2"></path><path d="M4 18v-6h6"></path></svg>
    </div>
    <div class="mono" style="font-size: 9px; color: #6F7785; letter-spacing: 0.06em;">HORIZON · COMPLETE · PATH · SCENE · LETTER · SEAL · RETURN</div>
  </div>
""")
(OUT/"Brand.dc.html").write_text(doc(brand), encoding="utf-8")

# ---------------------------------------------------------------- Paywall
paywall = root(sky(380, DAWN, sun_x=195, sun_size=72, sun_lift=84) + f"""
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; align-items: center; color: #101318; {R(0.1)}">
    <div class="eyebrow" style="opacity: 0.8;">Your Blueprint is ready</div>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
  </div>
  <div class="serif" style="position: absolute; left: 22px; right: 22px; top: 88px; color: #101318; font-style: italic; font-weight: 300; font-size: 30px; line-height: 35px; font-variation-settings: 'opsz' 60; text-wrap: balance; text-align: center; {R(0.4)}">I am becoming someone who keeps the small promise on the ordinary day.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 372px; display: flex; flex-direction: column;">
    """ + "".join(f'<div style="display: flex; gap: 12px; align-items: center; height: 42px; {"border-bottom: 1px solid rgba(255,255,255,0.10);" if i<2 else ""} font-size: 15px; font-weight: 500; color: #DDE3EA; {R(0.7 + i*0.1)}"><span style="color: {SOL};">—</span> {t}</div>' for i,t in enumerate(["Unlimited goals and Replans","Vision Scenes, letters, wallpapers","The coach every morning and evening"])) + f"""
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
    <div style="height: 44px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #A9B1BE; {R(1.4)}">Not now</div>
    <div class="mono" style="text-align: center; font-size: 10.5px; line-height: 16px; color: #6F7785; {R(1.5)}">RENEWS AUTOMATICALLY · CANCEL ANY TIME · RESTORE PURCHASES</div>
  </div>
""")
(OUT/"Paywall.dc.html").write_text(doc(paywall), encoding="utf-8")

print("generated:", sorted(p.name for p in OUT.glob("*.dc.html")))
