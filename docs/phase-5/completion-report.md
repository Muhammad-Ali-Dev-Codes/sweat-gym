# Phase 5: Workout, Onboarding & 30-Day Plan Engine — Completion Report

**Status**: In Progress (Services & Temporary UI Complete)  
**Date**: 2026-08-20

## What Was Built

### 1. Onboarding Flow
- **7-step wizard**: Welcome → Fitness Level → Push-up → Plank → Body → Target → Restrictions
- Server action (`submitOnboarding`) validates inputs, creates fitness profile, generates plan
- Redirects to `/onboarding` if profile incomplete

### 2. Server-Side Services
All services use server-side Supabase client (`@/lib/supabase/server`):

| Service | Path | Key Functions |
|---------|------|---------------|
| **Onboarding** | `src/services/onboarding/index.ts` | `completeOnboarding`, `getFitnessProfile`, `getUserRestrictions`, `getLatestWeight` |
| **Plan** | `src/services/plan/index.ts` | `generateUserPlan`, `getActivePlan`, `getPlanDays`, `getCurrentPlanDay`, `unlockNextDay`, `completePlanDay` |
| **Workout** | `src/services/workout/index.ts` | `getOrCreateSession`, `getSession`, `getExerciseSessions`, `completeExerciseSession`, `skipExerciseSession`, `activateNextExercise`, `completeWorkoutSession` |
| **Discover** | `src/services/discover/index.ts` | `getDiscoverWorkouts`, `getDiscoverWorkoutWithExercises`, `getReplacementExercise` |
| **Calories** | `src/lib/calories/index.ts` | `estimateCalories` (MET-based), `calculateBMI` |

### 3. Server Actions
| Action | Path | Purpose |
|--------|------|---------|
| `submitOnboarding` | `src/app/actions/onboarding.ts` | Complete onboarding, generate plan |
| `startWorkout` | `src/app/actions/workout.ts` | Create/resume workout session, return exercises |
| `completeExercise` | `src/app/actions/workout.ts` | Mark exercise done, activate next |
| `skipExercise` | `src/app/actions/workout.ts` | Skip exercise, activate next |
| `finishWorkout` | `src/app/actions/workout.ts` | Complete session, calculate calories, unlock next day |

### 4. Temporary UI Pages
| Page | Path | Purpose |
|------|------|---------|
| Onboarding | `src/app/(protected)/onboarding/page.tsx` | 7-step wizard |
| Dashboard | `src/app/(protected)/dashboard/page.tsx` | Current plan status, navigation |
| Plan | `src/app/(protected)/plan/page.tsx` | 30-day calendar view |
| Workout | `src/app/(protected)/workout/page.tsx` | Exercise player with timer, sets, rest |
| Discover | `src/app/(protected)/discover/page.tsx` | Browse all workouts |

### 5. Navigation Updates
- Added Plan and Discover links to protected layout header

## Build Status
✅ **Build passes** — All TypeScript checks, compilation, and static generation successful.

## What's NOT Done (Phase 5 Remaining)
- **Tests**: Unit tests for services, integration tests for plan generation
- **Domain logic tests**: Verify plan generation rules, calorie estimation
- **End-to-end flow testing**: Signup → Onboarding → Plan → Workout → Day 2 Unlock
- **Daily Goal tracking**: Not yet implemented
- **Onboarding question database integration**: Push-up/plank answers map to `fitness_level` only; full question→answer persistence deferred

## Notes
- Plan generation is deterministic/rule-based (not AI)
- Current plan is stable — profile changes don't regenerate in V1
- Discover workouts don't affect plan or daily goal
- Calorie estimation uses MET values (low=3.5, moderate=5.0, high=8.0)
