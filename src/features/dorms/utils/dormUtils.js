/**
 * Utility functions for dormitory page
 */

// Helper: create/find a portal container div by ID
export function getPortalContainer(id) {
    let el = document.getElementById(id)
    if (!el) {
        el = document.createElement('div')
        el.id = id
        document.body.appendChild(el)
    }
    return el
}

// Privacy mask helper
export function maskName(str) {
    if (!str) return '—'
    const parts = str.trim().split(' ')
    return parts.map((p, i) => i === 0 ? p : p[0] + '***').join(' ')
}
