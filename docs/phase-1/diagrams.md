# Architecture Diagrams — Gym Member Fitness PWA

Phase: Phase 1 — System Architecture
Version: 0.1.0
Date: 2026-08-19

All diagrams use Mermaid. They are architectural diagrams; final UI is deferred to Phase 7.

---

## D1 — High-Level System Architecture

```mermaid
flowchart TB
    subgraph Device["Member Device (Browser / PWA)"]
        UI["Next.js PWA UI"]
        SW["Service Worker (Serwist)"]
        IDB["IndexedDB / Dexie"]
        UI <--> SW
        SW <--> IDB
    end

    subgraph Host["Vercel — Next.js"]
        SC["Server Components"]
        SA["Server Actions"]
        RH["Route Handlers"]
        RL["RLS-safe client reads"]
        ING["Ingestion Scripts (server-only)"]
    end

    subgraph Sup["Supabase"]
        AUTH["Supabase Auth"]
        PG[("PostgreSQL + RLS")]
        STORE["Storage (future)"]
    end

    subgraph Ext["External"]
        EDB[("ExerciseDB API")]
    end

    UI -->|HTTPS| SC
    UI -->|mutations| SA
    UI -->|HTTP API| RH
    UI -->|RLS-safe reads| RL
    SC --> PG
    SA --> PG
    RH --> PG
    RL --> AUTH
    RL --> PG
    AUTH --> PG
    STORE --> PG
    EDB -->|import| ING
    ING --> PG
```

---

## D2 — Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Next.js PWA
    participant S as Supabase Auth

    alt Email/Password Signup
        U->>App: Signup (name, email, password)
        App->>S: createUser
        S-->>App: verify email required
        App-->>U: "Check your email"
        U->>S: confirm link
        S-->>App: verification callback
        U->>App: Login
        App->>S: signInWithPassword
        S-->>App: session
    else Google OAuth
        U->>App: Login with Google
        App->>S: signInWithOAuth(google)
        S-->>U: Google consent
        U-->>S: authorize
        S-->>App: OAuth callback → session
    end
    App->>App: Route by onboarding completeness
    App-->>U: Onboarding (incomplete) | Dashboard (complete)
```

---

## D3 — Request / Data Flow

```mermaid
sequenceDiagram
    participant UI as UI Component
    participant UC as Application Use Case
    participant Dom as Domain Service
    participant Repo as Repository
    participant Sup as Supabase (RLS)

    UI->>UC: action(input)
    UC->>UC: validate (Zod)
    UC->>Dom: domain rule check
    Dom-->>UC: result
    UC->>Repo: persistence op
    Repo->>Sup: query/mutation (session-derived user)
    Sup-->>Repo: row(s)
    Repo-->>UC: result
    UC-->>UI: ViewModel (domain-shaped)
```

---

## D4 — Plan-Generation Flow

```mermaid
flowchart TD
    A["Onboarding Complete"] --> B["Select Base Plan by fitness_level"]
    B --> C["Load base plan template (30 days)"]
    C --> D["For each day: load exercises"]
    D --> E["Fetch user physical_concerns"]
    E --> F["Check exercise compatibility (deterministic)"]
    F --> G{"Compatible?"}
    G -- Yes --> H["Keep exercise"]
    G -- No --> I["Replace from controlled library (ranked)"]
    I --> J{"Safe replacement found?"}
    J -- Yes --> H
    J -- No --> K["Apply documented fallback (never unsafe)"]
    H --> L["Preserve workout structure"]
    K --> L
    L --> M["Create user_plans + user_plan_days"]
    M --> N["Day 1 unlocked; days 2–30 locked"]
    N --> O["Exactly one user plan (idempotent, no duplicates)"]
```

---

## D5 — Workout Player State Diagram

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> starting: Start
    starting --> active
    active --> paused: Pause
    paused --> active: Resume
    active --> resting: Exercise complete → rest
    resting --> active: Rest done / skip rest
    active --> active: Next exercise
    active --> interrupted: Exit / close / network loss
    interrupted --> resumable: persist state
    resumable --> active: Resume
    active --> skipped: Skip exercise
    skipped --> active: Next exercise
    active --> completed: Final exercise reached
    completed --> [*]
    skipped --> completed: Final exercise reached (skipped)
```

Note: reaching `completed` is allowed even if exercises were `skipped`.

---

## D6 — Offline Architecture

```mermaid
flowchart TB
    subgraph Online["Online"]
        SRV[("Supabase (source of truth)")]
        APP["App fetches today's workout + media"]
        PRE["Prefetch & cache required media"]
    end

    subgraph Offline["Offline"]
        IDB[("IndexedDB/Dexie")]
        SW["Service Worker cache"]
        PLAYER["Workout Player (timers work)"]
        OUTBOX["Outbox (pending sync records)"]
        RECENT[("Recent progress cache")]
    end

    SRV --> APP --> PRE
    PRE --> IDB
    PRE --> SW
    IDB --> PLAYER
    SW --> PLAYER
    PLAYER --> OUTBOX
    OUTBOX --> RECENT

    OUTBOX -->|on reconnect, idempotent sync| SRV
```

---

## D7 — Offline Synchronization Sequence

```mermaid
sequenceDiagram
    participant U as User (offline)
    participant P as Workout Player
    participant IDB as IndexedDB
    participant E as Sync Engine
    participant S as Supabase

    U->>P: Complete workout offline
    P->>IDB: save session + client_action_id (outbox: pending)
    IDB-->>P: ack (UI confirms)
    Note over E,S: Connectivity restored
    E->>IDB: read pending records
    loop each pending record
        E->>S: submit (client_action_id, payload)
        S->>S: validate + idempotency check
        alt valid & unique
            S->>S: insert/update in transaction
            S-->>E: success ack
            E->>IDB: mark synced
        else duplicate
            S-->>E: existing row ack
            E->>IDB: mark synced
        else permanent validation failure
            S-->>E: validation error
            E->>IDB: mark failed + diagnostics
        else transient failure
            S-->>E: retryable error
            E->>IDB: retry with backoff
        end
    end
```

---

## D8 — Discover Personalization Flow

```mermaid
flowchart TD
    A["User opens Discover workout"] --> B["Fetch workout + exercises"]
    B --> C["Fetch user physical_concerns"]
    C --> D{"Any incompatible exercise?"}
    D -- No --> E["Present original workout"]
    D -- Yes --> F["Replace each incompatible exercise (ranked deterministic)"]
    F --> G{"All replaced safely?"}
    G -- Yes --> H["Present modified workout"]
    G -- No --> I["Apply documented fallback (mark unavailable / safe fallback / adjust duration + explain)"]
    H --> J["User sees final (modified) workout"]
    I --> J
    E --> K["Start → Workout Player (source=discover)"]
    J --> K
    Note over A,J: Original fixed workout is NEVER modified globally.
```

---

## D9 — ExerciseDB Ingestion Flow

```mermaid
flowchart LR
    A["ExerciseDB API"] --> B["Fetch (paginated, throttled)"]
    B --> C["Validate (Zod)"]
    C --> D["Map / Normalize to internal DTO"]
    D --> E["Add our taxonomy (focus areas, levels)"]
    E --> F["Add safety metadata + restrictions"]
    F --> G["Add equipment relationships"]
    G --> H["Store in PostgreSQL (external_source + external_exercise_id)"]
    H --> I["Curate workouts + base 30-day plans"]
    I --> J["Member application reads from DB"]
```

---

## D10 — Data Ownership / Trust Boundary Diagram

```mermaid
flowchart TB
    subgraph Untrusted["UNTRUSTED (client)"]
        B["Browser (user input, session)"]
        SW["Service Worker (caches)"]
        IDB[("IndexedDB (local state, outbox)")]
    end

    subgraph Trusted["TRUSTED (server)"]
        NX["Next.js server (validation, domain rules)"]
        SAuth["Supabase Auth"]
        PG[("PostgreSQL + RLS")]
        ST["Supabase Storage (future)"]
    end

    subgraph External["EXTERNAL (content source)"]
        EDB["ExerciseDB (validated DTOs only)"]
    end

    B -->|validated inputs| NX
    B -->|RLS-safe reads| PG
    SW -->|approved static/media only| B
    IDB -->|outbox → validated sync| NX
    NX --> SAuth
    NX --> PG
    SAuth --> PG
    ST --> PG
    EDB -->|ingestion| NX
```

---

## D11 — Deployment Architecture

```mermaid
flowchart TB
    GH["GitHub"] --> CI["CI (typecheck, lint, unit, build)"]
    CI --> PV["Vercel Preview"]
    PV -->|approval| PROD["Vercel Production (Next.js)"]
    PROD --> SP["Supabase Project (Auth + Postgres + Storage)"]
    CI -->|migrations| SP
    PROD --> EDB["ExerciseDB (server-side ingestion only)"]
```

---

## D12 — Environment Architecture

```mermaid
flowchart TB
    subgraph Dev["Development"]
        DEVV["Vercel Local / Next.js dev"]
        DEVSP["Supabase Local (CLI) or dev project"]
        DEVENV[".env.local (dev secrets)"]
    end
    subgraph Prev["Preview / Staging"]
        PRV["Vercel Preview"]
        PRSP["Supabase Preview project"]
        PRENV["Preview env vars"]
    end
    subgraph Prod["Production"]
        PRDV["Vercel Production"]
        PRSP2["Supabase Production project"]
        PRENV2["Production env vars (separate secrets)"]
    end
    Dev --> Prev --> Prod
    note["Migrations applied per environment; credentials never shared across environments"]
```
