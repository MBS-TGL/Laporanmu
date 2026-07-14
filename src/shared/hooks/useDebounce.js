import { useState, useEffect } from 'react'

/**
 * Custom hook untuk debounce value
 * Menunda update value sampai user berhenti mengetik
 * 
 * @param {any} value - Value yang mau di-debounce
 * @param {number} delay - Delay dalam milliseconds (default: 300ms)
 * @returns {any} Debounced value
 * 
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 500)
 * 
 * useEffect(() => {
 *   // Hanya fetch data setelah user stop typing 500ms
 *   fetchData(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        // Set timeout untuk update value
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        // Cleanup: Cancel timeout kalau value berubah sebelum delay selesai
        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}