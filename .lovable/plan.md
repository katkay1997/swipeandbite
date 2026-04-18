
The user wants a summary they can paste into a NEW Lovable project to recreate this app WITHOUT any authentication. They're not asking me to modify this project — they want a spec/prompt to bootstrap a duplicate elsewhere.

Let me quickly map what this app does so the summary is accurate:
- SwipeBite: Tinder-style meal discovery (cook or takeout)
- Routes: index (landing), app/mode, app/swipe, app/matches, app/match/$id, app/ate, app/settings, app/onboarding, contact, legal/disclaimer
- Backend tables: profiles, preferences, meals, swipes, matches, pins, contact_messages, reports, user_roles
- Server functions: estimateMealNutrition, searchTakeoutNearby (uses Lovable AI + Tavily)
- Storage: avatars bucket
- Stack: TanStack Start v1, React 19, Tailwind v4, Lovable Cloud

For a no-auth version, I need to specify:
- Remove all auth (no /auth, no /reset-password, no AuthProvider, no user_roles, no profiles table tied to auth.users)
- Replace user_id everywhere with a local device/anon identifier (localStorage UUID) OR just keep all data client-side (localStorage/IndexedDB) — simpler & matches "full access, no sign in"
- Drop RLS-protected tables that needed user scoping; either go fully local-storage OR use a single shared/public table with anon access
- Remove onboarding redirect gating; preferences live in localStorage
- Settings page no longer needs avatar upload (or keep with anon device id)

I'll recommend the localStorage approach — cleanest for "no sign in, full access". Cloud only used for the meals catalog (public read) + AI server functions for nutrition/takeout search.

Output: a single copy-paste prompt block.
