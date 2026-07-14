import { memo } from 'react'
import { Search, X, Filter, CircleDot, CheckCircle2, FileSpreadsheet, FileText } from 'lucide-react'

// Icon helper for multiselect
function MultiSelectIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="m3 17 2 2 4-4" />
      <path d="M13 8h8" />
      <path d="M13 18h8" />
    </svg>
  )
}

const GateFilterBar = memo(function GateFilterBar({
  searchLog,
  setSearchLog,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  selectionMode,
  handleCheckboxAllClick,
  handleExportCSV,
  handlePrint,
  filteredLogs,
  todayLogs,
  language,
  tp,
  tNum,
  VISITOR_TYPES,
  TYPE_META
}) {
  return (
    <>
      {/* === DESKTOP TOOLBAR === */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/10">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" />
          <input value={searchLog} onChange={e => setSearchLog(e.target.value)}
            placeholder={tp('placeholderSearch')}
            className="w-full h-8 pl-8 pr-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          {searchLog && (
            <button onClick={() => setSearchLog('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 shrink-0">
          {[{ k: 'all', l: tp('presetFilterAll') }, ...VISITOR_TYPES.map(t => ({ k: t.key, l: TYPE_META[t.key]?.label || t.label }))].map(f => (
            <button key={f.k} onClick={() => setFilterType(f.k)}
              className={`h-7 px-2.5 rounded-lg text-[9.5px] font-black transition-all whitespace-nowrap shrink-0 ${filterType === f.k
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              {f.l}
            </button>
          ))}
          <div className="w-px h-4 bg-[var(--color-border)] shrink-0 mx-0.5" />
          {[
            { k: 'all', l: tp('filterStatusAll'), icon: Filter },
            { k: 'aktif', l: tp('filterStatusActive'), icon: CircleDot },
            { k: 'selesai', l: tp('filterStatusCompleted'), icon: CheckCircle2 },
          ].map(f => {
            const count = f.k === 'all'
              ? todayLogs.filter(l => filterType === 'all' ? true : l.visitor_type === filterType).length
              : todayLogs.filter(l => {
                const typeOk = filterType === 'all' || l.visitor_type === filterType
                const statOk = f.k === 'aktif' ? !l.check_out : !!l.check_out
                return typeOk && statOk
              }).length
            const activeColor = f.k === 'aktif' ? 'bg-red-500 text-white' : f.k === 'selesai' ? 'bg-emerald-500 text-white' : 'bg-[var(--color-primary)] text-white'
            const IconComp = f.icon
            return (
              <button key={f.k} onClick={() => setFilterStatus(f.k)}
                className={`h-7 px-2.5 rounded-lg text-[9.5px] font-black flex items-center gap-1 transition-all whitespace-nowrap shrink-0 ${filterStatus === f.k ? activeColor : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                <IconComp className="w-3 h-3 shrink-0" />{f.l}
                <span className={`text-[8px] font-black px-1 py-0.5 rounded min-w-[14px] text-center ${filterStatus === f.k ? 'bg-white/25' : 'bg-[var(--color-border)]'}`}>{tNum(count)}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleCheckboxAllClick} disabled={filteredLogs.length === 0}
            className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-all ${selectionMode ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface)] disabled:opacity-50'}`}
            title={selectionMode ? tp('btnCancelSelect') : tp('btnMultiSelect')}>
            <MultiSelectIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleExportCSV('log')}
            disabled={filteredLogs.length === 0}
            className="h-7 w-7 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-500/30 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none" title="Export CSV">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>
          <button onClick={handlePrint}
            disabled={filteredLogs.length === 0}
            className="h-7 w-7 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none" title="Export PDF / Cetak">
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* === MOBILE TOOLBAR === */}
      <div className="sm:hidden border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/10">
        {/* Baris 1: Search + Actions */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" />
            <input value={searchLog} onChange={e => setSearchLog(e.target.value)}
              placeholder={tp('placeholderSearch')}
              className="w-full h-8 pl-8 pr-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all" />
            {searchLog && (
              <button onClick={() => setSearchLog('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleCheckboxAllClick} disabled={filteredLogs.length === 0}
              className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all ${selectionMode ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)] disabled:opacity-40'}`}
              title={selectionMode ? tp('btnCancelSelect') : tp('btnMultiSelect')}>
              <MultiSelectIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleExportCSV('log')}
              disabled={filteredLogs.length === 0}
              className="h-8 w-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-emerald-600 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none" title="Export CSV">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
            <button onClick={handlePrint}
              disabled={filteredLogs.length === 0}
              className="h-8 w-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none" title="Export PDF / Cetak">
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Baris 2: Preset Type Filters */}
        <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
          {[{ k: 'all', l: tp('presetFilterAll') }, ...VISITOR_TYPES.map(t => ({ k: t.key, l: TYPE_META[t.key]?.label || t.label }))].map(f => (
            <button key={f.k} onClick={() => setFilterType(f.k)}
              className={`h-7 px-3 rounded-lg text-[9px] font-black transition-all whitespace-nowrap ${filterType === f.k
                ? 'bg-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/15'
                : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
              {f.l}
            </button>
          ))}
        </div>

        {/* Baris 3: Status Filters */}
        <div className="flex items-center gap-1 px-3 pb-2.5 overflow-x-auto scrollbar-hide">
          {[
            { k: 'all', l: tp('filterStatusAll'), icon: Filter },
            { k: 'aktif', l: tp('filterStatusActive'), icon: CircleDot },
            { k: 'selesai', l: tp('filterStatusCompleted'), icon: CheckCircle2 },
          ].map(f => {
            const count = f.k === 'all'
              ? todayLogs.filter(l => filterType === 'all' ? true : l.visitor_type === filterType).length
              : todayLogs.filter(l => {
                const typeOk = filterType === 'all' || l.visitor_type === filterType
                const statOk = f.k === 'aktif' ? !l.check_out : !!l.check_out
                return typeOk && statOk
              }).length
            const activeColor = f.k === 'aktif' ? 'bg-red-500 text-white' : f.k === 'selesai' ? 'bg-emerald-500 text-white' : 'bg-[var(--color-primary)] text-white'
            const IconComp = f.icon
            return (
              <button key={f.k} onClick={() => setFilterStatus(f.k)}
                className={`h-7 px-3 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all whitespace-nowrap ${filterStatus === f.k ? activeColor : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                <IconComp className="w-2.5 h-2.5 shrink-0" />{f.l}
                <span className={`text-[8px] font-black px-1 rounded ${filterStatus === f.k ? 'bg-white/20' : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)]'}`}>{tNum(count)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
})

export default GateFilterBar
