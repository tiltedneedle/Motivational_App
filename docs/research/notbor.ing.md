# Design Map

Source: https://notbor.ing (Not Boring Software; (Not Boring) Camera was an Apple Design Awards 2026 Visuals finalist). Captured 8 Sept 2026 at 1440×900, single page.

## Spacing Scale
- Base unit 10px; observed 8, 10, 20, 30, 40, 60, 100px
- Section padding 100px; grid gutter 60px; h2 margin-bottom 20px; h3 margin-bottom 10px; p margin 8px 0 10px

## Font Hierarchy
- Hero h1/h2: Founders Grotesk 76px / 76px, 700
- h3: Founders Grotesk 44px / 52.8px, 600
- Body p: Founders Grotesk 36px / 36px, 600
- Nav and Download button: Founders Grotesk 22px, 600
- Labels (SKU, issue, tagline, footer): JetBrains Mono 12px, 400, uppercase, letter-spacing 0.5px
- Mobile menu items: JetBrains Mono 30px, 300, uppercase

## Color Palette
- Background #FFFFFF (hero)
- Band grey #ECECEC (57% of sampled area) and #E0E0E0
- Band accent #FFB200 (13.9% of area; used only as a section ground)
- Text #000000 primary, #232323 h3, #AAAAAA labels, #B6B5B5 footer
- Button: #000000 fill with white text, and the inverse on dark bands
- Neutrals are pure grey (no hue tint)

## Image Ratios
- App icons 1:1 (1440×1440), rendered 320px
- Artist Series skins 1:1
- Blog thumbnails 1:1
- Hero: rendered 3D objects composited over the wordmark, no photograph

## Component Tokens
- Border radius: 0px everywhere; 4px on buttons
- Shadows: none
- Grid: 3 columns × 360px, 60px gutters (1200px content), no container max-width
- Repeated component: square image + mono eyebrow + 44px bold title + body; product caption triplet NAME / TAGLINE / SKU
- Motion: `transition: all`, `background-color 0.3s`; `:focus-visible` present; no `prefers-reduced-motion` rule

---

# Taste DNA

### Depth lives in the objects, not the chrome
- **Trigger**: When presenting apps whose whole identity is 3D, tactile and haptic
- **Decision**: Chose flat page chrome (zero box-shadows, 4px radius only on buttons, pure-grey bands) over glass, gradients or shadowed cards
- **Reason**: Because the rendered objects must be the only things with dimension; if the page itself had depth the products would stop reading as physical
- **Evidence**: 0 box-shadow declarations across 8,000 sampled elements; radius 4px on buttons only; 3D icons and Artist Series cubes at 1:1; greys untinted

### Body copy at poster size
- **Trigger**: When the message is a manifesto ("Playful software for life's boring routines") rather than documentation
- **Decision**: Chose a 36px/36px semibold body under 76px/76px headings over a conventional 16–18px body with 1.5 line-height
- **Reason**: Because a reader should take in one thought per viewport, the way a poster is read from across a room; fewer words per screen is the price
- **Evidence**: p 36px 600 line-height 36px; h1/h2 76px 700 line-height 1.0; h3 44px 600; body max-width none

### Catalog labels in mono
- **Trigger**: When every app, skin and article needs metadata (name, tagline, number)
- **Decision**: Chose JetBrains Mono 12px uppercase +0.5px codes ("SKNx009", "ISSUE 013") in #AAAAAA over marketing badges, tags or colored chips
- **Reason**: Because a parts-catalog voice frames the apps as objects you collect, and grey mono recedes so the grotesk headline stays the only loud thing
- **Evidence**: 12px is the most common text size (66 nodes); NAME / TAGLINE / SKU triplet centered under each 1:1 image; footer links in the same 12px mono #B6B5B5

### Color bands instead of dividers
- **Trigger**: When sectioning a 10,900px page holding products, artist skins and blog posts
- **Decision**: Chose full-bleed color bands (#FFF, #ECECEC, #FFB200) with 100px internal padding and zero rules over hairline dividers, cards or whitespace-only gaps
- **Reason**: Because a band change reads like turning a page, and the single amber band gives the scroll a landmark without spending color on a button
- **Evidence**: #ECECEC covers 57% of sampled area, #FFB200 13.9%; 100px is the third most common spacing value (26 nodes); no section gaps detected, bands abut; buttons are black, never amber

---

# What Morrow takes from this (and what it leaves)

- Take: depth only where the product is (Morrow: depth only in generated scenes and the Horizon glow; chrome stays flat with hairlines).
- Take: a mono metadata voice that recedes (Morrow: Geist Mono 11–13px for dates, counts, SKU-like eyebrows such as "SCENE 1 OF 3").
- Take: the accent as environment rather than button paint (Morrow: the sky is the color; Sol is spent only on completion and the primary action).
- Leave: poster-size body copy (a coaching app is read at arm's length, daily; Morrow's body stays 17/24).
- Leave: pure greys (Morrow's neutrals are blue-biased so night and day grounds belong to the same sky).
