
The user is asking for an explanation of the error, not a fix. This is a research/Q&A question, so no plan or code changes are needed — just a clear explanation.

## What the error means

`Failed to fetch dynamically imported module: .../src/routes/auth.tsx?tsr-split=component`

### Plain-English explanation

TanStack Router splits each route into two pieces to keep the initial page load fast:
1. **Critical part** — route config, loaders, validators (loaded upfront)
2. **Non-critical part** — the actual UI component (loaded on-demand via dynamic `import()`)

The `?tsr-split=component` suffix is the URL the browser uses to fetch that second piece — the auth page's component code — only when you navigate to `/auth`.

The error means: **the browser tried to download that chunk and the network request failed.** It's a *fetch* failure, not a *code* failure. The file `src/routes/auth.tsx` itself is fine — the browser simply couldn't retrieve the compiled chunk from the dev server.

### Why this happens (most common causes)

1. **Stale chunk reference** — The browser has an old `index.html` cached from a previous build that points to a chunk hash that no longer exists on the server (most common after a hot reload or redeploy).
2. **Dev server restarted** — Vite regenerated the chunk URLs, but your open tab is still holding references to the old ones.
3. **Network blip / proxy issue** — The Lovable preview proxy briefly dropped the request.
4. **Sandbox sleep** — The dev server went idle and the chunk request hit it before it woke up.

### How to recover

- **Hard reload** the tab (Cmd/Ctrl + Shift + R) — this is the fix 95% of the time.
- If that doesn't work: DevTools → Application → Storage → **Clear site data** → reload.
- If it persists across reloads, the chunk genuinely isn't being produced (a real build error in `auth.tsx` or its imports), and we'd need to investigate the file.

### Why it isn't a code bug here

I've already verified `src/routes/auth.tsx` parses cleanly and all its imports resolve. The route also appears correctly in `routeTree.gen.ts`. So this is the cache/stale-chunk variant, not a syntax issue.
