

# SwipeBite — Full MVP Plan

A Tinder-style meal discovery app. Swipe meals → match → cook or order takeout. Built on TanStack Start + Lovable Cloud (Supabase under the hood). Tailwind + shadcn + Framer Motion. AI ranking via Lovable AI Gateway (Gemini/GPT-5).

## Critical reminders
- **Revoke the Gemini key you pasted** at https://aistudio.google.com/app/apikey before we build. The Lovable AI Gateway uses an auto-provisioned `LOVABLE_API_KEY` — you never touch a key.
- **No medical advice.** Health tags (GLP-1, pregnancy, iron-rich, etc.) are informational only with a visible disclaimer.
- **No alcohol** ever surfaced in the deck or search.

## Visual direction
Romance-aesthetic, Tinder/Hinge feel. Brand palette `#ee6464 / #f19b7d / #f5bd8c` (warm coral). Color-blind alt palette `#343679 / #686ec1 / #b5e1f7` toggled in settings (saved to `localStorage` + profile). Reduce-motion toggle disables Framer Motion physics. Rounded, soft shadows, big food photos, swipe gestures.

## Routes
```
/                          Landing + skippable demo carousel
/auth                      Email + Google sign-in / sign-up
/onboarding                Goal questionnaire (multi-step)
/_app/                     Authenticated layout
  mode                     Choose Takeout vs Cook Your Match
  swipe                    Swipe deck (deps on mode + meal-time)
  matches                  Grid of matched meals + filters + keyword
  matches/$mealId          Meal detail "thanks for choosing me" view
  pinned                   Saved-for-later meals
  settings                 Allergies, religion, color-blind, reduce-motion, photo, food-bio
  contact                  Contact form
/legal/disclaimer          Health disclaimer
```

## Database (Lovable Cloud / Supabase)

```text
profiles                    1:1 with auth.users
  id, display_name, avatar_url, food_bio, color_blind, reduce_motion,
  onboarding_complete, created_at

user_roles                  separate table (security)
  id, user_id, role enum('user','admin')

preferences                 onboarding answers
  user_id PK, dietary_restrictions[], allergies[], religion,
  health_conditions[], glp1_user, budget_range, living_situation,
  cook_time_minutes, kitchen_access, eating_goal, updated_at

meals                       cached meal catalog (TheMealDB + Edamam + curated cultural)
  id, source, source_id, name, cuisine, image_url, ingredients jsonb,
  instructions, prep_minutes, calories, macros jsonb, tags[],
  health_flags[], meal_time[], is_alcohol bool default false

swipes                      every swipe (full history, your choice)
  id, user_id, meal_id, direction enum('left','right'), mode, created_at

matches                     right-swipes (denormalized for speed)
  id, user_id, meal_id, matched_at, unique(user_id, meal_id)

pins                        saved-for-later
  id, user_id, meal_id, created_at, unique(user_id, meal_id)

reports                     "this shouldn't be here" + "my restriction missing"
  id, user_id, meal_id nullable, kind enum('bad_match','missing_restriction','other'),
  message, created_at

contact_messages
  id, user_id nullable, email, message, created_at
```

RLS: users see only their own rows everywhere. `meals` is public read. `user_roles` checked via `has_role()` security-definer function. Trigger auto-creates `profiles` + default `user_roles('user')` on signup.

## Server functions
- `submitOnboarding` — write preferences
- `getSwipeDeck({ mode, mealTime })` — returns 20 unswiped meals filtered by allergies/restrictions/calorie band, AI-ranked via Gateway
- `recordSwipe({ mealId, direction })` — insert swipe, if right also insert match, return `{ matched }`
- `rewindLastSwipe()` — undo most recent swipe (one step only)
- `togglePin({ mealId })`
- `getMatches({ filters })` — keyword + ingredient + calorie + health filter
- `getMealDetail({ mealId })` — full recipe, instructions, tools, nutrition, takeout deep links
- `submitReport({ mealId, kind, message })`
- `submitContact({ email, message })`
- `clearOtherMatches({ keptMealId })` — "I'm taking a bite" → archive other matches

## External integrations
- **TheMealDB** — free recipes, instructions, images, cuisine
- **Edamam** — nutrition + dietary flags (you'll add `EDAMAM_APP_ID` + `EDAMAM_APP_KEY` secrets when ready; MVP works without)
- **Lovable AI Gateway** — `google/gemini-3-flash-preview` for ranking deck + cleaning recipe text + tagging health benefits
- **Takeout deep links** — Uber Eats, DoorDash, Google Maps search by cuisine + browser geolocation. No live open/closed in MVP (Google Places later).
- **Browser geolocation** for "near me" sort on takeout
- **Auto meal-time**: 5–11:59 breakfast, 12–16:59 lunch, 17–23:59 dinner, else snacks/desserts

## Onboarding flow
Multi-step, saves on each step, resumable:
1. Dietary restrictions (checkboxes + "Other → report missing")
2. Allergies
3. Religious preferences
4. Health conditions (with disclaimer link)
5. GLP-1 / Ozempic toggle
6. Budget range
7. Living situation
8. Cook time available
9. Kitchen access
10. Eating goal
11. Optional photo + food bio

## Swipe deck UX
- Framer Motion drag, throw-away animation, big card with photo + name + cuisine + calorie chip + 2-3 health tags
- Right = match (heart pop overlay), Left = pass, **Rewind** button (one step), tap card = preview details
- Filter strip respects all preferences server-side; user never sees disallowed meals or alcohol
- Empty state when deck exhausted

## Matches page
- Picture grid, keyword search, filter sheet (calories slider, ingredient include/exclude, health flags)
- Tap card → meal detail "Thanks for choosing me 😍, have me on your plate…" with affordability, restrictions, ingredients, prep time, nutrition, benefits, **tools needed** (parsed from recipe), and "Take a Bite" button → calorie/macro confirmation + clears other matches

## Cook Your Match detail
- Full instructions, tools list, prep time, cultural context (curated cuisines: Caribbean, West African, South Asian, Latin American, East Asian, Mediterranean)
- AI-cleaned description with health benefit tags

## Takeout detail
- Cuisine-based deep links: "Order on Uber Eats", "Order on DoorDash", "Find on Google Maps" (uses geolocation)
- Placeholder for phone/open-status (wired later with Places)

## Auth & settings
- Email/password + Google OAuth (you confirm Google client setup in Lovable Cloud)
- Settings: allergies/religion/restrictions, color-blind toggle, reduce-motion toggle, avatar upload (Supabase Storage), food bio, sign out, delete account
- Password reset page at `/reset-password`

## Reports & contact
- "Report" button on every meal detail with three reasons + free text
- Onboarding "my restriction is not listed" → submits report
- `/contact` form persists to `contact_messages`

## Demo video on landing
- A skippable carousel of 4 phone-frame screenshots with captions explaining the flow (no real video; if you provide an MP4 later I'll embed it)

## What's NOT in MVP
- Live restaurant open/closed, phone, real distance (needs Google Places — later)
- MealMe API (paid, B2B)
- Real promotional video
- Push notifications

## Build order
1. Schema + RLS + auth + profile trigger
2. Onboarding + settings + a11y toggles
3. Meal seeding job (TheMealDB pull + curated cultural list, no alcohol)
4. Swipe deck + rewind + matches + pins
5. Match detail + Cook Your Match (recipe, tools, AI-cleaned description)
6. Takeout deep links + geolocation
7. Reports + contact + landing/demo + disclaimer
8. AI ranking pass on the deck

When you approve, I'll start with steps 1–2 in the first build.

