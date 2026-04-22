# Memories — user workflow (hi-fi + wireframe reference)

## Document control

| Field | Value |
| --- | --- |
| **Purpose** | Single place for **capture → save → list** flow: screenshots, flow diagram, and low-fi layout notes. |
| **Used by** | [product-requirements.md](product-requirements.md), future `technical-design.md`, design/wireframe work |
| **Screenshots** | `docs/assets/workflow-screenshots/*.png` (7 steps, committed to repo) |
| **Last updated** | 2026-04-22 |

---

## Flow overview (mermaid)

```mermaid
flowchart LR
  A[1 Photograph] --> B[2 Name and Room]
  B --> C[3a Prompt]
  C --> D[3b Recording]
  D --> E[4 Review and Save]
  E --> F[Success]
  F --> G[Memories list]
```

**Context bar (all capture steps):** “Facilitating for [Client]” — Guide-led capture for an elder; aligns with handoff and PRD `ClientAccess` / facilitator model.

---

## Step-by-step (hi-fi screenshots)

Paths are relative to this file (`docs/`).

### 1 — Photograph (Step 1 of 4)

![Step 1: photograph the object](assets/workflow-screenshots/01-step-1-photograph.png)

- Header: back, title **Capture Memory**, close.
- Progress: **Step 1 of 4 · Photograph**, ~25%.
- Primary: camera / viewfinder area; optional **Choose from Library**.
- Primary CTA: **Continue**.

### 2 — Name and room (Step 2 of 4)

![Step 2: object name and room chips](assets/workflow-screenshots/02-step-2-name-room.png)

- Photo thumbnail + retake.
- **Object name** (required); **Room** chips (required in Guide flow per PRD **FR-007**).
- CTA: **Continue**.

### 3a — Story prompt (Step 3 of 4, before record)

![Step 3a: Ohana Guide suggested prompt](assets/workflow-screenshots/03-step-3a-prompt-record.png)

- Memory summary card (title + room).
- **Ohana Guide suggests** — warm question for facilitator to ask elder (maps to **FR-015**).
- Mic CTA + alternates: record video / type or transcribe.

### 3b — Recording (Step 3 of 4, active)

![Step 3b: listening / recording state](assets/workflow-screenshots/04-step-3b-recording.png)

- Stop control; status (e.g. “Listening to …”).
- Same prompt card for context.

### 4 — Review and save (Step 4 of 4)

![Step 4: review audio, optional tags](assets/workflow-screenshots/05-step-4-review-save.png)

- Progress 100%; playback + **Re-record**.
- Optional **Tags** (chips + add).
- CTA: **Save to [Client]'s Archive** — idempotent save / offline queue per **FR-013**, **FR-014**.

### 5 — Success

![Success: memory saved confirmation](assets/workflow-screenshots/06-success-saved.png)

- Confirmation + **View in Archive** / **Capture another memory**.

### 6 — Memories list (client context)

![Memories tab: list with FAB](assets/workflow-screenshots/07-memories-list.png)

- Client header + tabs; **Memories** active; cards (thumbnail, title, snippet, “Added …”).
- FAB **+** for new capture (**FR-010** pagination / counts as in TDD).

---

## Low-fi wireframe (ASCII) — same flow

Use for quick reviews when PNGs are not open. Boxes = major regions, not pixel-accurate.

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ < Capture Memory        X │  │ < Capture Memory        X │
│ [ Facilitating for … ]    │  │ [ Facilitating for … ]    │
│ Step 1/4 · Photo   25%    │  │ Step 2/4 · Name    50%    │
│ [====···············]     │  │ [========···········]     │
│                             │  │ [ thumb ] Photo · Retake │
│  Let's capture…            │  │ What is this?            │
│  [   camera / preview   ]  │  │ [ Object name________ ]  │
│  Or choose from Library     │  │ ROOM: [Living][Bed]…     │
│ [      Continue         ] │  │ [      Continue         ] │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Step 3/4 · Story    75%     │  │ Step 3/4 · recording        │
│ [ summary card ]            │  │ [ summary ] [ prompt box ] │
│ ┌ Ohana Guide suggests ─┐  │  │        ( STOP )           │
│ │  “Ask …”              │  │  │   Listening…            │ │
│ └────────────────────────┘  │  │  video | type instead   │ │
│        ( MIC )              │  └─────────────────────────────┘
│  Tap when ready…            │
└─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Step 4/4 · Review   100%    │  │ ✓ Memory saved            │
│ [ summary ]                 │  │ …in archive…              │
│ Play · waveform · Re-record │  │ [ View in Archive      ]  │
│ TAGS optional · +Add        │  │ Capture another memory    │
│ [ Save to … Archive      ]  │  └─────────────────────────────┘
└─────────────────────────────┘

┌─────────────────────────────┐
│ <  [EK] Eleanor Kim  …      │
│ Overview | Journey | Mem* │
│ RECENTLY ADDED    42 mem   │
│ ┌─────────────────────────┐│
│ │ [thumb] Title… snippet  ││
│ └─────────────────────────┘│
│                        ( + )│
└─────────────────────────────┘
```

---

## PRD / TDD trace (quick)

| UI step | PRD (examples) | TDD will specify |
| --- | --- | --- |
| Photo / library | **FR-005**, **FR-011** | Upload, MIME/size, client resize |
| Name / room | **FR-007** | Validation, i18n limits |
| Prompt | **FR-015** | API contract, fallback copy, latency **NFR-005** |
| Record / playback | **FR-006**, **FR-008**, **FR-009** | MediaRecorder, storage, STT job |
| Review / tags | **FR-016**, **FR-017** (phased) | Tag model, permissions |
| Save | **FR-013**, **FR-014**, **FR-019** | Idempotency, queue, audit |
| List | **FR-010**, **FR-012** | Pagination, authz |
| Simplicity | **NFR-012** | Copy deck, touch targets, max actions per screen |

---

## Next steps for you

1. **Commit** `docs/assets/workflow-screenshots/*.png` and this file with git.  
2. **Technical design:** add a section that links here and maps each step to routes, API calls, and state machines.  
3. **Wireframes:** treat this doc as **reference hi-fi**; use ASCII above or designer-wireframe skill for empty/loading/error states not shown in screenshots.

You do **not** need to re-save screenshots elsewhere if they live under `docs/assets/workflow-screenshots/` as committed files (already copied from Cursor’s asset cache into the repo).
