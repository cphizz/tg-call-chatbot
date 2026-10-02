# TG Call Assist Chatbot

Live-call pattern-match assistant for TruGreen inbound sales reps.

**Live at:** https://tg-call-chatbot.netlify.app/

## What it does

Reps type what the prospect just said (or what they need help with) and
instantly get back a scripted response in their chosen selling style
(SAY THIS / THEN / CHECK format). 194 intents cover ~98% of real inbound
sales call scenarios, from basic objections through operational edge
cases.

If the pattern engine doesn't match the question, there's a one-click
AI fallback (Claude Haiku 4.5) that respects the same style voice and
response format.

## Core files

| File | Purpose |
|---|---|
| `index.html` | Landing page, auto-redirects to assist.html |
| `assist.html` | Main chatbot UI (styles, intents, API fallback) |
| `assist-launcher.html` | Opens assist.html in a sized popup window from PDFs |
| `pattern_engine.json` | 194 intents + trigger regexes + style-grouped responses |
| `style_patterns.json` | Rep selling-style voice patterns |
| `trusource_data.json` | 214-entry TruSource pest/weed library for lookups |
| `netlify.toml` | Netlify build config |
| `netlify/functions/claude.js` | Server-side Claude API proxy (no rep-side keys) |

## Setup

1. Deploy to Netlify (auto-deploys from `main` branch on git push)
2. In Netlify Site Settings → Environment variables, add:
   `ANTHROPIC_API_KEY=sk-ant-...`
3. Reps enter passcode `trugreen2026` once, then start using

## URL contract (for PDF integration)

```
https://tg-call-chatbot.netlify.app/assist.html?
  stage={open|discovery|package|value|close|objection|wrapup}
  &style={direct_setup|educational_consultant|polished_guide|
          structured_professional|reassurance_builder|
          process_driven_advisor|casual_problem_solver}
  &page={PDF page number}
  &customer_issue={free text}
  &bundle_context={free text}
```

Parameters are optional. If style isn't set, chatbot shows a one-time
style picker.

## Intent categories (194 total)

- Objections (17): price, think, spouse, already have, not interested,
  send info, pets safety, price match, fixed income, timing, bad
  experience, DIY, just lawn, cancellation, guarantee, how long, auto-renew
- Discovery (6): asking about lawn/tree/mosquito/pest/past service
- Service explanations (7): lawn, tree & shrub, mosquito, perimeter pest,
  aeration, guarantee, soil amendments
- Close moves (6): gear shift, PrePay, EasyPay, card ask, confirm, assume
- Payment & compliance (6): cards, when charged, property access,
  notifications, continuous service, first service
- Branch & scheduling (4): service area, what day, moving, pause
- Operations round 2 (23): grubs, irrigation, diseases, etc
- Operations round 3 (20): mobile app, complaints, drought, etc
- Lawn diagnosis & billing (22): brown lawn, yellow lawn, hidden fees
- Round 5 edge cases (27): weeds, pests, trust, property features
- Round 6 edge cases (22): guarantee claims, life events, communication
- Round 7 edge cases (17): service recovery, admin changes
- Sample-coverage additions (2): REFUSES_ADDRESS, BUNDLE_RECOMMENDATION

## Compliance-critical intents (do NOT improvise)

- `DO_YOU_TEST_SOIL` - TG does NOT test soil
- `DNC_REQUEST` - immediate TruView processing, no re-pitch
- `MOLE_RODENT` - do NOT promise mole treatment
- `TERMITES_QUESTION` - NOT a TG service
- `ROACHES_COCKROACHES` - outside only, not interior
- `CARPENTER_ANTS` - outside only, not interior wood damage
- `EDGING_TRIMMING` - NOT a TG service
- `CUSTOMER_COMPLAINT` - log same-day, no upsell
- `WRONG_PROPERTY_TREATED` - URGENT branch escalation
- `MISSED_APPOINTMENT` - service recovery protocol
- `WELL_WATER_PROPERTY` - wellhead setback
- `PARTIAL_SERVICE_RECOVERY` - incomplete service documentation
- `FERTILIZER_BURN_ISSUE` - guarantee follow-up
- `STORM_DAMAGE` - safety first, no upsell
- `RENTAL_LANDLORD` - landlord authorization required
- `DIVORCED_SELLING_HOUSE` - sensitive handling, no upsell
- `OVER_BILLED` - billing dispute protocol
- `POLLINATOR_SAFETY` - verify practices in TruSource
- `EPA_PRODUCT_SAFETY` - SDS via TruSource

## Development

Static site - no build step. Edit files directly, commit, push.
Netlify auto-deploys from `main`.

For the Claude API proxy, update `netlify/functions/claude.js` and
set `ANTHROPIC_API_KEY` as a Netlify environment variable.

## Passcode

Default: `trugreen2026` (SHA-256 hashed in `assist.html`). Can be
rotated by generating a new SHA-256 of the new passcode and replacing
`PASSCODE_HASH` constant in `assist.html`.
