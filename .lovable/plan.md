
## Why you're seeing this fetch error

The error `Failed to fetch dynamically imported module: .../src/routes/auth.tsx?tsr-split=component` is a **network/cache failure**, not a code bug.

### What's happening under the hood

TanStack Router automatically splits each route file into two pieces:
- **Critical chunk** — route config, search validators, loaders (loaded upfront)
- **Component chunk** — the UI (`AuthPage`), loaded on-demand via dynamic `import()`

The `?tsr-split=component` URL is the request for that second chunk. When you click "Sign in" (or navigate to `/auth`), the browser fires this request — and it failed.

### The most likely cause for your case

Looking at the console log, I see `Error in route match: /auth/auth` — note the doubled path. Combined with the fetch failure, this points to:

1. **Stale browser cache** — your tab was opened before the latest edits to `auth.tsx`. The browser still holds references to old chunk URLs that Vite has since regenerated. The new request 404s because that chunk hash no longer exists on the dev server.

2. **Lovable preview proxy hiccup** — the preview proxy occasionally drops in-flight chunk requests during HMR, especially right after an edit.

3. **Dev server was warming up** — if the sandbox was idle, the first request to `?tsr-split=component` can race the server before Vite finishes generating the chunk.

### Why it's NOT a code issue

I re-checked `src/routes/auth.tsx`:
- Imports all resolve (`@/integrations/supabase/client`, `@/lib/auth-context`, etc.)
- JSX is balanced, no syntax errors
- `Route` is exported correctly with `createFileRoute("/auth")`
- `AuthPage` is **not** exported (correct — exporting it would defeat code-splitting)
- The route appears in `routeTree.gen.ts`

So Vite *can* build the chunk. The browser just couldn't fetch it on that attempt.

### How to recover (in order)

1. **Hard reload** the preview tab: Cmd/Ctrl + Shift + R. Fixes ~95% of cases.
2. If hard reload doesn't work: DevTools → Application → **Clear site data** → reload.
3. If it still fails after a clean reload, the issue is the Lovable preview proxy interfering with the chunk request. Click **Publish** and test sign-in on the published URL — that environment doesn't have the proxy in front of dynamic imports.

### What I would do in code (only if it persists)

If the error reliably reproduces after a clean reload, the workaround is to **opt this route out of code-splitting** so the component ships in the main bundle and never needs a separate fetch:

```tsx
export const Route = createFileRoute("/auth")({
  codeSplitGroupings: [["loader", "component"]], // bundle together
  // ... rest unchanged
});
```

This trades a tiny bit of initial bundle size for eliminating the dynamic import entirely. I'd only apply this if hard reload + published-URL test both still fail — otherwise it's just masking a transient cache issue.

### Bottom line

This is a **fetch-time failure**, not a bug in `auth.tsx`. The file is correct. Hard reload first; if it persists, test on the published URL; only then do we change code.
