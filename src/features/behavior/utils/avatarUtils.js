/**
 * Generates deterministic Tailwind background, text, and ring classes based on a name string.
 * This provides visual distinction for student avatars.
 */
export const getAvatarColorByName = (name) => {
    if (!name) return { bg: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400', ring: 'ring-indigo-500/10' }
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
        { bg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', ring: 'ring-blue-500/10' },
        { bg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', ring: 'ring-emerald-500/10' },
        { bg: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400', ring: 'ring-violet-500/10' },
        { bg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400', ring: 'ring-amber-500/10' },
        { bg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400', ring: 'ring-rose-500/10' },
        { bg: 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400', ring: 'ring-cyan-500/10' },
        { bg: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400', ring: 'ring-purple-500/10' },
        { bg: 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400', ring: 'ring-pink-500/10' }
    ]
    const index = Math.abs(hash) % colors.length
    return colors[index]
}
