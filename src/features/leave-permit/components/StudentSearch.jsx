import { useState, useRef, useEffect } from 'react'
import { Search, User, Loader2, X } from 'lucide-react'
import { useDebounce } from '@shared/hooks/useDebounce'
import { FieldLabel, Input } from '@shared/components'

export default function StudentSearch({ onSelect, placeholder = 'Ketik nama santri...', disabled = false }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const debouncedSearch = useDebounce(search, 300)

  // Fetch students when search changes
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 1) {
      setResults([])
      return
    }
    let cancelled = false
    const controller = new AbortController()

    const fetchStudents = async () => {
      setLoading(true)
      try {
        const { supabase } = await import('@lib/supabase')
        const { data, error } = await supabase
          .from('students')
          .select(`
            id, name, phone, class_id, dorm_id, photo_url, metadata,
            classes ( id, name ),
            dorms ( id, ar, building, gender )
          `)
          .ilike('name', `%${debouncedSearch}%`)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name')
          .limit(15)

        if (!cancelled && !error) {
          setResults(data || [])
          setIsOpen(true)
        }
      } catch (err) {
        console.error('Student search error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStudents()
    return () => { cancelled = true; controller.abort() }
  }, [debouncedSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (student) => {
    setSearch(student.name)
    setIsOpen(false)
    setResults([])
    onSelect({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      className: student.classes?.name || '-',
      classId: student.class_id,
      // Plotting kamar dari DormsPage tersimpan di metadata.kamar; dorms (via dorm_id) sebagai cadangan
      dormName: student.metadata?.kamar || student.dorms?.ar || student.dorms?.building || '-',
      dormId: student.dorm_id,
      photoUrl: student.photo_url,
    })
  }

  const handleClear = () => {
    setSearch('')
    setResults([])
    setIsOpen(false)
    onSelect(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0 && results[highlightIdx]) {
      e.preventDefault()
      handleSelect(results[highlightIdx])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <FieldLabel htmlFor="leave-permit-student-search">Cari Santri *</FieldLabel>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <Input
          ref={inputRef}
          id="leave-permit-student-search"
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setHighlightIdx(-1) }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-8 disabled:opacity-50"
        />
        {(search || loading) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" />}
            {search && !loading && (
              <button onClick={handleClear} className="p-0.5 rounded hover:bg-surface-alt transition-colors" aria-label="Hapus pencarian">
                <X className="w-3.5 h-3.5 text-text-muted" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-surface border border-border shadow-sm">
          {results.map((student, idx) => (
            <button
              key={student.id}
              onClick={() => handleSelect(student)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${idx === highlightIdx
                  ? 'bg-primary/10'
                  : 'hover:bg-surface-alt'
                }`}
            >
              <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center shrink-0 overflow-hidden">
                {student.photo_url
                  ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                  : <User className="w-4 h-4 text-text-muted" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text truncate">{student.name}</div>
                <div className="text-xs text-text-muted flex gap-2">
                  <span>{student.classes?.name || '-'}</span>
                  <span className="opacity-40">|</span>
                  <span>{student.metadata?.kamar || student.dorms?.ar || student.dorms?.building || '-'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && search && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-surface border border-border shadow-sm p-4 text-center">
          <p className="text-sm text-text-muted">Santri tidak ditemukan</p>
        </div>
      )}
    </div>
  )
}