---
title: "Gym Member Fitness PWA - Entity Relationship Diagram v1.0"
---

```mermaid
erDiagram

    levels {
        uuid id PK
        text name
        text slug
    }

    focus_areas {
        uuid id PK
        text name
        text slug
    }

    workout_categories {
        uuid id PK
        text name
        text slug
        int display_order
    }

    equipment {
        uuid id PK
        text name
        text slug
    }

    physical_restrictions {
        uuid id PK
        text name
        text slug
    }

    exercise_restrictions {
        uuid id PK
        text name
        text slug
    }

    muscles {
        uuid id PK
        text name
        text slug
    }

    exercises {
        uuid id PK
        text name
        text slug
        text exercise_mode
        boolean is_low_impact
        boolean requires_jumping
        boolean is_active
    }

    exercise_focus_areas {
        uuid exercise_id FK
        uuid focus_area_id FK
    }

    exercise_levels {
        uuid exercise_id FK
        uuid level_id FK
    }

    exercise_equipment {
        uuid exercise_id FK
        uuid equipment_id FK
    }

    exercise_restriction_map {
        uuid exercise_id FK
        uuid restriction_id FK
    }

    exercise_muscles {
        uuid exercise_id FK
        uuid muscle_id FK
        boolean is_primary
    }

    workouts {
        uuid id PK
        text name
        text slug
        int duration_seconds
        int estimated_calories
        boolean is_active
    }

    workout_exercises {
        uuid id PK
        uuid workout_id FK
        uuid exercise_id FK
        int exercise_order
        int sets
        int reps
        int duration_seconds
        int rest_seconds
    }

    workout_category_map {
        uuid workout_id FK
        uuid category_id FK
    }

    workout_focus_areas {
        uuid workout_id FK
        uuid focus_area_id FK
    }

    workout_levels {
        uuid workout_id FK
        uuid level_id FK
    }

    plan_templates {
        uuid id PK
        text name
        uuid fitness_level_id FK
        int duration_days
        boolean is_active
    }

    plan_template_days {
        uuid id PK
        uuid plan_template_id FK
        int day_number
        uuid workout_id FK
        int target_duration_seconds
        int target_calories
    }

    profiles {
        uuid id PK
        uuid user_id FK
        text full_name
        int age
        text timezone
        boolean onboarding_completed
    }

    fitness_profiles {
        uuid id PK
        uuid user_id FK
        text fitness_level
        text push_up_ability
        text plank_ability
        int height_cm
        numeric target_weight_kg
    }

    user_physical_restrictions {
        uuid user_id FK
        uuid restriction_id FK
    }

    weight_entries {
        uuid id PK
        uuid user_id FK
        numeric weight_kg
        timestamptz recorded_at
    }

    user_plans {
        uuid id PK
        uuid user_id FK
        uuid plan_template_id FK
        timestamptz started_at
        text status
    }

    user_plan_days {
        uuid id PK
        uuid user_plan_id FK
        int day_number
        uuid workout_id FK
        int target_duration_seconds
        int target_calories
        text status
        date actual_activity_date
    }

    workout_sessions {
        uuid id PK
        uuid user_id FK
        uuid workout_id FK
        text source
        uuid user_plan_day_id FK
        timestamptz started_at
        timestamptz completed_at
        text status
        text client_operation_id
    }

    workout_exercise_sessions {
        uuid id PK
        uuid workout_session_id FK
        uuid workout_exercise_id FK
        text status
        int completed_sets
        int actual_reps
        int actual_duration_seconds
    }

    favorite_workouts {
        uuid user_id FK
        uuid workout_id FK
    }

    push_subscriptions {
        uuid id PK
        uuid user_id FK
        text endpoint
    }

    notification_preferences {
        uuid user_id FK
        boolean workout_reminders
        boolean streak_reminders
    }

    sync_operations {
        uuid id PK
        uuid user_id FK
        text operation_id
        text operation_type
        text table_name
        uuid record_id
        text status
    }

    exercises ||--o{ exercise_focus_areas : "has"
    focus_areas ||--o{ exercise_focus_areas : "has"

    exercises ||--o{ exercise_levels : "has"
    levels ||--o{ exercise_levels : "has"

    exercises ||--o{ exercise_equipment : "uses"
    equipment ||--o{ exercise_equipment : "used by"

    exercises ||--o{ exercise_restriction_map : "has"
    exercise_restrictions ||--o{ exercise_restriction_map : "applies to"

    exercises ||--o{ exercise_muscles : "targets"
    muscles ||--o{ exercise_muscles : "targeted by"

    workouts ||--o{ workout_exercises : "contains"
    exercises ||--o{ workout_exercises : "included in"

    workouts ||--o{ workout_category_map : "belongs to"
    workout_categories ||--o{ workout_category_map : "contains"

    workouts ||--o{ workout_focus_areas : "targets"
    focus_areas ||--o{ workout_focus_areas : "targeted by"

    workouts ||--o{ workout_levels : "suited for"
    levels ||--o{ workout_levels : "applies to"

    plan_templates ||--o{ plan_template_days : "contains"
    workouts ||--o{ plan_template_days : "assigned on"

    levels ||--o{ plan_templates : "defines level for"

    profiles }o--|| auth.users : "belongs to"
    fitness_profiles }o--|| auth.users : "belongs to"

    auth.users ||--o{ user_physical_restrictions : "has"
    physical_restrictions ||--o{ user_physical_restrictions : "restricts"

    auth.users ||--o{ weight_entries : "records"

    auth.users ||--o{ user_plans : "enrolled in"
    plan_templates ||--o{ user_plans : "based on"

    user_plans ||--o{ user_plan_days : "contains"
    workouts ||--o{ user_plan_days : "assigned on"

    auth.users ||--o{ workout_sessions : "performs"
    workouts ||--o{ workout_sessions : "performed as"
    user_plan_days ||--o{ workout_sessions : "tracked by"

    workout_sessions ||--o{ workout_exercise_sessions : "contains"
    workout_exercises ||--o{ workout_exercise_sessions : "tracked in"

    auth.users ||--o{ favorite_workouts : "favors"
    workouts ||--o{ favorite_workouts : "favorited by"

    auth.users ||--o{ push_subscriptions : "has"
    auth.users ||--| notification_preferences : "configured by"
    auth.users ||--o{ sync_operations : "performs"
```
