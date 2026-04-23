# Multi-list web app — product requirements

## Document control

| Field | Value |
| --- | --- |
| **Author** | Ken Levy |
| **Status** | Draft |
| **Version** | 0.29 |
| **Last updated** | 2026-04-22 |
| **Related docs** | [technical-design.md](technical-design.md) v0.25; [development-plan.md](development-plan.md) v1.15; [implementation-log.md](implementation-log.md); [runbook.md](runbook.md); [adr/README.md](adr/README.md); [tech-stack.md](tech-stack.md) v1.19; [design-wireframe.md](design-wireframe.md) v0.50; **v1.1:** [product-requirements-v1.1.md](product-requirements-v1.1.md) (**invite email** — **FR-V11-S01**); full PRD (future); `.cursor/skills/product-manager/reference.md` |

---

## Who it’s for

People who juggle **many lists** day to day — **tasks**, **groceries**, **shopping** (e.g. clothes, hardware), and similar. Some lists are **shared**: for example, **partners** co-managing a **grocery** list. The product stays **general-purpose** (not limited to one list type).

---

## Executive summary

A **responsive** web app helps these users manage **multiple lists** on **phone and desktop** browsers. **MVP** uses **email** sign-in and verification. They organize items with **done** states, **delete**, and **alphabetical or custom** order. Lists can be **shared** as **independent copies** (**duplicate**) — a **point-in-time snapshot** that then **diverges** per user — or as **one shared list** (**sync**) with **User** vs **Co-owner** roles. **Invitees** discover pending invites via an **in-app toast** that lists **all pending invites** (**FR-S16**); **sharer** outcomes stay **in-app** per **NFR-06**. **Clarification:** the **MVP baseline** did **not** require a **transactional “you were invited” email** to invitees — only **magic-link** email for **sign-in**. **v1.1** adds optional **invite delivery email** (outbox + one-time accept link) as **FR-V11-S01** in [product-requirements-v1.1.md](product-requirements-v1.1.md); it **supplements** **FR-S16** and still does **not** add SMS, push, or marketing-style **notification** channels. This document is the **baseline** requirements; a **full PRD** will add journeys, acceptance criteria, and rollout detail.

**Key rules (by ID):**

- **Lists & items:** **50** Unicode code points max per list name and item; names **unique per user** (**FR-L03**, **FR-L04**, **FR-L10**); **unlimited** lists per user (**FR-L05**). List surfaces show **Private** vs **Shared** (**FR-L11**); **sync** lists show **who** it’s shared with (**FR-L12**).
- **Sharing:** **Duplicate** (snapshot → diverge) vs **sync**; **server-connected** accept (**FR-L09**); **no global revoke** for all participants (**non-goals**). **Creator** and **co-owners** are **owners**; **co-owners** may **reshare**; **owners** may **remove** any other participant (**FR-S07**, **FR-S12**, **FR-S13**). **Sync** list **deleted** when **zero** **Users**, **no** **creator**, and **no** **co-owners** (**FR-S14** **(a)**). Otherwise **at least one owner** is maintained; if **no owner** remains but **Users** do, **succession** picks a **sole owner** (**earliest accept**, **PRNG** tie—**FR-S14** **(c)**). **Creator** may be **absent** while **co-owners** remain. **Sync** **list title** conflicts: **last writer wins** (**FR-S15**).
- **Invites:** **Rolling 72 hours** expiry (**FR-S05**); **silent** expiry for invitee (no dedicated expiry toast); **in-app** for sharer (**FR-S10**); **final-only** server outcomes (**FR-L09**). **Rename/decline** collision UI; **Escape** / **outside click** / **Cancel** / **tab close** → **pending**, not **declined** (**FR-L09**).
- **Security & quality:** **HTTPS** (**NFR-01**); **WCAG 2.2 AA**-oriented **a11y** (**NFR-04**); **support** sees **membership**, **list titles**, and **audit logs** within **NFR-08** scope; **audit** events remain **list lifecycle** only, not **items** (**NFR-08**).
- **Success (MVP week 1):** **≥2** **registered users**, each with **≥1** list created (**Success metrics**).

---

## MVP scope (short doc)

This baseline defines **MVP** as:

- **Identity:** **Email** sign-in and verification **only** — **no** phone / SMS auth in MVP (post-MVP in full PRD). **MVP auth is unchanged:** **magic-link** email for **every** sign-in (see technical design). **Post-MVP** adds **password** sign-in for **returning** users and reserves **magic links** for **first-time** login only — see **Post-MVP — Authentication**.
- **Connectivity:** **Online use** — **no** offline mode, **no** offline sync, **no** client-side offline queue or item-level reconciliation in MVP.
- **Sharing:** **Duplicate** and **sync** (with **User** / **Co-owner** roles) are **in** MVP.
- **Abuse / scale:** **No** product-mandated **API rate limits** in MVP (may be added later for operations or safety).

Deferred **FR-OF\*** / reconciliation content is kept under **Post-MVP** for roadmap continuity.

---

## Goals

- Secure per-user access and data isolation, with explicit rules for multi-party shared lists.
- **Responsive** experience on **mobile and desktop** browsers.
- Simple list lifecycle: create, select, delete (with confirm + short undo).
- Clear done vs not-done presentation and accessible core actions.
- Sharing that supports independent copies (duplicate) and multi-user synced editing (sync) with **roles** and **co-ownership**.

## Non-goals (current)

- Native installed apps (browser-first unless reprioritized).
- **MVP:** **Phone / SMS** sign-in, verification, or invite identifiers beyond **email** (full PRD / post-MVP).
- View-only collaborators on **sync** lists (sync is **edit-only** for participants).
- **MVP:** **Offline** use, local-first sync, and **item-level** offline reconciliation (**Post-MVP**).
- **MVP:** Product **rate limits** on list create / share (may be added later).
- **Email, SMS, or push** notifications (see **NFR-06**; **in-app** toasts and **in-app** sharer notifications only for MVP).
- **Global / “revoke for all”** end to a **sync** (no single action that ends sync for **every** participant at once; use **leave** / **remove** / **two-user** rules in **FR-S03**–**FR-S08** instead).

---

## User identity & authentication

- **MVP — Sign-in:** User signs in with **email magic links** only (no password field in MVP; implementation in technical design).
- **MVP — Verification:** **Email** verification per technical design (magic-link consumption establishes session).
- **Post-MVP — Passwords + first-time magic links:** **Returning** users sign in with **email + password**. **New** users (first successful login / account bootstrap) complete identity via **magic link** only; after that, **subsequent** sessions use **password** (exact onboarding and **password reset** flows in full PRD / technical design). **v1.1** stores passwords at rest as **Argon2id** hashes — [technical-design-v1.1.md](technical-design-v1.1.md) §3.1.
- **Post-MVP (full PRD):** **Phone (SMS)** sign-in / verification; invitee identifiers aligned with **email or phone**.
- **Account recovery** when the user **changes email** (re-verification, security steps—full PRD).
- **Account closure** effects on **sync** ownership: **FR-S14**.
- **MVP — Sharing / invites:** Invitees are identified consistently with **email** login (e.g. invite by email).
- Exact flows, edge cases, and compliance notes belong in the full PRD.

---

## Lists

| ID | Requirement |
| --- | --- |
| **FR-L01** | User can **create**, **select** (active list), and **delete** lists. |
| **FR-L02** | List **name is required**. Before validation, **trim leading and trailing whitespace**; reject names that are empty after trim. |
| **FR-L03** | List names are **unique within each user’s library**, compared **case-insensitively**. **Different** **users** may each have a list with the **same** **name**; **FR-L09** / **FR-S09** apply **per user**. |
| **FR-L04** | List name **maximum length is 50**, counted in **Unicode code points** (scalar values). |
| **FR-L05** | There is **no maximum** number of lists per user. |
| **FR-L06** | **Empty lists** (no items) are allowed. |
| **FR-L07** | **Zero lists** is allowed: the UI shows only what is needed to **create the first list** (e.g. a prominent create action) until at least one list exists. |
| **FR-L08** | **Delete list** requires a **confirmation dialog**. After delete, **undo is available only for 30 seconds** via a **toast**; after that, delete is final. |
| **FR-L10** | **Rename list:** A user **cannot rename** a list to a name that **conflicts** with **another** of **their** lists: the **new name** must satisfy **FR-L02**–**FR-L04** and **FR-L03** (case-insensitive **uniqueness** in **their** library). |
| **FR-L11** | **List library / switcher:** Wherever the user’s lists are shown as **selectable entries** (e.g. list switcher, library), each entry shows the **list name** and whether the list is **Private** or **Shared** (**MVP** definitions below). |
| **FR-L12** | **Who it’s shared with:** For lists marked **Shared**, the user can **see who** the **sync** list is shared with — **participants** (e.g. **email** or display label per technical design), including **role** on the list (**Creator**, **Co-owner**, **User** per **Sharing** glossary). **Full PRD** for layout (inline vs detail panel, long lists). **MVP note:** **Duplicate-only** outbound shares (no **sync**) do **not** require a **Shared** / participant roster on the sharer’s list; those copies are **independent** after accept (**FR-S01**). |

### FR-L11 / FR-L12 — Private vs Shared (MVP)

- **Private:** The list is **not** a **sync** list **with any other accepted participant** — i.e. only this account uses it as a **sync** list, **or** it is not participating in **sync** at all (including lists never shared and **duplicate** originals that only ever used **duplicate** mode).
- **Shared:** The list is a **sync** list and **at least one other accepted participant** is on it (anyone besides the viewing user counts as “others” when the viewer is also a participant).

### FR-L09 — Share accept, name collision, server state

**Server-connected only (MVP):** A user may **accept** a **duplicate** or **sync** share request only while **connected** to the server (MVP does not support offline use). **Offline** accept is **out of scope** for MVP.

**Name collision (duplicate or sync):** When accepting a **shared** list and a list **already in their account** uses the **same name** (case-insensitive, per **FR-L03**), after the user starts accept the product shows a **dialog** to **rename** the **pre-existing** list **or** **decline** the **invite** (**duplicate** or **sync**).

- **Rename path:** Submitting a **new name** for the **pre-existing** list that satisfies **FR-L02**–**FR-L04** and **FR-L03** / **FR-L10** **completes** accept (join / duplicate received) and clears the conflict; the **incoming** list keeps the **shared** name.
- **Decline path:** Explicit **decline** ends the invite: user **does not** receive the **duplicate** or **join** the **sync**, **pre-existing** name **unchanged**, **sharer** notified per **FR-S10** as **declined**.
- **No response / cancel:** If the user **does not** complete **rename** **or** **Decline**, **neither** accept nor decline is recorded and the **invite** stays **pending** (**no response yet**). **Closing** the dialog via **Escape**, **click outside** the dialog (when used), **Cancel** (if shown), or **closing the browser tab** that shows the dialog—**without** **Decline** or a **successful rename**—has the **same** effect: **pending** (**not** **declined**; **FR-S10** **decline** does **not** apply). The user may resume from **invites** (or equivalent) until **FR-S05** expiry.

**Server state (invite outcomes):** The **server** persists **only** **final** outcomes for an invite—**accepted**, **declined**, or **expired** (**FR-S05**)—not **in-progress** or “dialog open” state.

**Trade-off:** Loss of connectivity or a crash **before** the **final** commit means the user **retries** from **invites**; there is **no** partial membership on the **server** until accept completes.

---

## Items (within the active list)

| ID | Requirement |
| --- | --- |
| **FR-I01** | User can **add** items. **Trim leading and trailing whitespace**; reject if empty after trim. |
| **FR-I02** | Item text **maximum length is 50**, counted in **Unicode code points** (same counting rule as list names). |
| **FR-I03** | User can **toggle done** with a **checkbox** (or equivalent) **before** the item text. |
| **FR-I04** | User can **delete** an item. |
| **FR-I05** | **Done** items: checkbox **checked**, **lighter** text than not-done items, **strikethrough** on the item text. |

---

## Ordering

| ID | Requirement |
| --- | --- |
| **FR-O01** | User can set item order to **alphabetical** or **user-defined (custom)**. |
| **FR-O02** | Switching to **alphabetical** changes **display only**; the **underlying custom order is preserved**. |
| **FR-O03** | Switching back to **custom** restores the **preserved custom order**. |
| **FR-O04** | **New items** in custom mode appear **at the top** (define “new” by creation time in the full PRD). |
| **FR-O05** | If the user **never** had a saved custom order, entering custom mode **initializes** order from the **current alphabetical order**; thereafter **FR-O04** applies. |

---

## Sharing

Share modes; the sharer chooses the mode when sharing. A list may be shared with **multiple** invitees at once.

**MVP share dialog:** Invitees are added in one place only — the **Invitees** section (one email field per row, with a control to add another row). There is **no** separate bulk “paste many emails” field parallel to that list, so the flow stays unambiguous.

**Invitee account hint (MVP):** For each entered address (including after paste), the product may call the server to show whether that email matches an **active** account (**registered**) vs **not registered yet**. Invites remain valid either way; the hint is informational for the sharer.

**Self-invite and duplicate invites (MVP):** The sharer **cannot** invite **their own** email address. The sharer **cannot** send another invite to the same address for the same list while an invite for that address is still **pending** or has been **accepted** (declined or expired invites may be replaced with a new invite later).

**Share dialog roster (MVP):** The share UI lists **pending** and **accepted** outbound invites for that list so the sharer can see who was already invited.

### Glossary — **sync** lists only (roles)

Terms below apply to participants on a **sync** list (not to the word “user” meaning an account in general).

| Term | Meaning |
| --- | --- |
| **Creator** | The account that **first shared** that list to start the **sync** (**original sharer**). |
| **Co-owner** | A participant who **accepted** a **sync** invite **as Co-owner**. |
| **User** | A participant who **accepted** a **sync** invite **as User** (role name; capitalized when meaning the role). |
| **Owner** | **Creator** or **Co-owner** — anyone with **ownership** rights (**FR-S07**, **FR-S12**, **FR-S13**). |

For each **sync** invite, the sharer assigns the invitee as either **User** or **Co-owner** (**FR-S12**). The **creator’s account** may be **closed** while **co-owners** remain.

| Mode | Behavior |
| --- | --- |
| **Duplicate** | Each **invited user** who **accepts** receives a **duplicate** that is a **point-in-time snapshot** of the list (items and state at accept); **after** accept, that copy **diverges** independently per user. **Accept** requires a **server connection** (**FR-L09**). **Decline** or **expiry** means **no** copy for that user. **Each acceptance is independent.** |
| **Sync** | **One shared list** for all **accepted** participants; **any** participant may **edit**, and **all** see changes. **Edit is the only mode**. **Accept** requires a **server connection** (**FR-L09**). **Each invitee who accepts joins** with the assigned role (**User** or **Co-owner**). **Any participant may leave** and take a copy (**FR-S03**, **FR-S04**). **Creator** and **co-owners** may **remove any other participant** (**FR-S07**). **Co-owners** may **reshare**; **Users** may not (**FR-S13**). |

| ID | Requirement |
| --- | --- |
| **FR-S01** | **Duplicate** share: **each** accepting user gets an **independent** copy from a **snapshot** at accept, then **diverges**; **declined** or **expired** users get **nothing**. |
| **FR-S02** | **Sync** share: **all** **accepted** participants share **one** list; **any** editor’s changes are visible to **all** others (**MVP:** **online**; **real-time** / server-visible semantics per technical design). |
| **FR-S03** | **Sync — participant leaves (two users):** If exactly **two** users are synced and **one** stops participating, **both** retain **their own copy** of the list (current state); the **sync ends** for both. |
| **FR-S04** | **Sync — participant leaves (> two users):** If **more than two** users are synced and **one** stops participating, that user retains **their own copy** (current state). **Remaining users** **continue to sync** on the **same shared list**. |
| **FR-S16** | **Invitee discovery (MVP):** The product shows a **toast** that lists **all pending invites** so the invitee can open and act on them. **NFR-06** rules out **SMS**, **push**, and **email-as-notification-product** for share events; **v1.1** adds **transactional invite email** (**FR-V11-S01**) as an **optional** channel in the same class as **magic-link** mail — **FR-S16** remains the **primary** in-app path for signed-in users. **Full PRD:** timing (on load, on navigation, dismiss rules), empty state, and accessibility. |
| **FR-S06** | Invites may target **multiple** users; **each** invitee’s outcome is **independent**; **accepted** invitees gain access **as they accept** (**partial** membership is normal). |
| **FR-S08** | **Any** sync **participant** may **stop sharing** that list for themselves (leave sync and take a copy); **FR-S03** and **FR-S04** apply. |
| **FR-S10** | The **sharer** is **notified** (**in-app only**, **NFR-06**) when an invite is **accepted**, **declined**, or **expired** (duplicate and sync). |
| **FR-S11** | For **sync** (and **duplicate** batch invites): **accepted** invitees have the appropriate **access**; **declined** or **expired** invitees have **no access**. The **sharer** receives notifications per **FR-S10** for each invitee outcome. |
| **FR-S12** | For **sync** invites, the sharer assigns each invitee as a **User** or **Co-owner**. **Co-owners** gain **ownership** rights (**FR-S07**, **FR-S13**); **Users** do not. |
| **FR-S13** | **Co-owners** may **reshare** the sync list (invite others per **FR-S12**). **Users** may **not** reshare. |
| **FR-S15** | **Sync list title (MVP):** If multiple participants change the **shared list title** close together, **last writer wins** as determined by **server** persistence order (**timestamp** / **version** — technical design). |

### FR-S05 — Share request expiry

**Share requests** (duplicate or sync) **expire after rolling 72 hours** from invite creation (or server-defined start event in technical design) if not **fully** **accepted** or **declined**—including invites left **pending**, or **opened** (e.g. **FR-L09** rename/decline) but **not** completed.

- **No reminders** and **no badging** for **expiration**.
- For the **invitee**, **expiry** is **silent** (no dedicated “expired” **toast** or **modal**; the request simply **no longer** applies and drops off **pending** surfaces).
- The **sharer** is still notified **in-app** per **FR-S10** (**expired**).
- **Help / static copy** should state that **invites expire after 72 hours** (placement and wording—**full PRD** / content) to reduce **support** confusion.

### FR-S07 — Remove participants

The **list creator** and **any co-owner** may **remove any other participant** from a **sync** list (**Users** and **other co-owners**, including the **creator** if the remover is a **co-owner**). The **removed** user receives **their own copy** of the list (current state, naming **FR-S09**). **All other participants** remain synced together. An **owner** may also **stop participating** like any other user (**FR-S03** / **FR-S04** apply). After any **leave** / **remove** / **account** closure, the **sync** **must** still satisfy **FR-S14** (**at least one owner** among participants, or **succession** / **delete**).

### FR-S09 — Copies after leave / remove / two-user end

Lists created as **copies** because a user **left sync**, was **removed by an owner**, or **two-user sync ended** use the **original list name** (the shared list’s name at copy time).

**Leaving** (or being **removed** from) a **sync** list **does not** create an **FR-L03** name-collision flow: the user **already accepted** when their library satisfied **FR-L03** (or they **renamed** at **accept** per **FR-L09**), and **ongoing renames** cannot create a **clashing** name for **another** list (**FR-L10**), so the **personal copy** is created **without** the **FR-L09** rename/decline dialog.

**No** **sharer** or participant **notification** is required for receiving this **copy**.

### FR-S14 — Owner minimum & succession

**(a) Delete:** **Delete** the **sync** list if there are **zero** **Users** (**User** role) **and** **no** **creator** **and** **no** **co-owners** on the list (no remaining **participants** in **any** role).

**(b) At least one owner:** If the list is **not** deleted under **(a)**, a **sync** **must** have **at least one** **owner** (**creator** or **co-owner**). The **creator** may be **absent** (e.g. **account** closed) while **one or more co-owners** remain.

**(c) Succession from Users:** If **at least one** **User** remains but **no** **owner** remains—because **all** **owners** have **closed their account**, **left** the sync, **deleted** the shared list (**full PRD**), or **otherwise vacated** **owner** status—then among **remaining** **Users**, assign **one** **sole owner**:

- **Earliest** server-recorded **sync** **accept** time.
- If **two or more** **Users** tie, the **server** chooses the **sole owner** using a **server-side** **PRNG**, **uniform** among the tied **Users** (the **client** does **not** perform this draw).

**(d) Promoted owner:** A **User** promoted under **(c)** has the **same** **owner** capabilities as **creator** / **co-owners** (**FR-S07**, **FR-S12**, **FR-S13**).

**Logging / UX:** **No logging** of the **tie-break** itself (e.g. PRNG seed, intermediate draw, or audit trail for the random step) is required; ordinary persistence of **who is owner** after transfer is unaffected. **No** **user-facing** disclosure that ownership was assigned **randomly** (edge case).

---

## Post-MVP — Authentication

*Not in MVP; **MVP** stays **magic-link email for all sign-in**. Retained for roadmap and full PRD.*

- **First-time login:** **Magic link** to email (same trust model as MVP magic links; **not** used as the routine sign-in path after the account has completed first login).
- **Returning login:** **Email + password**; **password reset** and rate limiting per technical design when implemented.
- **MVP boundary:** No password storage, password login API, or password-reset email in MVP unless explicitly rescoped.

---

## Post-MVP — Offline & sync reconciliation

*Not in MVP; retained for roadmap and full PRD. **Persistent data on the device** (local store) holds a **copy** of list data for **offline** use; the **server** remains **system of record** when online (**FR-OF02** reconciliation).*

| ID | Requirement |
| --- | --- |
| **FR-OF01** | The application maintains a **local copy** of data so the user can use the app **offline** (scope: what is cached, read/write rules in full PRD). |
| **FR-OF02** | When back online, data **reconciles** with the server. |
| **FR-OF03** | For **sync** lists, when **conflicting offline edits** target the **same item** (same logical item identity), **one** edit is kept using the reconciliation policy below. |

### Reconciliation policy (post-MVP): “newest edit wins” (same item)

1. **Authority:** The server records a **revision** for each item on every successful write — preferably a **monotonic integer `version`** incremented per item (avoids clock skew). Acceptable alternative: **`updatedAt`** in **UTC** with **millisecond** precision assigned **only** when the server persists the change (not client clock alone).
2. **Winner:** When two mutations conflict on the same item, the mutation with the **higher** `version` (or later `updatedAt`) **wins**. The losing mutation is **discarded** for that item.
3. **Ties:** If two mutations would have **identical** revision timestamps (or same `version` — should not happen with a proper per-item version counter), break ties with a **deterministic** secondary key, e.g. **lexicographic order of a client-generated mutation ID** (UUID) attached to each write, so results are **reproducible** across clients.
4. **UX:** If the user’s **offline** change loses, show a **short, non-blocking message** (e.g. toast) that the item was updated elsewhere and their edit was not applied; optional **detail** or **undo** is out of scope unless added in the full PRD.

**Engineering note:** Pair each queued offline mutation with the **base `version`** (or revision) the client had when editing; if the server’s current version is newer before applying the mutation, treat as conflict and apply **FR-OF03** without clobbering the newer server state incorrectly.

---

## Non-functional requirements

| ID | Requirement |
| --- | --- |
| **NFR-01** | All authentication and API traffic uses **HTTPS**. |
| **NFR-02** | **Authorization** enforces per-user data access; **shared** access only per share rules (Duplicate vs Sync) and **role** (User vs Co-owner). |
| **NFR-03** | **Responsive design:** UI is usable on **mobile and desktop** viewports (breakpoints, touch targets, and keyboard vs touch in full PRD). Core mobile paths should have automated browser coverage in CI (Android + iPhone emulation). |
| **NFR-05** | **MVP:** **Browser** **session**, **credentials**, and **tokens** are handled **securely** (technical design). **Post-MVP:** offline / local storage hardening as under **FR-OF\***. |
| **NFR-06** | **MVP — Notifications:** **No** **SMS** or **push** for sharing. **No** **marketing** or **digest** email about share activity. **Sharer** notifications are **in-app** (**FR-S10**). **Invitees** see **pending invites** via **in-app toast** (**FR-S16**). **Transactional** email for **invite delivery** (one-time accept link, same operational class as **magic-link** auth mail) is specified in **v1.1** as **FR-V11-S01** and **does not** replace **FR-S16**. |

### NFR-04 — Accessibility

Meet **WCAG 2.2 AA** (or agreed target) for **core flows**.

- **Keyboard:** **mark done / not done**, **delete item**, and **primary** sharing / invite actions without requiring a pointer.
- **Focus order** is **logical** and **visible**.
- **Modals** and **dialogs** do **not** trap focus.
- For **FR-L09** rename/decline: **Escape**, **click outside** (if used), and **Cancel** **dismiss** the dialog with **pending** invite (**not** **declined**) per **FR-L09**; other dialogs follow platform conventions.
- **Screen reader** labels (and **ARIA** where appropriate) for **lists**, **items**, **Private** / **Shared** state (**FR-L11**), **participants** where shown (**FR-L12**), **sharing**, **roles**, **invite** states, and **pending-invite** toasts (**FR-S16**).

**Full PRD** for audit checklist and component-level criteria.

### NFR-08 — Support tooling & audit (MVP)

**MVP — Support visibility:** Support staff can access **current list membership** (roles per **Glossary**), **list titles**, and the **audit log** for events in scope below. **List item** content (task/grocery line text) is **not** exposed to support unless a future **support tier** or policy says otherwise.

**Future:** **Different support levels** or **roles** (e.g. read-only vs operations) may be introduced later; this doc defines the **current** MVP bar.

**Audit trail:** The system maintains an **audit trail** for **list creation**, **sharing** (invite, accept, decline, expiry, leave, remove, and other share-level events—**full PRD** / technical design for the exact event set), and **list deletion**. **Item**-level edits and **item** content are **not** included in this audit trail.

---

## Success metrics (MVP)

- **Week 1:** **At least 2** distinct **users** who have **created an account** and **each** has **created at least one list** in **their** account.

---

## Data retention

- **No** formal **data retention schedule** is specified in this document (MVP).
- **Scope assumption:** The product **will not** ship in **regulated** contexts (e.g. where the app would be in scope for sector-specific regimes). Baseline **security** and **privacy** practices still apply; **jurisdictional** or **regulated-product** obligations are **out of scope** for this short doc unless strategy changes.

---

## Locked decisions

- **Regulated contexts:** **Not** targeting regulated shipping; see **Data retention**.
- **MVP scope:** **Email** only; **no** offline; **no** product **rate limits**; **sync** + **duplicate** in MVP — see **MVP scope**.
- **Post-MVP direction (MVP unchanged):** **Password** sign-in for **returning** users; **magic link** reserved for **first-time** login. **Offline** roadmap keeps **local persistent copy** on device under **FR-OF\*** with **server authority** when connected.
- **Duplicate:** **Snapshot** at accept, then **independent** divergence per user.
- **Invitee discovery:** **In-app toast** listing **all pending invites** (**FR-S16**). **v1.1** adds **optional transactional invite email** (**FR-V11-S01**) — see [product-requirements-v1.1.md](product-requirements-v1.1.md).
- **Invite expiry:** **Rolling 72 hours** (**FR-S05**).
- **Sync list title:** **Last writer wins** on server (**FR-S15**).
- **Sync roles:** **Glossary** definitions for **Creator**, **Co-owner**, **User** (role), **Owner**.
- **Support (NFR-08):** Support uses **membership**, **titles**, and **audit logs** (scoped events); **items** not in audit; **item** content not in support surface for MVP; future **support tiers** possible.

---

## Document history (short)

| Version | Notes |
| --- | --- |
| 0.29 | **NFR-03:** added expectation for automated mobile browser coverage in CI (Android + iPhone emulation) to reduce regressions on touch-first devices; related-doc versions bumped. |
| 0.28 | **NFR-06** / **FR-S16:** clarified that **MVP** did **not** mandate **invite** email (only **magic-link** auth email); **v1.1** **FR-V11-S01** adds transactional invite delivery; cross-links to v1.1 PRD and updated related-doc versions. |

---

## Next steps

1. Expand to **full PRD** using the template in `.cursor/skills/product-manager/reference.md` (journeys, acceptance criteria per FR, rollout, metrics, risks).
2. Refine **technical design** ([technical-design.md](technical-design.md)): lock **TBD**s (auth, realtime, undo), **email** auth stack, data model detail, migrations; **post-MVP:** password + first-login magic links, phone/SMS, rate limits, offline queue + **FR-OF\*** reconciliation (local persistent copy).
3. **Design** wireframes: responsive layouts, zero-list state, list switcher (**FR-L11** / **FR-L12**: **Private**/**Shared** + participant visibility), **pending-invite toast** (**FR-S16**), sync invite (User vs Co-owner), reshare (co-owner only), item row, leave/remove flows, **FR-L09** (Escape/outside/Cancel = **pending**), **silent** **FR-S05** expiry + **help** copy (**72 hours**), **FR-L10** rename validation, **FR-S14** succession, **NFR-04** a11y patterns, in-app notifications (**FR-S10**).
