import type { Router } from 'vue-router'

// After a deploy the old hashed chunks are gone: a tab opened before it fails
// to load a page or a modal it hasn't loaded yet. Vite reports that as
// `vite:preloadError`; the tab then reloads into the new build, to where the
// user was heading. Once per RETRY_MS, so a broken build can't reload in a loop.
const RELOADED_AT = 'chunk-reload-at'
const RETRY_MS = 10_000

function reloadOnce(href: string) {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT)) < RETRY_MS) return
    sessionStorage.setItem(RELOADED_AT, String(Date.now()))
  } catch {
    // Storage blocked: reloading without the guard is still better than a dead link.
  }
  // Same page up to the #hash: assign() would only scroll to the fragment, not reload.
  const withoutHash = (url: string) => new URL(url, window.location.href).href.split('#')[0]
  if (withoutHash(href) === withoutHash(window.location.href)) window.location.reload()
  else window.location.assign(href)
}

// Returns the uninstall (for tests); the app keeps it for its lifetime.
export function installChunkReload(router: Router): () => void {
  // The route a navigation is loading; its page chunk is the likely one missing.
  let heading: string | null = null
  router.beforeEach((to) => {
    heading = to.fullPath
  })
  // A navigation that throws (its chunk failed) ends in onError, not afterEach.
  router.afterEach(() => {
    heading = null
  })
  router.onError(() => {
    heading = null
  })
  const onPreloadError = () => {
    reloadOnce(heading === null ? window.location.href : router.resolve(heading).href)
  }
  window.addEventListener('vite:preloadError', onPreloadError)
  return () => window.removeEventListener('vite:preloadError', onPreloadError)
}
