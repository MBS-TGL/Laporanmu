import { useState, useEffect, useCallback } from 'react'
import { Search, LogOut, LogIn, Loader2, User, FileText } from 'lucide-react'
import { useDebounce } from '@shared/hooks/useDebounce'
import { supabase } from '@lib/supabase'
import { EmptyState, Input } from '@shared/components'
import StatusBadge from '../components/StatusBadge'
import { fmtDateTimeShort } from '../utils/permitConstants'

export default function ReconcilePanel({ onConfirmDeparture, onConfirmReturn, loading }) {
  const [search, setSearch] = useState('')
  const [permits, setPermits] = useState([])
  const [fetching, setFetching] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  const fetchActivePermits = useCallback(async (term) => {
    setFetching(true)
    try {
      let query = supabase
        .from('leave_permits')
        .select(`
          *,
          student:students ( id, name, phone, photo_url,
            classes ( id, name ),
            dorms ( id, ar, building, gender )
          ),
          issuer:profiles ( id, name )
        `)
        .in('status', ['issued', 'departed'])
        .order('leave_date', { ascending: false })

      if (term && term.length >= 1) {
        query = query.ilike('student.name', `%${term}%`)
      }

      const { data, error } = await query.limit(20)
      if (!error) setPermits(data || [])
    } catch (err) {
      console.error('Error fetching active permits:', err)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchActivePermits(debouncedSearch)
  }, [debouncedSearch, fetchActivePermits])

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama santri..."
          className="pr-10"
        />
        {fetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-text-muted" />
        )}
      </div>

      {/* Permit list */}
      {permits.length === 0 && !fetching ? (
        <EmptyState
          variant="plain"
          icon={FileText}
          title="Tidak ada izin aktif"
        />
      ) : (
        <div className="space-y-2">
          {permits.map((permit) => {
            const student = permit.student || {}
            const isIssued = permit.status === 'issued'
            const isDeparted = permit.status === 'departed'
            const isOverdue = isDeparted && new Date(permit.return_deadline) < new Date()

            return (
              <div
                key={permit.id}
                className={`p-3 rounded-xl border transition-colors ${
                  isOverdue
                    ? 'border-danger/30 bg-danger/5'
                    : isDeparted
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-surface-alt flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {student.photo_url
                      ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                      : <User className="w-4 h-4 text-text-muted" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-text truncate">{student.name}</span>
                      <StatusBadge status={permit.status} size="xs" />
                    </div>
                    <p className="text-xs text-text-muted mb-1">
                      {student.classes?.name || '-'} &middot; {student.dorms?.ar || student.dorms?.building || '-'}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted">
                      <span>Tujuan: <strong>{permit.destination}</strong></span>
                      <span>Batas: <strong className={isOverdue ? 'text-danger' : ''}>{fmtDateTimeShort(permit.return_deadline)}</strong></span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                      {isIssued && (
                        <button
                          onClick={() => onConfirmDeparture?.(permit)}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-warning text-white text-xs font-semibold hover:bg-warning/90 transition-colors disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                          Berangkat
                        </button>
                      )}
                      {isDeparted && (
                        <button
                          onClick={() => onConfirmReturn?.(permit)}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success text-white text-xs font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                          Kembali
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
