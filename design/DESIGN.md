# Ponti — Design handoff (app)

> **What this is.** The build contract between the Ponti **design layer** and the
> codebase. Read this first, then use the prototypes in `./prototype/` as a visual
> reference. **Scope: the product app only** (sign-in + every in-app screen, state,
> and the unified write flow). The marketing **site** (separate web pages) and its
> site map are a different surface and ship separately — out of scope here.

**Target repo:** [github.com/aliersh/ponti](https://github.com/aliersh/ponti) —
Vite + React + viem + **Privy** (headless auth) + **Pimlico** (gasless writes) +
a **The Graph** subgraph (reads). The funding/chain plumbing is already built; the
app currently uses default browser styling. **This handoff is the design layer**
(Phase 6 / M2: functional → polished).

---

## 1. Overview

Ponti is a **two-person shared-expenses app** ("settle up, on-chain") for people
who share costs but live apart — e.g. cross-border family. One running balance per
person, netted, and settled directly in **USDC**. It is **non-custodial**: Ponti
never holds funds, it "keeps the count." What's being handed off is the **UI/UX** —
the visual system, the screens, all their states, the unified write flow, and the
wallet/funding layer. Take the app from default/unstyled to a **polished, friendly,
themed** product — light + dark, mobile-first, responsive to desktop.

---

## 2. About these design files (read this first)

The files in `./prototype/` are **design references built in HTML + in-browser
React (Babel)** — interactive prototypes that show the intended **look, copy,
states and behavior**. They are **not** production code to copy verbatim.

- They use plain in-browser React + inline styles + a **mock data layer**
  (`data.js`) and fake the chain entirely. **Do not** lift the prototype's
  component structure, mock mutations, device frames, or `Stage` scalers into the
  app.
- The job is to **recreate these designs inside the existing repo** (its real React
  components + its viem/Privy/subgraph data layer — see §11), pixel-faithfully,
  using the tokens in §6.
- Where a prototype screen maps to existing repo code, **extend** it. Where it's
  new, **add** a component. Mapping is in §8 and §11.

**To view:** open `prototype/Ponti — Prototype.html` (mobile) or
`prototype/Ponti — Desktop.html` (desktop/responsive) in a browser. Both have a
**Tweaks** panel (top corner) — use its **demo-state** switches to see every state
you must build (home normal/loading/empty/error, settle low-USDC).

---

## 3. Fidelity

**High-fidelity.** Final colors, type, spacing, radii, copy, and interaction design
are all **decided** (see §5 and §7). Recreate the UI **pixel-faithfully** with the
repo's stack and the tokens in §6. **Light and dark are both required from day one.**
There are **no open visual choices left** — every former "tweak" has resolved to a
fixed value (§7).

---

## 4. (reserved)

---

## 5. Locked product decisions (do not relitigate — flag, don't silently change)

1. **Identity = Direction B "Puente."** Tokens in §6. (Rejected alt "Mesa" removed.)
2. **Interface language is ENGLISH** for all app UI. (Audience is cross-border incl.
   Chile; an EN/ES toggle is **deferred**, not now.)
3. **Money rule — the accent color NEVER colors a number.** Amounts always render in
   `--ink`; color is for actions / edges / emphasis only.
   - **Figure style:** big single **display** amounts (Home net, balance hero) use
     **proportional** lining figures (tighter, even rhythm; `USDC` suffix tracked
     `+0.02em`). **Lists / activity rows** use **tabular** lining figures
     (`font-variant-numeric: tabular-nums lining-nums`) so they decimal-align and
     never jitter on update. The **wallet balance** is a value figure → tabular.
4. **No crypto jargon in the UI.** Avoid: *on-chain, gas, wallet (as seed), contract,
   address-front-and-center, batch, seed phrase, "Base" as a headline.* **Keep
   "USDC"** (it's the real unit). Say things plainly: it's *free*, money goes
   *straight to the other person*, *Ponti never holds it*. ("Faucet" and "Base"
   appear once each, only inside the funding steps where the user needs them.)
5. **Friendly identity layer.** The counterparty is shown as a user-set **nickname**
   (client-side, private to the viewer) + an **initial avatar**. The raw `0x…` is
   demoted to an **"Advanced details"** disclosure. Nicknames are local — never
   written on-chain, never shown to the other person.
6. **Invite exchange = link + QR** (never paste a raw `0x`). "Your Ponti" shares your
   QR/link; "Add someone" pastes a link or scans a QR.
7. **FlowWidget wraps EVERY write** (create / add / edit / delete / settle): one
   sheet, **confirm → in-progress → done**. **Always one explicit approval button —
   never auto-accept a transaction.** In-flight is resilient and **never shows red**;
   returning to a screen shows a grey "Saved — updating…". **Copy tone is LOCKED to
   wink** for all soft copy; numbers stay calm and are never colored. Settle's single
   approval covers the atomic approve+settle batch.
8. **Sign in: email only** (passwordless, Privy headless). Google is **deferred**.
9. **Profile depth ("Your Ponti"):** real **photo upload** (persisted locally,
   initial avatar as fallback) + a **read-only account-email row** (the sign-in
   email; shown, not editable) + an **editable display name**. **No** country/flag
   (deferred). **"Advanced details"** lists only **public, non-sensitive** facts:
   account address (`0x`, copyable), network (Base — "where USDC settles"), account
   type (Smart account · non-custodial), View on explorer. **Never** keys or seed.
10. **Wallet + funding.** Users have an account-level **USDC balance** (`me.usdc`,
    distinct from the per-person tabs) with an always-available **Add funds** step.
    See §10.
11. **Light + dark from day one. Mobile-first, responsive to desktop.** No native iOS
    app soon — so desktop must also work in a phone browser.
12. **Corners are SHARP.** `--radius 6` / `--radius-sm 4`. (A soft 10/7 variant was
    explored and rejected.)
13. **Balance direction = DirChip — flow chip (Jun 12).** Direction (owed / owe /
    settled) is shown by a small **arrow + word PILL** (`DirChip` in `components.jsx`)
    next to — never on — the amount. Arrows: **↓ in** (owes you) · **↑ out** (you
    owe) · **✓** (settled). Icon names: `I.arrowIn` / `I.arrowOut` / `I.check`.
    **Accent on "you owe" only** (accent-soft bg + accent text/arrow — it carries the
    pending Settle); "owes you" + settled stay neutral (surface-2 / muted). Numbers
    stay `--ink`; chip carries direction → **+/− sign dropped** from displayed
    amounts. Sizes: `lg` (hero) · `md` (Home/desktop net + an **"across everyone"**
    caption — the old "NET" mini-label was cut as finance jargon, §12/§17) · `sm`
    (rows). Hero/net chips personalize the label ("You owe Cami" / "Cami owes you" /
    "You're owed" / "All settled up"); rows use short form. Applied on every
    balance-direction surface: Home net, group rows, group-detail balance hero, mobile
    + desktop. **Money rule stays intact — no number is ever colored.**

**Out of scope / deferred** (NOT "incomplete"): local-currency ≈CLP/USD, EN/ES
toggle, Google sign-in, group naming/tagging.

---

## 6. Design tokens

Implement as **CSS custom properties with a light/dark switch**, using these exact
names (they match the prototype). Fonts are **Schibsted Grotesk** (display + numbers)
and **Hanken Grotesk** (UI/body) — both on Google Fonts.

### Color · Light
| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `--bg` | `#FBF7F4` | | `--border` | `#ECE2DD` |
| `--surface` | `#FFFFFF` | | `--accent` | `#B23A6B` |
| `--surface-2` | `#F4EEEA` | | `--accent-strong` | `#A1305F` |
| `--ink` | `#241F22` | | `--accent-soft` | `#F8E4ED` |
| `--muted` | `#786E72` | | `--accent-ink` | `#FFFFFF` |

### Color · Dark
| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `--bg` | `#1A171A` | | `--border` | `#382F36` |
| `--surface` | `#221D21` | | `--accent` | `#E36796` |
| `--surface-2` | `#2A242A` | | `--accent-soft` | `#36202B` |
| `--ink` | `#F1EAEE` | | `--accent-ink` | `#1A1115` |
| `--muted` | `#A99FA5` | | | |

> **Money rule (load-bearing):** the accent never colors a number; amounts render in
> `--ink`. Proportional figures on big display amounts, tabular on lists. See §5.3.

### Type
| Role | Family | Notes |
|---|---|---|
| Display / numbers | **Schibsted Grotesk** 600–800 | headings, balances, titles; `letter-spacing: -0.02em` |
| UI / body | **Hanken Grotesk** 400–700 | labels, copy, inputs, buttons |
| Figures | — | **tabular** lining on lists; **proportional** lining on big display amounts |

### Radii · spacing · elevation
- **Corners are sharp:** `--radius: 6px` / `--radius-sm: 4px`. Pills `999px`. Bottom
  sheet: `22px` top radius. Desktop modal: `20px`.
- Spacing gaps: **8 · 12 · 18 · 22px**. Page padding: **18px**.
- Shadow: `--shadow` = `0 10px 26px -14px` of ink at ~18%.
- Implement **accent + radius as tokens** so the theme is set once and themeable.

---

## 7. Tweaks → production values

The prototype's Tweaks panel was an **exploration tool, not a set of app features**.
Every tweak has resolved to one decided value. **The "demo state" switches are NOT a
control** — they exist to show you every UI state you must build.

| Tweak in the prototype | In production |
|---|---|
| **Accent hue** (4 options) | **Locked** → Direction B magenta: `--accent #B23A6B` / `--accent-strong #A1305F`. A constant, not user-configurable. |
| **Corners** (soft / sharp) | **Locked** → **Sharp**: `--radius 6` / `--radius-sm 4`. The soft variant is dropped. |
| **Flow copy tone** (calm / wink / playful) | **Locked** → **Wink** for all soft copy; numbers stay calm. A constant. |
| **Dark mode** toggle | **Real feature** → a user preference. Light + dark from day one. |
| **Demo states** (home normal/loading/empty/error · settle low-USDC) | **Build each** → these are states the UI must render, not a switch. |
| *(desktop only)* Layout / Content width / FlowWidget position | Pick one with the user before building; the prototype offers them to choose from. |

> **Rule of thumb.** *Locked* → ships as a token/constant. *Feature* → ships as real
> UI. *Demo-states* → ship as states the UI handles, never as a switch.

---

## 8. Screens & views

Every screen exists in the prototypes (mobile `Ponti — Prototype.html`, desktop
`Ponti — Desktop.html`). "extend" = file exists, rework its UI; "new" = add it.

### 8.1 Sign in — **new** → new `SignIn` screen; extend `App.tsx` auth gate / `providers.tsx`
Passwordless email entry. Single centered column: brand mark + wordmark, one email
input, one primary button, and a reassurance line **"Ponti never holds your money."**
Email only — no Google, no password. States: idle, submitting, "check your email."

### 8.2 Home — **extend** → `HomeView`
Top app bar (brand + Your-Ponti/profile entry). Home shows **three money figures that are really
TWO categories** — the layout must make that legible at a glance (Jun 16, 2nd pass):

- **RELATIONAL — "who owes whom":**
  1. **Net = the headline.** One big **proportional** amount in `--ink`, USDC suffix, a **DirChip**
     (§5.13, accent only on the "you owe" side) and the plain caption **"across everyone"**
     (replaces the old "NET" jargon; names the running total across all the people you share with).
     The number that matters.
  2. **Per-group balances = its breakdown.** The **"People you share with"** rows (avatar +
     nickname + balance **tabular** + **DirChip sm**, no +/− sign; settled rows show a check) sit
     **directly under the net as its detail** — visually subordinate, part of the same block.
- **UTILITY — "what I can pay with" (a different category):**
  3. **Funds available** (WalletStrip, §10) is **NOT** a balance. It is set **apart** from the
     relational block by a **real hairline + spacing**, under its own **"Your account"** label, so
     it **never reads as a third balance**. Eyebrow "Funds available," amount `--ink` **tabular**,
     inline **Add funds**.

The per-row secondary tag stays **deferred** with group naming/tagging (§14) — show a neutral
last-activity line if anything, never an invented label. Primary "Add someone" affordance.
**States** (all in the Tweaks demo-state control):
- **normal** — net header + group rows.
- **loading** — skeleton rows (no spinner-only screens).
- **empty** — friendly first-run; one CTA to add someone.
- **error** — a connection hiccup. Copy distinguishes "**nothing lost — your money is
  where it was**" from "no groups." Never alarm-red.
- (also the provisioning state while the smart account is created.)

### 8.3 Group detail — **extend** → `GroupDetail` (+ `ExpenseList`, `SettleSection`)
Top→bottom:
1. **Balance hero** — a **DirChip lg** (§5.13) personalized with the counterparty
   name ("You owe Cami" / "Cami owes you" / "All settled up") above a big
   **proportional** amount in `--ink`. Settled: check chip + "Settled" text.
   Counterparty = nickname + avatar. A small
   group-header **"details"** disclosure *(currently a stub in the prototype — wire
   it).*
2. **Activity timeline** — expenses as a vertical timeline. A **settle is a
   divider**: items before it are squared away and **collapse** (expandable). Edited
   expenses carry an **"edited" badge**. Tapping a row reveals inline **edit/delete**;
   the open row becomes a **lifted white card** (not a stuck grey hover). List
   amounts are **tabular**.
3. **Settle gate** (`SettleSection`) — shows only when the viewer is the **debtor**.
   Settle is an **outline** button. If the debtor lacks USDC, it's **disabled** with
   "You need X more USDC" + an **Add funds** affordance (§10) — never a failed tx. This
   **just-in-time** callout is the **only** place funds/wallet appear in the group view —
   there is **no permanent wallet strip here** (§10).

### 8.4 Add / Edit expense — **extend** → `AddExpenseForm` / `ExpenseList` (edit) → FlowWidget

**Presentation (the IA call — LOCKED Jun 16):** Add/Edit is a **dedicated form**, *not* a
bottom-sheet and *not* an inline panel. On **mobile** it's a full **FormScreen with a Back
affordance**; on **desktop** it's a **`ModalShell` dialog**. Two reasons it isn't a sheet:
(a) the sheet is reserved for the **FlowWidget** + **AddFundsPanel**, and the form *routes into*
the FlowWidget on submit — you must never stack sheet-on-sheet; (b) the form has enough fields
to deserve a focused surface. **Edit reuses the exact same form, prefilled,** via a
`mode`/`initial` distinction.

**Layout, top → bottom:**
1. **Title + contextual subtitle** (copy below).
2. **Amount** — the focal field: a large numeric input with a `USDC` suffix (big display
   figure). Money rule holds — `--ink`, never accent-colored.
3. **"What for?"** — single-line text; placeholder **"e.g. Groceries"**.
4. **"Who paid?"** — payer selector as two **styled toggle buttons** (a single-select
   segmented control: **You** / the counterparty by nickname + avatar). **Not raw radios.**
   *(This also retires the old shared-`name` radio-group gotcha entirely — toggle buttons
   don't collide when Add + Edit can both be mounted.)*
5. **Primary button** → routes into the FlowWidget confirm step (§9).

**Locked copy:** field labels **"Who paid?"** / **"What for?"**; placeholder **"e.g. Groceries"**;
subtitle — Add: **"Add what you paid for — Ponti keeps the count."** · Edit: **"Fix the details —
the balance updates to match."**; primary button — Add: **"Review & add"** · Edit:
**"Review changes"**. Full string set in §17.

### 8.5 Your Ponti (profile) — **new** → new Profile/`YourPonti` screen
**Avatar (photo upload**, persisted locally; initial fallback) + **editable display
name** + a **read-only account-email row**. The **WalletCard** (§10). The **invite
block**: your **QR + copyable invite link** (Copy works; **Share** button is a stub —
wire it). An **"Advanced details"** disclosure (address `0x` w/ copy, network "Base —
where USDC settles," account type "Smart account · non-custodial," "View on
explorer"). Then **Log out**. Same component is reused by the desktop "Your Ponti"
modal.

### 8.6 Add someone — **new** → new `AddSomeone` screen; extend `createGroup.ts`
**Paste an invite link** field **or** a **Scan QR** entry. The `0x` resolves
underneath — needs an invite-link scheme (e.g. `ponti.money/c/<token>` → resolves to
address) and QR encode/scan. Routes through FlowWidget (it's a create-group write).

### 8.7 Scanner — **new** → new `Scanner` screen
Camera viewfinder to scan a counterparty's Ponti QR → invite link → create group.

### Desktop / responsive (`Ponti — Desktop.html`)
Same screens, re-laid-out for wide viewports. The prototype shows **three layout
options** (Split master-detail · Sidebar nav · Centered column) + a mobile/desktop
toggle + a content-width choice. **Pick one with the user before building.** Modals
(Add, Edit, Add-someone, Your-Ponti) open as `ModalShell` dialogs; FlowWidget reuses
`placement="modal"`. Desktop must still work in a phone browser.

---

## 9. The FlowWidget (transversal — wraps every write) — **new**

One sheet, three phases: **confirm → in-progress → done.**
- **One explicit approval button** per action; **never auto-accepted.** Settle's
  single approval covers the atomic approve+settle batch.
- **In-flight is resilient and never red.** Success offers "view receipt." Returning
  to the underlying screen shows a grey **"Saved — updating…"** (mirrors the repo's
  resilient post-write refresh — see §11).
- **Copy tone is LOCKED to wink**, and the soft copy **rotates** among real phrase
  **pools** — one variant picked at random per open (stable for that opening).
  **Pool architecture (decided Jun 16):** `confirmSub`, `runningNote` and `doneTitle`
  are **shared by STATE** (action-agnostic — the consent reassurance and the in-flight
  note read the same whether you're adding, settling or deleting), while **`doneSub`
  is PER-ACTION** (settle / add / edit / delete / create each get their own distinct
  pool — that's the one line that genuinely differs by what just happened). `doneSub`
  is a **separate pool from `doneTitle`** and must never repeat a title line (the old
  single fixed `doneSub` duplicated a title ~half the time — fixed). **Numbers never
  rotate and are never colored.** Full pools in §17.
- **Two terminal error branches** (the prototype always succeeds, so this copy is new —
  wire it in the repo). Both are **wink and never alarm-red**:
  - **send-failed** — *nothing happened* (the UserOp never submitted): a soft "that
    didn't go through — try again," with a **Try again** button. Retryable.
  - **receipt-failed** — *it DID go through; only the confirmation signal was lost*
    (write mined, the post-write refresh/index is lagging). **No failure framing, no
    re-send** — reassure that it landed and we're just re-checking; closing drops the
    user onto the grey "Saved — updating…" state (§11). Strings in §17.
- **Placement is a prop:** mobile = bottom **sheet**; desktop = centered **modal**
  (default), with **side** and **sheet** also supported.

`new: FlowWidget component + write-state machine` — wraps `createGroup` · `addExpense`
· `editExpense` · `deleteExpense` · settle. It should **consume the repo's
`send`/`sendBatch` props, not import Privy** (see §11).

---

## 10. Wallet balance & "Add funds" — **new**

An account-level **USDC balance** (`me.usdc`, distinct from the per-person tabs).

> **Where the wallet lives (LOCKED Jun 16).** Funds appear on **Home** (a *utility* strip set
> apart from the relational balances — §8.2) and the **Your Ponti** account screen only. In the
> **group view the wallet is surfaced just-in-time at settle** (the low-USDC callout / settle
> confirm) — **never a permanent wallet strip there.** The group view is the relationship with one
> person; an account balance sitting in it recreates the competing-amounts problem.

- **WalletCard** — full card, primary location: the account screen ("Your Ponti").
  Eyebrow **"Funds available"** (was "Your USDC" — plain-language pass, §17) + amount in
  `--ink` (**tabular**) + "USDC" suffix + an **Add funds** soft-accent button + a one-line
  reassurance caption.
- **WalletStrip** — compact row (Home, desktop feed/rail): coin badge + **"Funds
  available"** + amount (`--ink`, tabular) + Add funds. On Home it sits **secondary,
  below the net headline** (§8.2).
- **Low-USDC settle gate** — when `you owe` and `me.usdc < owed`, Settle is disabled
  with "You need **X** more USDC" + Add funds. `X` is derived from `me.usdc` and the
  callout **clears reactively** the instant funds cover the debt (no manual refresh).
- **AddFundsPanel** — opened by any Add-funds affordance. **Not a FlowWidget** (no
  "approve transaction" button). One panel, three phases:
  1. **Guide** — plain intro **"Add USDC so you're ready to settle up. It's free — we'll
     point you to a page that hands out test funds. Takes about a minute."** → copy your
     address → "Open the funds page" (external, new tab) → steps (pick USDC on **Base**,
     paste address, up to 20 every 2h). **"Faucet"/"Base" appear ONLY inside these steps**
     (where the user must recognize the external site) — never in the headline copy.
  2. **Waiting** — passive **"Waiting for your funds… you can leave this open, it'll
     update on its own."**, auto-detecting, **no manual
     refresh button, never red.** Close is hidden here.
  3. **Received** — "Funds received ✓" + the new balance.
  - **Faucet isolation:** keep Phase 1's external-faucet content self-contained so a
    real **fiat on-ramp** can replace it later **without a redesign**. Phases 2–3 are
    generic "money on its way / arrived." **Do not** show Coinbase branding or a fiat
    ramp now (later mainnet milestone).
- Placement: **sheet** on mobile, **modal** on desktop.

**Data:** `me.usdc` (number, account-level balance) · `me.fullAddress` (full `0x…`,
the copy-to-faucet target) · `me.address` (truncated display form). In the repo, wire
the visual states to the **real balance read** (the panel *observes* the balance);
the prototype's `setTimeout` is only a mock stand-in. Faucet constants in the
prototype: URL `https://faucet.circle.com` (placeholder — confirm the repo's real
testnet faucet), grant `20` USDC.

---

## 11. State & data (use the REAL repo data layer — do not copy the prototype's mock)

- **Writes are gasless UserOps** through Privy + Pimlico. Every write handler is
  `encodeFunctionData → send({to,data})` (or `sendBatch(calls)` for settle). `send` /
  `sendBatch` are derived once in `App.tsx` and passed down as props — **the
  FlowWidget consumes these props, not Privy directly.**
- **One explicit approval per write** (decision §5.7). **Privy runs headless** — its
  built-in confirm and "All Done" modals have been **removed** — so the **FlowWidget is
  the ONLY surface for consent, progress and success.** The FlowWidget's single approval
  button **IS** the consent step; there is no separate Privy signer screen behind it. The
  widget consumes the repo's `send`/`sendBatch` props and **never imports or renders Privy
  UI**. *(Updated Jun 16: earlier drafts of this doc described Privy's per-call confirm /
  "All Done" screens — that wiring is gone; ignore any lingering reference to it.)*
- **Reads fork:** the **groups list** and **folded expense history** come from the
  **subgraph over GraphQL** (`fetchGroups.ts`, `fetchGroup.ts`); **balance** (signed
  `int256`) and the user's **USDC balance** are direct `readContract` calls. Balance
  sign convention used in the designs/mock: **+ = they owe you.**
- **`interpretBalance`** turns the signed balance into "Settled / they owe you / you
  owe" — feed this into **DirChip** (§5.13) — it handles the arrow, word, label
  personalization, and accent assignment for every balance surface.
- **Resilient post-write refresh** is the source of the grey "Saved — updating…"
  state: after a write, wait for the subgraph to index past the write's block,
  refetch with `Promise.allSettled` (one failed read never blanks the others), and **a
  refresh failure must never look like a write failure** (post-write status is grey,
  never red; red is reserved for cold-load). The FlowWidget "done → updating" copy
  must honor this.
- **Settle = one batched UserOp** (`approve` + `settle()` atomic). The single approval
  button maps to this one batch.

**UI-only state the design introduces** (not on-chain): **nicknames** (per-address,
device-local store), **profile photo** (local), **theme** (light/dark). Corners and
flow-tone are **constants**, not state. The **demo-state** switches are dev-only.

### Repo file map (designed → where it lands)
Paths are in `app/src/…` of **aliersh/ponti**.

| Design surface | Repo box | Action |
|---|---|---|
| Visual system / theming (tokens, light+dark) | _global styles_ | **new** `theme/tokens.css` + theme provider/state |
| Sign in (email) | `App.tsx` auth gate · `providers.tsx` | **new** `SignIn` + wire the gate |
| Home (net summary + states + WalletStrip) | `HomeView` · `App.tsx` | **extend** |
| Group detail (balance hero, timeline, settle) | `GroupDetail` | **extend** |
| Activity timeline (settle divider, collapse, edited badge) | `ExpenseList` | **extend** |
| Settle gate (low-USDC, add-funds) | `SettleSection` | **extend** |
| Add / Edit expense form | `AddExpenseForm` (+ edit in `ExpenseList`) | **extend** |
| Friendly identity (nickname + avatar) | `HomeView`, `GroupDetail` | **extend** + **new** device-local nickname store |
| Your Ponti (profile + invite QR/link + advanced details + WalletCard) | — | **new** Profile/`YourPonti` |
| Add someone (paste link / scan) | `createGroup.ts` | **extend** + **new** `AddSomeone` + invite-link resolver |
| Scanner | — | **new** `Scanner` |
| Wallet balance + Add funds | — | **new** `WalletCard`, `WalletStrip`, `AddFundsPanel` (observe real balance read) |
| FlowWidget (wraps every write) | wraps create/add/edit/delete/settle | **new** component + write-state machine; consumes `send`/`sendBatch` props |

Data-layer boxes the UI reads/writes through (already built — don't rebuild):
`config.ts`, `lib/client.ts`, `lib/subgraph.ts`, `lib/createGroup.ts`,
`lib/addExpense.ts`, `lib/editExpense.ts`, `lib/deleteExpense.ts`, `lib/settle.ts`,
`lib/fetchGroups.ts`, `lib/fetchGroup.ts`, `providers.tsx`.

---

## 12. Copy & language rules

- **No crypto jargon** (§5.4). Keep **USDC**.
- **Wink at the edges, calm on the money** — empty/success/microcopy use the **wink**
  tone (locked); numbers and confirmations stay sober and are never colored.
- **Interface is English.** Copy must travel cleanly to **es/pt** later — avoid puns or
  idioms that only work in English.
- Plain truths to keep surfacing: it's **free**, money goes **straight to the other
  person**, **Ponti never holds it**, it's **non-custodial**.
- **Plain-language sweep (Jun 16) + the full copy spec** — every locked string (Home
  "across everyone", "Funds available", the "Saved — updating…" refresh line that replaces
  "Confirmed on-chain", Add-funds, Add-someone / "your Ponti ID is your username", the
  FlowWidget pools, the two error states, and the Add/Edit form copy) — lives in **§17**.

---

## 13. Working with Claude Code

| Artifact | Role |
|---|---|
| **This `DESIGN.md`** | What to **build from**. The source of truth for the design layer. Read it first. |
| **`./prototype/` (`.jsx` + `.html`)** | **Read-only reference.** Open in a browser to see exact look, copy, states, behavior. Translate into the repo's real stack — don't copy the mock data layer, the device frames, or the `Stage` scalers. |

**Who does what**
- **Visual / interaction / copy / new state** → starts in **Design**. It's
  prototyped and approved there, then handed here to implement.
- **Logic / data / auth / on-chain** → starts in **Claude Code**. Design doesn't
  touch that layer.
- **A new feature** (UI + logic) → Design first (screens + states approved) → Code
  implements → Code loops back to Design only to report a real constraint.

This `/design` folder is a **generated export** for the repo — regenerated from the
canonical design project when something changes. After committing, you can build from
it; don't hand-edit it as if it were the design source.

---

## 14. Deferred / future (not in this round)

| Idea | Note |
|---|---|
| Local-currency display (≈ CLP/USD) | Show alongside USDC for cross-border legibility |
| Group naming / tagging | Client-side organization (the prototype's per-tab labels are mock) |
| EN/ES language toggle | Audience includes Chile |
| Google sign-in | Revisit later |

---

## 15. Files in this package

```
design/
├── DESIGN.md                         ← this document (the build contract)
├── README.md                         ← how to use this package
└── prototype/                        ← hi-fi interactive prototypes (open in a browser)
    ├── Ponti — Prototype.html        ← MOBILE: every screen, all states, FlowWidget, wallet, Tweaks
    ├── Ponti — Desktop.html          ← DESKTOP/responsive: 3 layouts + mobile/desktop toggle
    ├── data.js                       ← mock domain data (+ = they owe you). NOT for production
    ├── components.jsx                ← primitives, icons, GroupRow, QRCode, AvatarUpload, etc.
    ├── flow.jsx                      ← FlowWidget (FlowSheet) + wink copy (rotating variants)
    ├── wallet.jsx                    ← WalletCard, WalletStrip, AddFundsPanel
    ├── screens.jsx                   ← SignIn, Home, GroupDetail, Profile, AddExpense, Scanner
    ├── app.jsx                       ← mobile nav + mock mutations + Stage scaler + Tweaks
    ├── desktop-screens.jsx           ← desktop layouts + modals + ModalShell
    ├── desktop-app.jsx               ← desktop orchestration + view toggle + Tweaks
    ├── ios-frame.jsx / browser-window.jsx  ← device/window chrome (prototype-only, do NOT port)
    └── tweaks-panel.jsx              ← the Tweaks panel shell (prototype-only)
```

**Prototype-only, do NOT port:** `data.js` (mock), `ios-frame.jsx`,
`browser-window.jsx`, `tweaks-panel.jsx`, the `Stage` scalers, and all mock
mutations. They exist to make the prototype run standalone — the real app already has
its data layer.

**To run the prototypes:** serve this folder over HTTP (e.g. `npx serve`) and open a
`.html` — the `.jsx` load via Babel in the browser. Opening from `file://` may be
blocked by CORS.

---

## 16. Suggested build order

1. **Tokens + theming** (light/dark, accent + radius as tokens, the two fonts).
2. **Sign in** + auth gate.
3. **Home** (net summary + the states) and the **friendly identity** layer (nickname
   + avatar + local store).
4. **Group detail** — balance hero, **timeline**, **add/edit expense**, **settle
   gate**.
5. **FlowWidget** — wrap all writes; wire the resilient "Saved — updating…" return.
6. **Wallet + Add funds** (WalletCard / WalletStrip / AddFundsPanel) — observe the
   real balance read; the settle gate derives from it.
7. **Your Ponti** (profile + invite QR/link + advanced details) and **Add someone** +
   **Scanner**.
8. **Desktop/responsive** layout (confirm which of the three with the user).
9. **Consistency pass** — mobile↔desktop sweep of copy, states, dark mode; confirm
   nothing is left in Spanish and no crypto jargon slipped in.

---

## 17. Copy spec — locked strings (Jun 16 re-export)

> This appendix is the canonical English copy for the surfaces touched in the Jun 16
> pass. Voice = **wink** (warm, light, sure — *"your money, not ours"*; Ponti never
> holds funds); **numbers stay calm and uncolored**; no crypto jargon; written to travel
> cleanly to es/pt (no English-only puns). This pass is **copy + contract only** — the
> logic/data/flow live in the repo.

### 17.1 Plain-language sweep (kill the jargon)

| Surface | Was (jargon / unclear) | Now (locked) |
|---|---|---|
| **Home — net caption** | "NET" | **"across everyone"** — the running total across all the people you share with |
| **Home — net vs wallet** | two amounts competing as one | **Net = headline** (big proportional amount + DirChip + "across everyone"); **wallet = secondary strip below**, set off so they never merge (§8.2) |
| **Wallet label** (WalletCard / WalletStrip eyebrow) | "Your USDC" | **"Funds available"** ("USDC" stays only as the unit suffix on the number) |
| **Post-write refresh** (grey, never red) | "Confirmed on-chain — refreshing…" | **"Saved — updating…"** |
| **Post-write, refresh still lagging** | "Confirmed on-chain — reload to see the latest" | **"Saved — reload to see the latest."** |
| **Group list — section header** | "Groups" | **"People you share with"** |
| **Group row — secondary tag** | mock tag ("Apartment", "US ↔ Chile") | **deferred** with group naming/tagging (§14); until then a neutral last-activity line, **never an invented label** |

### 17.2 Add funds (guide → waiting → received) — plain, non-crypto

- **Guide intro:** "Add USDC so you're ready to settle up. It's free — we'll point you to a page that hands out test funds. Takes about a minute."
- **Steps (the only place "Base"/"faucet" appear):** "Copy your address" → "Open the funds page ↗" → on that page: "Pick **USDC** on the **Base** network," "Paste your address," "Up to 20 every 2 hours."
- **Waiting:** "Waiting for your funds… you can leave this open — it'll update on its own." *(auto-detecting; no manual refresh button; never red; close hidden here)*
- **Received:** "Funds received ✓ — you're ready to settle."

### 17.3 Add someone / Your Ponti — "your Ponti ID is your username"

- **Your Ponti (share side):** "This is your **Ponti ID** — like a username. Share it so someone can start a shared tab with you." Actions: **Share link** · **Show QR code** (the ID itself is copyable). *(No raw `0x`, no "address".)*
- **Add someone (receive side):** "Have someone's Ponti ID? Paste their link or scan their QR to start a shared tab." Actions: **Paste a link** · **Scan a QR code**.

### 17.4 FlowWidget copy pools (wink — LOCKED)

**Architecture:** `confirmSub` + `runningNote` + `doneTitle` are **shared by state**;
**`doneSub` is per-action** and **distinct from `doneTitle`** (never repeats a title).
Numbers never rotate, never colored.

**`confirmSub` (shared):**
- "Just the two of you and the math. Your money, not ours."
- "You, them, and the numbers. We never hold a cent."
- "One approval and it's logged. Ponti never touches the money."
- "You're in control — one tap, and we keep the count."

**`runningNote` (shared):**
- "Hang tight — this only takes a moment."
- "One sec — putting it where it belongs."
- "Almost there — you can keep this open."

**`doneTitle` (shared, short):** "Squared away" · "Sorted" · "All set" · "Done"

**`doneSub` (per-action — `{name}` = counterparty nickname):**
- **create:** "Your shared tab with {name} is ready." · "You and {name} are connected — start adding what you spend."
- **add:** "On the tab — the balance just updated." · "Added. Future-you will thank present-you."
- **edit:** "Updated — the balance recalculated to match." · "Fixed. The tab remembers the new details."
- **delete:** "Removed — the history still notes it was there." · "Gone from the balance; the trail keeps the record."
- **settle:** "You and {name} are even again." · "Balance back to zero — nothing owed either way."

### 17.5 FlowWidget error states (NEW — both wink, never alarm-red)

| Case | What really happened | Title | Subtitle | Actions |
|---|---|---|---|---|
| **send-failed** | Nothing happened — the write never submitted | **"That didn't go through"** | "Nothing moved and nothing's lost — give it another go." | **Try again** (primary) · Cancel |
| **receipt-failed** | It **did** go through; we only lost the confirmation signal (mined, refresh/index lagging) | **"It's saved — just catching up"** | "Your change went through. We're still waiting on the confirmation to show — it'll appear on its own." | **Done** (primary; closes to the grey "Saved — updating…") · *quiet* "Reload to see the latest" |

> **Rule:** `receipt-failed` carries **no failure framing and no re-send** — the write
> already succeeded; offering "try again" would risk a duplicate. This mirrors §11's
> resilient-refresh contract: a refresh/index lag must never look like a write failure.

### 17.6 Add / Edit expense form copy (see §8.4 for layout)

- **Subtitle** — Add: "Add what you paid for — Ponti keeps the count." · Edit: "Fix the details — the balance updates to match."
- **Field labels:** "Who paid?" · "What for?"
- **Placeholder:** "e.g. Groceries"
- **Primary button** — Add: "Review & add" · Edit: "Review changes"
- **Payer toggle buttons:** "You" / the counterparty's nickname.
</content>
