# GYM PWA — MASTER PROJECT CONTEXT / MEMORY PROMPT
# =================================================
# PURPOSE:
# This file is the permanent project context for the Gym PWA.
# Every AI coding agent working inside this repository MUST read and respect
# this document before making, changing, refactoring, or deleting code.
#
# PRIMARY GOAL:
# Build a production-quality, member-only fitness Progressive Web App (PWA)
# focused on personalized workouts, a fixed 30-day plan, Discover workouts,
# progress tracking, reports, streaks, notifications, and offline workout use.
#
# IMPORTANT:
# This is NOT a gym-management system.
# There is NO admin dashboard, trainer dashboard, gym membership management,
# payment system, billing system, or staff interface in V1.
#
# V1 IS COMPLETELY FREE.
# No payments are implemented in V1.
#
# ================================================================
# 1. PROJECT IDENTITY
# ================================================================


PROJECT_NAME:
    Gym Member Fitness PWA


PROJECT_TYPE:
    Member-only fitness Progressive Web App


PRIMARY_USER:
    Gym/Fitness Member


V1 BUSINESS MODEL:
    Free
    No payments
    No subscriptions
    No gym membership management


PRIMARY DEVICE:
    Mobile phone


PRIMARY DESIGN WIDTH:
    ~390px mobile-first


SECONDARY DEVICES:
    Tablet
    Desktop


PRIMARY PRODUCT GOAL:
    Help a member follow a personalized 30-day workout journey while also
    allowing them to discover additional workouts, track progress, and use
    essential workout functionality offline.


# ================================================================
# 2. SOURCE OF TRUTH
# ================================================================


SOURCE_OF_TRUTH_PRIORITY:


    1. This MASTER PROJECT CONTEXT
    2. Approved architecture/database decisions
    3. Phase-specific documents/prompts
    4. Existing code and migrations
    5. Temporary AI assumptions


RULE:
    Never silently change an approved product rule because a different
    implementation appears easier.


RULE:
    Before changing architecture, database relationships, authentication,
    personalization logic, or offline behavior, inspect the existing code,
    migrations, and project documentation.


RULE:
    Do not recreate functionality that already exists.
    Reuse and extend existing components, services, utilities, database
    tables, hooks, queries, and conventions whenever appropriate.


RULE:
    Never invent undocumented business logic just to make a feature compile.


RULE:
    If an implementation decision is genuinely unknown, document it as an
    explicit decision/assumption instead of silently guessing.


# ================================================================
# 3. CURRENT TECH STACK
# ================================================================


FRONTEND:
    Next.js
    TypeScript
    Tailwind CSS
    shadcn/ui
    React


SERVER DATA / CLIENT DATA:
    TanStack Query


FORMS:
    React Hook Form


VALIDATION:
    Zod


AUTHENTICATION:
    Supabase Auth


DATABASE:
    Supabase PostgreSQL


AUTH PROVIDERS:
    Email + Password
    Google OAuth


AUTHORIZATION:
    PostgreSQL Row Level Security (RLS)


BACKEND:
    Next.js Server Actions
    Next.js Route Handlers
    Server-side Supabase operations where appropriate


PWA:
    Serwist
    Service Worker


OFFLINE STORAGE:
    Dexie
    IndexedDB


CHARTS:
    Recharts


ICONS:
    Lucide React


DEPLOYMENT:
    Vercel


SOURCE CONTROL:
    GitHub


DATABASE/BACKEND PLATFORM:
    Supabase


EXTERNAL EXERCISE DATA SOURCE:
    ExerciseDB V1 Free API


INITIAL EXERCISE API:
    https://oss.exercisedb.dev/api/v1


EXERCISEDB DEVELOPMENT API:
    GET /exercises
    GET /exercises/search
    GET /exercises/bodyparts
    GET /exercises/muscles
    GET /exercises/equipments
    GET /exercises/{exerciseId}
    GET /bodyparts
    GET /muscles
    GET /equipments


IMPORTANT EXERCISEDB RULE:
    The currently documented ExerciseDB V1 free API is intended for
    personal/prototype/educational/non-commercial use according to its
    displayed terms.


    V1 is free and non-commercial.


    Do NOT design the application as permanently dependent on paid or
    commercially restricted ExerciseDB media.


    Keep the exercise/media abstraction replaceable.


# ================================================================
# 4. MEDIA SOURCE
# ================================================================


INITIAL MEDIA / EXERCISE SOURCE:
    ExerciseDB V1 Free API


INITIAL EXERCISE DATA:
    Approximately 1,500 structured exercises


INITIAL MEDIA:
    GIF-based exercise demonstrations


EXERCISEDB DATA MAY INCLUDE:
    Exercise name
    GIF URL
    Target muscles
    Secondary muscles
    Body parts
    Equipment
    Instructions


INTERNAL DATABASE MEDIA FIELDS SHOULD SUPPORT:
    animation_url
    thumbnail_url
    video_url


IMPORTANT:
    ExerciseDB media is a development/non-commercial source for V1.
    Do not assume its media is permanently commercially redistributable.


ARCHITECTURAL RULE:
    Our application database MUST NOT be tightly coupled to ExerciseDB URLs.


    Store our own:
        external_source
        external_exercise_id


    so that media can later be replaced with:
        licensed media
        self-created media
        commercially permitted media
        another provider


DO NOT:
    Scrape YouTube.
    Scrape random websites.
    Copy copyrighted fitness videos/images without permission.
    Assume GitHub availability means unrestricted media rights.


V1 MEDIA:
    GIF/animation is the primary exercise demonstration format.
    Videos can be included where legally permitted.
    Video is optional.


# ================================================================
# 5. AUTHENTICATION FLOW
# ================================================================


SIGNUP FLOW:


    Landing Page
        ↓
    Get Started
        ↓
    Signup
        ↓
    Full Name
    Email
    Password
        ↓
    Supabase Auth account creation
        ↓
    Email verification
        ↓
    User goes to their own email
        ↓
    Confirms email
        ↓
    Verification link returns user to website
        ↓
    User logs in
        ↓
    Onboarding


LOGIN:
    Email + Password
    Google OAuth


FORGOT PASSWORD:
    Supported


DELETE ACCOUNT:
    Supported


ONE ACCOUNT:
    One account = one member profile


IMPORTANT:
    Authentication identity belongs to Supabase Auth.
    Application profile data belongs in the application's profile tables.


# ================================================================
# 6. LANDING / ENTRY FLOW
# ================================================================


LANDING PAGE:
    Top-right:
        Login
        Get Started


GET STARTED:
    Signup


LOGIN:
    Login page


POST-LOGIN:
    If onboarding is incomplete:
        Go to onboarding


    If onboarding is complete:
        Go to dashboard


# ================================================================
# 7. ONBOARDING FLOW
# ================================================================


ONBOARDING PAGE 1:
    "Hello, welcome to the journey to your dream body."


    Supporting text:
        "Here comes a few simple questions before we can personalize your
        daily goal and schedule."


    Button:
        Start


ONBOARDING PAGE 2:
    Choose Your Plan


    Beginner:
        5–10 min/day


    Intermediate:
        10–20 min/day


    Advanced:
        15–30 min/day


ONBOARDING PAGE 3:
    How many push-ups can you do at one time?


    Options:
        I can't do it
        0–5 reps
        5–10 reps
        10–20 reps
        Over 20 reps


ONBOARDING PAGE 4:
    How long can you hold a plank?


    Options:
        I can't do it
        0–30 sec
        30–60 sec
        60–120 sec
        Over 120 sec


ONBOARDING PAGE 5:
    What is your height?
    What is your current weight?


    UI:
        Height input
        Weight input


    Internal storage:
        height_cm
        current_weight_kg


ONBOARDING PAGE 6:
    What is your target weight?


    Internal storage:
        target_weight_kg


ONBOARDING PAGE 7:
    What are your physical concerns?


    Current V1 choices:
        No, I am fine
        Low impact
        No jumping


    IMPORTANT:
        A user can select multiple concerns.


ONBOARDING PAGE 8:
    Generate Personalized Plan


    Show generation/progress experience.


AFTER ONBOARDING:
    Personalized member experience
    Dashboard


IMPORTANT:
    Do not create a gym membership or payment step.


# ================================================================
# 8. USER PROFILE
# ================================================================


PROFILE DATA:


    Full name
    Email
    Age
    Height
    Current weight
    Target weight
    Fitness level
    Physical concerns


UNITS:
    Weight:
        kg


    Height:
        cm


USER CAN EDIT:
    Profile information
    Fitness level
    Weight
    Height
    Physical concerns
    Other supported profile values


IMPORTANT V1 PLAN RULE:
    If a user changes their profile after a plan has been generated,
    DO NOT immediately regenerate/replace the existing 30-day plan.


    The current 30-day plan remains unchanged.


    Future replanning can be implemented later.


# ================================================================
# 9. SIDEBAR / PRIMARY NAVIGATION
# ================================================================


SIDEBAR ITEMS:


    1. Plan
    2. Discover
    3. Reports
    4. My Profile


Notifications:
    Desktop:
        Available from sidebar/header structure


    Mobile:
        Notifications are available at the bottom navigation area.


# ================================================================
# 10. PLAN
# ================================================================


PLAN CONTAINS:
    Day 1
    Day 2
    Day 3
    ...
    Day 30


BASE PLANS:
    Beginner 30-Day Plan
    Intermediate 30-Day Plan
    Advanced 30-Day Plan


PLAN RULE:
    Same base 30-day plan for all users within the same fitness level.


PLAN PERSONALIZATION:
    The base plan is adapted using deterministic safety/profile rules.


PLAN GENERATION:
    Generated after onboarding.


IMPORTANT:
    Do NOT ask an AI to invent a completely new 30-day workout program
    for each user.


    Use a controlled base plan + deterministic filtering/replacement.


# ================================================================
# 11. PLAN PROGRESSION
# ================================================================


RULE:
    Day N must be completed before Day N+1 becomes unlocked.


DISPLAY:
    Future days are visible but locked.


EXAMPLE:


    Day 1 = completed
    Day 2 = unlocked
    Day 3 = locked


SKIPPING DAYS:
    User cannot manually skip a plan day.


MISSED CALENDAR DAYS:
    Missing multiple calendar days does NOT reset the plan.


    When the user returns:
        Continue with the next incomplete day.


CALENDAR:
    The plan day is associated with the actual date on which it is performed.


EXAMPLE:


    Day 5
    User disappears for several days
    Returns on August 24
    Day 5 is performed on August 24


    Store:
        plan_day_number = 5
        actual activity/completion date = August 24


# ================================================================
# 12. PLAN WORKOUT TARGETS
# ================================================================


Each plan day contains a target:


    Target duration
    Target estimated calories


IMPORTANT:
    Example:
        Day 1
        8 minutes
        113 estimated kcal


    This does NOT mean the member's daily goal is 8 minutes.


DAILY GOAL:
    Based on the plan workout's target duration/calories.


DISCOVER:
    Discover workouts DO NOT contribute to the plan daily goal.


IMPORTANT BUSINESS RULE:
    Only the plan workout contributes toward the daily plan goal.


# ================================================================
# 13. WORKOUT MODEL
# ================================================================


EXERCISE:
    A reusable building block.


EXAMPLE:
    Push-up


    Media:
        GIF/animation


    Instructions:
        Step-by-step


    Metadata:
        focus areas
        difficulty
        equipment
        restrictions
        timing mode


WORKOUT:
    A fixed collection of exercises.


EXAMPLE:
    Beginner Chest Workout


    Exercise 1:
        Push-up
        3 sets × 10 reps
        rest


    Exercise 2:
        ...


IMPORTANT:
    Exercise data and workout prescriptions are separate entities.


# ================================================================
# 14. EXERCISE MODES
# ================================================================


SUPPORTED MODES:


    Reps-based
    Duration-based
    Both


EXAMPLES:


    Push-up:
        3 sets × 10 reps


    Plank:
        3 sets × 30 seconds


REST:
    Supported


REST CAN BE:
    Configured per workout exercise


# ================================================================
# 15. EXERCISE SAFETY MODEL
# ================================================================


EXERCISES MAY HAVE MULTIPLE RESTRICTIONS.


EXAMPLE:


    Jump Squat:
        no_jumping
        low_impact
        knee_sensitive


RULE:
    Safety restrictions are metadata, not AI decisions.


IMPORTANT:
    The system must use deterministic tags to decide whether an exercise
    is compatible with a user's selected physical concerns.


DO NOT:
    Ask an LLM to dynamically decide if an exercise is medically safe.


DO NOT:
    Treat the system as a medical diagnostic tool.


# ================================================================
# 16. EQUIPMENT MODEL
# ================================================================


V1 SUPPORTS:
    Bodyweight
    Common equipment


POSSIBLE EQUIPMENT:
    Dumbbells
    Resistance bands
    Bench
    Mat
    Other supported equipment


IMPORTANT:
    An exercise can require multiple equipment items.


EXAMPLE:
    Dumbbell Chest Press:
        Dumbbells
        Bench


IMPORTANT:
    We do NOT ask the user during onboarding what equipment they own.


The workout itself can tell the user:
    "Equipment required: Dumbbells"


The application does not track equipment ownership.


# ================================================================
# 17. DISCOVER
# ================================================================


DISCOVER CONTAINS WORKOUTS:
    NOT individual exercises.


DISCOVER GROUPS:


    Focus Area
        Full Body
        Abs
        Arm
        Chest
        Butt & Legs


    Picks for You
        Lose Belly Fat
        20 Minutes Calorie Burner
        Lose Fat (No Jumping)


    Stretching & Warmup
        Before Workout Warmup
        Fresh Start Warm Up
        Sleep Time Stretching
        Full Body Stretching
        7 Minute Lower Body Stretch Routine
        Lazy Morning Stretching


    Fat Burning
        Fat Burning HIIT
        20 Min Body Calorie Burner
        Lose Belly Fat
        Beginner Weighted Abs Burn


    Strength & Tone
        Abs Workout (No Crunch!)
        Quick Bigger Chest Building
        Lose Fat (No Jumping)
        Beginner Chest Workout
        Dumbbell Arm Toning


    Levels
        Beginner
        Intermediate
        Advanced


    Duration
        <10 min
        10–15 min
        16–35 min


IMPORTANT:
    One workout can belong to multiple categories.


EXAMPLE:
    Lose Fat (No Jumping)
        Picks for You
        Fat Burning
        Beginner
        10–15 min
        possibly relevant focus area(s)


DISCOVER SEARCH:
    NOT REQUIRED IN V1.


# ================================================================
# 18. DISCOVER USER ACCESS
# ================================================================


USER MAY OPEN ANY DISCOVER WORKOUT:
    Beginner
    Intermediate
    Advanced


Do NOT block advanced workouts from beginners.


The user explicitly chose to open it.


# ================================================================
# 19. DISCOVER PERSONALIZATION / SAFETY
# ================================================================


If a Discover workout contains an exercise incompatible with the user's
profile:


    Keep the Discover workout accessible.


    Modify the workout to fit the user's profile.


    Replace incompatible exercises with compatible exercises where possible.


UI:
    Show the modified workout.


Do not simply make the whole workout disappear.


Example:


    Original:
        Jump Squat


    User restriction:
        No jumping


    Result:
        Replace Jump Squat with an appropriate compatible exercise.


IMPORTANT:
    The replacement must come from our controlled exercise library.


Do NOT use AI to randomly invent an exercise.


# ================================================================
# 20. FAVORITES
# ================================================================


Favorites do NOT need a dedicated Favorites page in V1.


UI:
    Small heart icon beside the relevant exercise/workout item.


Behavior:
    Unselected:
        normal/outline heart


    Selected:
        red heart


    Press again:
        remove favorite
        return to normal heart


Database:
    Store favorite relationship.


# ================================================================
# 21. WORKOUT PLAYER
# ================================================================


WORKOUT PLAYER MUST SUPPORT:


    Exercise display
    GIF/animation
    Instructions
    Reps
    Duration
    Sets
    Rest timer
    Pause
    Resume
    Skip exercise
    Progress through workout


SKIP:
    User may skip individual exercises.


IMPORTANT:
    Skipping an exercise does NOT fail the workout.


COMPLETION:
    A workout is considered completed when the user reaches the end.


INTERRUPTION:
    User can leave/exit a workout.


RESUME:
    When returning to an unfinished workout, resume from the last unfinished
    exercise/state.


EXAMPLE:
    Exercise 4 of 8
    Exit
    Reopen
    Resume from Exercise 4


# ================================================================
# 22. WORKOUT SESSION TRACKING
# ================================================================


A workout session records an actual workout attempt.


FIELDS/CONCEPTS:
    user
    workout
    source
    plan day if applicable
    start time
    end time
    duration
    estimated calories
    completion status


SOURCE:
    plan
    discover


EXERCISE SESSION TRACKING:
    Individual exercise states must be recorded because exercises can be skipped.


POSSIBLE STATUS:
    completed
    skipped


# ================================================================
# 23. CALORIE ESTIMATION
# ================================================================


CALORIE ESTIMATION MUST BE AN ESTIMATE.


USE:
    User body weight
    Workout intensity
    Workout duration


DO NOT:
    Present fixed calorie numbers as medically exact.


DO NOT:
    Claim calorie calculations are perfectly accurate.


PLAN:
    Contains target estimated calories.


ACTUAL SESSION:
    Stores estimated calories associated with the performed session.


# ================================================================
# 24. DAILY GOAL
# ================================================================


DAILY GOAL IS DERIVED FROM THE PLAN WORKOUT.


Example:


    Daily Goal:
        30 min
        300 kcal


User completes:
    Plan workout:
        8 min
        estimated target calories


DISCOVER DOES NOT COUNT TOWARD THE DAILY PLAN GOAL.


IMPORTANT:
    Discover can increase overall activity/report totals,
    but it does not satisfy the Plan Daily Goal.


# ================================================================
# 25. REPORTS
# ================================================================


REPORT PERIODS:


    Today
    This Week
    This Month
    Last 30 Days
    All Time


REPORTS INCLUDE:


    Weight
    Calories
    Workout Duration
    Workout Count
    Streak


ALL WORKOUT SOURCES COUNT IN REPORTS:


    Plan workouts
    Discover workouts


EXAMPLE:


    Plan Day 4:
        8 min


    Discover:
        5 min


    Discover:
        12 min


REPORT:
    Total workouts = 3
    Total duration = 25 min
    Total calories = estimated total


IMPORTANT:
    Do NOT exclude Plan workouts from reports.


# ================================================================
# 26. ACTIVITY TRACKER
# ================================================================


ACTIVITY TRACKER SHOWS ACTUAL WORKOUT ACTIVITY.


EXAMPLE:


    Plan — Day 4
        8 minutes


    Discover — Lose Belly Fat
        5 minutes


    Discover — Beginner Chest Workout
        12 minutes


IMPORTANT:
    Activity tracker includes BOTH Plan and Discover activity.


This is different from Daily Goal tracking.


# ================================================================
# 27. WEIGHT TRACKING
# ================================================================


USER CAN ENTER WEIGHT:
    Any time


DO NOT:
    Overwrite historical measurements.


STORE:
    Each weight entry with timestamp/date.


DISPLAY:
    Current weight
    Target weight
    Last 30 days
    Annual average
    Weight history/chart


# ================================================================
# 28. BMI
# ================================================================


BMI USES:
    Current/latest weight
    Height


FORMULA:
    BMI = weight_kg / (height_m ^ 2)


BMI SHOULD UPDATE AUTOMATICALLY WHEN:
    Height changes
    Weight changes


Do not rely on storing stale BMI values.


# ================================================================
# 29. REPORTS / PROGRESS CHARTS
# ================================================================


IMPORTANT PROGRESS METRICS:


    Weight
    Calories
    Workout duration
    Workout count
    Streak


PRIORITY:
    Weight trend
    Workout consistency
    Streak


Secondary:
    Calories
    Duration
    Workout count


Charts must be calculated from underlying activity/history records rather
than duplicated report tables unless there is a measured performance reason.


# ================================================================
# 30. STREAK
# ================================================================


V1 SUPPORTS STREAKS.


Streak should be based on actual completed workout activity according to
the approved product rule.


Do not fabricate streaks.


Make the streak calculation deterministic and testable.


# ================================================================
# 31. NOTIFICATIONS
# ================================================================


V1 SUPPORTS PUSH NOTIFICATIONS.


Examples:
    Workout reminder
    New day available
    Streak reminder
    Other approved fitness-related notifications


IMPORTANT:
    Notifications must be permission-aware.


If the user denies notification permission:
    The app must continue functioning normally.


Do not make notifications a required dependency.


# ================================================================
# 32. OFFLINE PWA
# ================================================================


OFFLINE V1 SUPPORTS:


    View today's workout
    View downloaded workout media
    Perform workout
    Timer
    Record workout completion
    View recent progress


OFFLINE STORAGE:
    Dexie + IndexedDB


SERVICE WORKER:
    Serwist


ONLINE:
    Supabase is the source of truth.


OFFLINE:
    Local IndexedDB is used for supported actions.


SYNC:
    When network connectivity returns:
        synchronize valid pending local actions with Supabase.


IMPORTANT:
    Discover DOES NOT need to work offline in V1.


OFFLINE MUST NOT:
    Create duplicate workout sessions.


SYNC MUST BE:
    Idempotent where possible.


# ================================================================
# 33. DATA OWNERSHIP / SECURITY
# ================================================================


MEMBER DATA IS PRIVATE.


RLS MUST ENSURE:
    User can access only their own:
        profile
        fitness profile
        restrictions
        weight history
        personalized plan
        workout sessions
        exercise session records
        favorites
        notification preferences if applicable


PUBLIC/SHARED CONTENT:
    Exercises
    Workout templates
    Exercise metadata
    Discover content
    Base plan templates


Do not expose private member data to other members.


IMPORTANT:
    Never trust client-side user IDs.


Always derive authenticated identity from the verified Supabase session.


# ================================================================
# 34. DATABASE PRINCIPLES
# ================================================================


USE:
    PostgreSQL relational design


PREFER:
    normalized reusable data
    foreign keys
    unique constraints
    check constraints where appropriate
    indexes on common query paths
    timestamps
    UUID primary keys where appropriate


DO NOT:
    duplicate exercise data inside every user plan.


DO NOT:
    duplicate report records unnecessarily.


DO NOT:
    store only presentation labels when structured data is required.


DO NOT:
    mix authentication data and application profile data unnecessarily.


# ================================================================
# 35. CORE DATABASE ENTITIES
# ================================================================


EXPECTED CORE ENTITIES:


    profiles


    fitness_profiles


    physical_restrictions
    user_physical_restrictions


    weight_entries


    exercises


    focus_areas
    exercise_focus_areas


    equipment
    exercise_equipment


    restrictions
    exercise_restrictions


    levels
    exercise_levels


    workouts
    workout_exercises
    workout_focus_areas
    workout_categories
    workout_levels


    plan_templates
    plan_template_days


    user_plans
    user_plan_days


    workout_sessions
    workout_exercise_sessions


    favorite_workouts


    notification/preferences tables as needed


IMPORTANT:
    Exact final schema must be created during the database phase.
    Do not blindly create all tables without reviewing relationships,
    constraints, indexes, and RLS together.


# ================================================================
# 36. EXERCISE TAXONOMY
# ================================================================


FOCUS AREAS:


    Full Body
    Abs
    Arm
    Chest
    Butt & Legs


LEVELS:


    Beginner
    Intermediate
    Advanced


DISCOVER CATEGORIES:


    Picks for You
    Stretching & Warmup
    Fat Burning
    Strength & Tone


DURATION FILTERS:


    <10 min
    10–15 min
    16–35 min


IMPORTANT:
    Duration filters should preferably operate from real duration values,
    not only hardcoded labels.


# ================================================================
# 37. EXERCISE DATA INGESTION
# ================================================================


INITIAL SOURCE:
    ExerciseDB V1 Free API


PROCESS:


    ExerciseDB API
        ↓
    Fetch
        ↓
    Validate
        ↓
    Normalize
        ↓
    Store in our DB
        ↓
    Add our own taxonomy
        ↓
    Add safety metadata
        ↓
    Add equipment relationships
        ↓
    Build fixed workouts
        ↓
    Build 30-day plans


IMPORTANT:
    ExerciseDB categories are NOT identical to our product categories.


Do not blindly copy API taxonomy.


Map/normalize API data into our own domain model.


# ================================================================
# 38. MEDIA ABSTRACTION
# ================================================================


MEDIA SOURCE MUST BE REPLACEABLE.


Exercise record should support:


    animation_url
    thumbnail_url
    video_url


Also store:
    media_source
    external_media_id if applicable


Never hardcode ExerciseDB URLs throughout the UI.


The UI should ask our database/service for the exercise media.


# ================================================================
# 39. UI / UX RULE
# ================================================================


DO NOT START UI/UX DESIGN IN THIS MASTER PHASE.


UI/UX WILL BE DESIGNED LATER WITH:
    Google Stitch


Stitch is reserved for the dedicated UI/UX phase.


The final UI will become the visual source of truth after approval.


Do not let the coding agent invent an entirely different design system before
the UI/UX phase unless explicitly instructed.


# ================================================================
# 40. UI/UX DIRECTION — RESERVED FOR STITCH
# ================================================================


PRIMARY STYLE DIRECTION:
    Premium
    Minimal
    Modern
    Mobile-first
    Fitness-focused
    High-quality
    Clean hierarchy
    Strong typography
    Professional


DESIGN INSPIRATION:
    Apple-style simplicity
    Premium fitness application feel


IMPORTANT:
    Exact design system, colors, typography, spacing, components, transitions,
    screen layouts, and visual details will be finalized later through Stitch.


# ================================================================
# 41. REQUIRED MAJOR SCREENS
# ================================================================


Landing Page


Login


Signup


Email Verification Return Flow


Onboarding Page 1


Onboarding Page 2


Onboarding Page 3


Onboarding Page 4


Onboarding Page 5


Onboarding Page 6


Onboarding Page 7


Plan Generation Screen


Dashboard


Plan


Workout Player


Discover


Discover Workout Details


Reports


Progress/Charts


My Profile


Notifications


Settings-related account actions if required


Offline States


Loading States


Error States


Empty States


Locked Day States


Workout Resume States


Permission States


# ================================================================
# 42. IMPORTANT EDGE CASES
# ================================================================


AUTH:
    Unverified user attempts to access protected app
    Expired session
    Invalid login
    Google login conflict
    Password reset
    Deleted account


ONBOARDING:
    User closes app halfway
    User returns later
    Partial onboarding data
    Invalid age
    Invalid height
    Invalid weight
    Target weight equal to current weight
    Target weight greater than current weight
    Missing required answer
    Multiple restrictions
    User retries plan generation


PLAN:
    Day already completed
    Day locked
    User returns after several days
    Profile changes after plan creation
    User attempts to skip plan day
    Duplicate day completion
    Re-opening completed day
    Repeating permitted workout behavior


WORKOUT:
    User pauses
    User leaves app
    User closes browser
    User loses connection
    User resumes
    User skips exercise
    User completes final exercise
    Timer interruption
    Duplicate completion request
    Workout data partially saved offline


DISCOVER:
    Advanced workout opened by beginner
    Incompatible exercise
    Exercise replacement unavailable
    Multiple incompatible exercises
    Workout repeated multiple times
    Favorite toggled rapidly
    Missing media


OFFLINE:
    App starts with no internet
    User completes workout offline
    Network reconnects
    Duplicate sync
    Conflict between local and server data
    Stale cached workout
    Missing media from cache


WEIGHT/BMI:
    Invalid weight
    Invalid height
    Height update
    Weight update
    Weight history
    BMI update


NOTIFICATIONS:
    Permission denied
    Permission revoked
    Unsupported browser
    Notification service unavailable


ACCOUNT:
    Delete account
    Re-login after deletion
    Password reset
    Logout from active session


# ================================================================
# 43. CODING RULES
# ================================================================


1. TypeScript strict mode.


2. Do not use "any" unless there is a documented, unavoidable reason.


3. Validate all external/user input.


4. Use Zod for runtime validation where appropriate.


5. Server-side secrets must NEVER be exposed to the client.


6. Never expose service-role Supabase credentials in browser code.


7. Do not bypass RLS from the client.


8. Keep database operations on the server when elevated privileges are required.


9. Never trust client-supplied user IDs.


10. Prefer reusable components and domain services.


11. Avoid giant components.


12. Keep business logic out of presentation components when practical.


13. Avoid duplicated business rules.


14. Centralize constants/enums.


15. Keep API/data-access logic separate from UI.


16. Use meaningful names.


17. Handle loading, error, empty, offline, and success states.


18. Do not silently swallow errors.


19. Log useful technical information without leaking sensitive data.


20. Never hardcode secrets.


21. Never hardcode exercise catalogs directly into UI components.


22. Never hardcode personalized workout logic inside React components.


23. Database migrations must be versioned.


24. Never manually modify production schema without a migration.


25. Preserve existing working behavior during refactors.


26. Do not introduce a new library when existing project capabilities already solve
    the problem unless there is a clear technical reason.


27. Keep dependencies minimal.


28. Prefer deterministic rules for personalization.


29. Do not use AI-generated workout logic in V1.


30. Do not invent medical advice.


# ================================================================
# 44. PERSONALIZATION RULES
# ================================================================


V1 PERSONALIZATION IS:
    Rule-based
    Deterministic
    Testable


INPUTS:
    Fitness level
    Push-up ability
    Plank ability
    Age
    Height
    Current weight
    Target weight
    Physical restrictions


PROCESS:
    Select base plan
        ↓
    Check exercise compatibility
        ↓
    Remove/replace incompatible exercise
        ↓
    Preserve workout structure as much as possible
        ↓
    Create user plan


IMPORTANT:
    Current V1 plan is not automatically regenerated when profile changes.


# ================================================================
# 45. SOURCE OF TRUTH FOR WORKOUT CONTENT
# ================================================================


EXERCISES:
    Master reusable exercise library


WORKOUTS:
    Fixed exercise collections


PLAN TEMPLATES:
    Fixed 30-day base structures


USER PLANS:
    User-specific copy/assignment of the base plan structure


SESSIONS:
    Real-world performed activity


REPORTS:
    Derived/calculated from sessions/history


# ================================================================
# 46. WHAT MUST NOT BE BUILT IN V1
# ================================================================


DO NOT BUILD:


    Admin dashboard
    Trainer dashboard
    Gym staff portal
    Gym membership management
    Membership expiry system
    Payment gateway
    Online subscriptions
    Billing
    E-commerce
    AI workout generator
    Dynamic AI plan generation
    Social network
    Chat
    Community feed
    Friend system
    Discover offline support
    Separate Favorites page


Unless explicitly added later by the product owner.


# ================================================================
# 47. DEVELOPMENT PHASES
# ================================================================


# PHASE 0 — Requirements & Product Definition


# PHASE 1 — System Architecture


# PHASE 2 — Database & ERD


# PHASE 3 — Authentication & User Account System


# PHASE 4 — Exercise Data & Content Ingestion


# PHASE 5 — Workout & 30-Day Plan Engine


# PHASE 6 — PWA & Offline Architecture


# PHASE 7 — UI/UX Design with Stitch


# PHASE 8 — Frontend Implementation


# PHASE 9 — Backend & Personalization Implementation


# PHASE 10 — Reports, Progress & Notifications


# PHASE 11 — Security, Testing & Quality Assurance


# PHASE 12 — Production Deployment


# PHASE 13 — Post-V1 Improvements


IMPORTANT:
    The phase names above are project milestones.
    Phase-specific prompts will contain the actual execution instructions.


IMPORTANT:
    Do not jump ahead to a later phase unless explicitly instructed.


IMPORTANT:
    UI/UX with Stitch is intentionally delayed until PHASE 7.


# ================================================================
# 48. CURRENT PROJECT STATUS
# ================================================================


CURRENT_STATUS:
    Product definition completed


CURRENT_STAGE:
    Pre-implementation architecture/product planning


COMPLETED:
    Core product requirements discussed
    User journey defined
    Onboarding flow defined
    Member-only scope defined
    Plan rules defined
    Discover rules defined
    Workout behavior defined
    Reports defined
    Progress requirements defined
    Offline requirements defined
    Personalization approach defined
    Exercise/media source initially selected
    Recommended technology stack defined


NOT YET COMPLETED:
    Final ERD
    Final SQL schema
    RLS policies
    Final API contracts
    Exercise taxonomy finalization
    Workout taxonomy finalization
    Base 30-day workout content
    Data ingestion implementation
    PWA implementation
    Stitch UI/UX
    Final PRD
    Application implementation
    Testing
    Deployment


# ================================================================
# 49. PROJECT MEMORY / PROGRESS TRACKING
# ================================================================


The coding agent MUST maintain project progress documentation.


Recommended files:


    /docs/project-memory.md
    /docs/decisions.md
    /docs/current-phase.md
    /docs/database.md
    /docs/api.md
    /docs/testing.md


After meaningful work:
    Update current progress.


Record:
    Completed
    In progress
    Blocked
    Decisions made
    Files changed
    Database changes
    Remaining work
    Known risks


DO NOT claim a phase is complete when only part of it is complete.


# ================================================================
# 50. CONTEXT PRESERVATION RULE
# ================================================================


Before starting work:


    Read:
        MASTER PROJECT CONTEXT
        Current phase document
        Existing project memory
        Relevant database migrations
        Relevant implementation files


Then determine:
    What already exists?
    What has already been completed?
    What is currently being changed?
    What is the next approved task?


Do not start from assumptions.


# ================================================================
# 51. CHANGE MANAGEMENT
# ================================================================


Before implementing a major change:


    Inspect current implementation.
    Identify affected areas.
    Determine database impact.
    Determine API impact.
    Determine offline impact.
    Determine security impact.
    Determine UI impact.
    Implement the smallest safe change.


After implementation:


    Run relevant checks.
    Update documentation.
    Update current project status.
    Report exact files/areas changed.
    Report tests/checks performed.
    Report remaining issues.


# ================================================================
# 52. REQUIRED AGENT OUTPUT
# ================================================================


For every substantial task, the coding agent should report:


    STATUS:
        completed / partially completed / blocked


    WHAT CHANGED:
        concise summary


    FILES CHANGED:
        exact paths


    DATABASE CHANGES:
        migrations/tables/policies if applicable


    API CHANGES:
        endpoints/contracts if applicable


    TESTS:
        commands/checks performed


    RESULT:
        what now works


    REMAINING:
        what is not complete


    NEXT APPROVED STEP:
        one clear next step


DO NOT:
    Claim success without verification.


DO NOT:
    Say "everything is working" if tests/build/typecheck have not been verified.


# ================================================================
# 53. QUALITY STANDARD
# ================================================================


The target is not:
    "Make the demo work."


The target is:
    "Build a maintainable production-quality member fitness PWA."


Priorities:


    Correctness
    Security
    Data integrity
    Maintainability
    Testability
    Good UX
    Offline reliability
    Performance
    Clear architecture


DO NOT sacrifice:
    Database integrity
    RLS
    authentication security
    data consistency
    offline sync correctness


just to make a feature appear to work faster.


# ================================================================
# 54. FINAL PRODUCT MENTAL MODEL
# ================================================================


The entire application can be understood as:


    MEMBER
        ↓
    AUTHENTICATION
        ↓
    PROFILE + FITNESS DATA
        ↓
    BASE 30-DAY PLAN
        ↓
    PERSONALIZATION / SAFETY FILTERING
        ↓
    PLAN WORKOUTS
        +
    DISCOVER WORKOUTS
        ↓
    WORKOUT PLAYER
        ↓
    WORKOUT SESSIONS
        ↓
    REPORTS + PROGRESS + STREAK
        ↓
    MEMBER PROFILE / CONTINUED JOURNEY


OFFLINE LAYER:


    PWA
        ↓
    Service Worker
        +
    IndexedDB/Dexie
        ↓
    Offline workout capability
        ↓
    Sync
        ↓
    Supabase


# ================================================================
# 55. FINAL INSTRUCTION TO THE CODING AGENT
# ================================================================


You are working on an existing, long-running project.


Do NOT behave as though this is a brand-new application every time you are
given a new task.


Remember:
    What has already been decided.
    What has already been implemented.
    What has not yet been implemented.
    What must not be changed.
    Which phase the project is currently in.


Always preserve the approved architecture unless an explicit new decision
overrides it.


Always inspect existing code before changing it.


Always verify your work.


Always update project memory after substantial work.


Never invent missing requirements when they can be documented as assumptions.


Never silently change business rules.


Never replace the chosen stack without an explicit reason and approval.


Never introduce unnecessary complexity.


Build the Gym PWA incrementally, phase by phase, while maintaining one
consistent source of truth for the project.


# ================================================================
# END OF MASTER PROJECT CONTEXT
# ================================================================
