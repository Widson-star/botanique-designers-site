# Botanique Designers Operations Hub — Operating Model Authority

Founder-approved architecture for the Operations Hub's navigation, Finance department, and
product-wide presentation discipline. This is **visual and architectural authority, not
implementation authority** — it does not by itself authorise any code, database, branch, PR or
deployment change. A separate, explicit implementation authorisation is required, exactly as it
was for Stage 6 (`stage-6-navigation-authority/`, committed `261b5b4`, implemented and merged
separately via PR #92).

This package is not a numbered programme stage. It documents the accepted architecture; the
Founder has not yet closed Stage 6 or named a formal next stage, so nothing here is labelled
"Stage 7."

## What's here

| File | Purpose |
| --- | --- |
| `decision-record.md` | The complete, settled architecture: identity, desktop shell, navigation domains, Finance, Approvals, Reports, deferred data-hygiene questions |
| `COMPACT-PRESENTATION-STANDARD.md` | The product-wide presentation rule every domain must follow |
| `remediation-inventory.md` | A factual list of known compact-presentation deficiencies in current production, so they aren't forgotten |
| `01-identity-expanded.png` | Expanded sidebar: official `public/botanique.png` badge alone + "Operations Hub" subordinate — no retyped company name |
| `02-identity-collapsed-104px.png` | Collapsed 104px rail with the official badge at its approved size — supersedes the 64px rail Stage 6 shipped |
| `03-finance-desktop-landing.png` | Finance as one shell destination with an in-page area selector (Overview / Project Costs / Company Expenses / Staff Compensation / Funding, Payments and Reconciliation) |
| `04`–`05-finance-mobile-selector-{375,400}.png` | The approved wrapped-chip mobile area selector, isolated |
| `06`–`07-finance-mobile-page-{375,400}.png` | The full preferred mobile Finance page, demonstrating the Compact Presentation Standard applied |
| `08-illustrative-compact-vs-machine-generated.png` | One illustrative comparison only — see the sample-data notice below |

## What is NOT carried forward here

Rejected/superseded material stays only in the (untracked, non-authoritative) working history that
produced this package — none of it is part of this authority: the rejected duplicated-text
identity treatment; the 64px and 80px collapsed-rail options; Finance Option A (five persistent
sidebar children); the withdrawn horizontally-scrolling mobile Finance selector; the compact
dropdown/sheet mobile selector alternative (documented as considered, not adopted); every
Revision-1-era comparison board; the transfer ZIPs; `_shell-source.html`; and the convenience
copy of `public/botanique.png` kept in the working draft — the canonical asset is
`public/botanique.png` itself, cited by path, never duplicated into authority.

## Sample-data notice

Every name, figure, date and record in the images above is **illustrative only** — chosen to
establish density and hierarchy, most obviously in `08-illustrative-compact-vs-machine-
generated.png`. None of it is product-data authority and none of it authorises any field, action,
metric, workflow, or currently-unavailable functionality.

## Standing constraints

Restrained Botanique language · compact hierarchy · off-white shell (`#faf9f8`) · forest and sage
accents (`#3f5f58`, `#ecefe9`) · sparse amber and red · intentional density · clear drill-through
· no endless pages · no raw schema layouts · no generic identical-card stacks · no large pale
container around a single child · no invented figures · no invented logo treatment.

## Status

Stage 6 (`stage-6-navigation-authority/`) remains **NOT ACTIVE_VERIFIED**. The live production
shell now embodies several elements this authority supersedes (64px rail, People under More, Site
Costs and Approvals under Operations, Finance's single-child Fund Requests navigation, the absent
Dashboard greeting, the missing Operations Hub product label in collapsed mode). The Operations
Manager hosted walkthrough required to close Stage 6 should be performed against the corrected
shell once implemented, not used to certify a shell already known to be superseded.

**Application implementation remains unauthorised pending this authority PR's review and merge —
and, after that, a separate implementation authorisation.**
