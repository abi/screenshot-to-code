# Delayed Paywall / Free Trial A/B Test

**Status**: Active experiment
**Branch**: `claude/ab-test-delayed-paywall-pt3yi`
**Date started**: 2026-02-25

## Overview

A/B test where 50% of unsubscribed users get 5 free generations before
seeing the paywall, instead of seeing it immediately on sign-up.

- **Control group**: Immediate paywall (existing behavior).
- **Delayed paywall group**: 5 free generations, then paywall.

## How it works

1. On sign-in, the user's email is hashed to assign them to `control` or
   `delayed_paywall` (50/50 split). Some emails are overridden for testing.
2. Users in the `delayed_paywall` group skip the `OnboardingPaywall` and
   see the normal `StartPane` with a free trial banner showing remaining
   generations.
3. Generations are stored with `payment_method = 'free_trial'` and counted
   server-side by the SaaS backend.
4. The main backend validates the server-side count before each free trial
   generation to prevent abuse.
5. Once the limit is reached, the user sees the paywall.

## Files changed

### Frontend (`screenshot-to-code`)

| File | What changed |
|------|-------------|
| `frontend/src/lib/experiment.ts` | **New file.** Experiment group assignment (hash-based 50/50), email overrides, `FREE_TRIAL_GENERATION_LIMIT` constant. |
| `frontend/src/store/store.ts` | Added `experimentGroup`, `freeTrialUsed`, `freeTrialLimit`, `setFreeTrialUsage`, `setExperimentGroup` to Zustand store. |
| `frontend/src/components/hosted/AppContainer.tsx` | Calls `getExperimentGroup()` on user init. Fetches `/credits/free_trial_usage` for delayed paywall users and stores result. |
| `frontend/src/App.tsx` | Paywall gating: skips `OnboardingPaywall` when user is in delayed paywall group with remaining generations. Passes `isFreeTrial: true` to backend. Optimistically increments usage after generation. Passes `freeTrialInfo` to `StartPane` and `Sidebar`. |
| `frontend/src/components/start-pane/StartPane.tsx` | Accepts `freeTrialInfo` prop, renders `FreeTrialBanner`. |
| `frontend/src/components/sidebar/Sidebar.tsx` | Accepts `freeTrialInfo` prop, renders `FreeTrialBanner` during coding. |
| `frontend/src/components/hosted/FreeTrialBanner.tsx` | **New file.** Shared banner component with progress bar and Upgrade link. |
| `frontend/src/types.ts` | Added `isFreeTrial?: boolean` to generation request type. |

### Backend (`screenshot-to-code`)

| File | What changed |
|------|-------------|
| `backend/routes/generate_code.py` | Reads `isFreeTrial` param. Calls `get_free_trial_usage()` to validate server-side limit before granting platform API keys. Returns error if limit exceeded. |
| `backend/routes/saas_utils.py` | Added `FreeTrialUsageResponse` model and `get_free_trial_usage()` function that calls SaaS backend. |
| `backend/routes/logging_utils.py` | Added `FREE_TRIAL = "free_trial"` to `PaymentMethod` enum. |

### SaaS Backend (`screenshot-to-code-saas`)

| File | What changed |
|------|-------------|
| `backend/users/users.py` | Added `get_num_free_trial_generations()` — counts generations with `payment_method = 'free_trial'`. |
| `backend/routes/credits.py` | Added `FREE_TRIAL_GENERATION_LIMIT = 5`, `FreeTrialUsageResponse` model, and `POST /credits/free_trial_usage` endpoint. |

## Commits

### `screenshot-to-code` (this repo)

```
999f98f Add delayed paywall A/B test for unsubscribed users
ed4a531 Show free trial generation count in sidebar during coding
d06e47a Add email override for delayed paywall testing
e2407c5 Improve free trial banner with progress bar and upgrade link
35aa4c1 Track free trial generations server-side via SaaS backend
```

### `screenshot-to-code-saas`

```
b838efc Add free trial usage tracking endpoint
```

## How to revert

### Quick revert (frontend + backend)

Revert the five commits listed above from this repo, and the one commit
from the SaaS repo. The experiment code is self-contained — reverting
these commits restores the immediate paywall for all users.

### Manual revert checklist

1. **Delete** `frontend/src/lib/experiment.ts`
2. **Delete** `frontend/src/components/hosted/FreeTrialBanner.tsx`
3. **Remove** from `frontend/src/store/store.ts`: `experimentGroup`,
   `setExperimentGroup`, `freeTrialUsed`, `freeTrialLimit`,
   `setFreeTrialUsage` and their implementations.
4. **Remove** from `frontend/src/App.tsx`: all `freeTrialRemaining`,
   `freeTrialUsed`, `freeTrialLimit`, `setFreeTrialUsage` usage;
   the `isFreeTrial` param injection; the `freeTrialInfo` props to
   `StartPane` and `Sidebar`; the `experimentGroup` paywall bypass.
5. **Remove** from `frontend/src/components/hosted/AppContainer.tsx`:
   `setExperimentGroup`, `setFreeTrialUsage`, the experiment group
   assignment, and the free trial usage fetch.
6. **Remove** `freeTrialInfo` prop and `FreeTrialBanner` from
   `StartPane.tsx` and `Sidebar.tsx`.
7. **Remove** `isFreeTrial` from `frontend/src/types.ts`.
8. **Remove** from `backend/routes/generate_code.py`: the `isFreeTrial`
   check, `get_free_trial_usage` call, and the free trial API key grant.
9. **Remove** `FreeTrialUsageResponse` and `get_free_trial_usage` from
   `backend/routes/saas_utils.py`.
10. **Remove** `FREE_TRIAL` from `backend/routes/logging_utils.py`
    `PaymentMethod` enum.
11. **Remove** `get_num_free_trial_generations` from SaaS
    `backend/users/users.py`.
12. **Remove** `FREE_TRIAL_GENERATION_LIMIT`, `FreeTrialUsageResponse`,
    and `/credits/free_trial_usage` endpoint from SaaS
    `backend/routes/credits.py`.

## Testing overrides

To force a specific email into the delayed paywall group, add it to the
`DELAYED_PAYWALL_OVERRIDE_EMAILS` array in `frontend/src/lib/experiment.ts`.

Currently overridden: `abimanyuraja@gmail.com`
