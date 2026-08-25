# PHASE 2 — DATABASE & ERD
# ========================
# GYM MEMBER FITNESS PWA
#
# PURPOSE:
# This prompt defines the complete execution rules for PHASE 2.
#
# Phase 2 converts the approved product requirements and system architecture
# into a production-ready relational database design for Supabase PostgreSQL.
#
# The database must support:
#
#     Authentication-linked member profiles
#     Fitness onboarding
#     Physical restrictions
#     Exercises
#     Exercise media
#     Exercise taxonomy
#     Equipment
#     Exercise safety restrictions
#     Fixed workouts
#     Discover categories
#     Three 30-day base plans
#     User-specific plan assignments
#     Plan progression
#     Workout execution
#     Exercise skipping
#     Workout resume
#     Workout sessions
#     Daily goals
#     Reports
#     Activity tracking
#     Weight history
#     BMI
#     Favorites
#     Streaks
#     Notifications/preferences
#     Offline synchronization support
#     ExerciseDB imported content
#     Future media replacement
#
# Phase 2 MUST produce a database that can support the application without
# requiring major schema redesign during implementation.
#
# ================================================================
# 1. PHASE OBJECTIVE
# ================================================================

PHASE_NAME:
    Phase 2 — Database & ERD

PRIMARY_OBJECTIVE:
    Create the final relational data model and Supabase PostgreSQL schema
    required to implement the approved Gym PWA.

PHASE 2 MUST DEFINE:

    Tables
    Columns
    Data types
    Primary keys
    Foreign keys
    Unique constraints
    Check constraints
    Default values
    Nullable vs required fields
    Enum strategy
    Many-to-many relationships
    Indexes
    Delete/cascade behavior
    RLS architecture
    RLS policies
    Public/private data boundaries
    Seed/reference data
    Database functions where justified
    Triggers where justified
    Views/materialized views only where justified
    Audit-related data where necessary
    Sync/idempotency storage where necessary
    Migration order
    Seed order
    Data integrity rules
    ERD
    Query patterns
    Database test strategy

PHASE 2 MUST NOT:

    Build the full frontend.
    Build final UI.
    Use Stitch.
    Build the complete workout player.
    Implement the full notification system.
    Implement the complete offline engine.
    Implement all application business logic.

PHASE 2 MAY:

    Create migrations.
    Create seed scripts.
    Create database policies.
    Create database functions required by the data model.
    Create temporary scripts to validate schema behavior.
    Create test SQL.
    Inspect existing Supabase configuration.

# ================================================================
# 2. SOURCE OF TRUTH
# ================================================================

READ FIRST:

    Master Project Context

    Phase 0:
        Product Requirements
        User Flows
        Functional Requirements
        Non-Functional Requirements
        Edge Cases
        Decisions

    Phase 1:
        System Architecture
        Application Architecture
        Domain Boundaries
        Data Flow
        Auth Architecture
        API Architecture
        ExerciseDB Architecture
        Workout Architecture
        Personalization Architecture
        PWA Architecture
        Offline Sync Architecture
        Security Architecture
        Testing Architecture
        Deployment Architecture
        Architecture Invariants
        Architecture Decision Records

USE EXISTING PROJECT PATHS IF THEY DIFFER.

RULE:
    Phase 2 must preserve approved Phase 0 and Phase 1 decisions.

RULE:
    Do not silently change application architecture because a different
    database structure is convenient.

RULE:
    If database constraints reveal an actual product contradiction:
        identify it
        document it
        resolve it explicitly
        update the appropriate decision record
        do not silently guess

# ================================================================
# 3. DATABASE PLATFORM
# ================================================================

DATABASE:
    Supabase PostgreSQL

PRIMARY KEY STRATEGY:
    UUID preferred for application entities.

TIME:
    TIMESTAMPTZ for timestamps.

IMPORTANT:
    Store absolute timestamps in UTC.

USER-FACING DATES:
    Convert to the member's applicable timezone.

# ================================================================
# 4. DATABASE DESIGN PRINCIPLES
# ================================================================

PRINCIPLE 1:
    Normalize reusable content.

PRINCIPLE 2:
    Avoid unnecessary duplication.

PRINCIPLE 3:
    Preserve historical records.

PRINCIPLE 4:
    Separate planned values from actual values.

PRINCIPLE 5:
    Separate global content from user-specific state.

PRINCIPLE 6:
    Use relational integrity wherever possible.

PRINCIPLE 7:
    Enforce critical business rules in the database where appropriate.

PRINCIPLE 8:
    Never rely solely on frontend validation.

PRINCIPLE 9:
    Keep external provider data separate from the internal domain model.

PRINCIPLE 10:
    Make external exercise/media sources replaceable.

PRINCIPLE 11:
    Design for idempotent workout-session synchronization.

PRINCIPLE 12:
    Protect private member data with RLS.

PRINCIPLE 13:
    Avoid polymorphic relationships unless there is a strong, documented
    reason.

PRINCIPLE 14:
    Do not create report tables when reports can be safely derived from
    activity/history records.

PRINCIPLE 15:
    Do not store redundant derived values unless there is a clear reason.

# ================================================================
# 5. HIGH-LEVEL DATA MODEL
# ================================================================

CORE DOMAIN:

    auth.users
        ↓
    profiles
        ↓
    fitness_profiles
        ↓
    user_physical_restrictions
        ↓
    user_plans
        ↓
    user_plan_days
        ↓
    workout_sessions
        ↓
    workout_exercise_sessions

CONTENT DOMAIN:

    exercises
    focus_areas
    levels
    equipment
    restrictions
    workout_categories
    workouts
    workout_exercises
    plan_templates
    plan_template_days

USER HISTORY:

    weight_entries
    workout_sessions
    workout_exercise_sessions
    favorites

NOTIFICATIONS:
    push_subscriptions / notification preferences as required

OFFLINE:
    server-side idempotency/sync records where required

# ================================================================
# 6. AUTHENTICATION LINK
# ================================================================

SUPABASE AUTH:
    auth.users

APPLICATION PROFILE:
    profiles

RELATIONSHIP:

    profiles.user_id
        →
    auth.users.id

RULE:
    Exactly one application profile per authenticated user.

CONSTRAINT:
    profiles.user_id must be UNIQUE.

RULE:
    Do not duplicate password credentials in public application tables.

RULE:
    Do not store raw passwords.

# ================================================================
# 7. PROFILES TABLE
# ================================================================

TABLE:
    profiles

PURPOSE:
    Store application-level member identity data.

MINIMUM EXPECTED FIELDS:

    id
    user_id
    full_name
    age
    created_at
    updated_at

POSSIBLE ADDITIONAL FIELDS ONLY IF ARCHITECTURALLY JUSTIFIED:

    onboarding_completed
    timezone
    deleted_at if soft-delete strategy is selected

IMPORTANT:
    Email should generally remain sourced from Supabase Auth rather than
    being duplicated unnecessarily.

If email is duplicated:
    define synchronization/source-of-truth rules explicitly.

CONSTRAINTS:

    user_id UNIQUE
    full_name NOT NULL
    age should satisfy reasonable domain validation

AGE:
    Integer.

Do not store date of birth because V1 collects age only.

# ================================================================
# 8. FITNESS PROFILES TABLE
# ================================================================

TABLE:
    fitness_profiles

PURPOSE:
    Store onboarding fitness data.

FIELDS MUST REPRESENT:

    fitness level
    push-up ability
    plank ability
    height
    current/latest weight relationship if needed
    target weight
    created_at
    updated_at

IMPORTANT:
    Height stored in centimeters.
    Weight stored in kilograms.

FITNESS LEVEL:
    beginner
    intermediate
    advanced

PUSH-UP LEVEL:
    unable
    0_5
    5_10
    10_20
    20_plus

PLANK LEVEL:
    unable
    0_30
    30_60
    60_120
    120_plus

ONE-TO-ONE:
    One fitness profile per user.

CONSTRAINT:
    user_id UNIQUE.

# ================================================================
# 9. PHYSICAL RESTRICTIONS
# ================================================================

TABLE:
    physical_restrictions

PURPOSE:
    Controlled dictionary of user-selected physical restrictions.

INITIAL VALUES:

    low_impact
    no_jumping

DO NOT:
    hardcode these as independent boolean columns if multiple future
    restrictions are expected.

USER RELATIONSHIP:

    user_physical_restrictions

FIELDS:

    user_id
    restriction_id

PRIMARY KEY:
    (user_id, restriction_id)

RULE:
    Duplicate restriction assignments are prohibited.

# ================================================================
# 10. WEIGHT HISTORY
# ================================================================

TABLE:
    weight_entries

PURPOSE:
    Preserve every member's recorded weight.

FIELDS:

    id
    user_id
    weight_kg
    recorded_at
    created_at if needed

RULE:
    Historical weights are never overwritten.

USER MAY:
    Add weight at any time.

WEIGHT:
    Decimal/numeric.

CONSTRAINT:
    Must be greater than zero.

IMPORTANT:
    Current weight should preferably be derived from the latest valid weight
    entry instead of allowing multiple conflicting sources of truth.

If fitness_profiles stores current_weight_kg:
    explicitly define how it is synchronized with weight_entries.

PREFERRED:
    weight_entries is the historical source of truth.

# ================================================================
# 11. FOCUS AREAS
# ================================================================

TABLE:
    focus_areas

INITIAL VALUES:

    Full Body
    Abs
    Arm
    Chest
    Butt & Legs

STORE:
    human-readable name
    stable slug

Example:

    full_body
    abs
    arm
    chest
    butt_and_legs

Do not use display text as the stable identifier.

# ================================================================
# 12. LEVELS
# ================================================================

TABLE:
    levels

INITIAL VALUES:

    beginner
    intermediate
    advanced

USE:
    Exercise compatibility
    Workout categorization
    Plan selection

A workout/exercise may support multiple levels where appropriate.

# ================================================================
# 13. EQUIPMENT
# ================================================================

TABLE:
    equipment

INITIAL DATA MAY INCLUDE:

    none
    dumbbells
    resistance_band
    bench
    mat

RULE:
    One exercise can require multiple equipment items.

RELATIONSHIP:

    exercise_equipment

FIELDS:

    exercise_id
    equipment_id

PRIMARY KEY:
    (exercise_id, equipment_id)

IMPORTANT:
    There is NO member_equipment table in V1.

The product does not ask what equipment the member owns.

# ================================================================
# 14. EXERCISE RESTRICTIONS
# ================================================================

TABLE:
    exercise_restrictions

PURPOSE:
    Define restrictions/incompatibilities associated with exercises.

INITIAL CONCEPTS:

    no_jumping
    low_impact
    knee_sensitive
    back_sensitive
    no_crunch

IMPORTANT:
    These are structured domain tags.

Do not use free text as the only safety mechanism.

RELATIONSHIP:

    exercise_restriction_map

FIELDS:

    exercise_id
    restriction_id

PRIMARY KEY:
    (exercise_id, restriction_id)

# ================================================================
# 15. EXERCISE TABLE
# ================================================================

TABLE:
    exercises

PURPOSE:
    Master reusable exercise library.

EXPECTED FIELDS:

    id
    external_source
    external_exercise_id
    name
    description
    instructions
    animation_url
    thumbnail_url
    video_url
    media_source
    exercise_mode
    primary_muscle
    is_low_impact
    requires_jumping
    created_at
    updated_at

FIELDS MAY BE REFINED:
    based on actual ExerciseDB structure and Phase 1 architecture.

IMPORTANT:
    Do not blindly create all ExerciseDB fields as columns if relational
    normalization is more appropriate.

ExerciseDB metadata may contain:

    targetMuscles
    secondaryMuscles
    bodyParts
    equipments
    instructions
    gifUrl

These must be normalized/mapped appropriately.

# ================================================================
# 16. EXTERNAL EXERCISE IDENTITY
# ================================================================

EXERCISES SHOULD SUPPORT:

    external_source
    external_exercise_id

EXAMPLE:

    external_source = exercisedb
    external_exercise_id = EIeI8Vf

CONSTRAINT:
    The combination should be unique where appropriate.

PURPOSE:
    Prevent duplicate imported exercises.

IMPORTANT:
    The internal primary key remains ours.

ExerciseDB IDs must NOT become our primary keys.

# ================================================================
# 17. EXERCISE MEDIA
# ================================================================

MEDIA TYPES:

    gif/animation
    thumbnail
    video

MINIMUM SUPPORT:

    animation_url
    thumbnail_url

OPTIONAL:
    video_url

STORE:
    media source where necessary.

IMPORTANT:
    ExerciseDB is the current initial source.

Future replacement must be possible.

DO NOT:
    tightly couple application logic to ExerciseDB URLs.

# ================================================================
# 18. EXERCISE MODE
# ================================================================

Exercise must support:

    reps
    duration
    both

This can be represented using a controlled enum/check constraint.

Example:

    reps
    duration
    both

IMPORTANT:
    The exercise mode describes what is possible.

The workout prescription determines the actual:
    sets
    reps
    duration
    rest

# ================================================================
# 19. EXERCISE LEVEL RELATIONSHIP
# ================================================================

TABLE:

    exercise_levels

FIELDS:

    exercise_id
    level_id

PRIMARY KEY:
    (exercise_id, level_id)

RULE:
    An exercise may support multiple levels.

Example:

    Bodyweight Squat:
        beginner
        intermediate
        advanced

# ================================================================
# 20. EXERCISE FOCUS RELATIONSHIP
# ================================================================

TABLE:

    exercise_focus_areas

FIELDS:

    exercise_id
    focus_area_id

PRIMARY KEY:
    (exercise_id, focus_area_id)

RULE:
    An exercise may belong to multiple focus areas.

Example:

    Squat:
        Full Body
        Butt & Legs

# ================================================================
# 21. MUSCLE/BODY-PART DATA
# ================================================================

Phase 2 must decide whether target muscles/body parts should be:

    normalized reference tables
    controlled text fields
    arrays
    JSONB

PREFERRED:
    Normalize frequently filtered/searchable concepts.

ExerciseDB contains:
    target muscles
    secondary muscles
    body parts

If these are part of future filtering/personalization:
    use relational structures.

Do not over-normalize information that will never be queried independently.

The final choice must be documented in the schema decision record.

# ================================================================
# 22. WORKOUT CATEGORIES
# ================================================================

TABLE:

    workout_categories

INITIAL VALUES:

    picks_for_you
    stretching_and_warmup
    fat_burning
    strength_and_tone

IMPORTANT:
    These are Discover categories.

The category belongs primarily to WORKOUTS, not merely individual exercises.

# ================================================================
# 23. WORKOUT TABLE
# ================================================================

TABLE:

    workouts

PURPOSE:
    Fixed reusable workout definitions.

EXPECTED FIELDS:

    id
    name
    slug
    description
    duration_seconds
    estimated_calories
    is_active
    created_at
    updated_at

IMPORTANT:
    Duration is a real numerical value, not only a display label.

Example:
    8 minutes = 480 seconds.

DURATION FILTERS:
    derived from numerical duration.

CALORIES:
    Target/estimated value.

Do not represent estimated calories as universal exact truth.

# ================================================================
# 24. WORKOUT CATEGORY RELATIONSHIP
# ================================================================

TABLE:

    workout_categories_map

FIELDS:

    workout_id
    category_id

PRIMARY KEY:
    (workout_id, category_id)

RULE:
    One workout may appear in multiple categories.

EXAMPLE:

    Lose Fat (No Jumping)
        Picks for You
        Fat Burning
        possibly other relevant categories

Do not duplicate workout rows.

# ================================================================
# 25. WORKOUT FOCUS RELATIONSHIP
# ================================================================

TABLE:

    workout_focus_areas

FIELDS:

    workout_id
    focus_area_id

PRIMARY KEY:
    (workout_id, focus_area_id)

RULE:
    One workout may target multiple areas.

# ================================================================
# 26. WORKOUT LEVEL RELATIONSHIP
# ================================================================

TABLE:

    workout_levels

FIELDS:

    workout_id
    level_id

PRIMARY KEY:
    (workout_id, level_id)

IMPORTANT:
    A Discover workout can support multiple levels.

# ================================================================
# 27. WORKOUT EXERCISES
# ================================================================

TABLE:

    workout_exercises

PURPOSE:
    Define the ordered exercise prescription inside a workout.

EXPECTED FIELDS:

    id
    workout_id
    exercise_id
    exercise_order
    sets
    reps
    duration_seconds
    rest_seconds
    created_at

IMPORTANT:
    This is where the workout decides:

        3 sets × 10 reps

    or:

        3 sets × 30 seconds

RULE:
    Exercise definitions remain reusable.

RULE:
    Different workouts can prescribe the same exercise differently.

CONSTRAINT:
    exercise_order should be unique within each workout.

Example:

    workout_id + exercise_order UNIQUE.

# ================================================================
# 28. WORKOUT PRESCRIPTION VALIDATION
# ================================================================

Database/application validation should prevent nonsensical prescriptions.

Examples:

    sets > 0
    reps > 0 when reps mode is used
    duration_seconds > 0 when duration mode is used
    rest_seconds >= 0

The exact cross-field validation may require application/domain logic
because PostgreSQL constraints may become unnecessarily complex.

Critical invariant:
    A workout exercise must have at least one valid execution prescription.

# ================================================================
# 29. PLAN TEMPLATES
# ================================================================

TABLE:

    plan_templates

PURPOSE:
    Define the three controlled base 30-day programs.

INITIAL ROWS:

    Beginner 30-Day Plan
    Intermediate 30-Day Plan
    Advanced 30-Day Plan

EXPECTED FIELDS:

    id
    name
    fitness_level_id
    duration_days
    is_active
    created_at
    updated_at

CONSTRAINT:
    Duration = 30 for V1.

FITNESS LEVEL:
    One of:
        beginner
        intermediate
        advanced

# ================================================================
# 30. PLAN TEMPLATE DAYS
# ================================================================

TABLE:

    plan_template_days

PURPOSE:
    Define what workout belongs to each day in the base plan.

FIELDS:

    id
    plan_template_id
    day_number
    workout_id
    target_duration_seconds
    target_calories
    created_at
    updated_at

CONSTRAINTS:

    day_number BETWEEN 1 AND 30

    UNIQUE:
        (plan_template_id, day_number)

Each plan day maps to a fixed workout.

IMPORTANT:
    Target duration and target calories belong to the plan day.

# ================================================================
# 31. USER PLANS
# ================================================================

TABLE:

    user_plans

PURPOSE:
    Assign a base plan to a specific member.

FIELDS:

    id
    user_id
    plan_template_id
    started_at
    status
    created_at
    updated_at

STATUS MAY INCLUDE:

    active
    completed
    archived

V1:
    User should normally have one active 30-day plan.

CONSTRAINT:
    Enforce one active user plan per user.

IMPORTANT:
    This allows future plan history without overwriting previous plans.

# ================================================================
# 32. USER PLAN DAYS
# ================================================================

TABLE:

    user_plan_days

PURPOSE:
    Store the member-specific plan progression.

FIELDS:

    id
    user_plan_id
    day_number
    workout_id
    target_duration_seconds
    target_calories
    status
    unlocked_at
    completed_at
    actual_activity_date
    created_at
    updated_at

STATUS:

    locked
    available
    in_progress
    completed

IMPORTANT:
    user_plan_days represent the member's current plan state.

RULE:
    Day N+1 becomes available only after Day N is completed.

RULE:
    Future days remain visible but locked.

IMPORTANT:
    actual_activity_date is separate from day_number.

Example:

    day_number = 5
    actual_activity_date = 2026-08-24

This is critical.

# ================================================================
# 33. PLAN COPYING STRATEGY
# ================================================================

When creating a user plan:

    Copy the necessary plan-day assignment data into user_plan_days.

Do not require runtime dependence on mutable global plan templates for current
user history.

IMPORTANT:

    Historical user plan state must remain stable even if future templates
    are edited.

If the application needs strict historical reproducibility:
    preserve workout assignment IDs and target values at the time of creation.

# ================================================================
# 34. PROFILE CHANGES AND PLAN HISTORY
# ================================================================

RULE:

    Updating profile does NOT regenerate the current plan in V1.

DATABASE MUST SUPPORT:

    Stable existing user plan
    Updated profile
    Future new plan

Do not overwrite the current plan merely because:
    fitness level changes
    restrictions change
    weight changes

# ================================================================
# 35. WORKOUT SESSIONS
# ================================================================

TABLE:

    workout_sessions

PURPOSE:
    Record actual performed workout sessions.

FIELDS SHOULD INCLUDE:

    id
    user_id
    workout_id
    source
    user_plan_day_id nullable
    started_at
    completed_at
    duration_seconds
    estimated_calories
    status
    client_operation_id
    created_at
    updated_at

SOURCE:
    plan
    discover

STATUS:
    in_progress
    completed
    abandoned
    interrupted
    possibly other explicitly documented states

IMPORTANT:
    Do not confuse plan completion with workout session creation.

# ================================================================
# 36. IDEMPOTENCY / CLIENT OPERATION ID
# ================================================================

Because the PWA can work offline and sync later:

    workout_sessions should support a unique client-generated operation ID
    or equivalent idempotency mechanism.

PURPOSE:
    Prevent duplicate sessions caused by:

    retries
    double submissions
    reconnects
    offline sync
    browser refresh

CONSTRAINT:
    Appropriate uniqueness must prevent accidental duplicate insertion.

The exact key strategy must be compatible with multi-device usage.

# ================================================================
# 37. WORKOUT EXERCISE SESSIONS
# ================================================================

TABLE:

    workout_exercise_sessions

PURPOSE:
    Record the actual state of each exercise in a workout session.

FIELDS:

    id
    workout_session_id
    workout_exercise_id
    status
    completed_sets
    actual_reps
    actual_duration_seconds
    started_at
    completed_at
    skipped_at
    created_at
    updated_at

STATUS:

    pending
    in_progress
    completed
    skipped

IMPORTANT:
    User may skip exercises.

A skipped exercise does not necessarily make the overall workout incomplete.

# ================================================================
# 38. WORKOUT RESUME DATA
# ================================================================

The workout session must contain enough information to resume.

Possible source:
    workout_exercise_sessions
    plus session state

Need to identify:
    current exercise
    current set
    current timer state where necessary
    paused status

DO NOT store constantly changing animation/timer frames server-side.

The database stores durable state.
Real-time timer state can remain client-side until meaningful checkpoints.

# ================================================================
# 39. PLAN COMPLETION MODEL
# ================================================================

IMPORTANT:

    The plan day is completed when the linked plan workout session reaches
    completed status.

Even if:
    some exercises are skipped

RULE:
    Completion should be idempotent.

Do not allow:
    multiple completions to move the user from Day N to Day N+2.

# ================================================================
# 40. PLAN DAY UNLOCKING
# ================================================================

When Day N is completed:

    Day N:
        completed

    Day N+1:
        available

Future:
    locked

Database must support this state machine.

IMPORTANT:
    Server-side logic should enforce progression rather than relying only on
    client state.

# ================================================================
# 41. ACTIVITY / REPORT SOURCE OF TRUTH
# ================================================================

PRIMARY ACTIVITY SOURCE:

    workout_sessions

PRIMARY WEIGHT SOURCE:

    weight_entries

REPORTS should derive from these records.

DO NOT:
    create separate tables such as:

        weekly_report
        monthly_report
        daily_report

unless a later performance requirement proves necessary.

# ================================================================
# 42. REPORT DATA
# ================================================================

Report calculations need:

    user_id
    time range
    workout source
    completion status
    duration
    estimated calories

INDEX STRATEGY SHOULD SUPPORT:

    user_id + completed_at
    user_id + source + completed_at

Exact index definitions must be finalized after query review.

# ================================================================
# 43. ACTIVITY TRACKER
# ================================================================

Activity tracker includes:

    Plan sessions
    Discover sessions

Example:

    Plan Day 4 — 8 min
    Discover — 5 min
    Discover — 12 min

The tracker reads from workout_sessions.

Do not store a separate activity table unless needed for a specific technical
reason.

# ================================================================
# 44. DAILY GOAL DATA MODEL
# ================================================================

Daily goal comes from:

    user_plan_day

The goal includes:

    target_duration_seconds
    target_calories

PROGRESS comes from:

    completed plan workout session

DISCOVER SESSIONS:
    MUST NOT contribute toward plan daily goal.

IMPORTANT:
    Queries/functions calculating Daily Goal must filter:
        source = plan
    and:
        current user plan day/date according to product rules.

# ================================================================
# 45. WEIGHT AND BMI
# ================================================================

WEIGHT:
    weight_entries

TARGET:
    target_weight_kg in fitness profile

CURRENT:
    latest weight entry

BMI:
    Derived.

Do not create an authoritative bmi_history table.

If caching BMI:
    define it as a derived cache, not source of truth.

# ================================================================
# 46. STREAK DATA MODEL
# ================================================================

Do not store streak as the only source of truth.

Preferred:

    derive streak from completed workout sessions.

If a cached current streak field is added:
    it must be treated as derived state and maintained safely.

Phase 2 must define the query/function that can calculate:

    current streak
    longest streak if required later

Need clear rules regarding:
    Plan workouts
    Discover workouts
    Multiple sessions in one day
    Missed days
    Timezone

# ================================================================
# 47. FAVORITES
# ================================================================

TABLE:

    favorite_workouts

FIELDS:

    user_id
    workout_id
    created_at

PRIMARY KEY:
    (user_id, workout_id)

RULE:
    User can toggle favorite.

FUTURE:
    This structure can also support favorite exercises if product scope expands.

V1:
    Favorites must support the UI heart behavior.

# ================================================================
# 48. NOTIFICATION DATA MODEL
# ================================================================

Phase 2 must support push notifications.

Possible tables:

    notification_preferences
    push_subscriptions

PUSH SUBSCRIPTION SHOULD SUPPORT:

    user_id
    endpoint / provider identifier
    public keys if applicable
    device/browser metadata where justified
    created_at
    updated_at
    revoked_at if needed

IMPORTANT:
    A user may have multiple devices.

Therefore:
    Do NOT assume one push subscription per user.

NOTIFICATION PREFERENCES:
    Store only necessary preferences.

# ================================================================
# 49. TIMEZONE DATA
# ================================================================

Since reports, streaks, and activity are date-sensitive:

STORE USER TIMEZONE:
    In profiles or a dedicated preference table.

Preferred:
    IANA timezone identifier.

Example:
    Asia/Karachi

Do not store only:
    UTC+5

because daylight-saving and timezone rules vary globally.

Current user may be in:
    Asia/Karachi

but the application should not hardcode this for all users.

# ================================================================
# 50. DELETION / CASCADE STRATEGY
# ================================================================

Phase 2 must define what happens when a user account is deleted.

PRIVATE USER DATA SHOULD BE REMOVED OR SAFELY DISASSOCIATED:

    profiles
    fitness_profiles
    user_physical_restrictions
    weight_entries
    user_plans
    user_plan_days
    workout_sessions
    workout_exercise_sessions
    favorites
    notification subscriptions
    notification preferences

PUBLIC CONTENT:
    exercises
    workouts
    plan templates
    taxonomy

must NOT be deleted because a user deletes their account.

Use:
    ON DELETE CASCADE
where appropriate.

Do NOT blindly cascade across shared/public content.

# ================================================================
# 51. SOFT DELETE VS HARD DELETE
# ================================================================

Phase 2 must explicitly choose:

    hard delete
    soft delete
    hybrid

V1 preference:
    Account deletion should remove/private-data access appropriately.

If legal/audit requirements later demand retention:
    introduce a documented retention model.

Do not implement an unexplained soft-delete field on every table.

# ================================================================
# 52. RLS STRATEGY
# ================================================================

RLS IS REQUIRED.

PRIVATE USER TABLES:
    policies must enforce ownership.

Example principle:

    auth.uid() = user_id

For user plans:
    Access through ownership relationship.

For workout sessions:
    auth.uid() = user_id

For weight entries:
    auth.uid() = user_id

For favorites:
    auth.uid() = user_id

# ================================================================
# 53. PUBLIC CONTENT RLS
# ================================================================

Public content tables may be readable by authenticated members.

Examples:

    exercises
    focus_areas
    equipment
    levels
    workout_categories
    workouts
    workout_focus_areas
    workout_levels
    workout_exercises
    plan_templates
    plan_template_days

WRITE ACCESS:
    MUST NOT be given to ordinary members.

Do not accidentally allow members to modify the public exercise library.

# ================================================================
# 54. USER PLAN RLS
# ================================================================

USER PLANS:
    Member can read their own.

    Member should not be able to arbitrarily:
        change day number
        unlock future day
        mark day completed
        replace workout
        modify target calories

These state transitions should occur through secure application/server logic.

Database policies must not permit arbitrary member writes that bypass business rules.

# ================================================================
# 55. WORKOUT SESSION RLS
# ================================================================

USER CAN:
    Create valid session for themselves according to application rules.
    Read their own sessions.

USER CANNOT:
    Read another user's sessions.
    Modify another user's sessions.

Server logic must validate:
    workout exists
    plan day exists if source=plan
    user owns relevant plan day
    idempotency key
    valid state transition

# ================================================================
# 56. SYNC QUEUE DATA MODEL
# ================================================================

Client-side sync queue lives primarily in IndexedDB.

However, Phase 2 should decide whether server-side idempotency/action logging
is required.

Possible server table:

    sync_operations

Purpose:
    Track processed client operation IDs.

Potential fields:

    id
    user_id
    operation_id
    operation_type
    processed_at
    result/reference
    created_at

RULE:
    Do not store redundant full client payloads unless required.

The final choice must consider:
    idempotency
    auditability
    storage cost
    cleanup strategy

# ================================================================
# 57. DATABASE FUNCTIONS
# ================================================================

Use PostgreSQL functions only where they strengthen:

    data integrity
    secure transactions
    atomic state transitions
    efficient derived calculations

Potential functions:

    complete_plan_day
    calculate_current_streak
    calculate_bmi
    safe_record_workout_completion

Do NOT create functions for every simple CRUD operation.

Application code can handle ordinary CRUD.

# ================================================================
# 58. DATABASE TRANSACTIONS
# ================================================================

Transactions are required where multiple state changes must occur atomically.

Important example:

    Complete Day 4
        ↓
    Mark Day 4 completed
    ↓
    Unlock Day 5
    ↓
    Record workout completion

These must not leave the database in a half-updated state.

If implementation uses server-side application logic:
    transaction boundary must still be respected.

# ================================================================
# 59. PLAN COMPLETION TRANSACTION
# ================================================================

A plan workout completion should safely coordinate:

    session completion
    plan day completion
    next-day unlock
    exercise session finalization

IMPORTANT:
    Duplicate completion must not unlock multiple future days.

Use:
    transaction
    row locking where necessary
    conditional update
    unique constraints/idempotency

# ================================================================
# 60. WEIGHT DATA CONSISTENCY
# ================================================================

When recording a weight:

    Insert historical weight entry.

If profile current_weight_kg exists:
    update consistently.

PREFERRED:
    Avoid duplicated current weight where possible.

If duplicated:
    Define transaction synchronization.

# ================================================================
# 61. ENUM STRATEGY
# ================================================================

Phase 2 must decide whether to use:

    PostgreSQL ENUM
    lookup/reference table
    text + CHECK constraint

PREFERRED:
    Use reference tables for values that may expand or carry metadata.

Examples:
    levels
    equipment
    restrictions
    focus areas
    workout categories

Potential ENUM:
    session source
    session status
    plan day status
    exercise mode

Do not create dozens of PostgreSQL enum types unnecessarily.

# ================================================================
# 62. NAMING CONVENTIONS
# ================================================================

DATABASE:

    lowercase
    snake_case

TABLES:
    plural nouns

Examples:

    profiles
    exercises
    workouts
    workout_sessions

PRIMARY KEY:
    id

FOREIGN KEY:
    <entity>_id

TIMESTAMPS:
    created_at
    updated_at
    completed_at
    recorded_at
    started_at

BOOLEAN:
    is_<state>

Examples:
    is_active
    is_low_impact
    requires_jumping

# ================================================================
# 63. NULLABILITY RULES
# ================================================================

Phase 2 must explicitly decide:

    required vs optional fields.

Examples:

    exercise name:
        required

    video_url:
        optional

    thumbnail_url:
        optional depending on media requirement

    target_calories:
        required for plan day

    completed_at:
        nullable until completion

Do not make everything nullable "just in case."

Do not make everything required without considering real workflow states.

# ================================================================
# 64. CONSTRAINTS
# ================================================================

Use database constraints for critical invariants.

Examples:

    weight_kg > 0

    height_cm > 0

    target_weight_kg > 0

    day_number between 1 and 30

    duration_seconds >= 0

    rest_seconds >= 0

    age within reasonable range

    unique user_id

    unique plan day per plan

    unique exercise order per workout

    unique external source/external ID

    unique favorites

    unique client operation ID where applicable

# ================================================================
# 65. INDEXING STRATEGY
# ================================================================

Indexes must be driven by real query patterns.

IMPORTANT QUERY PATHS:

    user profile by user_id
    fitness profile by user_id
    restrictions by user_id
    weight entries by user_id + recorded_at
    user plan by user_id + status
    user plan days by user_plan_id + day_number
    workout exercises by workout_id + exercise_order
    sessions by user_id + completed_at
    sessions by user_id + source + completed_at
    session exercises by workout_session_id
    favorites by user_id
    external exercise ID
    discover workout filters
    plan day lookup

Do not blindly index every column.

Every index should have a purpose.

# ================================================================
# 66. FOREIGN KEY STRATEGY
# ================================================================

Every relationship that is logically required should use foreign keys.

Examples:

    profiles.user_id
    fitness_profiles.user_id
    weight_entries.user_id
    workout_exercises.workout_id
    workout_exercises.exercise_id
    plan_template_days.plan_template_id
    plan_template_days.workout_id
    user_plans.user_id
    user_plans.plan_template_id
    user_plan_days.user_plan_id
    user_plan_days.workout_id
    workout_sessions.user_id
    workout_sessions.workout_id
    workout_sessions.user_plan_day_id
    workout_exercise_sessions.workout_session_id
    workout_exercise_sessions.workout_exercise_id

Do not use foreign keys to external APIs.

# ================================================================
# 67. DELETE BEHAVIOR
# ================================================================

For each foreign key, Phase 2 must explicitly decide:

    CASCADE
    RESTRICT
    SET NULL

Examples:

USER:
    user deletes account
        ↓
    private user-owned records cascade

PUBLIC CONTENT:
    workout references exercise
        ↓
    exercise should usually not be hard-deleted if historical sessions depend on it

This may require:
    is_active
    archived_at
    soft retirement

Do not break historical workout records.

# ================================================================
# 68. CONTENT ARCHIVING
# ================================================================

Exercises and workouts may eventually be retired.

Prefer:
    is_active
or:
    archived_at

rather than deleting content that historical sessions reference.

Historical session data must remain interpretable.

# ================================================================
# 69. VERSIONING OF BASE CONTENT
# ================================================================

Phase 2 must decide whether:

    workouts
    plan templates

need versioning.

Minimum requirement:
    Existing user plan assignments must remain stable if global templates are
    changed later.

If using copied user_plan_days:
    historical assignments remain stable.

Full content versioning can be introduced only if required.

Do not build an unnecessarily complex version system for V1.

# ================================================================
# 70. SEED DATA
# ================================================================

Phase 2 must create a seed strategy.

REFERENCE SEED:

    Levels
    Focus areas
    Categories
    Equipment
    Restrictions

CONTENT SEED:

    Exercises
    Exercise relationships
    Workouts
    Workout exercises
    Three 30-day plans
    Plan days

IMPORTANT:
    ExerciseDB import should not automatically create production-quality
    safety classification without human/curated rules.

ExerciseDB data:
    raw/imported source

Our taxonomy:
    curated product data

# ================================================================
# 71. EXERCISEDB IMPORT DATA
# ================================================================

If imported records need raw-source preservation:

    Consider a separate ingestion/raw table or import metadata table.

Example conceptual entity:

    exercise_imports

or:
    raw_external_exercises

Purpose:
    Preserve source data without contaminating the normalized domain model.

Phase 2 should decide whether this is actually necessary.

Do not store giant raw JSON blobs in the main exercises table without reason.

# ================================================================
# 72. EXERCISE CURATION
# ================================================================

The internal database must support our own metadata:

    focus areas
    levels
    restrictions
    equipment
    suitability
    workout usage

These fields may not be directly available from ExerciseDB.

Therefore:
    imported content and curated application metadata are distinct concerns.

# ================================================================
# 73. FIXED WORKOUT CONTENT
# ================================================================

Discover workouts are fixed.

They should be stored as persistent records.

Examples:

    Lose Belly Fat
    20 Minutes Calorie Burner
    Lose Fat (No Jumping)
    Before Workout Warmup
    etc.

The exact final content list is a content-authoring task.

The schema must support:
    one workout
    many exercises
    many categories
    many focus areas
    many levels

# ================================================================
# 74. BASE 30-DAY PLAN CONTENT
# ================================================================

There are:

    Beginner 30-Day Plan
    Intermediate 30-Day Plan
    Advanced 30-Day Plan

Each:
    exactly 30 plan days

Each day:
    fixed workout
    target duration
    target calories

The schema should enforce:
    day_number uniqueness
    valid 1–30 range

# ================================================================
# 75. USER PLAN CONTENT
# ================================================================

User plan:
    one assigned base plan

User plan days:
    30 assigned days

The actual plan must preserve:
    assigned workout
    target duration
    target calories

The plan should not silently change because:
    profile changes
    exercise database changes
    Discover changes

# ================================================================
# 76. DISCOVER MODIFICATION
# ================================================================

A Discover workout is globally fixed.

When personalized for a user:
    DO NOT modify the global workout record.

Potential strategies:

    Runtime replacement map

or:

    Session-level resolved workout structure

Phase 2 must choose the database approach that best matches Phase 1.

IMPORTANT:
    Do not create permanent copies for every user unnecessarily.

# ================================================================
# 77. RESOLVED WORKOUT / SNAPSHOT STRATEGY
# ================================================================

Phase 2 must decide whether workout sessions need a snapshot of the actual
exercise prescription shown to the user.

This matters because:

    Global workout may change later.
    Exercise may be archived.
    Discover workout may be modified for user's restrictions.

For historical accuracy:
    session records should preserve enough information to know what actually
    happened.

Possible strategies:

    reference original workout + session exercise records

or:

    store resolved exercise IDs/prescriptions in session tables

The final strategy must be documented.

# ================================================================
# 78. HISTORICAL DATA INTEGRITY
# ================================================================

Historical records must remain meaningful.

Example:

    User completed:
        Push-up
        3 × 10

Later:
    Workout definition changes to:
        4 × 8

Historical session must still be interpretable.

Do not allow future edits to destroy historical meaning.

# ================================================================
# 79. REPORTING ACCURACY
# ================================================================

Reports should derive from:
    completed workout sessions

Do not count:
    in-progress
    abandoned
    invalid
    duplicate

unless explicitly specified.

Plan day completion and workout session completion must have clearly defined
relationships.

# ================================================================
# 80. DATABASE SECURITY
# ================================================================

Phase 2 must include:

    RLS enabled on all private tables.

IMPORTANT:
    Supabase service role bypasses RLS.

Service role:
    server-only.

Never expose:
    service role key
    database connection credentials
    private push credentials

# ================================================================
# 81. RLS TEST STRATEGY
# ================================================================

Create tests/checks proving:

    User A cannot read User B profile.

    User A cannot read User B weight.

    User A cannot read User B sessions.

    User A cannot modify User B favorites.

    User cannot directly unlock future plan days.

    User cannot modify public exercise content.

    User cannot modify global workout templates.

    User can read appropriate public content.

# ================================================================
# 82. DATABASE TRANSACTION REQUIREMENTS
# ================================================================

Transactions must cover:

    Workout completion
    Plan day completion
    Next day unlock
    Relevant session state transitions
    Potential offline-sync writes

Example atomic workflow:

    validate session
        ↓
    create/confirm workout session
        ↓
    finalize exercise sessions
        ↓
    mark plan day complete
        ↓
    unlock next day

If any required step fails:
    transaction should preserve a valid state.

# ================================================================
# 83. CONCURRENCY
# ================================================================

Phase 2 must consider:

    User taps Complete twice.
    Two browser tabs complete same workout.
    Offline device syncs after another device completed it.
    User opens same workout on two devices.

Need:
    unique constraints
    conditional updates
    row locks or equivalent where necessary
    idempotency

Do not rely solely on UI disabling a button.

# ================================================================
# 84. MULTI-DEVICE DATA
# ================================================================

Server database is account-level source of truth.

Multiple devices may access:

    Profile
    Plan
    Reports
    Weight history
    Favorites

Offline state:
    device-specific

The database must therefore support device-independent account data.

# ================================================================
# 85. USER TIMEZONE
# ================================================================

Store:
    timezone identifier

Example:
    Asia/Karachi

Purpose:

    Day boundaries
    Reports
    Streak
    Activity Tracker
    Notifications
    Calendar date

Absolute timestamps:
    TIMESTAMPTZ / UTC

# ================================================================
# 86. NOTIFICATION SUBSCRIPTIONS
# ================================================================

A user can have multiple device subscriptions.

Table should support:

    user_id
    endpoint/provider ID
    keys/credentials if required
    device identifier where appropriate
    created_at
    updated_at
    revoked_at

Do not store browser push credentials in plaintext if avoidable.

Follow the selected push provider/browser standard.

# ================================================================
# 87. NOTIFICATION PREFERENCES
# ================================================================

Store preference state such as:

    enabled
    workout reminders
    streak reminders

Only store preferences that the V1 product actually uses.

Do not overbuild notification configuration.

# ================================================================
# 88. AUDITABILITY
# ================================================================

Phase 2 must determine where audit/history matters.

At minimum:
    user workout history
    weight history
    plan day completion

Not every table needs a full audit log.

Avoid overengineering.

# ================================================================
# 89. DATABASE TEST DATA
# ================================================================

Create development seed scenarios for:

    brand-new user
    beginner
    intermediate
    advanced
    multiple restrictions
    no restrictions
    missed days
    completed days
    skipped exercise
    Discover workout
    mixed plan + Discover activity
    multiple weight entries
    notification subscription
    offline duplicate operation

These should help Phase 8/9 testing later.

# ================================================================
# 90. DATABASE MIGRATION ORDER
# ================================================================

Phase 2 must establish a safe migration order.

Suggested conceptual order:

    1. Extensions/utilities if required

    2. Reference tables:
        levels
        focus_areas
        categories
        equipment
        restrictions

    3. Exercise tables:
        exercises
        exercise relationships

    4. Workout tables:
        workouts
        workout_exercises
        workout relationships

    5. Plan templates:
        plan_templates
        plan_template_days

    6. User tables:
        profiles
        fitness_profiles
        user restrictions
        weight entries
        user plans
        user plan days

    7. Activity:
        workout_sessions
        workout_exercise_sessions
        favorites

    8. Notifications

    9. Sync/idempotency tables if required

    10. Indexes

    11. Functions

    12. RLS policies

    13. Seeds

Exact migration order may be adjusted based on dependency constraints.

# ================================================================
# 91. SQL QUALITY RULES
# ================================================================

Use:

    explicit column types
    explicit constraints
    explicit foreign keys
    explicit indexes
    comments for unusual logic
    safe migration patterns

DO NOT:

    use SELECT *
    create unnecessary JSON blobs
    create duplicate indexes
    rely on application code for critical uniqueness
    use vague field names like:
        data
        info
        stuff

unless JSONB is explicitly justified.

# ================================================================
# 92. JSONB USAGE
# ================================================================

JSONB may be used for:

    external raw data
    optional metadata
    future extensibility

Do NOT use JSONB as a replacement for relationships when the data needs:

    filtering
    joining
    integrity
    uniqueness

Core application relationships must remain relational.

# ================================================================
# 93. ARCHIVE STRATEGY
# ================================================================

Exercises/workouts referenced by historical sessions should not be casually
hard-deleted.

Prefer:

    is_active
    archived_at

if content must be retired.

Historical sessions must remain readable.

# ================================================================
# 94. CONTENT STATUS
# ================================================================

Workouts and exercises may need:

    draft
    active
    archived

However:
    Do not introduce unnecessary status complexity.

V1 should have the smallest state model needed.

# ================================================================
# 95. DATABASE ENVIRONMENTS
# ================================================================

Separate:

    local/development database
    preview/staging
    production

Use migration files to move schema changes.

Use seed scripts for development/reference content.

Do not manually copy production database tables.

# ================================================================
# 96. ERD REQUIREMENTS
# ================================================================

PHASE 2 MUST CREATE AN ERD SHOWING:

    auth.users → profiles

    profiles → fitness_profiles

    profiles → weight_entries

    profiles → user_physical_restrictions
        → physical_restrictions

    exercises → exercise_focus_areas
        → focus_areas

    exercises → exercise_levels
        → levels

    exercises → exercise_equipment
        → equipment

    exercises → exercise_restriction_map
        → restrictions

    workouts → workout_exercises
        → exercises

    workouts → workout_categories
        → workout_categories

    workouts → workout_focus_areas
        → focus_areas

    workouts → workout_levels
        → levels

    plan_templates → plan_template_days
        → workouts

    profiles → user_plans
        → user_plan_days
        → workouts

    profiles → workout_sessions
        → workout_exercise_sessions
        → workout_exercises

    profiles → favorite_workouts
        → workouts

    profiles → notification subscriptions/preferences

The exact ERD must reflect the final implementation.

# ================================================================
# 97. DATABASE QUERY REQUIREMENTS
# ================================================================

Phase 2 must define expected efficient queries for:

    Get current user profile

    Get fitness profile

    Get user restrictions

    Get next available plan day

    Get plan day by number

    Get entire 30-day plan

    Get today's plan

    Get workout with exercises

    Get Discover workouts by category

    Get Discover workouts by focus area

    Get Discover workouts by level

    Get Discover workouts by duration

    Get favorites

    Get workout history

    Get reports

    Get weight history

    Get current weight

    Get BMI inputs

    Get current streak

    Get notification subscriptions

# ================================================================
# 98. QUERY EFFICIENCY RULE
# ================================================================

Avoid:

    N+1 queries

Example bad pattern:

    Get workout
        ↓
    Query exercise 1
    Query exercise 2
    Query exercise 3
    ...

Prefer:
    relational joins/selects
    carefully structured queries
    server-side aggregation where appropriate

Do not over-fetch.

# ================================================================
# 99. SECURITY-CRITICAL CONSTRAINTS
# ================================================================

The database must prevent:

    duplicate accounts at application level where applicable
    duplicate user restriction assignments
    duplicate favorites
    duplicate plan days
    duplicate workout exercise order
    duplicate external exercise IDs
    duplicate idempotency operations
    invalid negative weights
    invalid negative durations
    day number outside 1–30
    unauthorized user-owned data access through RLS

# ================================================================
# 100. PHASE 2 OUTPUT DOCUMENTS
# ================================================================

PHASE 2 MUST PRODUCE:

    1. Final ERD
    2. Database Schema Specification
    3. Table-by-table Data Dictionary
    4. Relationship Specification
    5. Constraint Specification
    6. Index Specification
    7. RLS Specification
    8. RLS Policy Matrix
    9. Migration Plan
    10. Seed Data Plan
    11. ExerciseDB Import Data Mapping
    12. Workout/Plan Data Model
    13. Session/Activity Data Model
    14. Offline Idempotency Data Model
    15. Notification Data Model
    16. Database Testing Plan
    17. SQL Migrations
    18. Seed scripts
    19. Database validation/report
    20. Phase 2 Completion Report

Suggested documentation structure:

    /docs/phase-2/
        erd.md
        schema.md
        data-dictionary.md
        relationships.md
        constraints.md
        indexes.md
        rls.md
        rls-matrix.md
        migrations.md
        seed-data.md
        exercisedb-mapping.md
        workout-plan-model.md
        session-model.md
        offline-idempotency.md
        notifications.md
        testing.md
        validation-report.md
        completion-report.md

Database implementation:

    /supabase/migrations/
    /supabase/seed/
    
Use the existing project conventions where different.

# ================================================================
# 101. SQL MIGRATION RULES
# ================================================================

Each schema change must be represented as a migration.

Migration names must be:

    ordered
    descriptive
    deterministic

Examples:

    0001_create_reference_tables.sql
    0002_create_exercises.sql
    0003_create_workouts.sql
    0004_create_plan_templates.sql
    0005_create_user_profiles.sql
    ...

Do not manually edit old migrations after they have become part of a shared
environment unless the project migration policy explicitly allows it.

# ================================================================
# 102. SEEDING RULES
# ================================================================

Reference data should be idempotently seedable.

Avoid:
    duplicate seed rows

Use:
    stable slugs
    upsert where appropriate

Seed order must respect:
    foreign keys

ExerciseDB imports should be separated from curated seed data where practical.

# ================================================================
# 103. DATABASE VALIDATION
# ================================================================

After creating the schema, verify:

    migrations apply cleanly
    seed scripts apply cleanly
    foreign keys work
    uniqueness works
    constraints reject invalid data
    RLS is enabled
    RLS policies behave correctly
    public content is readable
    private content is isolated
    deletion works as intended
    plan progression constraints are enforceable
    idempotency works
    historical data remains valid

# ================================================================
# 104. RLS VALIDATION SCENARIOS
# ================================================================

At least test:

    User A → own profile → allowed

    User A → User B profile → denied

    User A → own weight → allowed

    User A → User B weight → denied

    User A → own sessions → allowed

    User A → User B sessions → denied

    User A → own favorites → allowed

    User A → User B favorites → denied

    User → public exercises → allowed

    User → modify public exercise → denied

    User → modify global workout → denied

    User → arbitrarily unlock Day 20 → denied

# ================================================================
# 105. PLAN DATA VALIDATION
# ================================================================

Verify:

    Every base plan has exactly 30 days.

    Day numbers are 1–30.

    No duplicate day number exists within a plan.

    Every day references a valid workout.

    Every day has target duration.

    Every day has target calories.

    User plan can preserve assigned values.

# ================================================================
# 106. WORKOUT DATA VALIDATION
# ================================================================

Verify:

    Every workout exercise references a valid exercise.

    Every exercise order is unique within a workout.

    Every workout has at least one exercise where appropriate.

    Reps/duration prescription is valid.

    Rest is non-negative.

    Workouts have valid duration values.

# ================================================================
# 107. EXERCISE DATA VALIDATION
# ================================================================

Verify:

    name exists

    external source/ID uniqueness where applicable

    mode valid

    media URLs valid format where present

    relationships to levels/focus/equipment/restrictions work

Do not mark an imported ExerciseDB exercise as production-ready safety content
merely because it imported successfully.

# ================================================================
# 108. HISTORICAL DATA VALIDATION
# ================================================================

Test scenario:

    Workout:
        Push-up
        3 × 10

    User completes it.

    Later:
        Workout changes to 4 × 8

Expected:
    Historical completion remains interpretable.

Same principle:
    exercise can be archived.

Historical activity must not disappear unexpectedly.

# ================================================================
# 109. OFFLINE IDEMPOTENCY VALIDATION
# ================================================================

Test:

    Client creates operation ID A.

    Server receives A.
        → process

    Server receives A again.
        → do not create duplicate effect.

Test:
    same workout completion
    same account
    same operation ID

Expected:
    exactly one authoritative completion.

# ================================================================
# 110. DATABASE PERFORMANCE REVIEW
# ================================================================

Before Phase 2 completion:

    Review common queries.

    Check indexes.

    Identify N+1 risks.

    Check foreign key indexing.

    Check report query paths.

    Check Discover filter paths.

    Check plan day retrieval.

Do not optimize prematurely based on imaginary scale.

# ================================================================
# 111. ARCHITECTURE CONSISTENCY CHECK
# ================================================================

Compare Phase 2 with Phase 1.

Verify:

    Every repository boundary has database support.

    Every important use case has required records.

    Every offline mutation has idempotency support.

    Every private data path has RLS.

    Every content relationship exists.

    Base plan/user plan distinction exists.

    Workout/workout session distinction exists.

    Exercise/workout distinction exists.

    Daily Goal and Reports can be separately calculated.

    Discover can be queried without ExerciseDB runtime dependency.

# ================================================================
# 112. FINAL DATA FLOW
# ================================================================

The final database should support:

    SIGNUP
        ↓
    profiles

    ONBOARDING
        ↓
    fitness_profiles
    user_physical_restrictions
    weight_entries

    PLAN GENERATION
        ↓
    user_plans
    user_plan_days

    PLAN WORKOUT
        ↓
    workout_sessions
    workout_exercise_sessions

    DISCOVER WORKOUT
        ↓
    workout_sessions
    workout_exercise_sessions

    REPORTS
        ↓
    workout_sessions
    weight_entries

    PROGRESS
        ↓
    weight_entries
    workout_sessions

    FAVORITES
        ↓
    favorite_workouts

    NOTIFICATIONS
        ↓
    push_subscriptions
    notification_preferences

    OFFLINE SYNC
        ↓
    idempotency/sync records if required

# ================================================================
# 113. PHASE 2 ACCEPTANCE CRITERIA
# ================================================================

PHASE 2 IS COMPLETE ONLY WHEN:

    [ ] Final ERD exists.

    [ ] Every Phase 0 requirement has a database destination.

    [ ] Every Phase 1 architectural boundary has database support.

    [ ] Profiles are linked to auth.users.

    [ ] Fitness profile is modeled.

    [ ] Multiple physical restrictions are supported.

    [ ] Weight history is preserved.

    [ ] BMI inputs are modeled.

    [ ] Exercises are reusable.

    [ ] Exercise media is replaceable.

    [ ] ExerciseDB external identity is supported.

    [ ] Exercise levels are modeled.

    [ ] Focus areas are modeled.

    [ ] Equipment is modeled.

    [ ] Exercise restrictions are modeled.

    [ ] Workouts are reusable fixed collections.

    [ ] Workouts can belong to multiple categories.

    [ ] Workouts can belong to multiple focus areas.

    [ ] Workouts can belong to multiple levels where appropriate.

    [ ] Workout prescriptions support sets/reps/duration/rest.

    [ ] Three 30-day base plans are supported.

    [ ] Every base plan has 30 days.

    [ ] User plan assignment is separated from base templates.

    [ ] User plan days support locked/unlocked/completed state.

    [ ] Actual calendar date is distinct from plan day number.

    [ ] Workout sessions support Plan and Discover sources.

    [ ] Exercise-level completion/skip state is supported.

    [ ] Workout resume state is supportable.

    [ ] Idempotency is supported.

    [ ] Reports can calculate Plan + Discover activity.

    [ ] Daily Goal can calculate Plan-only progress.

    [ ] Favorites are supported.

    [ ] Weight history and reports are supported.

    [ ] Streak calculation has database support.

    [ ] Notifications have database support.

    [ ] User timezone is supported.

    [ ] Account deletion behavior is defined.

    [ ] RLS is implemented.

    [ ] RLS is tested.

    [ ] Public content is protected from member writes.

    [ ] Private member data is isolated.

    [ ] Constraints are implemented.

    [ ] Indexes are justified.

    [ ] Migrations are ordered and reproducible.

    [ ] Seed scripts are idempotent.

    [ ] ExerciseDB mapping is documented.

    [ ] Historical data integrity is protected.

    [ ] Offline idempotency behavior is supportable.

    [ ] Database validation has passed.

# ================================================================
# 114. REQUIRED FINAL OUTPUT
# ================================================================

At the end of Phase 2 output:

    PHASE:
        Phase 2 — Database & ERD

    STATUS:
        Complete / Partially Complete / Blocked

    SCHEMA:
        Summary of final database structure

    TABLES:
        List of created tables

    RELATIONSHIPS:
        Important relationships

    RLS:
        Security summary

    INDEXES:
        Important indexes

    MIGRATIONS:
        Migration files created

    SEEDS:
        Seed files/data created

    EXERCISEDB:
        Import mapping and source status

    IDEMPOTENCY:
        How duplicate offline/session writes are prevented

    VALIDATION:
        Tests/checks performed

    ISSUES:
        Any remaining issues

    OPEN DECISIONS:
        Only genuinely unresolved items

    DOCUMENTS:
        Exact files created/updated

    NEXT PHASE:
        Phase 3 — Authentication & User Account System

IMPORTANT:
    Do not claim database completion until migrations, constraints, RLS,
    seeds, and validation have actually been verified.

# ================================================================
# 115. PHASE TRANSITION RULE
# ================================================================

DO NOT automatically begin Phase 3.

After Phase 2 is accepted:

    Update project memory.

    Record:
        schema version
        migration state
        RLS state
        seed state
        unresolved issues

    Stop.

Wait for explicit instruction to begin:

    PHASE 3 — AUTHENTICATION & USER ACCOUNT SYSTEM

# ================================================================
# 116. FINAL PHASE 2 INSTRUCTION
# ================================================================

Design the database as the durable foundation of the Gym PWA.

Do not model the database around temporary UI screens.

Do not duplicate data simply because the UI shows the same information in
different places.

Do not store reports as primary data when they can be derived safely.

Do not let profile changes destroy current plan history.

Do not let public workout content be modified by members.

Do not let members read each other's private information.

Do not let offline retries create duplicate workout sessions.

Do not let Discover activity contaminate Daily Goal calculations.

Do not let future content changes destroy historical workout meaning.

Do not let ExerciseDB become the permanent domain model.

Do not use unsafe free-text fields where controlled relational data is
required.

Do not over-normalize data that does not need independent querying.

Do not under-model relationships that are central to product behavior.

Keep the database:
    relational
    secure
    testable
    performant
    maintainable
    migration-driven
    replaceable at external integration boundaries

The final output of Phase 2 must be strong enough that backend implementation
can begin without redesigning the database.

The next approved phase after successful completion is:

    PHASE 3 — AUTHENTICATION & USER ACCOUNT SYSTEM

# ================================================================
# END OF PHASE 2 MASTER PROMPT
# ================================================================