# Typography research: free premium pairings and licensing (verified Sept 2026)

## Licensing verdicts
- **Fontshare closed-source fonts (ITF Free Font License)** — https://www.fontshare.com/licenses/itf-ffl — grants use in "Mobile or Desktop Applications" and lets you "embed the Font Software in mobile or desktop applications." Constraints: no modification (no subsetting, no format conversion — ship files as downloaded), no handing files to external contractors (they must download themselves), no attribution required. Applies to Satoshi, General Sans, Clash, Switzer, Sentient, Gambetta, Erode, Boska, Bespoke Serif, Melodrama, Gambarino, Cabinet Grotesk, Chillax, Alpino, Supreme, Ranade, Panchang, Tanker.
- **SIL OFL (Google Fonts)** — https://openfontlicense.org/ofl-faq/ — bundling in sold apps is fine; include copyright + license text in an About/Licenses screen; subsetting creates a "Modified Version" so rename the family if a Reserved Font Name is declared. Practical: ship unmodified static TTFs from the Google Fonts repo.
- **Atipo** (Argesta, Geomanist, Wotfard, Silka, Basier) — free weights are desktop-only; app embedding is a separate paid license. Exclude.
- **Paid (confirmed):** PP Editorial New, PP Neue Montreal, PP Migra ($40/style), Berkeley Mono.
- **Variable fonts in React Native/Expo** — Expo docs: variable fonts lack cross-platform support; use static instances (fontTools `varLib.instancer`) and map each weight/style to its own `fontFamily` string; define a token table (h1/body/label → file) up front.

## Font ledger (verified source + axes)
Google Fonts (OFL): Instrument Serif (Regular + Italic only), Instrument Sans (wght 400–700, wdth 75–100, italics), Inter (wght + opsz 14–32), Geist / Geist Mono (100–900 + italics), Bricolage Grotesque (wght 200–800, wdth 75–100, opsz 12–96), Fraunces (wght 100–900, opsz 9–144, SOFT 0–100, WONK 0–1), Newsreader (200–800, opsz 6–72), Host Grotesk (uniwidth 300–800), Funnel Display/Sans, Parkinsans, Schibsted Grotesk, Onest, Hanken Grotesk, Figtree, Manrope, Public Sans, Golos Text, Familjen Grotesk, Wix Madefor Display, Plus Jakarta Sans, Sora, Space Grotesk, Unbounded, Gloock, Young Serif, DM Serif Display, Cormorant, Libre Caslon Text, Bodoni Moda, Playfair Display, Lora; mono: Martian Mono, Azeret Mono, JetBrains Mono, IBM Plex Mono, DM Mono, Space Mono, Commit Mono.
Fontshare (ITF FFL): Satoshi, General Sans, Switzer (20 styles), Clash Display/Grotesk, Cabinet Grotesk, Sentient, Gambetta, Erode, Boska, Bespoke Serif, Gambarino, Melodrama, Chillax, Alpino, Supreme, Ranade, Panchang, Tanker.
Other libre: Collletttivo (Mazius Display, Apfel Grotezk, Sprat…), Velvetyne (Karrik, Avara, Le Murmure…), Open Foundry, Free Faces gallery, Uncut.wtf (verify each license).

## Free stand-ins for paid editorial faces
- PP Editorial New → Instrument Serif Italic, Gambetta Italic, Sentient Light Italic, Erode, Boska Light Italic, Newsreader Italic (opsz 72), Fraunces (SOFT 0, WONK 0)
- PP Migra → Gambarino, Gloock, Boska Bold Italic, Bodoni Moda 900, Young Serif
- Neue Montreal / Söhne / Suisse → Switzer, General Sans, Geist, Instrument Sans, Host Grotesk, Schibsted Grotesk
- GT Sectra / Reckless / Canela → Fraunces (SOFT 100 ≈ Canela softness), Cormorant Light, Sentient, Erode, Newsreader
- ABC Diatype / Founders Grotesk → Hanken Grotesk, Figtree, Onest, Geist, Funnel Sans, Supreme, Apfel Grotezk
- Berkeley Mono → Commit Mono, Geist Mono, Martian Mono, Azeret Mono

## Ten pairings (mobile size/line-height, weight)
1. Instrument Serif Italic + Geist + Geist Mono — quiet-journal editorial (H1 40/44 400i; body 16/24; labels mono 12/16 caps +0.06em). Risk: Instrument Serif is the 2024–25 Framer-template serif; keep italic-only and ≥28pt.
2. Bricolage Grotesque + Onest — signage energy (H1 36/40 wght 800 opsz 96 wdth 90).
3. Gambetta Medium Italic + Switzer — "the coach who reads" (ITF FFL; no subsetting).
4. **Fraunces (SOFT 100, WONK 1, wght 500, opsz 144) + Manrope** — warmest; generate one static instance for RN; rename if RFN.
5. Sentient Light Italic + General Sans — literary.
6. Clash Display Semibold + General Sans — loud; only for high-energy brands.
7. Unbounded + Hanken Grotesk — athletic scoreboard numerals.
8. Boska Light Italic + Host Grotesk — fashion Didone over uniwidth UI sans (tab weight swaps never reflow).
9. Gloock/Gambarino + Schibsted Grotesk + Martian Mono — newspaper gravity + condensed data tickers.
10. Newsreader Italic + Funnel Sans + Azeret Mono — Reckless-adjacent serif, data-point sans, editorial mono.
