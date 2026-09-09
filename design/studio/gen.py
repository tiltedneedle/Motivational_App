# Morrow — "Studio" direction. A softly lit studio, dimensional objects (every goal is a stone), tactile depth, one geometric typeface, springy motion.
import pathlib, random

OUT = pathlib.Path(__file__).parent
INK = "#17181C"; INK2 = "#6B6E76"; INK3 = "#A3A6AD"; HAIR = "rgba(23,24,28,0.08)"; HAIR2 = "rgba(23,24,28,0.16)"
WHITE = "#FFFFFF"
STUDIO = "radial-gradient(120% 90% at 18% 0%, #F8F7F4 0%, #EEEDEA 46%, #E4E3DF 100%)"
NIGHT = "radial-gradient(120% 90% at 18% 0%, #23252C 0%, #17181C 50%, #0E0F12 100%)"
# stones: (highlight, light, mid, deep, glow)
CORAL  = ("#FFDCCF", "#FF8A66", "#EA4B2E", "#7A1D10", "rgba(234,75,46,0.45)")
TEAL   = ("#D6FAF4", "#4FDCCB", "#169A89", "#0A4A42", "rgba(22,154,137,0.42)")
VIOLET = ("#EAE3FF", "#A98FFF", "#6D4BE8", "#2E1F7A", "rgba(109,75,232,0.42)")
AMBER  = ("#FFF3D2", "#FFC85E", "#F09A12", "#7A4A05", "rgba(240,154,18,0.42)")
PEARL  = ("#FFFFFF", "#F3F1EC", "#CFCBC2", "#8E8A80", "rgba(120,116,108,0.35)")

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap">'

MOTION = """
    @keyframes up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pop { 0% { opacity: 0; transform: scale(0.6) translateY(10px); } 65% { opacity: 1; transform: scale(1.06) translateY(-2px); } 100% { transform: scale(1) translateY(0); } }
    @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes shadowbob { 0%, 100% { transform: scaleX(1); opacity: .9; } 50% { transform: scaleX(0.86); opacity: .6; } }
    @keyframes shine { 0% { transform: translateX(-160%) rotate(20deg); } 100% { transform: translateX(260%) rotate(20deg); } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes drawto { to { stroke-dashoffset: var(--end); } }
    @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    @keyframes kenburns { from { transform: scale(1.0); } to { transform: scale(1.07); } }
    @keyframes focus { from { filter: blur(10px); } to { filter: blur(3px); } }
    .up { animation: up .7s cubic-bezier(.2,.8,.2,1) both; }
    .pop { animation: pop .8s cubic-bezier(.2,.9,.25,1.15) both; }
    .bob { animation: bob 4.5s ease-in-out infinite; }
    .shadowbob { animation: shadowbob 4.5s ease-in-out infinite; }
    .pulse { animation: pulse 3.6s ease-in-out infinite; }
    .kb { animation: kenburns 30s ease-out both; }
    .draw { animation: draw 1.6s cubic-bezier(.4,.1,.2,1) .7s both; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } }
"""

def helmet():
    return f"""<helmet>
  {FONTS}
  <style>
    body {{ margin: 0; font-family: "Outfit", "Helvetica Neue", Arial, sans-serif; -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }}
    a {{ color: {INK}; }} a:hover {{ color: #EA4B2E; }}
    .label {{ font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }}
{MOTION}
  </style>
</helmet>"""

def doc(body):
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
</body>
</html>
"""

def U(d): return f'animation: up .7s cubic-bezier(.2,.8,.2,1) {d}s both;'
def P(d): return f'animation: pop .8s cubic-bezier(.2,.9,.25,1.15) {d}s both;'

def root(inner, bg=STUDIO, color=INK):
    return f'<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: {bg}; color: {color};">{inner}</div>'

def stone(size, c, delay=0.3, bob=False, blur=0, extra=""):
    h, l, m, d, g = c
    inset = max(4, size // 8)
    b = f"filter: blur({blur}px);" if blur else ""
    return f"""<div style="position: relative; width: {size}px; height: {size}px; {P(delay)} {extra}">
      <div class="{'bob' if bob else ''}" style="position: absolute; inset: 0;">
        <div style="position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 32% 26%, {h} 0%, {l} 24%, {m} 60%, {d} 100%); box-shadow: inset -{inset}px -{inset+2}px {inset*2}px rgba(0,0,0,0.38), inset {inset//2}px {inset//2}px {inset}px rgba(255,255,255,0.35), 0 {size//5}px {size//2}px -{size//8}px {g}; {b}">
          <div style="position: absolute; left: 20%; top: 12%; width: 30%; height: 18%; border-radius: 50%; background: rgba(255,255,255,0.7); filter: blur({max(2, size//24)}px); transform: rotate(-18deg);"></div>
          <div style="position: absolute; top: -20%; bottom: -20%; left: 0; width: 34%; background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%); animation: shine 5.5s ease-in-out {delay+1.2:.1f}s infinite;"></div>
        </div>
      </div>
    </div>"""

def floor_shadow(width, top_offset, opacity=0.28, bob=False):
    return f'<div class="{"shadowbob" if bob else ""}" style="position: absolute; left: 50%; top: {top_offset}px; width: {width}px; height: {max(10, width//5)}px; margin-left: -{width//2}px; border-radius: 50%; background: radial-gradient(closest-side, rgba(23,24,28,{opacity}), rgba(23,24,28,0)); filter: blur(6px);"></div>'

def card(inner, style="", delay=0.4):
    return f'<div style="background: {WHITE}; border-radius: 28px; box-shadow: 0 1px 2px rgba(23,24,28,0.04), 0 18px 40px -18px rgba(23,24,28,0.22); {style} {U(delay)}">{inner}</div>'

def button(label, delay=0.8, bg=INK, fg=WHITE, edge="#000000", shadow_glow="rgba(23,24,28,0.30)"):
    return f'<div style="height: 60px; border-radius: 999px; background: {bg}; color: {fg}; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; box-shadow: 0 5px 0 {edge}, 0 22px 34px -12px {shadow_glow}, inset 0 1px 0 rgba(255,255,255,0.18); {U(delay)}">{label}</div>'

def check_button(size=60, delay=0.9):
    return f'<div style="width: {size}px; height: {size}px; border-radius: 50%; background: {INK}; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 0 #000, 0 18px 30px -10px rgba(23,24,28,0.4), inset 0 1px 0 rgba(255,255,255,0.18); {P(delay)}"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="{WHITE}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></div>'

def topbar(left, right, color=INK, delay=0.05):
    return f'<div style="position: absolute; left: 22px; right: 22px; top: 20px; display: flex; justify-content: space-between; align-items: center; color: {color}; {U(delay)}"><div class="label" style="opacity: 0.6;">{left}</div><div class="label" style="opacity: 0.6;">{right}</div></div>'

def tabbar(active, dark=False):
    bg = "rgba(255,255,255,0.92)" if not dark else "rgba(35,37,44,0.92)"
    fg = INK if not dark else WHITE
    def ic(name, on):
        paths = {
            "today": '<circle cx="12" cy="12" r="4.2"></circle><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"></path>',
            "goals": '<circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="3.2"></circle>',
            "envision": '<rect x="3.5" y="5" width="17" height="14" rx="3.5"></rect><path d="M3.5 15.5l4.5-4.5 4 4 3-3 5.5 5.5"></path>',
            "coach": '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"></path>',
        }[name]
        col = fg if on else (INK3 if not dark else "rgba(255,255,255,0.45)")
        dot = f'<div style="width: 5px; height: 5px; border-radius: 50%; background: #EA4B2E;"></div>' if on else '<div style="width: 5px; height: 5px;"></div>'
        return f'<div style="display: flex; flex-direction: column; align-items: center; gap: 5px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{paths}</svg>{dot}</div>'
    return f"""
  <div style="position: absolute; left: 18px; right: 18px; bottom: 22px; display: flex; gap: 10px; align-items: center; {U(0.95)}">
    <div style="flex: 1 1 auto; height: 64px; border-radius: 32px; background: {bg}; backdrop-filter: blur(20px); box-shadow: 0 1px 2px rgba(23,24,28,0.05), 0 18px 40px -16px rgba(23,24,28,0.30); display: flex; justify-content: space-around; align-items: center; padding: 0 12px;">
      {ic('today', active=='today')}{ic('goals', active=='goals')}{ic('envision', active=='envision')}{ic('coach', active=='coach')}
    </div>
    <div style="width: 64px; height: 64px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FF9A78 0%, #EA4B2E 60%, #B92E14 100%); box-shadow: 0 5px 0 #8E2411, 0 22px 34px -12px rgba(234,75,46,0.55), inset 0 1px 0 rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; flex: 0 0 auto;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{WHITE}" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
    </div>
  </div>"""

def pips(n, filled, color, delay=0.5, size=10, gap=6):
    return f'<div style="display: flex; gap: {gap}px; {U(delay)}">' + "".join(f'<div style="width: {size}px; height: {size}px; border-radius: 50%; background: {color if i < filled else "rgba(23,24,28,0.10)"}; {"box-shadow: 0 2px 6px " + color + "66;" if i < filled else ""}"></div>' for i in range(n)) + '</div>'

def ring(size, pct, color, stroke=6, delay=0.7, track="rgba(23,24,28,0.08)"):
    r = (size - stroke) / 2; circ = 2 * 3.14159 * r
    return f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" style="position: absolute; inset: 0; transform: rotate(-90deg);"><circle cx="{size/2}" cy="{size/2}" r="{r}" stroke="{track}" stroke-width="{stroke}" fill="none"></circle><circle cx="{size/2}" cy="{size/2}" r="{r}" stroke="{color}" stroke-width="{stroke}" stroke-linecap="round" fill="none" style="stroke-dasharray: {circ:.1f}; stroke-dashoffset: {circ:.1f}; --end: {circ*(1-pct):.1f}; animation: drawto 1.6s cubic-bezier(.4,.1,.2,1) {delay}s both;"></circle></svg>'

# ---------------------------------------------------------------- Welcome
welcome = root(f"""
  {topbar("Morrow", "2026")}
  <div style="position: absolute; left: 50%; top: 120px; margin-left: -110px;">{stone(220, CORAL, 0.2, bob=True)}</div>
  {floor_shadow(200, 372, 0.30, bob=True)}
  <div style="position: absolute; left: 0; right: 0; top: 430px; text-align: center; font-size: 56px; line-height: 60px; font-weight: 700; letter-spacing: -0.035em; {U(0.5)}">Morrow</div>
  <div style="position: absolute; left: 40px; right: 40px; top: 500px; text-align: center; font-size: 21px; line-height: 28px; font-weight: 400; color: {INK2}; {U(0.65)}">Meet who you're becoming. A coach that asks, plans and remembers.</div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 56px; display: flex; flex-direction: column; gap: 14px;">
    {button("Begin the interview", 0.9)}
    <div style="text-align: center; font-size: 15px; color: {INK2}; {U(1.0)}">I already have an account</div>
  </div>
  <div class="label" style="position: absolute; left: 0; right: 0; bottom: 24px; text-align: center; color: {INK3}; font-size: 10.5px; {U(1.1)}">Five minutes · no sign‑up yet</div>
""")
(OUT/"Welcome.dc.html").write_text(doc(welcome), encoding="utf-8")

# ---------------------------------------------------------------- Today
def goal_chip(c, name, pct, delay):
    return f'<div style="display: flex; flex-direction: column; align-items: center; gap: 8px; {U(delay)}"><div style="position: relative; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center;">{ring(68, pct, c[2], 4, delay+0.3)}{stone(46, c, delay+0.1)}</div><div style="font-size: 12px; font-weight: 500; color: {INK2};">{name}</div></div>'
today = root(f"""
  {topbar("Tue 8 Sept", "Day 251")}
  <div style="position: absolute; left: 22px; right: 22px; top: 54px; font-size: 34px; line-height: 38px; font-weight: 700; letter-spacing: -0.03em; {U(0.15)}">Good morning, Maya.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 98px; font-size: 17px; line-height: 23px; color: {INK2}; {U(0.25)}">The ten‑minute version counts today.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 150px; display: flex; justify-content: space-between;">
    {goal_chip(CORAL, "Half marathon", 0.34, 0.35)}{goal_chip(TEAL, "Emergency fund", 0.62, 0.42)}{goal_chip(VIOLET, "The pitch", 0.18, 0.49)}{goal_chip(AMBER, "Sleep by 11", 0.80, 0.56)}
  </div>
  <div style="position: absolute; left: 18px; right: 18px; top: 272px;">
    {card(f'''<div style="padding: 20px 20px 20px 22px; display: flex; align-items: center; gap: 16px;">
      <div style="flex: 1 1 auto; display: flex; flex-direction: column; gap: 6px;">
        <div class="label" style="color: #EA4B2E;">Now · Half marathon</div>
        <div style="font-size: 28px; line-height: 32px; font-weight: 600; letter-spacing: -0.025em;">Ten‑minute run</div>
        <div style="font-size: 14px; line-height: 19px; color: {INK2};">If it's raining: the stairwell, same ten minutes.</div>
      </div>
      {check_button(62, 0.95)}
    </div>''', delay=0.6)}
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 436px; display: flex; flex-direction: column;">
    <div class="label" style="color: {INK3}; padding-bottom: 6px; {U(0.8)}">Later today</div>
""" + "".join(f'<div style="display: flex; align-items: center; gap: 14px; height: 50px; border-top: 1px solid {HAIR2}; {U(0.9 + i*0.08)}"><div style="width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, {c[1]}, {c[2]} 60%, {c[3]}); box-shadow: 0 2px 4px {c[4]};"></div><div style="flex: 1 1 auto; font-size: 17px; font-weight: 500; {"text-decoration: line-through; color: " + INK3 + ";" if done else ""}">{t}</div><div style="font-size: 13px; color: {INK3}; font-weight: 500;">{m}</div></div>' for i,(c,t,m,done) in enumerate([(VIOLET,"Write 300 words of the pitch","45 min",False),(TEAL,"Move £50 to savings","2 min",False),(AMBER,"Lights out by 11","",False),(CORAL,"Call Dad","done",True)])) + f"""
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 678px; display: flex; align-items: center; justify-content: space-between; {U(1.3)}">
    <div style="display: flex; flex-direction: column;"><div class="label" style="color: {INK3};">Consistency</div><div style="font-size: 40px; line-height: 40px; font-weight: 700; letter-spacing: -0.03em;">71 <span style="font-size: 14px; color: #1E9E5A; font-weight: 600; letter-spacing: 0;">+7</span></div></div>
    <div style="width: 150px; height: 10px; border-radius: 5px; background: rgba(23,24,28,0.08); overflow: hidden;"><div style="width: 71%; height: 100%; border-radius: 5px; background: linear-gradient(90deg, #FF8A66, #EA4B2E); transform-origin: left; animation: grow 1.2s cubic-bezier(.3,.1,.2,1) 1.4s both;"></div></div>
  </div>
""" + tabbar('today'))
# Main.dc.html is hand-built (interactive stone control); not written by the generator

# ---------------------------------------------------------------- Interview (a stone coming into focus)
interview = root(f"""
  {topbar("The interview", "Question 5")}
  <div style="position: absolute; left: 50%; top: 66px; margin-left: -70px; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center;">
    {ring(140, 0.64, "#EA4B2E", 5, 0.6)}
    {stone(96, CORAL, 0.2, blur=3)}
  </div>
  <div style="position: absolute; left: 0; right: 0; top: 214px; text-align: center; {U(0.5)}"><span style="font-size: 30px; font-weight: 700; letter-spacing: -0.03em;">64%</span> <span class="label" style="color: {INK3}; margin-left: 6px;">clarity</span></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 262px; display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 16px; border-radius: 20px; background: rgba(255,255,255,0.7); box-shadow: 0 10px 30px -14px rgba(23,24,28,0.2); {U(0.6)}">
    <div style="flex: 1 1 auto; font-size: 15px; line-height: 20px; color: {INK2};">Something about mornings, energy, and not being tired anymore…</div>
    <div style="font-size: 13px; font-weight: 600; padding: 9px 13px; border-radius: 999px; background: {INK}; color: {WHITE}; white-space: nowrap; box-shadow: 0 3px 0 #000;">Yes, that</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 350px; font-size: 32px; line-height: 37px; font-weight: 700; letter-spacing: -0.03em; text-wrap: balance; {U(0.75)}">When you imagine it working, what is different first?</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 480px; display: flex; flex-direction: column; gap: 10px;">
""" + "".join(f'<div style="display: flex; align-items: center; gap: 14px; height: 56px; padding: 0 18px; border-radius: 999px; background: {WHITE}; box-shadow: 0 1px 2px rgba(23,24,28,0.04), 0 10px 24px -14px rgba(23,24,28,0.25); {U(0.9 + i*0.08)}"><div style="width: 26px; height: 26px; border-radius: 50%; background: rgba(23,24,28,0.06); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: {INK2};">{l}</div><div style="font-size: 17px; font-weight: 500;">{t}</div></div>' for i,(l,t) in enumerate([("A","How my mornings feel"),("B","What my body can do"),("C","The number in my account"),("D","Who I spend evenings with")])) + f"""
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 30px; display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 8px 0 20px; border-radius: 999px; background: {INK}; color: {WHITE}; box-shadow: 0 5px 0 #000, 0 18px 30px -12px rgba(23,24,28,0.4); {U(1.3)}">
    <div style="flex: 1 1 auto; font-size: 15px; opacity: 0.85;">Or hold and say it your way</div>
    <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{WHITE}" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="4" width="6" height="11" rx="3"></rect><path d="M6 11a6 6 0 0 0 12 0M12 17v3"></path></svg></div>
  </div>
""")
# Interview.dc.html is hand-built (interactive question flow); not written by the generator

# ---------------------------------------------------------------- Portrait
portrait = root(f"""
  {topbar("Your goal portrait", "Health")}
  <div style="position: absolute; left: 50%; top: 70px; margin-left: -80px;">{stone(160, CORAL, 0.2, bob=True)}</div>
  {floor_shadow(150, 254, 0.28, bob=True)}
  <div style="position: absolute; left: 22px; right: 22px; top: 300px; text-align: center; font-size: 32px; line-height: 37px; font-weight: 700; letter-spacing: -0.03em; text-wrap: balance; {U(0.5)}">Run the Lahore half marathon in March, and feel at home in my body again.</div>
  <div style="position: absolute; left: 30px; right: 30px; top: 462px; text-align: center; font-size: 17px; line-height: 24px; color: {INK2}; {U(0.65)}">“I'm tired of being the person who cancels.” <span style="color: {INK3};">— you, Tuesday</span></div>
  <div style="position: absolute; left: 18px; right: 18px; top: 540px;">
    {card(f'''<div style="padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; flex-direction: column; gap: 4px;"><div class="label" style="color: #EA4B2E;">Becoming</div><div style="font-size: 18px; line-height: 24px; font-weight: 600; letter-spacing: -0.015em;">Someone who keeps the small promise on the ordinary day.</div></div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid {HAIR};"><div style="display: flex; flex-direction: column; gap: 2px;"><div class="label" style="color: {INK3};">First move · Wed 9</div><div style="font-size: 16px; font-weight: 500;">Walk‑run ten minutes after coffee</div></div><div style="font-size: 12px; color: {INK3}; font-weight: 600; white-space: nowrap;">+2 this week</div></div>
    </div>''', delay=0.8)}
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 30px; display: flex; flex-direction: column; gap: 8px;">
    {button("Make this my Blueprint", 1.0)}
    <div style="height: 40px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: {INK2}; {U(1.1)}">Not quite, change a line</div>
  </div>
""")
(OUT/"Portrait.dc.html").write_text(doc(portrait), encoding="utf-8")

# ---------------------------------------------------------------- Blueprint
def move(text, meta, delay, done=False):
    socket = 'position: relative; width: 34px; height: 34px; flex: 0 0 auto; border-radius: 50%; background: radial-gradient(circle at 50% 42%, rgba(23,24,28,0.16) 0%, rgba(23,24,28,0.07) 55%, rgba(23,24,28,0) 72%); box-shadow: inset 0 3px 6px rgba(23,24,28,0.16), inset 0 -2px 3px rgba(255,255,255,0.7);'
    inner = ('transform: translateY(0); box-shadow: 0 2px 4px rgba(23,24,28,0.28); filter: saturate(1.05);' if done else 'transform: translateY(-7px); box-shadow: 0 10px 12px -3px rgba(23,24,28,0.38); filter: saturate(0.55) brightness(0.96);')
    glint = ('<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></div>' if done else '')
    box = (f'<div style="{socket}"><div style="position: absolute; left: 6px; top: 6px; width: 22px; height: 22px; border-radius: 50%; {inner}"><div style="position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 32% 26%, {CORAL[0]} 0%, {CORAL[1]} 24%, {CORAL[2]} 60%, {CORAL[3]} 100%); box-shadow: inset -4px -6px 10px rgba(0,0,0,0.38), inset 2px 2px 5px rgba(255,255,255,0.35);"></div>{glint}</div></div>')
    return f'<div style="display: flex; align-items: center; gap: 12px; min-height: 46px; {U(delay)}">{box}<div style="flex: 1 1 auto; font-size: 15.5px; font-weight: 500; {"text-decoration: line-through; color: " + INK3 + ";" if done else ""}">{text}</div><div style="font-size: 12px; color: {INK3}; font-weight: 600; white-space: nowrap;">{meta}</div></div>'
blueprint = root(f"""
  {topbar("Blueprint · v1", "12 weeks")}
  <div style="position: absolute; left: 22px; top: 52px; display: flex; align-items: center; gap: 14px; {U(0.15)}">{stone(52, CORAL, 0.2)}<div style="display: flex; flex-direction: column;"><div style="font-size: 28px; line-height: 32px; font-weight: 700; letter-spacing: -0.03em;">Lahore half marathon</div><div style="font-size: 14px; color: {INK2};">Race day · March 2027</div></div></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 126px; display: flex; justify-content: space-between; align-items: center;">{pips(12, 1, "#EA4B2E", 0.35, 12, 8)}<div class="label" style="color: {INK3}; {U(0.4)}">Week 1</div></div>
  <div style="position: absolute; left: 18px; right: 18px; top: 166px; display: flex; flex-direction: column; gap: 12px;">
    {card(f'''<div style="padding: 18px 20px 12px;">
      <div style="display: flex; align-items: center; gap: 12px;"><div style="width: 34px; height: 34px; border-radius: 50%; background: {INK}; color: {WHITE}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">1</div><div style="display: flex; flex-direction: column;"><div style="font-size: 19px; font-weight: 600; letter-spacing: -0.015em;">Run 5 km without stopping</div><div style="font-size: 13px; color: {INK2};">By 4 Oct · 26 days · proof: a 5 km run, any pace</div></div></div>
      <div style="margin-top: 10px; display: flex; flex-direction: column; border-top: 1px solid {HAIR}; padding-top: 4px;">
        {move("Walk‑run 10 min after coffee", "Wed 9", 0.7, done=True)}
        {move("Book the physio for the knee", "Thu 10", 0.78)}
        {move("Three 15‑min walk‑runs", "Wk 1", 0.86)}
        {move("Evening stretch · 2‑min ok", "Daily", 0.94)}
      </div>
    </div>''', delay=0.5)}
    <div style="display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-radius: 22px; background: rgba(255,255,255,0.55); {U(1.05)}"><div style="width: 34px; height: 34px; border-radius: 50%; border: 1.6px solid rgba(23,24,28,0.25); box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: {INK2};">2</div><div style="display: flex; flex-direction: column;"><div style="font-size: 17px; font-weight: 600;">Run 10 km on a Sunday</div><div style="font-size: 13px; color: {INK3};">By 8 Nov</div></div></div>
    <div style="display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-radius: 22px; background: rgba(255,255,255,0.35); {U(1.15)}"><div style="width: 34px; height: 34px; border-radius: 50%; border: 1.6px solid rgba(23,24,28,0.18); box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: {INK3};">3</div><div style="display: flex; flex-direction: column;"><div style="font-size: 17px; font-weight: 600; color: {INK2};">Race day, 21.1 km</div><div style="font-size: 13px; color: {INK3};">March</div></div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 30px;">{button("Start with the first move", 1.25)}</div>
""")
(OUT/"Blueprint.dc.html").write_text(doc(blueprint), encoding="utf-8")

# ---------------------------------------------------------------- Goal (photo as a print)
goal = root(f"""
  {topbar("← Goal · Health", "179 days")}
  <div style="position: absolute; left: 22px; right: 22px; top: 56px; height: 300px; border-radius: 30px; overflow: hidden; box-shadow: 0 24px 50px -20px rgba(23,24,28,0.45), 0 2px 4px rgba(23,24,28,0.06); transform: rotate(-1.5deg); {U(0.15)}">
    <img class="kb" src="scene-runner.jpeg" alt="" style="width: 100%; height: 100%; object-fit: cover; object-position: 50% 45%; display: block; transform-origin: 50% 40%;">
  </div>
  <div style="position: absolute; left: 292px; top: 306px;">{stone(78, CORAL, 0.6)}</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 384px; display: flex; flex-direction: column; gap: 6px; {U(0.5)}">
    <div style="font-size: 34px; line-height: 38px; font-weight: 700; letter-spacing: -0.03em;">Lahore half marathon</div>
    <div style="font-size: 16px; line-height: 22px; color: {INK2};">…and feel at home in my body again.</div>
  </div>
  <div style="position: absolute; left: 18px; right: 18px; top: 478px;">
    {card(f'''<div style="padding: 16px 20px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;">
      <div style="display: flex; flex-direction: column; gap: 2px;"><div style="font-size: 28px; font-weight: 700; letter-spacing: -0.03em;">3.2<span style="font-size: 13px; color: {INK3}; font-weight: 600;"> km</span></div><div class="label" style="color: {INK3}; font-size: 10.5px;">Longest run</div></div>
      <div style="display: flex; flex-direction: column; gap: 2px; border-left: 1px solid {HAIR}; padding-left: 12px;"><div style="font-size: 28px; font-weight: 700; letter-spacing: -0.03em; color: #EA4B2E;">26<span style="font-size: 13px; color: {INK3}; font-weight: 600;"> days</span></div><div class="label" style="color: {INK3}; font-size: 10.5px;">To milestone 1</div></div>
      <div style="display: flex; flex-direction: column; gap: 2px; border-left: 1px solid {HAIR}; padding-left: 12px;"><div style="font-size: 28px; font-weight: 700; letter-spacing: -0.03em;">14</div><div class="label" style="color: {INK3}; font-size: 10.5px;">Evidence</div></div>
    </div>''', delay=0.7)}
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 578px; display: flex; flex-direction: column; gap: 10px; {U(0.85)}">
    <div style="display: flex; justify-content: space-between;"><div class="label" style="color: {INK3};">The path</div><div class="label" style="color: #EA4B2E;">You are here</div></div>
    <div style="position: relative; height: 22px;">
      <div style="position: absolute; left: 0; right: 0; top: 10px; height: 3px; border-radius: 2px; background: rgba(23,24,28,0.10);"></div>
      <div style="position: absolute; left: 0; width: 24%; top: 10px; height: 3px; border-radius: 2px; background: #EA4B2E; transform-origin: left; animation: grow 1.1s cubic-bezier(.3,.1,.2,1) 1s both;"></div>
      <div style="position: absolute; left: 24%; top: 0; margin-left: -11px;">{stone(22, CORAL, 1.6)}</div>
      <div style="position: absolute; left: 46%; top: 6px; width: 11px; height: 11px; margin-left: -5px; border-radius: 50%; background: {WHITE}; border: 2px solid {INK}; box-sizing: border-box;"></div>
      <div style="position: absolute; left: 84%; top: 6px; width: 11px; height: 11px; margin-left: -5px; border-radius: 50%; background: {WHITE}; border: 2px solid {INK}; box-sizing: border-box;"></div>
      <div style="position: absolute; right: 0; top: 6px; width: 11px; height: 11px; border-radius: 50%; background: {INK};"></div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 0; top: 650px; display: flex; flex-direction: column; gap: 10px; {U(1.0)}">
    <div class="label" style="color: {INK3};">Anchors</div>
    <div style="display: flex; gap: 10px; height: 80px; align-items: stretch;">
      <div style="width: 80px; border-radius: 16px; overflow: hidden; flex: 0 0 auto; box-shadow: 0 8px 18px -8px rgba(23,24,28,0.4); transform: rotate(2deg);"><img src="scene-kitchen.jpeg" alt="" style="width: 80px; height: 80px; object-fit: cover; display: block;"></div>
      <div style="width: 150px; border-radius: 16px; flex: 0 0 auto; padding: 10px 12px; box-sizing: border-box; background: {WHITE}; box-shadow: 0 8px 18px -10px rgba(23,24,28,0.3); display: flex; align-items: flex-end;"><div style="font-size: 14px; line-height: 18px; font-weight: 500; color: {INK2};">“Slow is smooth, smooth is fast.”</div></div>
      <div style="width: 80px; border-radius: 16px; overflow: hidden; flex: 0 0 auto; box-shadow: 0 8px 18px -8px rgba(23,24,28,0.4); transform: rotate(-2deg);"><img src="scene-runner.jpeg" alt="" style="width: 80px; height: 80px; object-fit: cover; object-position: 60% 60%; display: block;"></div>
      <div style="width: 48px; border-radius: 16px; flex: 0 0 auto; border: 1.6px dashed rgba(23,24,28,0.2); display: flex; align-items: center; justify-content: center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{INK3}" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg></div>
    </div>
  </div>
""" + tabbar('goals'))
(OUT/"Goal.dc.html").write_text(doc(goal), encoding="utf-8")

# ---------------------------------------------------------------- Envision
envision = root(f"""
  {topbar("The practice · Scene 1 of 3", "Generated")}
  <div style="position: absolute; left: 18px; right: 18px; top: 54px; height: 460px; border-radius: 34px; overflow: hidden; box-shadow: 0 30px 60px -22px rgba(23,24,28,0.5), 0 2px 4px rgba(23,24,28,0.06); {U(0.15)}">
    <img class="kb" src="scene-kitchen.jpeg" alt="" style="width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; display: block; transform-origin: 50% 35%;">
    <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(23,24,28,0) 55%, rgba(23,24,28,0.55) 100%);"></div>
    <div style="position: absolute; left: 18px; right: 18px; bottom: 16px; display: flex; gap: 6px;">""" + "".join(f'<div style="height: 4px; flex: 1 1 0; border-radius: 2px; background: {"#FFFFFF" if i==0 else "rgba(255,255,255,0.4)"};"></div>' for i in range(3)) + f"""</div>
  </div>
  <div style="position: absolute; left: 306px; top: 470px;">{stone(64, CORAL, 0.7)}</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 538px; font-size: 22px; line-height: 29px; font-weight: 500; letter-spacing: -0.015em; text-wrap: pretty; {U(0.5)}">It's 6:40 and the kitchen is still blue. You lace the left shoe first, like always. Ten minutes, you tell yourself, and the door is already open.</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 664px; font-size: 13px; color: {INK3}; font-weight: 500; {U(0.7)}">From your words: “the kitchen at 6:40, before anyone's up”</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 700px; display: flex; gap: 8px; {U(0.85)}">""" + "".join(f'<div style="font-size: 13px; font-weight: 600; padding: 9px 14px; border-radius: 999px; background: {WHITE}; box-shadow: 0 6px 16px -10px rgba(23,24,28,0.3);">{t}</div>' for t in ["Warmer","Simpler","Closer to home"]) + f"""<div style="flex: 1 1 auto;"></div><div style="font-size: 13px; font-weight: 600; padding: 9px 14px; border-radius: 999px; background: {INK}; color: {WHITE}; box-shadow: 0 3px 0 #000;">Wallpaper</div></div>
""" + tabbar('envision'))
(OUT/"Envision.dc.html").write_text(doc(envision), encoding="utf-8")

# ---------------------------------------------------------------- Coach (pearl)
def brief(label, text, delay, last=False):
    return f'<div style="display: flex; gap: 14px; padding: 12px 0; {"" if last else "border-bottom: 1px solid " + HAIR + ";"} {U(delay)}"><div class="label" style="width: 76px; flex: 0 0 auto; color: #EA4B2E; padding-top: 3px; font-size: 11px;">{label}</div><div style="font-size: 15px; line-height: 21px; font-weight: 400; color: {INK};">{text}</div></div>'
coach = root(f"""
  {topbar("Dawn brief · Tue 8 Sept", "06:30")}
  <div style="position: absolute; left: 22px; top: 56px; display: flex; align-items: center; gap: 14px; {U(0.15)}"><div class="pulse">{stone(56, PEARL, 0.2)}</div><div style="display: flex; flex-direction: column;"><div style="font-size: 15px; font-weight: 600;">Your coach</div><div style="font-size: 13px; color: {INK3};">Remembers 251 days</div></div></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 132px; font-size: 30px; line-height: 35px; font-weight: 700; letter-spacing: -0.03em; text-wrap: balance; {U(0.35)}">You ran on the day you were sick. That's the one I'll remember.</div>
  <div style="position: absolute; left: 18px; right: 18px; top: 250px;">
    {card(f'''<div style="padding: 8px 20px;">
      {brief("Yesterday", 'Two of three moves, plus the two‑minute stretch at 11 pm. Sealed at 71, up from 64. The physio is booked for Thursday.', 0.6)}
      {brief("Today", "Start with the ten‑minute run, before the pitch. The pitch will eat the morning if you let it, and the run makes it better.", 0.72)}
      {brief("If", "If it's raining at 7, then the stairwell, ten floors, twice. Same shoes, same ten minutes.", 0.84, last=True)}
    </div>''', delay=0.5)}
  </div>
  <div style="position: absolute; left: 22px; top: 552px; display: flex; align-items: center; gap: 8px; padding: 8px 14px 8px 10px; border-radius: 999px; background: rgba(30,158,90,0.10); color: #1E9E5A; {P(1.1)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg><div style="font-size: 13px; font-weight: 600;">Run set as your first move</div></div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 172px; display: flex; gap: 8px; flex-wrap: wrap; {U(1.2)}">""" + "".join(f'<div style="font-size: 13px; font-weight: 600; padding: 9px 14px; border-radius: 999px; background: {WHITE}; box-shadow: 0 6px 16px -10px rgba(23,24,28,0.3);">{t}</div>' for t in ["I'm stuck","I don't feel like it","Something changed","Celebrate with me"]) + f"""</div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 104px; display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 8px 0 20px; border-radius: 999px; background: {WHITE}; box-shadow: 0 1px 2px rgba(23,24,28,0.05), 0 14px 30px -14px rgba(23,24,28,0.3); {U(1.3)}"><div style="flex: 1 1 auto; font-size: 16px; color: {INK3};">Talk to the coach</div><div style="width: 42px; height: 42px; border-radius: 50%; background: {INK}; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 0 #000;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{WHITE}" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="4" width="6" height="11" rx="3"></rect><path d="M6 11a6 6 0 0 0 12 0M12 17v3"></path></svg></div></div>
""" + tabbar('coach'))
(OUT/"Coach.dc.html").write_text(doc(coach), encoding="utf-8")

# ---------------------------------------------------------------- Review (ring + stone)
review = root(f"""
  {topbar("Horizon review · Week 36", "1 – 7 Sept")}
  <div style="position: absolute; left: 50%; top: 62px; margin-left: -100px; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center;">
    {ring(200, 0.71, "#EA4B2E", 8, 0.5)}
    <div style="display: flex; flex-direction: column; align-items: center; {U(0.4)}"><div style="font-size: 64px; line-height: 60px; font-weight: 700; letter-spacing: -0.045em;">71</div><div class="label" style="color: {INK3}; margin-top: 4px;">Consistency</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 282px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; {U(0.6)}">
    <div style="background: {WHITE}; border-radius: 20px; padding: 14px 16px; box-shadow: 0 12px 30px -16px rgba(23,24,28,0.25);"><div style="font-size: 26px; font-weight: 700; letter-spacing: -0.03em; color: #1E9E5A;">+7</div><div class="label" style="color: {INK3}; font-size: 10.5px;">This week</div></div>
    <div style="background: {WHITE}; border-radius: 20px; padding: 14px 16px; box-shadow: 0 12px 30px -16px rgba(23,24,28,0.25);"><div style="font-size: 26px; font-weight: 700; letter-spacing: -0.03em;">#4</div><div class="label" style="color: {INK3}; font-size: 10.5px;">Return</div></div>
    <div style="background: {WHITE}; border-radius: 20px; padding: 14px 16px; box-shadow: 0 12px 30px -16px rgba(23,24,28,0.25);"><div style="font-size: 26px; font-weight: 700; letter-spacing: -0.03em;">3<span style="font-size: 13px; color: {INK3};">/4</span></div><div class="label" style="color: {INK3}; font-size: 10.5px;">Runs</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 386px; display: flex; align-items: flex-end; gap: 4px; height: 70px; {U(0.75)}">""" + "".join(f'<div style="flex: 1 1 0; height: {int((v-40)/40*100)}%; border-radius: 3px; background: {"#EA4B2E" if i==27 else "rgba(23,24,28,0.16)"}; transform-origin: bottom; animation: pop .6s ease-out {0.8 + i*0.03:.2f}s both;"></div>' for i,v in enumerate([52,55,50,58,61,57,60,63,59,66,64,62,67,70,65,63,68,71,69,72,70,66,73,74,71,75,73,71])) + f"""</div>
  <div style="position: absolute; left: 22px; right: 22px; top: 462px; display: flex; justify-content: space-between; {U(0.85)}"><div class="label" style="color: {INK3}; font-size: 10.5px;">28 days ago</div><div class="label" style="color: #EA4B2E; font-size: 10.5px;">Today</div></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 494px; font-size: 20px; line-height: 27px; font-weight: 500; letter-spacing: -0.015em; {U(0.95)}">Three runs, all short, all real. The knee held. Next week the plan asks for one more, not two.</div>
  <div style="position: absolute; left: 18px; right: 18px; top: 596px;">
    {card(f'''<div style="padding: 6px 20px;">
      <div style="display: flex; align-items: center; gap: 12px; height: 48px; border-bottom: 1px solid {HAIR};"><div class="label" style="font-size: 10.5px; color: #1E9E5A; width: 42px;">Add</div><div style="flex: 1 1 auto; font-size: 15px; font-weight: 500;">Fourth walk‑run, Saturday</div></div>
      <div style="display: flex; align-items: center; gap: 12px; height: 48px;"><div class="label" style="font-size: 10.5px; color: {INK3}; width: 42px;">Move</div><div style="flex: 1 1 auto; font-size: 15px; font-weight: 500;">Physio to Tuesday morning</div></div>
    </div>''', delay=1.1)}
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 30px;">{button("Review the Replan", 1.25)}</div>
""")
(OUT/"Review.dc.html").write_text(doc(review), encoding="utf-8")

# ---------------------------------------------------------------- Seal (night studio)
seal = root(f"""
  {topbar("Seal the day · 22:14", "Day 251", color=WHITE)}
  <div style="position: absolute; left: 22px; right: 40px; top: 56px; color: {WHITE}; font-size: 34px; line-height: 38px; font-weight: 700; letter-spacing: -0.03em; text-wrap: balance; {U(0.2)}">Quiet day. The stretch still counted.</div>
  <div style="position: absolute; left: 50%; top: 170px; margin-left: -90px;">{stone(180, CORAL, 0.4, bob=True)}</div>
  <div style="position: absolute; left: 50%; top: 372px; width: 220px; height: 44px; margin-left: -110px; border-radius: 50%; background: radial-gradient(closest-side, rgba(234,75,46,0.45), rgba(234,75,46,0)); filter: blur(10px);"></div>
  <div style="position: absolute; left: 50%; top: 384px; width: 150px; height: 18px; margin-left: -75px; border-radius: 50%; background: rgba(0,0,0,0.55); filter: blur(6px);"></div>
  <div style="position: absolute; left: 22px; right: 22px; top: 430px; display: flex; flex-direction: column; gap: 14px; color: {WHITE};">
    <div style="display: flex; flex-direction: column; gap: 8px; {U(0.7)}"><div class="label" style="opacity: 0.55; font-size: 11px;">Today, in a word</div><div style="display: flex; gap: 8px;">""" + "".join(f'<div style="font-size: 14px; font-weight: 600; padding: 9px 14px; border-radius: 999px; background: {"#EA4B2E" if t=="Steady" else "rgba(255,255,255,0.08)"}; border: 1px solid {"#EA4B2E" if t=="Steady" else "rgba(255,255,255,0.14)"};">{t}</div>' for t in ["Calm","Tired","Proud","Steady"]) + f"""</div></div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.12); {U(0.85)}"><div class="label" style="opacity: 0.55; font-size: 11px;">One piece of proof</div><div style="font-size: 17px; line-height: 22px; font-weight: 500;">Two‑minute calves at 11 pm, on the bathroom floor.</div></div>
    <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.12); {U(1.0)}"><div class="label" style="opacity: 0.55; font-size: 11px;">One thing you're glad of</div><div style="font-size: 16px; line-height: 22px; opacity: 0.45;">Type, or hold to speak…</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 30px; display: flex; flex-direction: column; gap: 10px; align-items: center;">
    <div style="position: relative; width: 100%; height: 60px; {U(1.2)}">
      <div style="position: absolute; inset: 0; border-radius: 999px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);"></div>
      <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 72%; border-radius: 999px; background: linear-gradient(90deg, #FF8A66, #EA4B2E); transform-origin: left; animation: grow 3.2s cubic-bezier(.4,.05,.2,1) 1.6s both;"></div>
      <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: {WHITE}; font-size: 16px; font-weight: 600;">Hold to seal</div>
    </div>
  </div>
""", bg=NIGHT, color=WHITE)
# Seal.dc.html is hand-built (interactive seal); not written by the generator

# ---------------------------------------------------------------- Almanac (a shelf of stones)
random.seed(3)
cells = []
palette = [CORAL, TEAL, VIOLET, AMBER]
for d in range(1, 32):
    for m in range(12):
        past = (m < 8) or (m == 8 and d <= 8)
        delay = f"animation: pop .5s ease-out {0.3 + d*0.03:.2f}s both;"
        if (m in (1,3,5,8,10) and d == 31) or (m == 1 and d > 28):
            cells.append('<div></div>'); continue
        if not past:
            cells.append(f'<div style="width: 10px; height: 10px; border-radius: 50%; background: rgba(23,24,28,0.05); {delay}"></div>'); continue
        r = random.random()
        if m == 8 and d == 8:
            cells.append(f'<div style="width: 13px; height: 13px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FF8A66, #EA4B2E 60%, #7A1D10); box-shadow: 0 0 0 3px rgba(234,75,46,0.25), 0 3px 6px rgba(234,75,46,0.5); {delay}"></div>')
        elif r < 0.14:
            cells.append(f'<div style="width: 10px; height: 10px; border-radius: 50%; background: rgba(23,24,28,0.09); {delay}"></div>')
        else:
            c = random.choice(palette)
            cells.append(f'<div style="width: 11px; height: 11px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, {c[1]}, {c[2]} 60%, {c[3]}); box-shadow: 0 2px 4px {c[4]}; {delay}"></div>')
months = "".join(f'<div class="label" style="font-size: 9.5px; color: {INK3}; text-align: center;">{m}</div>' for m in ["J","F","M","A","M","J","J","A","S","O","N","D"])
almanac = root(f"""
  {topbar("Almanac · 2026", "251 / 365")}
  <div style="position: absolute; left: 22px; right: 22px; top: 52px; display: flex; align-items: flex-end; justify-content: space-between; {U(0.15)}">
    <div style="display: flex; flex-direction: column;"><div style="font-size: 72px; line-height: 66px; font-weight: 700; letter-spacing: -0.05em;">214</div><div class="label" style="color: {INK3};">Pieces of evidence</div></div>
    <div style="display: flex; gap: 18px; padding-bottom: 6px;">
      <div style="display: flex; flex-direction: column; align-items: flex-end;"><div style="font-size: 26px; font-weight: 700; letter-spacing: -0.03em; color: #EA4B2E;">4</div><div class="label" style="color: {INK3}; font-size: 10.5px;">Returns</div></div>
      <div style="display: flex; flex-direction: column; align-items: flex-end;"><div style="font-size: 26px; font-weight: 700; letter-spacing: -0.03em;">19</div><div class="label" style="color: {INK3}; font-size: 10.5px;">Best stretch</div></div>
    </div>
  </div>
  <div style="position: absolute; left: 18px; right: 18px; top: 170px;">
    {card(f'''<div style="padding: 16px 18px 18px;">
      <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; padding-bottom: 8px; border-bottom: 1px solid {HAIR};">{months}</div>
      <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 5.5px 6px; justify-items: center; align-items: center;">{''.join(cells)}</div>
    </div>''', delay=0.3)}
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 104px; display: flex; gap: 14px; flex-wrap: wrap; {U(1.4)}">
    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, {CORAL[1]}, {CORAL[2]} 60%, {CORAL[3]});"></div><div class="label" style="font-size: 10px; color: {INK3};">Health</div></div>
    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, {TEAL[1]}, {TEAL[2]} 60%, {TEAL[3]});"></div><div class="label" style="font-size: 10px; color: {INK3};">Money</div></div>
    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, {VIOLET[1]}, {VIOLET[2]} 60%, {VIOLET[3]});"></div><div class="label" style="font-size: 10px; color: {INK3};">Craft</div></div>
    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, {AMBER[1]}, {AMBER[2]} 60%, {AMBER[3]});"></div><div class="label" style="font-size: 10px; color: {INK3};">Mind</div></div>
    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; border-radius: 50%; background: rgba(23,24,28,0.09);"></div><div class="label" style="font-size: 10px; color: {INK3};">Quiet</div></div>
  </div>
""" + tabbar('goals'))
(OUT/"Almanac.dc.html").write_text(doc(almanac), encoding="utf-8")

# ---------------------------------------------------------------- Paywall
paywall = root(f"""
  {topbar("Your Blueprint is ready", "×")}
  <div style="position: absolute; left: 50%; top: 66px; margin-left: -96px; width: 192px; height: 150px;">
    <div style="position: absolute; left: 0; top: 30px;">{stone(96, TEAL, 0.3)}</div>
    <div style="position: absolute; left: 96px; top: 30px;">{stone(96, VIOLET, 0.4)}</div>
    <div style="position: absolute; left: 44px; top: -6px;">{stone(110, CORAL, 0.5, bob=True)}</div>
  </div>
  {floor_shadow(200, 208, 0.26)}
  <div style="position: absolute; left: 22px; right: 22px; top: 246px; text-align: center; font-size: 30px; line-height: 35px; font-weight: 700; letter-spacing: -0.03em; text-wrap: balance; {U(0.6)}">Every goal, every plan, every morning.</div>
  <div style="position: absolute; left: 30px; right: 30px; top: 336px; display: flex; flex-direction: column; gap: 10px; {U(0.75)}">""" + "".join(f'<div style="display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 500;"><div style="width: 22px; height: 22px; border-radius: 50%; background: rgba(30,158,90,0.12); display: flex; align-items: center; justify-content: center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1E9E5A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></div>{t}</div>' for t in ["Unlimited goals and Replans","Vision Scenes, letters, wallpapers","The coach every morning and evening"]) + f"""</div>
  <div style="position: absolute; left: 18px; right: 18px; top: 470px; display: flex; gap: 10px; {U(0.9)}">
    <div style="flex: 1.4 1 0; padding: 18px; border-radius: 24px; background: {INK}; color: {WHITE}; box-shadow: 0 5px 0 #000, 0 22px 40px -16px rgba(23,24,28,0.5); display: flex; flex-direction: column; gap: 2px;"><div class="label" style="color: rgba(255,255,255,0.6); font-size: 10.5px;">Yearly · 7 days free</div><div style="font-size: 36px; font-weight: 700; letter-spacing: -0.035em; margin-top: 6px;">$49.99</div><div style="font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 2px;">$4.17 a month</div></div>
    <div style="flex: 1 1 0; padding: 18px; border-radius: 24px; background: {WHITE}; box-shadow: 0 1px 2px rgba(23,24,28,0.04), 0 18px 40px -18px rgba(23,24,28,0.22); display: flex; flex-direction: column; gap: 2px;"><div class="label" style="color: {INK3}; font-size: 10.5px;">Monthly</div><div style="font-size: 36px; font-weight: 700; letter-spacing: -0.035em; margin-top: 6px;">$9.99</div><div style="font-size: 13px; color: {INK3}; margin-top: 2px;">no trial</div></div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; bottom: 30px; display: flex; flex-direction: column; gap: 8px;">
    {button("Start 7 days free", 1.1, bg="linear-gradient(180deg, #FF7A55, #EA4B2E)", edge="#9E2A14", shadow_glow="rgba(234,75,46,0.5)")}
    <div style="height: 40px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: {INK2}; {U(1.2)}">Not now</div>
    <div style="text-align: center; font-size: 11.5px; color: {INK3}; {U(1.25)}">Renews automatically · Cancel any time · Restore purchases</div>
  </div>
""")
(OUT/"Paywall.dc.html").write_text(doc(paywall), encoding="utf-8")

# ---------------------------------------------------------------- Brand sheet
brand = root(f"""
  {topbar("Morrow · Identity", "Studio")}
  <div class="pop" style="position: absolute; left: 22px; top: 60px; width: 124px; height: 124px; border-radius: 30px; background: {STUDIO}; box-shadow: 0 20px 40px -16px rgba(23,24,28,0.45), inset 0 1px 0 rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; animation-delay: .2s;">{stone(64, CORAL, 0.4)}</div>
  <div style="position: absolute; left: 164px; right: 16px; top: 74px; display: flex; flex-direction: column; gap: 4px; {U(0.4)}">
    <div style="font-size: 50px; line-height: 50px; font-weight: 700; letter-spacing: -0.04em;">Morrow</div>
    <div style="font-size: 15px; line-height: 20px; color: {INK2};">Meet who you're becoming.</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 214px; display: flex; flex-direction: column; gap: 12px; {U(0.6)}">
    <div class="label" style="color: {INK3};">Every goal is a stone</div>
    <div style="display: flex; justify-content: space-between; align-items: flex-end;">""" + "".join(f'<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">{stone(60, c, 0.6 + i*0.1)}<div style="font-size: 12px; font-weight: 600; color: {INK2};">{n}</div></div>' for i,(c,n) in enumerate([(CORAL,"Health"),(TEAL,"Money"),(VIOLET,"Craft"),(AMBER,"Mind"),(PEARL,"Coach")])) + f"""</div>
    <div style="font-size: 13px; line-height: 18px; color: {INK2};">A stone is dull when a goal starts and polished when it's kept. Its colour is the goal's domain; the pearl is the coach.</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 400px; display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid {HAIR2}; {U(0.8)}">
    <div class="label" style="color: {INK3};">Studio and ink</div>
    <div style="display: flex; gap: 8px;">
      <div style="flex: 1 1 0; height: 46px; border-radius: 14px; background: {STUDIO}; box-shadow: inset 0 0 0 1px {HAIR2}; display: flex; align-items: center; padding: 0 12px; font-size: 11px; font-weight: 600; color: {INK2};">Studio</div>
      <div style="flex: 1 1 0; height: 46px; border-radius: 14px; background: {WHITE}; box-shadow: 0 8px 20px -10px rgba(23,24,28,0.3); display: flex; align-items: center; padding: 0 12px; font-size: 11px; font-weight: 600; color: {INK2};">Surface</div>
      <div style="flex: 1 1 0; height: 46px; border-radius: 14px; background: {INK}; box-shadow: 0 4px 0 #000; display: flex; align-items: center; padding: 0 12px; font-size: 11px; font-weight: 600; color: {WHITE};">Ink #17181C</div>
    </div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 506px; display: flex; flex-direction: column; gap: 8px; padding-top: 14px; border-top: 1px solid {HAIR2}; {U(1.0)}">
    <div class="label" style="color: {INK3};">One typeface</div>
    <div style="font-size: 24px; line-height: 28px; font-weight: 700; letter-spacing: -0.03em;">Outfit: 700 for statements, 400–500 to read.</div>
  </div>
  <div style="position: absolute; left: 22px; right: 22px; top: 592px; display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid {HAIR2}; {U(1.2)}">
    <div class="label" style="color: {INK3};">The stone is the control</div>
    <div style="display: flex; gap: 18px; align-items: center;">
      <div style="display: flex; align-items: center; gap: 10px;"><div style="position: relative; width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle at 50% 42%, rgba(23,24,28,0.16) 0%, rgba(23,24,28,0.07) 55%, rgba(23,24,28,0) 72%); box-shadow: inset 0 3px 6px rgba(23,24,28,0.16), inset 0 -2px 3px rgba(255,255,255,0.7);"><div style="position: absolute; left: 7px; top: 7px; width: 30px; height: 30px; border-radius: 50%; transform: translateY(-8px); box-shadow: 0 12px 14px -4px rgba(23,24,28,0.38); filter: saturate(0.55) brightness(0.96);"><div style="position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 32% 26%, {CORAL[0]} 0%, {CORAL[1]} 24%, {CORAL[2]} 60%, {CORAL[3]} 100%); box-shadow: inset -5px -7px 12px rgba(0,0,0,0.38), inset 3px 3px 6px rgba(255,255,255,0.35);"></div></div></div><div style="font-size: 12px; line-height: 16px; color: {INK2};"><b style="color: {INK};">Raised, matte</b><br>waiting</div></div>
      <div style="display: flex; align-items: center; gap: 10px;"><div style="position: relative; width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle at 50% 42%, rgba(23,24,28,0.16) 0%, rgba(23,24,28,0.07) 55%, rgba(23,24,28,0) 72%); box-shadow: inset 0 3px 6px rgba(23,24,28,0.16), inset 0 -2px 3px rgba(255,255,255,0.7);"><div style="position: absolute; left: 7px; top: 7px; width: 30px; height: 30px; border-radius: 50%; box-shadow: 0 2px 4px rgba(23,24,28,0.28);"><div style="position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 32% 26%, {CORAL[0]} 0%, {CORAL[1]} 24%, {CORAL[2]} 60%, {CORAL[3]} 100%); box-shadow: inset -5px -7px 12px rgba(0,0,0,0.38), inset 3px 3px 6px rgba(255,255,255,0.35);"></div><div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></div></div></div><div style="font-size: 12px; line-height: 16px; color: {INK2};"><b style="color: {INK};">Seated, polished</b><br>done</div></div>
    </div>
    <div class="label" style="color: {INK3}; margin-top: 6px;">Tactile controls</div>
    <div style="display: flex; gap: 10px; align-items: center;">{button("Primary", 1.3)}<div style="width: 60px; flex: 0 0 auto;">{check_button(60, 1.4)}</div><div style="width: 60px; height: 60px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FF9A78 0%, #EA4B2E 60%, #B92E14 100%); box-shadow: 0 5px 0 #8E2411, 0 20px 30px -12px rgba(234,75,46,0.55); flex: 0 0 auto; display: flex; align-items: center; justify-content: center; {P(1.5)}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="{WHITE}" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg></div></div>
    <div style="font-size: 12px; line-height: 16px; color: {INK2};">Tap a stone to seat it in its socket; it settles, brightens and takes a check glint. Buttons have a bottom edge they press into.</div>
  </div>
""")
brand = brand.replace('<div style="height: 60px; border-radius: 999px; background: #17181C', '<div style="flex: 1 1 auto; height: 60px; border-radius: 999px; background: #17181C')
(OUT/"Brand.dc.html").write_text(doc(brand), encoding="utf-8")

print("generated:", sorted(p.name for p in OUT.glob("*.dc.html")))
