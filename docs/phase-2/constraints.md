# Database Constraints Reference

Gym Member Fitness PWA — Phase 2 Schema Constraints

---

## 1. PRIMARY KEYS

| Table | Column(s) | Generation |
|---|---|---|
| levels | id | gen_random_uuid() |
| focus_areas | id | gen_random_uuid() |
| workout_categories | id | gen_random_uuid() |
| equipment | id | gen_random_uuid() |
| physical_restrictions | id | gen_random_uuid() |
| exercise_restrictions | id | gen_random_uuid() |
| muscles | id | gen_random_uuid() |
| exercises | id | gen_random_uuid() |
| exercise_focus_areas | (exercise_id, focus_area_id) | Composite |
| exercise_levels | (exercise_id, level_id) | Composite |
| exercise_equipment | (exercise_id, equipment_id) | Composite |
| exercise_restriction_map | (exercise_id, restriction_id) | Composite |
| exercise_muscles | (exercise_id, muscle_id) | Composite |
| workouts | id | gen_random_uuid() |
| workout_exercises | id | gen_random_uuid() |
| workout_category_map | (workout_id, category_id) | Composite |
| workout_focus_areas | (workout_id, focus_area_id) | Composite |
| workout_levels | (workout_id, level_id) | Composite |
| plan_templates | id | gen_random_uuid() |
| plan_template_days | id | gen_random_uuid() |
| profiles | id | gen_random_uuid() |
| fitness_profiles | id | gen_random_uuid() |
| user_physical_restrictions | (user_id, restriction_id) | Composite |
| weight_entries | id | gen_random_uuid() |
| user_plans | id | gen_random_uuid() |
| user_plan_days | id | gen_random_uuid() |
| workout_sessions | id | gen_random_uuid() |
| workout_exercise_sessions | id | gen_random_uuid() |
| favorite_workouts | (user_id, workout_id) | Composite |
| push_subscriptions | id | gen_random_uuid() |
| notification_preferences | user_id | FK-based |
| sync_operations | id | gen_random_uuid() |

---

## 2. FOREIGN KEYS

### exercises table
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| exercise_focus_areas.exercise_id | exercises | id | CASCADE |
| exercise_focus_areas.focus_area_id | focus_areas | id | CASCADE |
| exercise_levels.exercise_id | exercises | id | CASCADE |
| exercise_levels.level_id | levels | id | CASCADE |
| exercise_equipment.exercise_id | exercises | id | CASCADE |
| exercise_equipment.equipment_id | equipment | id | CASCADE |
| exercise_restriction_map.exercise_id | exercises | id | CASCADE |
| exercise_restriction_map.restriction_id | exercise_restrictions | id | CASCADE |
| exercise_muscles.exercise_id | exercises | id | CASCADE |
| exercise_muscles.muscle_id | muscles | id | CASCADE |

### workout_exercises
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| workout_exercises.workout_id | workouts | id | CASCADE |
| workout_exercises.exercise_id | exercises | id | RESTRICT |

### workout_category_map
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| workout_category_map.workout_id | workouts | id | CASCADE |
| workout_category_map.category_id | workout_categories | id | CASCADE |

### workout_focus_areas
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| workout_focus_areas.workout_id | workouts | id | CASCADE |
| workout_focus_areas.focus_area_id | focus_areas | id | CASCADE |

### workout_levels
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| workout_levels.workout_id | workouts | id | CASCADE |
| workout_levels.level_id | levels | id | CASCADE |

### plan_templates
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| plan_templates.fitness_level_id | levels | id | RESTRICT |

### plan_template_days
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| plan_template_days.plan_template_id | plan_templates | id | CASCADE |
| plan_template_days.workout_id | workouts | id | RESTRICT |

### profiles
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| profiles.user_id | auth.users | id | CASCADE |

### fitness_profiles
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| fitness_profiles.user_id | auth.users | id | CASCADE |

### user_physical_restrictions
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| user_physical_restrictions.user_id | auth.users | id | CASCADE |
| user_physical_restrictions.restriction_id | physical_restrictions | id | CASCADE |

### weight_entries
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| weight_entries.user_id | auth.users | id | CASCADE |

### user_plans
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| user_plans.user_id | auth.users | id | CASCADE |
| user_plans.plan_template_id | plan_templates | id | RESTRICT |

### user_plan_days
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| user_plan_days.user_plan_id | user_plans | id | CASCADE |
| user_plan_days.workout_id | workouts | id | RESTRICT |

### workout_sessions
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| workout_sessions.user_id | auth.users | id | CASCADE |
| workout_sessions.workout_id | workouts | id | RESTRICT |
| workout_sessions.user_plan_day_id | user_plan_days | id | SET NULL |

### workout_exercise_sessions
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| workout_exercise_sessions.workout_session_id | workout_sessions | id | CASCADE |
| workout_exercise_sessions.workout_exercise_id | workout_exercises | id | RESTRICT |

### favorite_workouts
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| favorite_workouts.user_id | auth.users | id | CASCADE |
| favorite_workouts.workout_id | workouts | id | CASCADE |

### push_subscriptions
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| push_subscriptions.user_id | auth.users | id | CASCADE |

### notification_preferences
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| notification_preferences.user_id | auth.users | id | CASCADE |

### sync_operations
| Source Column | Target Table | Target Column | ON DELETE |
|---|---|---|---|
| sync_operations.user_id | auth.users | id | CASCADE |

---

## 3. UNIQUE CONSTRAINTS

| Table | Column(s) | Constraint Name Pattern |
|---|---|---|
| levels | slug | levels_slug_unique (implicit) |
| focus_areas | slug | focus_areas_slug_unique (implicit) |
| workout_categories | slug | workout_categories_slug_unique (implicit) |
| equipment | slug | equipment_slug_unique (implicit) |
| physical_restrictions | slug | physical_restrictions_slug_unique (implicit) |
| exercise_restrictions | slug | exercise_restrictions_slug_unique (implicit) |
| muscles | slug | muscles_slug_unique (implicit) |
| exercises | (external_source, external_exercise_id) | exercises_external_source_external_exercise_id_key (explicit) |
| workouts | slug | workouts_slug_unique (implicit) |
| workout_exercises | (workout_id, exercise_order) | workout_exercises_workout_id_exercise_order_key (explicit) |
| plan_template_days | (plan_template_id, day_number) | plan_template_days_plan_template_id_day_number_key (explicit) |
| profiles | user_id | profiles_user_id_unique (explicit UNIQUE) |
| fitness_profiles | user_id | fitness_profiles_user_id_unique (explicit UNIQUE) |
| user_plan_days | (user_plan_id, day_number) | user_plan_days_user_plan_id_day_number_key (explicit) |
| workout_sessions | client_operation_id | workout_sessions_client_operation_id_key (explicit UNIQUE) |
| push_subscriptions | (user_id, endpoint) | push_subscriptions_user_id_endpoint_key (explicit) |
| sync_operations | operation_id | sync_operations_operation_id_key (explicit UNIQUE) |

---

## 4. CHECK CONSTRAINTS

### exercises
| Column | Condition |
|---|---|
| exercise_mode | exercise_mode IN ('reps', 'duration', 'both') |

### workouts
| Column | Condition |
|---|---|
| duration_seconds | duration_seconds > 0 |
| estimated_calories | estimated_calories > 0 |

### workout_exercises
| Column | Condition |
|---|---|
| exercise_order | exercise_order > 0 |
| sets | sets > 0 |
| reps | reps > 0 |
| duration_seconds | duration_seconds > 0 |
| rest_seconds | rest_seconds >= 0 |

### plan_templates
| Column | Condition |
|---|---|
| duration_days | duration_days = 30 |

### plan_template_days
| Column | Condition |
|---|---|
| day_number | day_number BETWEEN 1 AND 30 |
| target_duration_seconds | target_duration_seconds > 0 |
| target_calories | target_calories > 0 |

### profiles
| Column | Condition |
|---|---|
| age | age BETWEEN 10 AND 120 |

### fitness_profiles
| Column | Condition |
|---|---|
| fitness_level | fitness_level IN ('beginner', 'intermediate', 'advanced') |
| push_up_ability | push_up_ability IN ('unable', '0_5', '5_10', '10_20', '20_plus') |
| plank_ability | plank_ability IN ('unable', '0_30', '30_60', '60_120', '120_plus') |
| height_cm | height_cm > 0 |
| target_weight_kg | target_weight_kg > 0 |

### weight_entries
| Column | Condition |
|---|---|
| weight_kg | weight_kg > 0 |

### user_plans
| Column | Condition |
|---|---|
| status | status IN ('active', 'completed', 'archived') |

### user_plan_days
| Column | Condition |
|---|---|
| day_number | day_number BETWEEN 1 AND 30 |
| target_duration_seconds | target_duration_seconds > 0 |
| target_calories | target_calories > 0 |
| status | status IN ('locked', 'available', 'in_progress', 'completed') |

### workout_sessions
| Column | Condition |
|---|---|
| source | source IN ('plan', 'discover') |
| duration_seconds | duration_seconds > 0 |
| estimated_calories | estimated_calories > 0 |
| status | status IN ('in_progress', 'completed', 'abandoned', 'interrupted') |

### workout_exercise_sessions
| Column | Condition |
|---|---|
| status | status IN ('pending', 'in_progress', 'completed', 'skipped') |
| completed_sets | completed_sets >= 0 |
| actual_reps | actual_reps > 0 |
| actual_duration_seconds | actual_duration_seconds > 0 |

### sync_operations
| Column | Condition |
|---|---|
| operation_type | operation_type IN ('create', 'update', 'delete') |
| status | status IN ('pending', 'processing', 'completed', 'failed') |

---

## 5. NOT NULL COLUMNS

All tables have `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.

### Reference Tables (0001)
- levels: id, name, slug, created_at
- focus_areas: id, name, slug, created_at
- workout_categories: id, name, slug, display_order, created_at
- equipment: id, name, slug, created_at
- physical_restrictions: id, name, slug, created_at
- exercise_restrictions: id, name, slug, created_at
- muscles: id, name, slug, created_at

### exercises
- id, name, exercise_mode, is_low_impact, requires_jumping, is_active, created_at, updated_at

### exercise_focus_areas
- exercise_id, focus_area_id, created_at

### exercise_levels
- exercise_id, level_id, created_at

### exercise_equipment
- exercise_id, equipment_id, created_at

### exercise_restriction_map
- exercise_id, restriction_id, created_at

### exercise_muscles
- exercise_id, muscle_id, is_primary, created_at

### workouts
- id, name, slug, duration_seconds, estimated_calories, is_active, created_at, updated_at

### workout_exercises
- id, workout_id, exercise_id, exercise_order, sets, rest_seconds, created_at

### workout_category_map
- workout_id, category_id, created_at

### workout_focus_areas
- workout_id, focus_area_id, created_at

### workout_levels
- workout_id, level_id, created_at

### plan_templates
- id, name, fitness_level_id, duration_days, is_active, created_at, updated_at

### plan_template_days
- id, plan_template_id, day_number, workout_id, target_duration_seconds, target_calories, created_at, updated_at

### profiles
- id, user_id, full_name, age, timezone, onboarding_completed, created_at, updated_at

### fitness_profiles
- id, user_id, fitness_level, push_up_ability, plank_ability, height_cm, target_weight_kg, created_at, updated_at

### user_physical_restrictions
- user_id, restriction_id, created_at

### weight_entries
- id, user_id, weight_kg, recorded_at, created_at

### user_plans
- id, user_id, plan_template_id, started_at, status, created_at, updated_at

### user_plan_days
- id, user_plan_id, day_number, workout_id, target_duration_seconds, target_calories, status, created_at, updated_at

### workout_sessions
- id, user_id, workout_id, source, started_at, status, client_operation_id, created_at, updated_at

### workout_exercise_sessions
- id, workout_session_id, workout_exercise_id, status, created_at, updated_at

### favorite_workouts
- user_id, workout_id, created_at

### push_subscriptions
- id, user_id, endpoint, p256dh, auth, created_at, updated_at

### notification_preferences
- user_id, workout_reminders, streak_reminders, created_at, updated_at

### sync_operations
- id, user_id, operation_id, operation_type, table_name, record_id, status, created_at

---

## 6. DEFAULT VALUES

| Table | Column | Default |
|---|---|---|
| levels | id | gen_random_uuid() |
| levels | created_at | now() |
| focus_areas | id | gen_random_uuid() |
| focus_areas | created_at | now() |
| workout_categories | id | gen_random_uuid() |
| workout_categories | display_order | 0 |
| workout_categories | created_at | now() |
| equipment | id | gen_random_uuid() |
| equipment | created_at | now() |
| physical_restrictions | id | gen_random_uuid() |
| physical_restrictions | created_at | now() |
| exercise_restrictions | id | gen_random_uuid() |
| exercise_restrictions | created_at | now() |
| muscles | id | gen_random_uuid() |
| muscles | created_at | now() |
| exercises | id | gen_random_uuid() |
| exercises | media_source | 'exercisedb' |
| exercises | is_low_impact | false |
| exercises | requires_jumping | false |
| exercises | is_active | true |
| exercises | created_at | now() |
| exercises | updated_at | now() |
| workouts | id | gen_random_uuid() |
| workouts | is_active | true |
| workouts | created_at | now() |
| workouts | updated_at | now() |
| workout_exercises | id | gen_random_uuid() |
| workout_exercises | rest_seconds | 0 |
| workout_exercises | created_at | now() |
| plan_templates | id | gen_random_uuid() |
| plan_templates | duration_days | 30 |
| plan_templates | is_active | true |
| plan_templates | created_at | now() |
| plan_templates | updated_at | now() |
| plan_template_days | id | gen_random_uuid() |
| plan_template_days | created_at | now() |
| plan_template_days | updated_at | now() |
| profiles | id | gen_random_uuid() |
| profiles | timezone | 'UTC' |
| profiles | onboarding_completed | false |
| profiles | created_at | now() |
| profiles | updated_at | now() |
| fitness_profiles | id | gen_random_uuid() |
| fitness_profiles | created_at | now() |
| fitness_profiles | updated_at | now() |
| weight_entries | id | gen_random_uuid() |
| weight_entries | created_at | now() |
| user_plans | id | gen_random_uuid() |
| user_plans | started_at | now() |
| user_plans | status | 'active' |
| user_plans | created_at | now() |
| user_plans | updated_at | now() |
| user_plan_days | id | gen_random_uuid() |
| user_plan_days | status | 'locked' |
| user_plan_days | created_at | now() |
| user_plan_days | updated_at | now() |
| workout_sessions | id | gen_random_uuid() |
| workout_sessions | status | 'in_progress' |
| workout_sessions | created_at | now() |
| workout_sessions | updated_at | now() |
| workout_exercise_sessions | id | gen_random_uuid() |
| workout_exercise_sessions | status | 'pending' |
| workout_exercise_sessions | completed_sets | 0 |
| workout_exercise_sessions | created_at | now() |
| workout_exercise_sessions | updated_at | now() |
| push_subscriptions | id | gen_random_uuid() |
| push_subscriptions | created_at | now() |
| push_subscriptions | updated_at | now() |
| notification_preferences | workout_reminders | true |
| notification_preferences | streak_reminders | true |
| notification_preferences | created_at | now() |
| notification_preferences | updated_at | now() |
| sync_operations | id | gen_random_uuid() |
| sync_operations | status | 'pending' |
| sync_operations | created_at | now() |
