const KEY = 'auth.userId'

export function getStoredUserId(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function persistUserId(id: string) {
  try { localStorage.setItem(KEY, id) } catch {}
  window.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: true, userId: id } }))
}

export function clearStoredUserId() {
  try { localStorage.removeItem(KEY) } catch {}
  window.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: false, userId: null } }))
}
