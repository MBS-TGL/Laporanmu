import { useState, useEffect, memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons'

const EnrollmentSearch = memo(({ searchQuery, onSearch, inputRef, isLoading }) => {
    const [value, setValue] = useState(searchQuery)
    useEffect(() => { const t = setTimeout(() => onSearch(value), 350); return () => clearTimeout(t) }, [value])
    useEffect(() => { if (searchQuery === '' && value !== '') setValue('') }, [searchQuery])

    return (
        <div className="relative flex items-center">
            <FontAwesomeIcon icon={isLoading ? faSpinner : faSearch} className={`absolute left-3.5 text-[var(--color-text-muted)] text-xs pointer-events-none ${isLoading ? 'animate-spin' : 'opacity-40'}`} />
            <input
                ref={inputRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Cari nama, no. pendaftaran, NISN..."
                className="w-full h-9 pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all outline-none"
            />
            {value && (
                <button onClick={() => { setValue(''); onSearch('') }} className="absolute right-2.5 w-5 h-5 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-colors">
                    <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                </button>
            )}
        </div>
    )
})
EnrollmentSearch.displayName = 'EnrollmentSearch'
export default EnrollmentSearch
