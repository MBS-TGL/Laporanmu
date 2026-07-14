import { useState, useEffect, useRef, useMemo, useCallback, memo, createContext, useContext } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPalette, faCheck, faTriangleExclamation, faCircleInfo,
    faXmark, faChevronDown, faPlus, faTrash, faArrowRight,
    faMoon, faSun, faCopy, faEye, faCode, faFont,
    faLayerGroup, faExpand, faGrip, faBell, faCheckCircle,
    faExclamationCircle, faXmarkCircle, faChevronRight, faSearch,
    faCalendar, faUser, faShieldHalved, faEllipsisVertical,
    faFileLines, faChartLine, faArrowUpRightFromSquare,
    faCheckDouble, faSpinner, faClock, faFilter, faDownload,
    faEnvelope, faLock, faPhone, faMapMarkerAlt, faGlobe,
    faCamera, faUserGroup, faLightbulb, faHeart, faFlag,
    faBoxOpen, faCreditCard, faGear, faSignOutAlt, faKey,
    faFaceSadTear, faFaceFrown, faFaceMeh, faFaceSmile, faFaceGrinHearts,
    faFilePdf, faTable, faLink, faUsers, faClipboardList, faGaugeHigh,
    faArrowUpFromBracket
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { Breadcrumb, Modal, Pagination, Skeleton } from '@shared/components'
import { useToast } from '@context'

// ─── VS Code Syntax Highlighter ────────────────────────────────────────────────

const TOKEN_COLORS = {
    comment: '#5c6370',
    string: '#98c379',
    tag: '#e06c75',
    attr: '#d19a66',
    keyword: '#c678dd',
    number: '#d19a66',
    text: '#abb2bf',
    punct: '#abb2bf',
}

const tokenizeLine = (line) => {
    const tokens = []
    let str = line
    while (str.length > 0) {
        const commentMatch = str.match(/^(\/\/.*)/)
        if (commentMatch) { tokens.push({ type: 'comment', value: commentMatch[1] }); str = str.slice(commentMatch[1].length); continue }
        const strMatch = str.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/)
        if (strMatch) { tokens.push({ type: 'string', value: strMatch[1] }); str = str.slice(strMatch[1].length); continue }
        const closeTagMatch = str.match(/^(<\/[a-zA-Z][a-zA-Z0-9.]*>?)/)
        if (closeTagMatch) { tokens.push({ type: 'tag', value: closeTagMatch[1] }); str = str.slice(closeTagMatch[1].length); continue }
        const selfCloseMatch = str.match(/^(\/>)/)
        if (selfCloseMatch) { tokens.push({ type: 'tag', value: selfCloseMatch[1] }); str = str.slice(2); continue }
        const openTagMatch = str.match(/^(<[a-zA-Z][a-zA-Z0-9.]*)/)
        if (openTagMatch) { tokens.push({ type: 'tag', value: openTagMatch[1] }); str = str.slice(openTagMatch[1].length); continue }
        if (str[0] === '>') { tokens.push({ type: 'tag', value: '>' }); str = str.slice(1); continue }
        const attrMatch = str.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?==)/)
        if (attrMatch) { tokens.push({ type: 'attr', value: attrMatch[1] }); str = str.slice(attrMatch[1].length); continue }
        const kwMatch = str.match(/^(const|let|var|return|import|export|default|function|from|className|onClick|onChange|onSubmit|onClose|if|else|for|while|new|this|typeof|null|undefined|true|false|async|await|=>)\b/)
        if (kwMatch) { tokens.push({ type: 'keyword', value: kwMatch[1] }); str = str.slice(kwMatch[1].length); continue }
        const numMatch = str.match(/^(\d+(?:\.\d+)?)/)
        if (numMatch) { tokens.push({ type: 'number', value: numMatch[1] }); str = str.slice(numMatch[1].length); continue }
        const wordMatch = str.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/)
        if (wordMatch) { tokens.push({ type: 'text', value: wordMatch[1] }); str = str.slice(wordMatch[1].length); continue }
        const last = tokens[tokens.length - 1]
        if (last && last.type === 'punct') { last.value += str[0] } else { tokens.push({ type: 'punct', value: str[0] }) }
        str = str.slice(1)
    }
    return tokens
}

// ─── Interactive Atom Sub-Components ────────────────────────────────────────────

const TagChipsPreview = memo(() => {
    const [tags, setTags] = useState(['Student', 'Teacher', 'Admin', 'Parent', 'Staff', 'Finance', 'Academic'])
    const pool = ['Principal', 'Operator', 'Counselor', 'Librarian', 'Treasurer']
    const remove = tag => setTags(prev => prev.filter(t => t !== tag))
    const add = () => { const next = pool.find(p => !tags.includes(p)); if (next) setTags(prev => [...prev, next]) }
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all cursor-pointer">
                        {tag}
                        <button onClick={() => remove(tag)} className="hover:opacity-100 opacity-50 transition-opacity">
                            <FontAwesomeIcon icon={faXmark} className="text-[8px]" />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
                <span className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-black">{tags.length} selected</span>
                <button onClick={add} className="px-2.5 py-1 rounded-lg border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">
                    <FontAwesomeIcon icon={faPlus} className="text-[8px]" /> Add tag
                </button>
                {tags.length > 0 && (
                    <button onClick={() => setTags([])} className="text-[9px] font-black text-rose-400 hover:text-rose-600 transition-colors">clear all</button>
                )}
            </div>
        </div>
    )
})

const ToggleVariantsPreview = memo(() => {
    const [states, setStates] = useState({ darkMode: true, notifications: false, autoSave: true, betaFeatures: true })
    const toggle = key => setStates(prev => ({ ...prev, [key]: !prev[key] }))
    const items = [
        { key: 'darkMode', label: 'Dark Mode', color: 'bg-[var(--color-primary)]' },
        { key: 'notifications', label: 'Notifications', color: 'bg-[var(--color-primary)]' },
        { key: 'autoSave', label: 'Auto Save', color: 'bg-emerald-500' },
        { key: 'betaFeatures', label: 'Beta Features', color: 'bg-amber-500' },
    ]
    return (
        <div className="space-y-5">
            {items.map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-black text-[var(--color-text)]">{label}</span>
                        <p className="text-[9px] text-[var(--color-text-muted)] opacity-50">{states[key] ? 'Aktif' : 'Nonaktif'}</p>
                    </div>
                    <button
                        onClick={() => toggle(key)}
                        className={`w-11 h-6 rounded-full relative transition-all duration-200 ${states[key] ? color : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)]'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${states[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            ))}
        </div>
    )
})

const CheckboxStatesPreview = memo(() => {
    const [items, setItems] = useState([
        { id: 'terms', label: 'Accept terms & conditions', checked: true, indeterminate: false, disabled: false },
        { id: 'news', label: 'Subscribe to newsletter', checked: false, indeterminate: false, disabled: false },
        { id: 'all', label: 'Select all (3 of 7)', checked: false, indeterminate: true, disabled: false },
        { id: 'required', label: 'Required (cannot change)', checked: true, indeterminate: false, disabled: true },
        { id: 'premium', label: 'Premium feature (locked)', checked: false, indeterminate: false, disabled: true },
    ])
    const toggle = id => setItems(prev => prev.map(i =>
        i.id === id && !i.disabled
            ? { ...i, checked: i.indeterminate ? true : !i.checked, indeterminate: false }
            : i
    ))
    return (
        <div className="space-y-4">
            {items.map(({ id, label, checked, indeterminate, disabled }) => (
                <label key={id} onClick={() => toggle(id)} className={`flex items-center gap-3 select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors border ${indeterminate || checked
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                        : 'bg-transparent border-[var(--color-border)] group-hover:border-[var(--color-primary)]'
                        }`}>
                        {indeterminate && <div className="w-2 h-0.5 bg-white rounded-full" />}
                        {checked && !indeterminate && <FontAwesomeIcon icon={faCheck} className="text-white text-[7px]" />}
                    </div>
                    <span className="text-[11px] font-medium text-[var(--color-text)]">{label}</span>
                </label>
            ))}
        </div>
    )
})

const RadioGroupPreview = memo(() => {
    const [selected, setSelected] = useState('pro')
    const plans = [
        { value: 'free', label: 'Free', desc: 'Up to 5 users' },
        { value: 'pro', label: 'Pro', desc: 'Unlimited users' },
        { value: 'enterprise', label: 'Enterprise', desc: 'Custom pricing' },
    ]
    return (
        <div className="space-y-4">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Plan Selection</p>
            <div className="space-y-2.5">
                {plans.map(({ value, label, desc }) => (
                    <label key={value} onClick={() => setSelected(value)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors select-none ${selected === value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected === value ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>
                            {selected === value && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                        </div>
                        <div className="flex-1">
                            <span className={`text-[11px] font-black ${selected === value ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{label}</span>
                            <p className="text-[10px] text-[var(--color-text-muted)] opacity-60">{desc}</p>
                        </div>
                        {selected === value && <FontAwesomeIcon icon={faCheckCircle} className="text-[var(--color-primary)] text-sm" />}
                    </label>
                ))}
            </div>
        </div>
    )
})

const InputStatesPreview = memo(() => {
    const [vals, setVals] = useState({ default: '', focus: 'Sedang diketik', error: 'nilai@salah', success: 'admin@sekolah.sch.id', disabled: '' })
    const set = (k, v) => setVals(prev => ({ ...prev, [k]: v }))
    const emailValid = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    const errorMsg = vals.error && !emailValid(vals.error) ? 'Format email tidak valid' : null
    const successMsg = vals.success && emailValid(vals.success) ? 'Email tersedia' : null
    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Default</label>
                <input value={vals.default} onChange={e => set('default', e.target.value)} placeholder="Masukkan teks..." className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10" />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Focus</label>
                <input value={vals.focus} onChange={e => set('focus', e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10 text-sm font-medium text-[var(--color-text)] outline-none" />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Error</label>
                <input value={vals.error} onChange={e => set('error', e.target.value)} className={`w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border text-sm font-medium text-[var(--color-text)] outline-none transition-all ${errorMsg ? 'border-rose-400 ring-2 ring-rose-400/10' : 'border-[var(--color-border)]'}`} />
                {errorMsg && <p className="text-[9px] font-black text-rose-500 flex items-center gap-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />{errorMsg}</p>}
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Success</label>
                <input value={vals.success} onChange={e => set('success', e.target.value)} className={`w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border text-sm font-medium text-[var(--color-text)] outline-none transition-all ${successMsg ? 'border-emerald-400 ring-2 ring-emerald-400/10' : 'border-[var(--color-border)]'}`} />
                {successMsg && <p className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><FontAwesomeIcon icon={faCheck} className="text-[8px]" />{successMsg}</p>}
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Disabled</label>
                <input disabled placeholder="Tidak dapat diubah" className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-muted)] outline-none opacity-40 cursor-not-allowed" />
            </div>
        </div>
    )
})

const InputAddonsPreview = memo(() => {
    const [search, setSearch] = useState('')
    const [domain, setDomain] = useState('sekolah.sch.id')
    const [apiKey] = useState('sk_live_••••••••••')
    const [copied, setCopied] = useState(false)
    const copyKey = () => { setCopied(true); setTimeout(() => setCopied(false), 1500) }
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Search</label>
                <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs transition-colors ${search ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari siswa..." className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 text-sm font-medium text-[var(--color-text)] outline-none transition-all" />
                    {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>}
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">With Prefix</label>
                <div className="flex">
                    <span className="h-10 px-3.5 flex items-center rounded-l-xl bg-[var(--color-surface-alt)] border border-r-0 border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] shrink-0">https://</span>
                    <input value={domain} onChange={e => setDomain(e.target.value)} className="flex-1 h-10 px-3 rounded-r-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-medium text-[var(--color-text)] outline-none transition-all" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">With Suffix Button</label>
                <div className="flex gap-0">
                    <input readOnly value={apiKey} className="flex-1 h-10 px-3.5 rounded-l-xl bg-[var(--color-surface)] border border-r-0 border-[var(--color-border)] text-sm font-mono text-[var(--color-text-muted)] outline-none" />
                    <button onClick={copyKey} className={`h-10 px-4 rounded-r-xl border text-[10px] font-black transition-colors flex items-center gap-1.5 ${copied ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]'}`}>
                        <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-[9px]" /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>
        </div>
    )
})

// ─── Library Interactive Sub-Components ─────────────────────────────────────────

const AccordionPreview = memo(() => {
    const [open, setOpen] = useState(0)
    const items = [
        { q: 'Apa itu Laporanmu?', a: 'Platform manajemen laporan dan administrasi sekolah yang terintegrasi untuk ekosistem pendidikan Indonesia.' },
        { q: 'Bagaimana cara daftar?', a: 'Klik tombol Daftar di halaman utama, isi data sekolah, lalu verifikasi email. Proses selesai dalam 2 menit.' },
        { q: 'Apakah ada versi gratis?', a: 'Ya, paket Free tersedia untuk sekolah dengan hingga 5 pengguna dan fitur dasar tanpa batas waktu.' },
        { q: 'Bagaimana keamanan data?', a: 'Data dienkripsi end-to-end dan disimpan di server lokal Indonesia sesuai regulasi PDPRI.' },
    ]
    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <div key={i} className={`rounded-xl border overflow-hidden transition-all ${open === i ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>
                    <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                        <span className={`text-[11px] font-black ${open === i ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{item.q}</span>
                        <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] transition-transform shrink-0 ml-3 ${open === i ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
                    </button>
                    {open === i && <div className="px-4 pb-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed border-t border-[var(--color-primary)]/20 pt-2">{item.a}</div>}
                </div>
            ))}
        </div>
    )
})

const DataTablePreview = memo(() => {
    const [selected, setSelected] = useState(new Set([0]))
    const [sortField, setSortField] = useState('name')
    const [sortDir, setSortDir] = useState('asc')
    const data = [
        { id: 0, name: 'Andi Setiawan', kelas: '6A', status: 'Aktif', nilai: 92 },
        { id: 1, name: 'Budi Pratama', kelas: '5B', status: 'Pending', nilai: 78 },
        { id: 2, name: 'Citra Dewi', kelas: '6A', status: 'Aktif', nilai: 88 },
        { id: 3, name: 'Dian Kusuma', kelas: '4C', status: 'Nonaktif', nilai: 65 },
        { id: 4, name: 'Eka Rahmawati', kelas: '5A', status: 'Aktif', nilai: 95 },
    ]
    const sorted = [...data].sort((a, b) => {
        const v = sortDir === 'asc' ? 1 : -1
        return a[sortField] > b[sortField] ? v : -v
    })
    const toggleAll = () => selected.size === data.length ? setSelected(new Set()) : setSelected(new Set(data.map(d => d.id)))
    const toggleRow = id => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s) }
    const sortBy = f => { setSortField(f); setSortDir(sortField === f && sortDir === 'asc' ? 'desc' : 'asc') }
    const statusColor = s => s === 'Aktif' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : s === 'Pending' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
    return (
        <div className="space-y-3">
            {selected.size > 0 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                    <span className="text-[10px] font-black text-[var(--color-primary)]">{selected.size} data dipilih</span>
                    <div className="flex gap-2">
                        <button className="text-[9px] font-black text-[var(--color-primary)] hover:underline">Export</button>
                        <button className="text-[9px] font-black text-rose-500 hover:underline">Hapus</button>
                    </div>
                </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full text-[10px]">
                    <thead>
                        <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                            <th className="w-10 p-3"><div onClick={toggleAll} className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center ${selected.size === data.length ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>{selected.size === data.length && <FontAwesomeIcon icon={faCheck} className="text-white text-[7px]" />}</div></th>
                            {[['name', 'Nama'], ['kelas', 'Kelas'], ['status', 'Status'], ['nilai', 'Nilai']].map(([f, label]) => (
                                <th key={f} onClick={() => sortBy(f)} className="p-3 text-left font-black text-[var(--color-text-muted)] uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)] transition-colors">
                                    {label} {sortField === f ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                                </th>
                            ))}
                            <th className="p-3 text-left font-black text-[var(--color-text-muted)] uppercase tracking-widest">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row) => (
                            <tr key={row.id} className={`border-b border-[var(--color-border)] last:border-0 transition-colors ${selected.has(row.id) ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]'}`}>
                                <td className="p-3"><div onClick={() => toggleRow(row.id)} className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center ${selected.has(row.id) ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>{selected.has(row.id) && <FontAwesomeIcon icon={faCheck} className="text-white text-[7px]" />}</div></td>
                                <td className="p-3 font-black text-[var(--color-text)]">{row.name}</td>
                                <td className="p-3 font-mono text-[var(--color-text-muted)]">{row.kelas}</td>
                                <td className="p-3"><span className={`px-2 py-0.5 rounded-full border text-[9px] font-black ${statusColor(row.status)}`}>{row.status}</span></td>
                                <td className="p-3 font-black text-[var(--color-text)]">{row.nilai}</td>
                                <td className="p-3"><div className="flex gap-2"><button className="text-[9px] font-black text-[var(--color-primary)] hover:underline">Edit</button><button className="text-[9px] font-black text-rose-500 hover:underline">Hapus</button></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between text-[9px] text-[var(--color-text-muted)]">
                <span>Menampilkan {data.length} dari 320 data</span>
                <div className="flex gap-1">{[1, 2, 3, '…', 32].map((p, i) => <button key={i} className={`w-6 h-6 rounded text-[9px] font-black transition-colors ${p === 1 ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>{p}</button>)}</div>
            </div>
        </div>
    )
})

const FilterBarPreview = memo(() => {
    const [filters, setFilters] = useState([{ id: 'kelas', label: 'Kelas', value: '6A' }, { id: 'status', label: 'Status', value: 'Aktif' }])
    const [search, setSearch] = useState('')
    const remove = id => setFilters(prev => prev.filter(f => f.id !== id))
    const colorMap = { kelas: 'bg-sky-500/10 border-sky-500/20 text-sky-700', status: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' }
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--color-text-muted)]" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari siswa…" className="h-8 pl-8 pr-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[10px] outline-none transition-all" />
                </div>
                {filters.map(f => (
                    <div key={f.id} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[10px] font-black ${colorMap[f.id]}`}>
                        {f.label}: {f.value}
                        <button onClick={() => remove(f.id)} className="opacity-60 hover:opacity-100 transition-opacity ml-1"><FontAwesomeIcon icon={faXmark} className="text-[8px]" /></button>
                    </div>
                ))}
                <button className="h-8 px-3 rounded-lg border border-dashed border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faPlus} className="text-[8px]" /> Filter
                </button>
                {filters.length > 0 && <button onClick={() => setFilters([])} className="text-[9px] font-black text-rose-400 hover:text-rose-600 ml-auto transition-colors">Reset semua</button>}
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)]">Menampilkan <span className="font-black text-[var(--color-text)]">{filters.length === 0 ? 320 : 48}</span> dari 320 siswa</p>
        </div>
    )
})

const TabsPreview = memo(() => {
    const [activeUnder, setActiveUnder] = useState('semua')
    const [activeSeg, setActiveSeg] = useState('list')
    const tabs = [{ k: 'semua', label: 'Semua', count: 320 }, { k: 'aktif', label: 'Aktif', count: 298 }, { k: 'pending', label: 'Pending', count: 14 }, { k: 'nonaktif', label: 'Nonaktif', count: 8 }]
    return (
        <div className="space-y-5">
            <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Underline Tabs</p>
                <div className="flex border-b border-[var(--color-border)] gap-1">
                    {tabs.map(({ k, label, count }) => (
                        <button key={k} onClick={() => setActiveUnder(k)} className={`px-3 py-2 text-[10px] font-black transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${activeUnder === k ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            {label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeUnder === k ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>{count}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Segmented Control</p>
                <div className="inline-flex p-1 bg-[var(--color-surface-alt)] rounded-xl gap-1">
                    {['list', 'grid', 'chart'].map(v => (
                        <button key={v} onClick={() => setActiveSeg(v)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black capitalize transition-colors ${activeSeg === v ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>{v}</button>
                    ))}
                </div>
            </div>
        </div>
    )
})

const DropdownPreview = memo(() => {
    const [open, setOpen] = useState(false)
    return (
        <div className="flex gap-6 items-start">
            <div className="relative">
                <button onClick={() => setOpen(p => !p)} className={`flex items-center gap-2 px-4 h-9 rounded-xl border text-[11px] font-black transition-colors ${open ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]'}`}>
                    Aksi <FontAwesomeIcon icon={faChevronDown} className={`text-[8px] transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div className="absolute top-full left-0 mt-1.5 w-44 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-10">
                        <div className="p-1">
                            {[{ icon: faFileLines, label: 'Lihat Detail', color: 'text-[var(--color-text)]' }, { icon: faCopy, label: 'Duplikat', color: 'text-[var(--color-text)]' }, { icon: faDownload, label: 'Export PDF', color: 'text-[var(--color-text)]' }].map(({ icon, label, color }) => (
                                <button key={label} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-black ${color} hover:bg-[var(--color-surface-alt)] transition-colors text-left`}>
                                    <FontAwesomeIcon icon={icon} className="text-[10px] opacity-60 w-3" /> {label}
                                </button>
                            ))}
                            <div className="h-px bg-[var(--color-border)] my-1" />
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-black text-rose-500 hover:bg-rose-500/5 transition-colors text-left">
                                <FontAwesomeIcon icon={faTrash} className="text-[10px] w-3" /> Hapus
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
})

const CommandPalettePreview = memo(() => {
    const [q, setQ] = useState('')
    const pages = [
        { icon: faGaugeHigh, label: 'Dashboard', shortcut: '⌘1' },
        { icon: faUsers, label: 'Data Siswa', shortcut: '⌘2' },
        { icon: faClipboardList, label: 'Laporan', shortcut: '⌘3' },
        { icon: faGear, label: 'Pengaturan', shortcut: '⌘,' },
    ]
    const filtered = pages.filter(p => p.label.toLowerCase().includes(q.toLowerCase()))
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
                <FontAwesomeIcon icon={faSearch} className="text-[var(--color-text-muted)] text-sm" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari halaman atau ketik perintah…" className="flex-1 text-[11px] font-medium bg-transparent outline-none text-[var(--color-text)] placeholder-[var(--color-text-muted)]" />
                <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[8px] font-mono text-[var(--color-text-muted)]">Esc</kbd>
            </div>
            <div className="max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-[var(--color-text-muted)]">Tidak ada hasil untuk "{q}"</div>
                ) : (
                    <>
                        <p className="px-4 pt-2 pb-1 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Halaman</p>
                        {filtered.map((p, i) => (
                            <div key={p.label} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${i === 0 ? 'bg-[var(--color-primary)]/8' : 'hover:bg-[var(--color-surface-alt)]'}`}>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${i === 0 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                    <FontAwesomeIcon icon={p.icon} className="text-xs" />
                                </div>
                                <span className={`flex-1 text-[11px] font-black ${i === 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{p.label}</span>
                                <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[8px] font-mono text-[var(--color-text-muted)]">{p.shortcut}</kbd>
                                {i === 0 && <span className="text-[9px] text-[var(--color-primary)] font-black">Enter →</span>}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    )
})

const OnboardingPreview = memo(() => {
    const [steps, setSteps] = useState([
        { id: 0, label: 'Buat akun admin', done: true }, { id: 1, label: 'Upload logo sekolah', done: true },
        { id: 2, label: 'Atur tahun ajaran', done: true }, { id: 3, label: 'Import data siswa', done: false },
        { id: 4, label: 'Undang guru & staf', done: false },
    ])
    const complete = id => setSteps(prev => prev.map(s => s.id === id ? { ...s, done: true } : s))
    const done = steps.filter(s => s.done).length
    const pct = Math.round((done / steps.length) * 100)
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div><p className="text-[12px] font-black text-[var(--color-text)]">Setup Akun Sekolah</p><p className="text-[9px] text-[var(--color-text-muted)]">{done} dari {steps.length} selesai</p></div>
                <span className="text-[16px] font-black text-[var(--color-primary)]">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-2">
                {steps.map(s => (
                    <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${!s.done ? 'cursor-pointer hover:bg-[var(--color-surface-alt)]' : ''}`} onClick={() => !s.done && complete(s.id)}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${s.done ? 'bg-[var(--color-primary)]' : 'border-2 border-[var(--color-primary)]'}`}>
                            {s.done && <FontAwesomeIcon icon={faCheck} className="text-white text-[7px]" />}
                        </div>
                        <span className={`text-[11px] font-black transition-all ${s.done ? 'line-through text-[var(--color-text-muted)] opacity-50' : 'text-[var(--color-primary)]'}`}>{s.label}</span>
                        {!s.done && <span className="ml-auto text-[9px] text-[var(--color-text-muted)] opacity-50">Klik →</span>}
                    </div>
                ))}
            </div>
            {pct === 100 && <div className="text-center text-[11px] font-black text-emerald-600 bg-emerald-500/10 rounded-xl p-3">🎉 Semua langkah selesai!</div>}
        </div>
    )
})

const WizardPreview = memo(() => {
    const [step, setStep] = useState(2)
    const steps = ['Profil', 'Sekolah', 'Akademik', 'Review']
    return (
        <div className="space-y-5">
            <div className="flex items-center">
                {steps.map((s, i) => (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                            <div onClick={() => setStep(i)} className={`w-8 h-8 rounded-full text-[9px] font-black flex items-center justify-center cursor-pointer transition-all ${i < step ? 'bg-[var(--color-primary)] text-white' : i === step ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-2 border-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                                {i < step ? <FontAwesomeIcon icon={faCheck} className="text-[8px]" /> : i + 1}
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-wide text-[var(--color-text-muted)] whitespace-nowrap">{s}</span>
                        </div>
                        {i < 3 && <div className={`h-0.5 flex-1 mx-2 mb-4 transition-all ${i < step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />}
                    </div>
                ))}
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60 mb-2">Langkah {step + 1} · {steps[step]}</p>
                <div className="space-y-2">
                    <div className="h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-3 flex items-center text-[10px] text-[var(--color-text-muted)]">Isi data {steps[step]}…</div>
                </div>
            </div>
            <div className="flex justify-between">
                <button onClick={() => setStep(p => Math.max(0, p - 1))} disabled={step === 0} className="px-4 h-9 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:border-[var(--color-primary)] transition-all disabled:opacity-30">← Kembali</button>
                <button onClick={() => setStep(p => Math.min(3, p + 1))} disabled={step === 3} className="px-4 h-9 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black transition-all hover:opacity-90 disabled:opacity-40">Lanjut →</button>
            </div>
        </div>
    )
})

const ConfirmDialogPreview = memo(() => {
    const [input, setInput] = useState('')
    const [done, setDone] = useState(false)
    const confirmed = input === 'HAPUS'
    if (done) return (
        <div className="text-center py-6 space-y-2">
            <div className="text-3xl">✅</div>
            <p className="text-[12px] font-black text-emerald-600">Berhasil dihapus!</p>
            <button onClick={() => { setDone(false); setInput('') }} className="text-[9px] font-black text-[var(--color-text-muted)] underline">Reset demo</button>
        </div>
    )
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center"><FontAwesomeIcon icon={faTrash} className="text-rose-500 text-sm" /></div>
            <div><h4 className="text-[13px] font-black text-[var(--color-text)]">Hapus Data Siswa?</h4><p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mt-1">Aksi ini permanen. Semua nilai dan absensi akan ikut terhapus.</p></div>
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <p className="text-[9px] font-black text-rose-500 mb-1.5">Ketik <strong>HAPUS</strong> untuk konfirmasi</p>
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="HAPUS" className={`w-full h-8 px-3 rounded-lg border text-[11px] font-black outline-none transition-all ${confirmed ? 'border-rose-400 ring-2 ring-rose-400/20 text-rose-600' : 'border-[var(--color-border)] text-[var(--color-text)]'} bg-[var(--color-surface)]`} />
            </div>
            <div className="flex gap-2">
                <button onClick={() => setInput('')} className="flex-1 h-9 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                <button disabled={!confirmed} onClick={() => setDone(true)} className={`flex-1 h-9 rounded-xl text-[10px] font-black transition-colors ${confirmed ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-rose-500/20 text-rose-300 cursor-not-allowed'}`}>Hapus Permanen</button>
            </div>
        </div>
    )
})

const RatingPreview = memo(() => {
    const [stars, setStars] = useState(4)
    const [hover, setHover] = useState(null)
    const [mood, setMood] = useState(3)
    const moods = [
        { icon: faFaceSadTear, label: 'Sangat Buruk', color: 'text-rose-400' },
        { icon: faFaceFrown, label: 'Kurang Baik', color: 'text-orange-400' },
        { icon: faFaceMeh, label: 'Biasa Saja', color: 'text-amber-400' },
        { icon: faFaceSmile, label: 'Baik', color: 'text-lime-500' },
        { icon: faFaceGrinHearts, label: 'Luar Biasa!', color: 'text-emerald-500' },
    ]
    return (
        <div className="space-y-5">
            <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-2">Penilaian Guru</p>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(v => (
                        <button key={v} onMouseEnter={() => setHover(v)} onMouseLeave={() => setHover(null)} onClick={() => setStars(v)} className="text-2xl transition-transform hover:scale-110 active:scale-95">
                            <span className={(hover ?? stars) >= v ? 'text-amber-400' : 'text-[var(--color-border)]'}>★</span>
                        </button>
                    ))}
                    <span className="text-[11px] font-black text-[var(--color-text-muted)] ml-1">{stars}.0 / 5</span>
                </div>
            </div>
            <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Mood Check-in</p>
                <div className="flex gap-3 items-center">
                    {moods.map((m, i) => (
                        <button
                            key={i}
                            onClick={() => setMood(i)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${mood === i
                                ? `${m.color} bg-[var(--color-surface-alt)] border-2 border-current scale-110 shadow-sm`
                                : 'text-[var(--color-text-muted)] opacity-30 hover:opacity-60 hover:scale-105'
                                }`}
                        >
                            <FontAwesomeIcon icon={m.icon} className="text-xl" />
                        </button>
                    ))}
                </div>
                <p className={`text-[10px] font-black mt-2 transition-all ${moods[mood].color}`}>{moods[mood].label}</p>
            </div>
        </div>
    )
})

const InlineEditPreview = memo(() => {
    const [fields, setFields] = useState([
        { key: 'nama', label: 'Nama', value: 'Andi Setiawan', editing: false },
        { key: 'kelas', label: 'Kelas', value: '6A', editing: false },
        { key: 'email', label: 'Email', value: 'andi@gmail.com', editing: false },
    ])
    const [saved, setSaved] = useState(false)
    const startEdit = key => setFields(prev => prev.map(f => ({ ...f, editing: f.key === key })))
    const save = key => { setFields(prev => prev.map(f => ({ ...f, editing: false }))); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    const cancel = () => setFields(prev => prev.map(f => ({ ...f, editing: false })))
    const update = (key, val) => setFields(prev => prev.map(f => f.key === key ? { ...f, value: val } : f))
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 space-y-2">
            {fields.map(f => (
                <div key={f.key} className="flex items-center gap-3 py-2 border-b border-[var(--color-border)] last:border-0">
                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest w-12 shrink-0">{f.label}</span>
                    {f.editing ? (
                        <>
                            <input autoFocus value={f.value} onChange={e => update(f.key, e.target.value)} className="flex-1 h-8 px-2.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10 text-[11px] font-black text-[var(--color-text)] outline-none" />
                            <button onClick={() => save(f.key)} className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><FontAwesomeIcon icon={faCheck} className="text-[9px]" /></button>
                            <button onClick={cancel} className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-rose-500 transition-all"><FontAwesomeIcon icon={faXmark} className="text-[9px]" /></button>
                        </>
                    ) : (
                        <>
                            <span className="flex-1 text-[11px] font-black text-[var(--color-text)]">{f.value}</span>
                            <button onClick={() => startEdit(f.key)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all">
                                <FontAwesomeIcon icon={faGear} className="text-[9px]" />
                            </button>
                        </>
                    )}
                </div>
            ))}
            {saved && <p className="text-[9px] font-black text-emerald-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Autosaved</p>}
        </div>
    )
})

// ─── New Atoms Sub-Components ────────────────────────────────────────────────────

const SelectTextareaPreview = memo(() => {
    const [sel, setSel] = useState('kelas-6a')
    const [multi, setMulti] = useState(new Set(['guru', 'siswa']))
    const [ta, setTa] = useState('Catatan wali kelas:\nSiswa menunjukkan perkembangan yang baik bulan ini.')
    const toggleMulti = v => { const s = new Set(multi); s.has(v) ? s.delete(v) : s.add(v); setMulti(s) }
    return (
        <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Single Select</label>
                    <div className="relative">
                        <select value={sel} onChange={e => setSel(e.target.value)} className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[11px] font-black text-[var(--color-text)] outline-none appearance-none cursor-pointer transition-all">
                            <optgroup label="Kelas 6"><option value="kelas-6a">Kelas 6A</option><option value="kelas-6b">Kelas 6B</option></optgroup>
                            <optgroup label="Kelas 5"><option value="kelas-5a">Kelas 5A</option><option value="kelas-5b">Kelas 5B</option></optgroup>
                        </select>
                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] text-[var(--color-text-muted)] pointer-events-none" />
                    </div>
                    <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">Dipilih: <span className="text-[var(--color-primary)] font-black">{sel}</span></p>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Custom Multi-Select</label>
                    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                        {['admin', 'guru', 'siswa', 'ortu', 'tu'].map(v => (
                            <div key={v} onClick={() => toggleMulti(v)} className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${multi.has(v) ? 'bg-[var(--color-primary)]/5' : ' hover:bg-[var(--color-surface-alt)]'} border-b border-[var(--color-border)] last:border-0`}>
                                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${multi.has(v) ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>{multi.has(v) && <FontAwesomeIcon icon={faCheck} className="text-white text-[7px]" />}</div>
                                <span className={`text-[10px] font-black capitalize ${multi.has(v) ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Textarea — auto-resize</label>
                    <span className={`text-[9px] font-black ${ta.length > 180 ? 'text-rose-500' : ta.length > 120 ? 'text-amber-500' : 'text-[var(--color-text-muted)] opacity-50'}`}>{ta.length}/200</span>
                </div>
                <textarea value={ta} onChange={e => setTa(e.target.value.slice(0, 200))} rows={3} className="w-full px-3.5 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 text-[11px] font-medium text-[var(--color-text)] outline-none resize-none transition-all leading-relaxed" />
                <div className="h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden"><div className={`h-full rounded-full transition-all ${ta.length > 180 ? 'bg-rose-500' : ta.length > 120 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${(ta.length / 200) * 100}%` }} /></div>
            </div>
        </div>
    )
})

const RangeSliderPreview = memo(() => {
    const [val, setVal] = useState(65)
    const [min, setMin] = useState(20)
    const [max, setMax] = useState(80)
    return (
        <div className="space-y-6">
            <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-4">Single Range</p>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[var(--color-text)]">Nilai Minimum Lulus</span>
                        <span className="text-[14px] font-black text-[var(--color-primary)]">{val}</span>
                    </div>
                    <div className="relative h-4 flex items-center">
                        <div className="absolute w-full h-2 rounded-full bg-[var(--color-surface-alt)]" />
                        <div className="absolute h-2 rounded-full bg-[var(--color-primary)]" style={{ width: `${val}%` }} />
                        <input type="range" min="0" max="100" value={val} onChange={e => setVal(+e.target.value)} className="absolute w-full opacity-0 cursor-pointer h-4" />
                        <div className="absolute h-4 w-4 rounded-full bg-white border-2 border-[var(--color-primary)] shadow-md pointer-events-none transition-all" style={{ left: `calc(${val}% - 8px)` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">
                        {[0, 20, 40, 60, 80, 100].map(v => <span key={v}>{v}</span>)}
                    </div>
                </div>
            </div>
            <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-4">Range Double (Min–Max)</p>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-[var(--color-text)]">
                        <span>Min: <span className="text-[var(--color-primary)]">{min}</span></span>
                        <span>Max: <span className="text-[var(--color-primary)]">{max}</span></span>
                    </div>
                    <div className="relative h-4 flex items-center">
                        <div className="absolute w-full h-2 rounded-full bg-[var(--color-surface-alt)]" />
                        <div className="absolute h-2 rounded-full bg-[var(--color-primary)]" style={{ left: `${min}%`, width: `${max - min}%` }} />
                        <input type="range" min="0" max="100" value={min} onChange={e => setMin(Math.min(+e.target.value, max - 5))} className="absolute w-full opacity-0 cursor-pointer h-4 z-10" />
                        <input type="range" min="0" max="100" value={max} onChange={e => setMax(Math.max(+e.target.value, min + 5))} className="absolute w-full opacity-0 cursor-pointer h-4 z-10" />
                        <div className="absolute h-4 w-4 rounded-full bg-white border-2 border-[var(--color-primary)] shadow-md pointer-events-none" style={{ left: `calc(${min}% - 8px)` }} />
                        <div className="absolute h-4 w-4 rounded-full bg-white border-2 border-[var(--color-primary)] shadow-md pointer-events-none" style={{ left: `calc(${max}% - 8px)` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">{[0, 25, 50, 75, 100].map(v => <span key={v}>{v}</span>)}</div>
                </div>
            </div>
        </div>
    )
})

const OTPInputPreview = memo(() => {
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [done, setDone] = useState(false)
    const handleKey = (i, e) => {
        if (e.key === 'Backspace' && !otp[i] && i > 0) { const r = document.getElementById(`otp-${i - 1}`); r && r.focus() }
    }
    const handleChange = (i, v) => {
        const d = v.replace(/\D/g, '').slice(-1)
        const next = [...otp]; next[i] = d; setOtp(next)
        if (d && i < 5) { const r = document.getElementById(`otp-${i + 1}`); r && r.focus() }
        if (next.every(c => c) && next.join('') === '123456') setDone(true)
    }
    const handlePaste = (e) => {
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
        const next = Array(6).fill('').map((_, i) => paste[i] || '')
        setOtp(next)
        if (next.every(c => c)) setDone(true)
    }
    return (
        <div className="space-y-4">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Verifikasi 2FA — ketik 123456</p>
            <div className="flex gap-2 justify-center">
                {otp.map((v, i) => (
                    <input key={i} id={`otp-${i}`} maxLength={1} value={v} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
                        className={`w-11 h-13 text-center text-[20px] font-black rounded-xl border-2 outline-none transition-all bg-[var(--color-surface)] ${v ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : done ? 'border-emerald-400' : 'border-[var(--color-border)]'} focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10`}
                        style={{ height: 52 }} />
                ))}
            </div>
            {done ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-sm" />
                    <span className="text-[10px] font-black">Verifikasi berhasil!</span>
                </div>
            ) : (
                <p className="text-[9px] text-center text-[var(--color-text-muted)] opacity-60">Kode dikirim ke +62 8xx xxxx <span className="text-[var(--color-primary)] cursor-pointer hover:underline">Kirim ulang</span></p>
            )}
        </div>
    )
})

const TagInputPreview = memo(() => {
    const [tags, setTags] = useState(['React', 'TypeScript', 'Tailwind'])
    const [input, setInput] = useState('')
    const addTag = () => { const t = input.trim(); if (t && !tags.includes(t) && tags.length < 8) { setTags(p => [...p, t]); setInput('') } }
    return (
        <div className="space-y-3">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Tag Kompetensi Guru</p>
            <div className="min-h-12 p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap gap-1.5 focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/10 transition-all">
                {tags.map(t => (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black border border-[var(--color-primary)]/20">
                        {t}
                        <button onClick={() => setTags(p => p.filter(x => x !== t))} className="hover:opacity-70 transition-opacity"><FontAwesomeIcon icon={faXmark} className="text-[7px]" /></button>
                    </span>
                ))}
                {tags.length < 8 && <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } if (e.key === 'Backspace' && !input) setTags(p => p.slice(0, -1)) }} placeholder={tags.length === 0 ? "Tambah tag…" : ""} className="flex-1 min-w-20 text-[10px] font-medium text-[var(--color-text)] bg-transparent outline-none" />}
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] opacity-50">Enter atau koma untuk tambah · Backspace untuk hapus · {8 - tags.length} slot tersisa</p>
        </div>
    )
})

const ComboboxPreview = memo(() => {
    const [q, setQ] = useState('')
    const [selected, setSelected] = useState([])
    const [open, setOpen] = useState(false)
    const all = ['Andi Setiawan', 'Budi Pratama', 'Citra Dewi', 'Dian Kusuma', 'Eka Rahmawati', 'Fajar Nugroho', 'Gita Permata']
    const filtered = all.filter(n => n.toLowerCase().includes(q.toLowerCase()) && !selected.includes(n))
    const toggle = n => setSelected(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n])
    return (
        <div className="space-y-3">
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Pilih Siswa Berprestasi</p>
            <div className="relative">
                <div className={`min-h-10 px-3 py-1.5 rounded-xl border bg-[var(--color-surface)] flex flex-wrap gap-1.5 items-center cursor-text transition-all ${open ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10' : 'border-[var(--color-border)]'}`} onClick={() => setOpen(true)}>
                    {selected.map(s => <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black">{s.split(' ')[0]}<button onClick={e => { e.stopPropagation(); toggle(s) }}><FontAwesomeIcon icon={faXmark} className="text-[7px]" /></button></span>)}
                    <input value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} placeholder={selected.length === 0 ? "Cari siswa..." : ""} className="flex-1 min-w-16 text-[10px] font-medium text-[var(--color-text)] bg-transparent outline-none" />
                </div>
                {open && filtered.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-10 overflow-hidden max-h-40 overflow-y-auto">
                        {filtered.slice(0, 5).map(n => (
                            <div key={n} onClick={() => { toggle(n); setQ(''); setOpen(false) }} className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-surface-alt)] cursor-pointer transition-colors">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 text-[7px] font-black flex items-center justify-center shrink-0">{n.split(' ').map(x => x[0]).join('')}</div>
                                <span className="text-[10px] font-black text-[var(--color-text)]">{n}</span>
                            </div>
                        ))}
                    </div>
                )}
                {open && <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />}
            </div>
            {selected.length > 0 && <p className="text-[9px] text-[var(--color-text-muted)]">Terpilih: <span className="text-[var(--color-primary)] font-black">{selected.length} siswa</span></p>}
        </div>
    )
})

// ─── Forms Sub-Components ────────────────────────────────────────────────────────

const LoginFormPreview = memo(() => {
    const [email, setEmail] = useState('')
    const [pass, setPass] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const valid = email.includes('@') && pass.length >= 6
    const submit = () => { if (!valid) return; setLoading(true); setTimeout(() => { setLoading(false); setSuccess(true) }, 1500) }
    if (success) return <div className="flex flex-col items-center gap-3 py-8"><FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-4xl" /><p className="text-[12px] font-black text-[var(--color-text)]">Login berhasil!</p><button onClick={() => setSuccess(false)} className="text-[9px] font-black text-[var(--color-text-muted)] underline">Reset demo</button></div>
    return (
        <div className="space-y-4">
            <div><h3 className="text-[14px] font-black text-[var(--color-text)]">Masuk ke Akun</h3><p className="text-[9px] text-[var(--color-text-muted)]">Laporanmu · Ekosistem Sekolah</p></div>
            <div className="space-y-3">
                <div className="space-y-1"><label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Email</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="admin@sekolah.sch.id" className={`w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border text-[11px] font-medium text-[var(--color-text)] outline-none transition-all ${email && !email.includes('@') ? 'border-rose-400 ring-2 ring-rose-400/10' : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10'}`} />{email && !email.includes('@') && <p className="text-[9px] font-black text-rose-500 flex items-center gap-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />Format email tidak valid</p>}</div>
                <div className="space-y-1"><label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Password</label><div className="relative"><input value={pass} onChange={e => setPass(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="Min. 6 karakter" className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 text-[11px] font-medium text-[var(--color-text)] outline-none transition-all" /><button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"><FontAwesomeIcon icon={showPass ? faEye : faLock} className="text-xs" /></button></div></div>
            </div>
            <div className="flex items-center justify-between"><label className="flex items-center gap-2 cursor-pointer"><div className="w-3.5 h-3.5 rounded border-2 border-[var(--color-border)] bg-[var(--color-surface)]" /><span className="text-[9px] text-[var(--color-text-muted)]">Ingat saya</span></label><span className="text-[9px] font-black text-[var(--color-primary)] cursor-pointer hover:underline">Lupa password?</span></div>
            <button onClick={submit} disabled={!valid || loading} className={`w-full h-10 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 ${valid && !loading ? 'bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] cursor-not-allowed'}`}>
                {loading ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" />Memverifikasi…</> : 'Masuk →'}
            </button>
        </div>
    )
})

const SearchFilterFormPreview = memo(() => {
    const [q, setQ] = useState('')
    const [kelas, setKelas] = useState('semua')
    const [status, setStatus] = useState('semua')
    const [sortBy, setSortBy] = useState('nama')
    const data = [{ n: 'Andi Setiawan', k: '6A', s: 'Aktif', v: 92 }, { n: 'Budi Pratama', k: '5B', s: 'Pending', v: 78 }, { n: 'Citra Dewi', k: '6A', s: 'Aktif', v: 88 }, { n: 'Dian Kusuma', k: '4C', s: 'Nonaktif', v: 65 }, { n: 'Eka Rahmawati', k: '5A', s: 'Aktif', v: 95 }]
    const filtered = data.filter(d => (q === '' || d.n.toLowerCase().includes(q.toLowerCase())) && (kelas === 'semua' || d.k === kelas) && (status === 'semua' || d.s === status)).sort((a, b) => sortBy === 'nama' ? a.n.localeCompare(b.n) : b.v - a.v)
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-32"><FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--color-text-muted)]" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama…" className="w-full h-9 pl-8 pr-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[10px] font-medium text-[var(--color-text)] outline-none transition-all" /></div>
                <div className="relative"><select value={kelas} onChange={e => setKelas(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text)] outline-none appearance-none cursor-pointer"><option value="semua">Semua Kelas</option>{['4C', '5A', '5B', '6A', '6B'].map(k => <option key={k}>{k}</option>)}</select><FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-[var(--color-text-muted)] pointer-events-none" /></div>
                <div className="relative"><select value={status} onChange={e => setStatus(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text)] outline-none appearance-none cursor-pointer"><option value="semua">Semua Status</option>{['Aktif', 'Pending', 'Nonaktif'].map(s => <option key={s}>{s}</option>)}</select><FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-[var(--color-text-muted)] pointer-events-none" /></div>
            </div>
            <div className="flex items-center justify-between"><p className="text-[9px] text-[var(--color-text-muted)]"><span className="font-black text-[var(--color-text)]">{filtered.length}</span> hasil</p><div className="flex items-center gap-1"><span className="text-[8px] text-[var(--color-text-muted)] opacity-60">Urut:</span><button onClick={() => setSortBy(p => p === 'nama' ? 'nilai' : 'nama')} className="text-[8px] font-black text-[var(--color-primary)] hover:underline capitalize">{sortBy}</button></div></div>
            <div className="space-y-1">
                {filtered.length === 0 ? <div className="py-4 text-center text-[10px] font-black text-[var(--color-text-muted)] opacity-50">Tidak ada hasil</div> : filtered.map(d => (
                    <div key={d.n} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-colors">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[8px] font-black flex items-center justify-center shrink-0">{d.n.split(' ').map(x => x[0]).join('')}</div>
                        <span className="flex-1 text-[10px] font-black text-[var(--color-text)]">{d.n}</span>
                        <span className="text-[9px] font-mono text-[var(--color-text-muted)]">{d.k}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${d.s === 'Aktif' ? 'bg-emerald-500/10 text-emerald-700' : d.s === 'Pending' ? 'bg-amber-500/10 text-amber-700' : 'bg-rose-500/10 text-rose-700'}`}>{d.s}</span>
                        <span className="text-[10px] font-black text-[var(--color-text)]">{d.v}</span>
                    </div>
                ))}
            </div>
        </div>
    )
})

// ─── Data Viz Sub-Components ─────────────────────────────────────────────────────

const BarChartPreview = memo(() => {
    const data = [{ l: 'Jan', v: 82 }, { l: 'Feb', v: 91 }, { l: 'Mar', v: 75 }, { l: 'Apr', v: 88 }, { l: 'Mei', v: 94 }, { l: 'Jun', v: 87 }]
    const max = Math.max(...data.map(d => d.v))
    return (
        <div className="space-y-3">
            <div className="flex items-end gap-2 h-28">
                {data.map(({ l, v }) => (
                    <div key={l} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-[8px] font-black text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">{v}</span>
                        <div className="w-full rounded-t-lg bg-[var(--color-primary)]/20 group-hover:bg-[var(--color-primary)] transition-all relative overflow-hidden" style={{ height: `${(v / max) * 80}px` }}>
                            <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-primary)] rounded-t-lg transition-all" style={{ height: `${(v / max) * 80}px` }} />
                        </div>
                        <span className="text-[8px] font-black text-[var(--color-text-muted)] opacity-60">{l}</span>
                    </div>
                ))}
            </div>
            <div className="h-px bg-[var(--color-border)]" />
            <p className="text-[8px] font-black text-[var(--color-text-muted)] opacity-50 text-center">Rata-rata Nilai Ujian per Bulan</p>
        </div>
    )
})

const LineChartPreview = memo(() => {
    const data = [68, 74, 71, 82, 79, 88, 85, 92, 89, 95, 91, 97]
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
    const W = 260, H = 80, pad = 8
    const max = Math.max(...data), min = Math.min(...data) - 5
    const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (W - pad * 2), H - pad - ((v - min) / (max - min)) * (H - pad * 2)])
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
    const area = `${path} L${pts[pts.length - 1][0]},${H - pad} L${pts[0][0]},${H - pad} Z`
    return (
        <div className="space-y-2">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
                <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" /></linearGradient></defs>
                <path d={area} fill="url(#grad)" />
                <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="var(--color-primary)" strokeWidth="1.5" />)}
            </svg>
            <div className="flex justify-between px-1">
                {months.map((m, i) => <span key={i} className="text-[7px] font-black text-[var(--color-text-muted)] opacity-50">{m}</span>)}
            </div>
            <p className="text-[8px] font-black text-[var(--color-text-muted)] opacity-50 text-center">Tren Kehadiran Siswa 2024</p>
        </div>
    )
})

const DonutChartPreview = memo(() => {
    const [hov, setHov] = useState(null)
    const segments = [{ l: 'Aktif', v: 72, c: '#6366f1' }, { l: 'Lulus', v: 18, c: '#22c55e' }, { l: 'Pending', v: 7, c: '#f59e0b' }, { l: 'Nonaktif', v: 3, c: '#ef4444' }]
    let cum = 0
    const total = segments.reduce((s, d) => s + d.v, 0)
    const arcs = segments.map(seg => { const s = cum, e = cum += (seg.v / total) * 360; const sr = s * Math.PI / 180, er = e * Math.PI / 180, r = 36, cx = 50, cy = 50; const x1 = cx + r * Math.sin(sr), y1 = cy - r * Math.cos(sr), x2 = cx + r * Math.sin(er), y2 = cy - r * Math.cos(er); const large = e - s > 180 ? 1 : 0; return { ...seg, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z` } })
    return (
        <div className="flex items-center gap-6">
            <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
                {arcs.map((arc, i) => <path key={i} d={arc.path} fill={arc.c} opacity={hov === null || hov === i ? 1 : 0.3} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} className="cursor-pointer transition-opacity" />)}
                <circle cx="50" cy="50" r="22" fill="var(--color-surface)" />
                <text x="50" y="47" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--color-text)">{hov !== null ? arcs[hov].v + '%' : 'Total'}</text>
                <text x="50" y="56" textAnchor="middle" fontSize="5" fill="var(--color-text-muted)">{hov !== null ? arcs[hov].l : '320 siswa'}</text>
            </svg>
            <div className="space-y-2 flex-1">
                {segments.map((s, i) => (
                    <div key={s.l} className="flex items-center gap-2 cursor-pointer" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.c }} />
                        <span className="text-[10px] font-black text-[var(--color-text)] flex-1">{s.l}</span>
                        <span className="text-[10px] font-black" style={{ color: s.c }}>{s.v}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
})

const SparklinePreview = memo(() => {
    const kpis = [
        { label: 'Total Siswa', val: '2,840', change: '+12.5%', up: true, data: [62, 65, 68, 64, 70, 72, 75, 73, 78, 80, 82, 84] },
        { label: 'Kehadiran', val: '94.2%', change: '-2.1%', up: false, data: [96, 95, 97, 94, 93, 96, 92, 95, 94, 91, 93, 94] },
        { label: 'Laporan', val: '18 baru', change: '+5', up: true, data: [3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 9] },
        { label: 'Guru Aktif', val: '42', change: 'Stabil', up: true, data: [40, 40, 41, 41, 42, 42, 42, 42, 42, 42, 42, 42] },
    ]
    return (
        <div className="grid grid-cols-2 gap-3">
            {kpis.map(({ label, val, change, up, data }) => {
                const W = 80, H = 28, max = Math.max(...data), min = Math.min(...data)
                const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / (max - min || 1)) * H}`).join(' ')
                return (
                    <div key={label} className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-2">
                            <div><p className="text-[16px] font-black font-heading tracking-tight text-[var(--color-text)]">{val}</p><p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{label}</p></div>
                            <span className={`text-[8px] font-black ${up ? 'text-emerald-500' : 'text-rose-500'}`}>{up ? '↑' : '↓'}{change}</span>
                        </div>
                        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 28 }}>
                            <polyline points={pts} fill="none" stroke={up ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )
            })}
        </div>
    )
})

const HeatmapPreview = memo(() => {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum']
    const hours = ['07', '08', '09', '10', '11', '12', '13', '14']
    const [hov, setHov] = useState(null)
    const getVal = (d, h) => { const seed = (d * 31 + h * 7) % 100; return seed < 20 ? 0 : seed < 40 ? 25 : seed < 60 ? 50 : seed < 80 ? 75 : 100 }
    const getColor = v => v === 0 ? 'var(--color-border)' : v <= 25 ? '#c7d2fe' : v <= 50 ? '#818cf8' : v <= 75 ? '#6366f1' : '#4338ca'
    return (
        <div className="space-y-2">
            <div className="flex gap-1">
                <div className="w-8 shrink-0" />
                {days.map(d => <div key={d} className="flex-1 text-center text-[8px] font-black text-[var(--color-text-muted)] opacity-60">{d}</div>)}
            </div>
            {hours.map((h, hi) => (
                <div key={h} className="flex gap-1 items-center">
                    <div className="w-8 text-[7px] font-mono text-[var(--color-text-muted)] opacity-50 shrink-0">{h}:00</div>
                    {days.map((_, di) => {
                        const v = getVal(di, hi); return (
                            <div key={di} className="flex-1 aspect-square rounded cursor-pointer transition-all hover:ring-2 hover:ring-[var(--color-primary)] hover:scale-110"
                                style={{ background: getColor(v) }}
                                onMouseEnter={() => setHov({ d: days[di], h, v })}
                                onMouseLeave={() => setHov(null)}
                            />
                        )
                    })}
                </div>
            ))}
            {hov && <p className="text-[9px] font-black text-[var(--color-text-muted)] text-center">{hov.d} {hov.h}:00 — Kehadiran: <span className="text-[var(--color-primary)]">{hov.v}%</span></p>}
        </div>
    )
})

// ─── Layout Interactive Sub-Components ──────────────────────────────────────────

const SidebarNavPreview = memo(() => {
    const [active, setActive] = useState('dashboard')
    const [collapsed, setCollapsed] = useState(false)
    const groups = [
        {
            label: 'Menu Utama', items: [
                { key: 'dashboard', icon: faGaugeHigh, label: 'Dashboard', badge: null },
                { key: 'siswa', icon: faUsers, label: 'Data Siswa', badge: 3 },
                { key: 'laporan', icon: faClipboardList, label: 'Laporan', badge: null },
                { key: 'jadwal', icon: faCalendar, label: 'Jadwal', badge: null },
            ]
        },
        {
            label: 'Pengaturan', items: [
                { key: 'profil', icon: faUser, label: 'Profil Saya', badge: null },
                { key: 'sistem', icon: faGear, label: 'Sistem', badge: null },
            ]
        },
    ]
    return (
        <div className="flex h-72 border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className={`${collapsed ? 'w-14' : 'w-52'} bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col transition-all duration-300 shrink-0`}>
                <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--color-border)]">
                    {!collapsed && <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-[var(--color-primary)] flex items-center justify-center"><FontAwesomeIcon icon={faGaugeHigh} className="text-white text-[9px]" /></div><span className="text-[11px] font-black text-[var(--color-text)]">Laporanmu</span></div>}
                    <button onClick={() => setCollapsed(p => !p)} className={`w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all ${collapsed ? 'mx-auto' : ''}`}>
                        <FontAwesomeIcon icon={faChevronRight} className={`text-[8px] transition-transform ${collapsed ? '' : 'rotate-180'}`} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {groups.map(g => (
                        <div key={g.label}>
                            {!collapsed && <p className="text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 px-2 mb-1">{g.label}</p>}
                            <div className="space-y-0.5">
                                {g.items.map(item => (
                                    <button key={item.key} onClick={() => setActive(item.key)} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors text-left ${active === item.key ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'}`}>
                                        <FontAwesomeIcon icon={item.icon} className={`text-xs shrink-0 ${active === item.key ? 'text-[var(--color-primary)]' : ''}`} />
                                        {!collapsed && <><span className="text-[10px] font-black flex-1">{item.label}</span>{item.badge && <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[7px] font-black">{item.badge}</span>}</>}
                                        {collapsed && item.badge && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className={`p-2 border-t border-[var(--color-border)]`}>
                    <button className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all ${collapsed ? 'justify-center' : ''}`}>
                        <FontAwesomeIcon icon={faSignOutAlt} className="text-xs shrink-0" />
                        {!collapsed && <span className="text-[10px] font-black">Keluar</span>}
                    </button>
                </div>
            </div>
            <div className="flex-1 bg-[var(--color-surface-alt)] flex items-center justify-center">
                <div className="text-center space-y-1">
                    <FontAwesomeIcon icon={faGaugeHigh} className="text-[var(--color-text-muted)] text-2xl opacity-20" />
                    <p className="text-[9px] font-black text-[var(--color-text-muted)] opacity-40 uppercase tracking-widest">{active}</p>
                </div>
            </div>
        </div>
    )
})

const ChatPreview = memo(() => {
    const [msg, setMsg] = useState('')
    const [messages, setMessages] = useState([
        { from: 'them', text: 'Pak, laporan kelas 6A sudah selesai', time: '09:41' },
        { from: 'me', text: 'Oke, terima kasih Andi 👍', time: '09:42' },
        { from: 'them', text: 'Siap pak! Ada yang perlu direvisi?', time: '09:43' },
    ])
    const send = () => {
        if (!msg.trim()) return
        setMessages(prev => [...prev, { from: 'me', text: msg, time: 'Baru saja' }])
        setMsg('')
    }
    return (
        <div className="flex flex-col border border-[var(--color-border)] rounded-2xl overflow-hidden h-72">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="relative"><div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 text-[9px] font-black flex items-center justify-center">AS</div><div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]" /></div>
                <div><p className="text-[11px] font-black text-[var(--color-text)]">Andi Setiawan</p><p className="text-[9px] text-emerald-600 font-black">Online</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--color-surface-alt)]">
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 items-end ${m.from === 'me' ? 'flex-row-reverse' : ''}`}>
                        {m.from === 'them' && <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 text-[7px] font-black flex items-center justify-center shrink-0">AS</div>}
                        <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-[10px] font-medium leading-relaxed ${m.from === 'me' ? 'bg-[var(--color-primary)] text-white rounded-br-sm' : 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-sm'}`}>
                            {m.text}
                            <p className={`text-[7px] mt-0.5 ${m.from === 'me' ? 'text-white/60 text-right' : 'text-[var(--color-text-muted)] opacity-50'}`}>{m.time}{m.from === 'me' && ' ✓✓'}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                <button className="w-7 h-7 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"><FontAwesomeIcon icon={faPlus} className="text-[9px]" /></button>
                <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ketik pesan…" className="flex-1 h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors" />
                <button onClick={send} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${msg.trim() ? 'bg-[var(--color-primary)] text-white hover:opacity-90' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}><FontAwesomeIcon icon={faArrowRight} className="text-[10px]" /></button>
            </div>
        </div>
    )
})

const FABPreview = memo(() => {
    const [open, setOpen] = useState(false)
    const actions = [
        { icon: faArrowUpFromBracket, label: 'Import', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
        { icon: faDownload, label: 'Export', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
        { icon: faFileLines, label: 'Laporan', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    ]
    return (
        <div className="relative h-48 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-2 rounded-full bg-[var(--color-border)] opacity-50" style={{ width: `${[80, 60, 70][i - 1]}%` }} />)}
            </div>
            {open && <div className="absolute inset-0 bg-black/10" onClick={() => setOpen(false)} />}
            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2.5">
                {open && actions.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ animationDelay: `${i * 50}ms` }}>
                        <span className="px-2.5 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[9px] font-black text-[var(--color-text)] shadow-sm">{a.label}</span>
                        <button className={`w-9 h-9 rounded-full border flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95 ${a.color}`}><FontAwesomeIcon icon={a.icon} className="text-xs" /></button>
                    </div>
                ))}
                <button onClick={() => setOpen(p => !p)} className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${open ? 'bg-slate-700 text-white rotate-45' : 'bg-[var(--color-primary)] text-white'}`}>
                    <FontAwesomeIcon icon={faPlus} className={`text-lg transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
                </button>
            </div>
        </div>
    )
})

const MobileBottomNavPreview = memo(() => {
    const [active, setActive] = useState('home')
    const tabs = [
        { key: 'home', icon: faGaugeHigh, label: 'Home', badge: null },
        { key: 'siswa', icon: faUsers, label: 'Siswa', badge: 3 },
        { key: 'laporan', icon: faClipboardList, label: 'Laporan', badge: null },
        { key: 'setting', icon: faGear, label: 'Setting', badge: null },
    ]
    return (
        <div className="w-52 mx-auto border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]">
            <div className="h-24 bg-[var(--color-surface-alt)] flex items-center justify-center">
                <p className="text-[9px] font-black text-[var(--color-text-muted)] opacity-40 uppercase tracking-widest">{active}</p>
            </div>
            <div className="border-t border-[var(--color-border)] flex">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActive(tab.key)} className="flex-1 flex flex-col items-center py-2 gap-0.5 relative transition-all">
                        <div className={`w-8 h-6 rounded-lg flex items-center justify-center transition-all ${active === tab.key ? 'bg-[var(--color-primary)]/10' : ''}`}>
                            <FontAwesomeIcon icon={tab.icon} className={`text-xs transition-all ${active === tab.key ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}`} />
                        </div>
                        <span className={`text-[7px] font-black transition-all ${active === tab.key ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{tab.label}</span>
                        {tab.badge && <div className="absolute top-1 right-[18%] w-4 h-4 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center border-2 border-[var(--color-surface)]">{tab.badge}</div>}
                    </button>
                ))}
            </div>
        </div>
    )
})

const BreakpointPreview = memo(() => {
    const [width, setWidth] = useState(640)
    const bps = [{ label: 'xs', min: 0, max: 639 }, { label: 'sm', min: 640, max: 767 }, { label: 'md', min: 768, max: 1023 }, { label: 'lg', min: 1024, max: 1279 }, { label: 'xl', min: 1280, max: 1535 }, { label: '2xl', min: 1536, max: 1920 }]
    const current = bps.find(b => width >= b.min && width <= b.max) || bps[bps.length - 1]
    const cols = current.label === 'xs' ? 1 : current.label === 'sm' ? 1 : current.label === 'md' ? 2 : current.label === 'lg' ? 3 : 4
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {bps.map(b => (
                    <button key={b.label} onClick={() => setWidth(b.min || 320)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black border transition-colors ${current.label === b.label ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}>
                        <span className="uppercase">{b.label}</span> <span className="opacity-60">≥{b.min}px</span>
                    </button>
                ))}
            </div>
            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Layout: <span className="text-[var(--color-primary)]">{cols} kolom</span> pada breakpoint <span className="text-[var(--color-primary)]">{current.label}</span></p>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
                    {Array.from({ length: cols * 2 }).map((_, i) => (
                        <div key={i} className="h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
                            <span className="text-[8px] font-black text-[var(--color-primary)] opacity-60">col</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
})

const TopbarPreview = memo(() => {
    const [search, setSearch] = useState('')
    const [notifOpen, setNotifOpen] = useState(false)
    return (
        <div className="space-y-3">
            {/* Variant 1: Full */}
            <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-2">Full Topbar</p>
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
                    <div className="w-7 h-7 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shrink-0"><FontAwesomeIcon icon={faGaugeHigh} className="text-white text-[9px]" /></div>
                    <span className="text-[11px] font-black text-[var(--color-text)]">Laporanmu</span>
                    <div className="flex-1 relative">
                        <FontAwesomeIcon icon={faSearch} className={`absolute left-3 top-1/2 -translate-y-1/2 text-[9px] transition-colors ${search ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari siswa, laporan…" className="w-full h-8 pl-8 pr-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[10px] font-medium text-[var(--color-text)] outline-none transition-all" />
                        {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"><FontAwesomeIcon icon={faXmark} className="text-[9px]" /></button>}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={() => setNotifOpen(p => !p)} className="w-8 h-8 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                                <FontAwesomeIcon icon={faBell} className="text-xs" />
                            </button>
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center border-2 border-[var(--color-surface)]">3</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 text-[9px] font-black flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)]/20 transition-all">AS</div>
                    </div>
                </div>
            </div>
            {/* Variant 2: Branded */}
            <div>
                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-2">Branded / Dark</p>
                <div className="flex items-center gap-4 px-4 py-2.5 bg-[var(--color-primary)] rounded-2xl">
                    <span className="text-[11px] font-black text-white">Laporanmu</span>
                    <div className="flex gap-4">
                        {['Dashboard', 'Data Siswa', 'Laporan'].map((item, i) => (
                            <button key={item} className={`text-[10px] font-black transition-colors ${i === 0 ? 'text-white border-b border-white' : 'text-white/60 hover:text-white'}`}>{item}</button>
                        ))}
                    </div>
                    <div className="ml-auto w-7 h-7 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">AS</div>
                </div>
            </div>
        </div>
    )
})

// ─── LazySection — renders children only when near viewport ─────────────────────
const LazySection = memo(({ children }) => {
    const [visible, setVisible] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        // Already visible check (e.g. first section)
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight + 600) {
            setVisible(true)
            return
        }
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                setVisible(true)
                obs.disconnect()
            }
        }, { rootMargin: '400px 0px' })
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    return (
        <div ref={ref}>
            {visible ? children : (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />
                        <div className="h-5 w-48 rounded-lg bg-[var(--color-surface-alt)] animate-pulse" />
                        <div className="h-px bg-[var(--color-border)] flex-1 ml-4 opacity-50" />
                    </div>
                    <div className="grid lg:grid-cols-2 gap-8">
                        <div className="h-48 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-pulse" />
                        <div className="h-48 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-pulse" />
                    </div>
                </div>
            )}
        </div>
    )
})

// ─── Playground Context ─────────────────────────────────────────────────────────
const PlaygroundCtx = createContext({ onCopy: () => { } })

// ─── SectionHeader (memo) ────────────────────────────────────────────────────────
const SectionHeader = memo(({ icon, number, title }) => {
    const id = `sec-${title.toLowerCase().replace(/[&·]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
    return (
        <div id={id} className="flex items-center gap-4 mb-8 group">
            <div className="relative group/num">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-sm font-black relative z-10 border border-[var(--color-primary)]/20 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">{number}</div>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)] opacity-60 mb-0.5">Section</span>
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={icon} className="text-[var(--color-text-muted)] text-[11px]" />
                    <h2 className="text-sm font-black text-[var(--color-text)] uppercase tracking-widest">{title}</h2>
                </div>
            </div>
            <div className="h-px bg-[var(--color-border)] flex-1 ml-4 opacity-50" />
        </div>
    )
})

// ─── ColorBlock (memo) ────────────────────────────────────────────────────────────
const ColorBlock = memo(({ name, variable, description }) => {
    const { onCopy } = useContext(PlaygroundCtx)
    return (
        <div className="space-y-1.5 group">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black tracking-widest text-[var(--color-text)] uppercase">{name}</span>
                <button onClick={() => onCopy(variable)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <FontAwesomeIcon icon={faCopy} className="text-[10px] text-[var(--color-primary)]" />
                </button>
            </div>
            <div className="h-20 rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm cursor-pointer hover:-translate-y-0.5 transition-transform active:scale-95" onClick={() => onCopy(variable)}>
                <div className="h-full w-full" style={{ backgroundColor: `var(${variable})` }} />
            </div>
            <div className="px-1">
                <p className="text-[9px] font-mono text-[var(--color-text-muted)] opacity-60 truncate uppercase tracking-tighter">{variable}</p>
                <p className="text-[8px] font-medium text-[var(--color-text-muted)] opacity-40 italic">{description}</p>
            </div>
        </div>
    )
})

// ─── UIBlock (memo + lazy mount + responsive toggle) ─────────────────────────────
const PREVIEW_SIZES = { S: 375, M: 768, L: null }

const UIBlock = memo(({ title, children, code, fullWidth = false, dos = null, donts = null, apiProps = null }) => {
    const { onCopy } = useContext(PlaygroundCtx)
    const [mode, setMode] = useState('preview')
    const [size, setSize] = useState('L')
    const filename = title.replace(/\s+/g, '') + '.jsx'
    const hasDoDont = dos && donts
    const hasApi = apiProps?.length > 0
    const lines = useMemo(() => code ? code.split('\n') : [], [code])
    const previewWidth = PREVIEW_SIZES[size]

    return (
        <div className={`space-y-2.5 ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
            {/* Header row */}
            <div className="flex items-center justify-between px-1 gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 truncate">{title}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {/* Responsive size toggle — only in preview mode */}
                    {mode === 'preview' && (
                        <div className="flex items-center gap-0.5 p-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-md mr-1">
                            {Object.keys(PREVIEW_SIZES).map(s => (
                                <button key={s} onClick={() => setSize(s)}
                                    className={`w-5 h-5 rounded text-[7px] font-black transition-all ${size === s ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] opacity-40 hover:opacity-70'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Mode tabs */}
                    <div className="flex items-center gap-0.5 p-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg">
                        <button onClick={() => setMode('preview')} className={`px-2 py-1 rounded-md text-[8px] font-black transition-colors ${mode === 'preview' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50 hover:opacity-80'}`}>PREVIEW</button>
                        <button onClick={() => setMode('code')} className={`px-2 py-1 rounded-md text-[8px] font-black transition-colors ${mode === 'code' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50 hover:opacity-80'}`}>CODE</button>
                        {hasDoDont && <button onClick={() => setMode('dodont')} className={`px-2 py-1 rounded-md text-[8px] font-black transition-colors ${mode === 'dodont' ? 'bg-[var(--color-surface)] shadow-sm text-emerald-600' : 'text-[var(--color-text-muted)] opacity-50 hover:opacity-80'}`}>DO·DON'T</button>}
                        {hasApi && <button onClick={() => setMode('api')} className={`px-2 py-1 rounded-md text-[8px] font-black transition-colors ${mode === 'api' ? 'bg-[var(--color-surface)] shadow-sm text-amber-500' : 'text-[var(--color-text-muted)] opacity-50 hover:opacity-80'}`}>API</button>}
                    </div>
                </div>
            </div>

            {/* Card */}
            <div className="rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                {mode === 'preview' ? (
                    <div className="p-6 overflow-x-auto">
                        <div className="transition-all duration-200 mx-auto" style={previewWidth ? { maxWidth: previewWidth } : {}}>
                            {/* Size label */}
                            {size !== 'L' && (
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border)]">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40">
                                        {size === 'S' ? '📱 Mobile — 375px' : '💻 Tablet — 768px'}
                                    </span>
                                    <div className="h-1 rounded-full bg-[var(--color-border)] flex-1 mx-3">
                                        <div className="h-full rounded-full bg-[var(--color-primary)]/30 transition-all duration-200"
                                            style={{ width: size === 'S' ? '29%' : '60%' }} />
                                    </div>
                                    <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-40">{previewWidth}px</span>
                                </div>
                            )}
                            {children}
                        </div>
                    </div>
                ) : mode === 'dodont' && hasDoDont ? (
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><FontAwesomeIcon icon={faCheck} className="text-white text-[8px]" /></div>
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Do — Lakukan Ini</span>
                                </div>
                                {dos.map((d, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                                        <FontAwesomeIcon icon={faCheck} className="text-emerald-500 text-[9px] mt-0.5 shrink-0" />
                                        <span className="text-[10px] text-[var(--color-text)] leading-relaxed font-medium">{d}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0"><FontAwesomeIcon icon={faXmark} className="text-white text-[8px]" /></div>
                                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Don't — Hindari Ini</span>
                                </div>
                                {donts.map((d, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                                        <FontAwesomeIcon icon={faXmark} className="text-rose-500 text-[9px] mt-0.5 shrink-0" />
                                        <span className="text-[10px] text-[var(--color-text)] leading-relaxed font-medium">{d}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : mode === 'api' && hasApi ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/60">
                                    {['Prop', 'Type', 'Default', 'Description'].map(h => (
                                        <th key={h} className="text-left px-4 py-2.5 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {apiProps.map(({ prop, type, defaultVal, desc }, i) => (
                                    <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-alt)] transition-colors">
                                        <td className="px-4 py-2.5 font-mono text-[10px] font-black text-[var(--color-primary)] whitespace-nowrap">{prop}</td>
                                        <td className="px-4 py-2.5 font-mono text-[10px] text-amber-500 whitespace-nowrap">{type}</td>
                                        <td className="px-4 py-2.5 font-mono text-[10px] text-[var(--color-text-muted)] opacity-60 whitespace-nowrap">{defaultVal}</td>
                                        <td className="px-4 py-2.5 text-[10px] text-[var(--color-text-muted)] leading-relaxed">{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-[1.5rem]">
                        <div style={{ background: '#010409', borderBottom: '1px solid #21262d' }}>
                            <div className="flex items-center gap-1.5 px-4 pt-3 pb-2">
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                            </div>
                            <div className="flex items-end" style={{ paddingLeft: '1rem' }}>
                                <div style={{ background: '#0d1117', borderTop: '1.5px solid #58a6ff', borderLeft: '0.5px solid #21262d', borderRight: '0.5px solid #21262d', borderTopLeftRadius: 6, borderTopRightRadius: 6, marginBottom: -1, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#61afef', flexShrink: 0 }} />
                                    <span style={{ color: '#cdd9e5', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{filename}</span>
                                </div>
                            </div>
                        </div>
                        <div className="relative group" style={{ background: '#0d1117', maxHeight: 380, overflowY: 'auto', overflowX: 'auto' }}>
                            <button onClick={() => onCopy(code)} className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90" style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.14)', color: '#8b949e', fontSize: 9, fontFamily: 'monospace', padding: '3px 10px', borderRadius: 6, cursor: 'pointer' }}>
                                <FontAwesomeIcon icon={faCopy} style={{ fontSize: 9 }} /> copy
                            </button>
                            <div style={{ padding: '18px 0', fontSize: 11, lineHeight: 1.85, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' }}>
                                {lines.map((line, idx) => (
                                    <div key={idx} className="flex" style={{ paddingRight: 24 }}>
                                        <span style={{ color: '#3d4452', minWidth: '3rem', textAlign: 'right', paddingRight: '1.25rem', userSelect: 'none', flexShrink: 0, fontSize: 10, lineHeight: 1.85 }}>{idx + 1}</span>
                                        <span style={{ whiteSpace: 'pre' }}>
                                            {tokenizeLine(line).map((token, i) => (
                                                <span key={i} style={{ color: TOKEN_COLORS[token.type] }}>{token.value}</span>
                                            ))}
                                            {line === '' && '\u00a0'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between px-4 py-1" style={{ background: '#0366d6', fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)' }}>
                            <span>JSX · UTF-8</span>
                            <span>{lines.length} lines</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
})

// ─── PlaygroundPage ─────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
    const { addToast } = useToast()
    const [copiedClass, setCopiedClass] = useState(null)
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('atoms')
    const [searchQ, setSearchQ] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [activeSectionId, setActiveSectionId] = useState(null)
    const [tocOpen, setTocOpen] = useState(true)

    const tabCounts = useMemo(() => ({ atoms: 25, library: 28, layout: 25, forms: 8, dataviz: 6, tokens: 4 }), [])

    const copyToClipboard = useCallback((text) => {
        navigator.clipboard.writeText(text)
        setCopiedClass(text)
        addToast('Code disalin!', 'success')
        setTimeout(() => setCopiedClass(null), 2000)
    }, [addToast])

    const ctxValue = useMemo(() => ({ onCopy: copyToClipboard }), [copyToClipboard])
    const TOC_DATA = useMemo(() => ({
        atoms: [
            { id: 'sec-typography-text', label: 'Typography & Text' },
            { id: 'sec-color-system', label: 'Color System' },
            { id: 'sec-badge-status-pills', label: 'Badge & Pills' },
            { id: 'sec-avatar-user-identity', label: 'Avatar' },
            { id: 'sec-spacing-scale', label: 'Spacing Scale' },
            { id: 'sec-border-radius-scale', label: 'Border Radius' },
            { id: 'sec-dividers-separators', label: 'Dividers' },
            { id: 'sec-loading-progress-states', label: 'Loading States' },
            { id: 'sec-tooltip-keyboard-hints', label: 'Tooltip' },
            { id: 'sec-iconography-reference', label: 'Iconography' },
            { id: 'sec-toggle-switch', label: 'Toggle & Switch' },
            { id: 'sec-checkbox-radio', label: 'Checkbox & Radio' },
            { id: 'sec-input-states', label: 'Input States' },
            { id: 'sec-elevation-shadow-scale', label: 'Elevation' },
            { id: 'sec-opacity-scale', label: 'Opacity' },
            { id: 'sec-motion-animation-tokens', label: 'Motion' },
            { id: 'sec-empty-states', label: 'Empty States' },
            { id: 'sec-z-index-scale', label: 'Z-Index' },
            { id: 'sec-select-textarea', label: 'Select & Textarea' },
            { id: 'sec-range-slider', label: 'Range Slider' },
            { id: 'sec-color-tokens-grid', label: 'Color Tokens Grid' },
            { id: 'sec-breadcrumb-variants', label: 'Breadcrumb' },
            { id: 'sec-micro-interactions', label: 'Micro-interactions' },
            { id: 'sec-scrollbar-styling', label: 'Scrollbar' },
            { id: 'sec-focus-ring-a11y', label: 'Focus & A11Y' },
        ],
        library: [
            { id: 'sec-data-tables', label: 'Data & Tables' },
            { id: 'sec-navigation-discovery', label: 'Navigation' },
            { id: 'sec-cards-profiles', label: 'Cards & Profiles' },
            { id: 'sec-overlays-feedback', label: 'Overlays & Feedback' },
            { id: 'sec-content-components', label: 'Content' },
            { id: 'sec-advanced-patterns', label: 'Advanced Patterns' },
            { id: 'sec-input-extras', label: 'Input Extras' },
        ],
        layout: [
            { id: 'sec-navigation', label: 'Navigation' },
            { id: 'sec-page-templates', label: 'Page Templates' },
            { id: 'sec-content-layouts', label: 'Content Layouts' },
            { id: 'sec-overlays-states', label: 'Overlays & States' },
            { id: 'sec-utility-structural', label: 'Utility & Structural' },
            { id: 'sec-special-page-states', label: 'Special Page States' },
            { id: 'sec-developer-cheat-sheet', label: 'Cheat Sheet' },
        ],
        forms: [
            { id: 'sec-authentication-forms', label: 'Auth Forms' },
            { id: 'sec-data-forms', label: 'Data Forms' },
        ],
        dataviz: [
            { id: 'sec-trend-comparison', label: 'Trend & Comparison' },
            { id: 'sec-distribution-patterns', label: 'Distribution' },
        ],
        tokens: [
            { id: 'sec-color-tokens', label: 'Color Tokens' },
            { id: 'sec-spacing-sizing-tokens', label: 'Spacing & Sizing' },
            { id: 'sec-shadow-motion-tokens', label: 'Shadow & Motion' },
        ],
    }), [])

    const iconGroups = useMemo(() => [
        { label: 'Navigation', icons: [faChevronRight, faChevronDown, faArrowRight, faSearch, faFilter] },
        { label: 'Actions', icons: [faPlus, faTrash, faCopy, faDownload, faGear] },
        { label: 'Status', icons: [faCheck, faXmark, faTriangleExclamation, faCircleInfo, faBell] },
        { label: 'Users', icons: [faUser, faUserGroup, faShieldHalved, faKey, faLock] },
        { label: 'Content', icons: [faFileLines, faChartLine, faCalendar, faGlobe, faCamera] },
    ], [])

    useEffect(() => {
        const ids = (TOC_DATA[activeTab] || []).map(s => s.id)
        if (!ids.length) return
        setActiveSectionId(ids[0])
        const handleScroll = () => {
            let current = ids[0]
            for (const id of ids) {
                const el = document.getElementById(id)
                if (el && el.getBoundingClientRect().top <= 100) current = id
            }
            setActiveSectionId(current)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
        return () => window.removeEventListener('scroll', handleScroll)
    }, [activeTab, TOC_DATA])

    return (
        <DashboardLayout title="UI Playground">
            <PlaygroundCtx.Provider value={ctxValue}>
                <div className="p-4 md:p-6 space-y-4 bg-[var(--color-surface-alt)]/30">

                    <div className="space-y-3">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                            <div className="min-w-0">
                                <Breadcrumb badge="Admin" items={['Developer Tools', 'Design System']} />
                                <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)] mt-1.5">UI Playground</h1>
                                <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70 mt-1 leading-relaxed">
                                    Design system sandbox & panduan komponen Laporanmu Ecosystem. Semua komponen interaktif dengan preview dan kode siap pakai.
                                </p>
                            </div>

                            {/* Desktop tab nav — shrink-0 so it never gets clipped */}
                            <div className="hidden lg:flex items-center gap-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm shrink-0">
                                {[['atoms', 'Atoms'], ['library', 'Library'], ['layout', 'Layout'], ['forms', 'Forms'], ['dataviz', 'Viz'], ['tokens', 'Tokens']].map(([key, label]) => (
                                    <button key={key} onClick={() => setActiveTab(key)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === key ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                        {label}
                                        <span className={`text-[7px] px-1 rounded-sm font-black ${activeTab === key ? 'bg-white/20 text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>{tabCounts[key]}</span>
                                    </button>
                                ))}
                                <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                                <button onClick={() => setShowSearch(p => !p)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showSearch ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}>
                                    <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                                </button>
                            </div>
                        </div>

                        {/* Mobile tab nav — scrollable + fade + dot indicator */}
                        <div className="lg:hidden space-y-2">
                            <div className="relative">
                                <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide" id="tab-scroll-container">
                                    <div className="flex items-center gap-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm w-max">
                                        {[['atoms', 'Atoms'], ['library', 'Library'], ['layout', 'Layout'], ['forms', 'Forms'], ['dataviz', 'Viz'], ['tokens', 'Tokens']].map(([key, label]) => (
                                            <button key={key} onClick={() => setActiveTab(key)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === key ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                                {label}
                                                <span className={`text-[7px] px-1 rounded-sm font-black ${activeTab === key ? 'bg-white/20 text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>{tabCounts[key]}</span>
                                            </button>
                                        ))}
                                        <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                                        <button onClick={() => setShowSearch(p => !p)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showSearch ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}>
                                            <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                                        </button>
                                    </div>
                                </div>
                                {/* Fade gradient right edge */}
                                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--color-app-bg)] to-transparent pointer-events-none rounded-r-xl" />
                            </div>
                            {/* Dot scroll indicator */}
                            <div className="flex justify-center items-center gap-1.5">
                                {[['atoms', 'Atoms'], ['library', 'Library'], ['layout', 'Layout'], ['forms', 'Forms'], ['dataviz', 'Viz'], ['tokens', 'Tokens']].map(([key]) => (
                                    <button
                                        key={key}
                                        onClick={() => setActiveTab(key)}
                                        className={`rounded-full transition-colors duration-200 ${activeTab === key ? 'w-4 h-1.5 bg-[var(--color-primary)]' : 'w-1.5 h-1.5 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    {showSearch && (
                        <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm" />
                            <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Cari komponen… (button, input, chart, modal…)" className="w-full h-12 pl-12 pr-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10 text-[12px] font-medium text-[var(--color-text)] outline-none" />
                            <button onClick={() => { setSearchQ(''); setShowSearch(false) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"><FontAwesomeIcon icon={faXmark} /></button>
                            {searchQ && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl z-50 overflow-hidden">
                                    {[
                                        { tab: 'atoms', items: ['Typography', 'Color System', 'Badge & Pills', 'Avatar', 'Spacing', 'Border Radius', 'Dividers', 'Loading', 'Tooltip', 'Iconography', 'Toggle', 'Checkbox', 'Input States', 'Elevation', 'Opacity', 'Motion', 'Empty States', 'Z-Index', 'Select', 'Range Slider', 'Color Tokens', 'Breadcrumb'] },
                                        { tab: 'library', items: ['Data Table', 'Filter Bar', 'Export', 'Pagination', 'Command Palette', 'Tabs', 'Dropdown', 'Stat Cards', 'Profile Card', 'Onboarding', 'Wizard', 'Toast', 'Confirm Dialog', 'Notification', 'Drawer', 'Accordion', 'Timeline', 'File Upload', 'Rich Text', 'Date Picker', 'Kanban', 'Rating', 'Permission', 'Inline Edit', 'OTP Input', 'Tag Input', 'Combobox'] },
                                        { tab: 'layout', items: ['Sidebar', 'Topbar', 'Mobile Bottom Nav', 'FAB', 'Dashboard Shell', 'Auth Page', 'Settings Page', 'Split Panel', 'Chat', 'Breakpoints', 'Grid System', 'Card Grid', 'Calendar', 'Gallery', 'Modal', 'Overlay Stack', 'Tooltip Positioning', 'Scroll Sticky', 'Page Header', 'Stepper', 'Responsive Table', 'Skeleton', 'Empty State', 'Error Pages', 'Print Layout'] },
                                        { tab: 'forms', items: ['Login Form', 'Register Form', 'Search & Filter', 'Forgot Password', 'Settings Form', 'Multi-field Form', 'Validation Patterns', 'Dynamic Fields'] },
                                        { tab: 'dataviz', items: ['Bar Chart', 'Line Chart', 'Donut Chart', 'Sparkline KPI', 'Heatmap', 'Area Chart'] },
                                        { tab: 'tokens', items: ['Color Tokens', 'Spacing Tokens', 'Typography Scale', 'Shadow Scale'] },
                                    ].flatMap(({ tab, items }) => items.filter(i => i.toLowerCase().includes(searchQ.toLowerCase())).map(item => ({ tab, item }))).slice(0, 8).map(({ tab, item }, i) => (
                                        <button key={i} onClick={() => { setActiveTab(tab); setSearchQ(''); setShowSearch(false) }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-alt)] transition-colors text-left border-b border-[var(--color-border)] last:border-0">
                                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0 w-14 text-center">{tab}</span>
                                            <span className="text-[11px] font-black text-[var(--color-text)]">{item}</span>
                                            <FontAwesomeIcon icon={faArrowRight} className="ml-auto text-[var(--color-text-muted)] text-[9px] opacity-50" />
                                        </button>
                                    ))}
                                    {searchQ && [].length === 0 && <div className="px-4 py-4 text-center text-[10px] font-black text-[var(--color-text-muted)] opacity-50">Ketik untuk mencari komponen…</div>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab content — opacity dims while transition is pending */}


                    {/* ── ATOMS ── */}
                    {activeTab === 'atoms' && (
                        <div className="space-y-10">

                            {/* 01 · Typography */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faFont} number="01" title="Typography & Text" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock
                                        title="Heading Styles"
                                        children={
                                            <div className="space-y-4">
                                                <h1 className="text-3xl font-black font-heading tracking-tighter text-[var(--color-text)]">Heading One - 3XL</h1>
                                                <h2 className="text-2xl font-black font-heading tracking-tighter text-[var(--color-text)]">Heading Two - 2XL</h2>
                                                <h3 className="text-xl font-black font-heading tracking-tight text-[var(--color-text)]">Heading Three - XL</h3>
                                                <h4 className="text-lg font-black font-heading tracking-tight text-[var(--color-text)]">Heading Four - LG</h4>
                                                <h5 className="text-base font-black font-heading tracking-tight text-[var(--color-text)]">Heading Five - MD</h5>
                                            </div>
                                        }
                                        code={`<div className="space-y-4">\n  <h1 className="text-3xl font-black font-heading tracking-tighter text-[var(--color-text)]">Heading One - 3XL</h1>\n  <h2 className="text-2xl font-black font-heading tracking-tighter text-[var(--color-text)]">Heading Two - 2XL</h2>\n  <h3 className="text-xl font-black font-heading tracking-tight text-[var(--color-text)]">Heading Three - XL</h3>\n  <h4 className="text-lg font-black font-heading tracking-tight text-[var(--color-text)]">Heading Four - LG</h4>\n  <h5 className="text-base font-black font-heading tracking-tight text-[var(--color-text)]">Heading Five - MD</h5>\n</div>`}
                                    />
                                    <UIBlock
                                        title="Paragraph & Decor"
                                        children={
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-widest opacity-60">Lead Paragraph</p>
                                                    <p className="text-base font-medium text-[var(--color-text-muted)] leading-relaxed">The quick brown fox jumps over the lazy dog in a high-fidelity environment.</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-widest opacity-60">Standard Text</p>
                                                    <p className="text-sm text-[var(--color-text)] leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                                                </div>
                                                <div className="flex flex-wrap gap-4">
                                                    <span className="text-[10px] font-black text-[var(--color-primary)] underline decoration-2 underline-offset-4">Interactive Link</span>
                                                    <span className="text-[10px] font-mono bg-[var(--color-surface-alt)] px-2 py-0.5 rounded border border-[var(--color-border)] uppercase text-[var(--color-text-muted)]">inline:code</span>
                                                    <span className="text-[10px] font-bold italic text-[var(--color-text-muted)] opacity-60">Muted & Italic</span>
                                                </div>
                                            </div>
                                        }
                                        code={`<div className="space-y-6">\n  <div>\n    <p className="text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-widest opacity-60">Lead Paragraph</p>\n    <p className="text-base font-medium text-[var(--color-text-muted)] leading-relaxed">The quick brown fox jumps over the lazy dog in a high-fidelity environment.</p>\n  </div>\n  <div>\n    <p className="text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-widest opacity-60">Standard Text</p>\n    <p className="text-sm text-[var(--color-text)] leading-relaxed">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>\n  </div>\n  <div className="flex flex-wrap gap-4">\n    <span className="text-[10px] font-black text-[var(--color-primary)] underline decoration-2 underline-offset-4">Interactive Link</span>\n    <span className="text-[10px] font-mono bg-[var(--color-surface-alt)] px-2 py-0.5 rounded border border-[var(--color-border)] uppercase text-[var(--color-text-muted)]">inline:code</span>\n    <span className="text-[10px] font-bold italic text-[var(--color-text-muted)] opacity-60">Muted & Italic</span>\n  </div>\n</div>`}
                                    />
                                </div>
                            </section></LazySection>

                            {/* 02 · Color System */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faPalette} number="02" title="Color System" />
                                <div className="rounded-[2rem] border border-[var(--color-border)] p-6 md:p-8 bg-[var(--color-surface)]">
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8">
                                        <ColorBlock name="Primary Brand" variable="--color-primary" description="Main actions & highlights" />
                                        <ColorBlock name="Secondary" variable="--color-secondary" description="Auxiliary interactive elements" />
                                        <ColorBlock name="Accent" variable="--color-accent" description="Visual flourish & details" />
                                        <ColorBlock name="Success" variable="--color-success" description="Positive status & completion" />
                                        <ColorBlock name="Warning" variable="--color-warning" description="Cautions & pending states" />
                                        <ColorBlock name="Danger" variable="--color-danger" description="Errors & destructive actions" />
                                        <ColorBlock name="Surface Base" variable="--color-surface" description="Main container background" />
                                        <ColorBlock name="Surface Alt" variable="--color-surface-alt" description="Secondary background areas" />
                                        <ColorBlock name="Text Dark" variable="--color-text" description="Primary content readability" />
                                        <ColorBlock name="Text Muted" variable="--color-text-muted" description="Hierarchy & secondary info" />
                                        <ColorBlock name="UI Border" variable="--color-border" description="Grid lines & separators" />
                                    </div>
                                </div>
                            </section></LazySection>

                            {/* 03 · Badge & Status Pills */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faFlag} number="03" title="Badge & Status Pills" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock
                                        title="Semantic Badges"
                                        children={
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap gap-3 items-center">
                                                    <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 text-[10px] font-black uppercase tracking-widest">Info</span>
                                                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
                                                    </span>
                                                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[10px] font-black uppercase tracking-widest">Warning</span>
                                                    <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 text-[10px] font-black uppercase tracking-widest">Error</span>
                                                    <span className="px-3 py-1 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest">Archived</span>
                                                </div>
                                                <div className="flex flex-wrap gap-3 items-center">
                                                    <span className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest">Primary</span>
                                                    <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest">Dark</span>
                                                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">9</span>
                                                    <span className="px-1.5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">99+</span>
                                                </div>
                                            </div>
                                        }
                                        code={`<div className="flex flex-wrap gap-3 items-center">\n  <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 text-[10px] font-black uppercase tracking-widest">Info</span>\n  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">\n    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active\n  </span>\n  <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[10px] font-black uppercase tracking-widest">Warning</span>\n  <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 text-[10px] font-black uppercase tracking-widest">Error</span>\n  <span className="px-3 py-1 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest">Archived</span>\n</div>`}
                                    />
                                    <UIBlock
                                        title="Tag Chips"
                                        children={<TagChipsPreview />}
                                        code={`<div className="flex flex-wrap gap-2">\n  {tags.map(tag => (\n    <span key={tag} className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all cursor-pointer">\n      {tag}\n      <FontAwesomeIcon icon={faXmark} className="text-[8px] opacity-50" />\n    </span>\n  ))}\n  <button className="px-2.5 py-1 rounded-lg border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">\n    <FontAwesomeIcon icon={faPlus} className="text-[8px]" /> Add tag\n  </button>\n</div>`}
                                    />
                                </div>
                            </section></LazySection>

                            {/* 04 · Avatar */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faUser} number="04" title="Avatar & User Identity" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock
                                        title="Avatar Sizes & States"
                                        children={
                                            <div className="space-y-6">
                                                <div className="flex items-end gap-4">
                                                    {[
                                                        { size: 'w-8 h-8', text: 'text-[9px]', label: '32', bg: 'bg-indigo-500/10 text-indigo-600', init: 'AB' },
                                                        { size: 'w-10 h-10', text: 'text-[11px]', label: '40', bg: 'bg-emerald-500/10 text-emerald-700', init: 'CD' },
                                                        { size: 'w-12 h-12', text: 'text-sm', label: '48', bg: 'bg-rose-500/10 text-rose-700', init: 'EF' },
                                                        { size: 'w-16 h-16', text: 'text-lg', label: '64', bg: 'bg-amber-500/10 text-amber-700', init: 'GH' },
                                                    ].map(({ size, text, label, bg, init }) => (
                                                        <div key={label} className="flex flex-col items-center gap-2">
                                                            <div className={`${size} rounded-full ${bg} ${text} font-black flex items-center justify-center`}>{init}</div>
                                                            <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">{label}px</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 text-[11px] font-black flex items-center justify-center">IJ</div>
                                                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]" />
                                                    </div>
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-700 text-[11px] font-black flex items-center justify-center">KL</div>
                                                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-400 border-2 border-[var(--color-surface)]" />
                                                    </div>
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-700 text-[11px] font-black flex items-center justify-center">MN</div>
                                                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-amber-400 border-2 border-[var(--color-surface)]" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)] opacity-60 uppercase tracking-widest ml-1">Online · Away · Busy</span>
                                                </div>
                                            </div>
                                        }
                                        code={`{/* Avatar sizes */}\n<div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 text-[11px] font-black flex items-center justify-center">AB</div>\n\n{/* With online indicator */}\n<div className="relative">\n  <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 text-[11px] font-black flex items-center justify-center">IJ</div>\n  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]" />\n</div>`}
                                    />
                                    <UIBlock
                                        title="Avatar Group Stack"
                                        children={
                                            <div className="space-y-6">
                                                <div className="flex items-center">
                                                    {[
                                                        { bg: 'bg-indigo-500/10 text-indigo-600', init: 'AB', z: 'z-[4]' },
                                                        { bg: 'bg-emerald-500/10 text-emerald-700', init: 'CD', z: 'z-[3]' },
                                                        { bg: 'bg-rose-500/10 text-rose-700', init: 'EF', z: 'z-[2]' },
                                                        { bg: 'bg-amber-500/10 text-amber-700', init: 'GH', z: 'z-[1]' },
                                                    ].map(({ bg, init, z }, i) => (
                                                        <div key={i} className={`w-9 h-9 rounded-full ${bg} text-[10px] font-black flex items-center justify-center border-2 border-[var(--color-surface)] -mr-2 ${z} hover:z-[10] hover:-translate-y-1 transition-all cursor-pointer`}>{init}</div>
                                                    ))}
                                                    <div className="w-9 h-9 rounded-full bg-[var(--color-surface-alt)] border-2 border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black flex items-center justify-center ml-2">+12</div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center gap-4">
                                                    <div className="flex items-center -space-x-2">
                                                        {['bg-indigo-500/10 text-indigo-600', 'bg-emerald-500/10 text-emerald-700', 'bg-rose-500/10 text-rose-700'].map((bg, i) => (
                                                            <div key={i} className={`w-7 h-7 rounded-full ${bg} text-[8px] font-black flex items-center justify-center border-2 border-[var(--color-surface)]`}>{String.fromCharCode(65 + i * 2)}{String.fromCharCode(66 + i * 2)}</div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[11px] font-black text-[var(--color-text)]">3 members collaborating</span>
                                                </div>
                                            </div>
                                        }
                                        code={`<div className="flex items-center">\n  {members.map(({ init, bg }, i) => (\n    <div key={i} className={\`w-9 h-9 rounded-full \${bg} text-[10px] font-black flex items-center justify-center border-2 border-[var(--color-surface)] -mr-2 hover:-translate-y-1 transition-all cursor-pointer\`}>\n      {init}\n    </div>\n  ))}\n  <div className="w-9 h-9 rounded-full bg-[var(--color-surface-alt)] border-2 border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black flex items-center justify-center ml-2">\n    +12\n  </div>\n</div>`}
                                    />
                                </div>
                            </section></LazySection>

                            {/* 05 · Spacing Scale */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faExpand} number="05" title="Spacing Scale" />
                                <UIBlock
                                    fullWidth
                                    title="Spacing Tokens"
                                    children={
                                        <div className="space-y-4">
                                            {/* Visual swatch row — capped height so large values stay compact */}
                                            <div className="flex items-end gap-2 flex-wrap pb-1">
                                                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map(n => (
                                                    <div key={n} className="flex flex-col items-center gap-1">
                                                        <div
                                                            className="bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 rounded-sm"
                                                            style={{ width: Math.min(n * 3, 40), height: Math.min(n * 3, 40) }}
                                                        />
                                                        <span className="text-[7px] font-mono text-[var(--color-text-muted)] opacity-60">{n * 4}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Bar table */}
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                                {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
                                                    <div key={n} className="flex items-center gap-3 py-0.5">
                                                        <div
                                                            className="bg-[var(--color-primary)]/25 border-l-2 border-[var(--color-primary)]/60 h-1.5 shrink-0"
                                                            style={{ width: Math.min(n * 4, 64) }}
                                                        />
                                                        <span className="text-[9px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                                                            <span className="text-[var(--color-primary)] font-black">p-{n}</span>
                                                            <span className="opacity-40"> / gap-{n} / m-{n}</span>
                                                            <span className="ml-1.5 opacity-35">= {n * 4}px</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    }
                                    code={`{/* Spacing scale — n × 4px per Tailwind convention */}\n{[1, 2, 3, 4, 6, 8, 10, 12].map(n => (\n  <div key={n} className="flex items-center gap-4">\n    <div\n      className="bg-[var(--color-primary)]/20 border-l-2 border-[var(--color-primary)]/50 h-2"\n      style={{ width: n * 4 }}\n    />\n    <span className="text-[9px] font-mono text-[var(--color-text-muted)]">\n      p-{n} / gap-{n} / m-{n} = {n * 4}px\n    </span>\n  </div>\n))}`}
                                />
                            </section></LazySection>

                            {/* 06 · Border Radius */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faGrip} number="06" title="Border Radius Scale" />
                                <UIBlock
                                    fullWidth
                                    title="Radius Tokens"
                                    children={
                                        <div className="flex flex-wrap gap-8 items-end">
                                            {[
                                                { label: 'none', tw: 'rounded-none', px: '0px' },
                                                { label: 'sm', tw: 'rounded-sm', px: '2px' },
                                                { label: 'md', tw: 'rounded-md', px: '6px' },
                                                { label: 'lg', tw: 'rounded-lg', px: '8px' },
                                                { label: 'xl', tw: 'rounded-xl', px: '12px' },
                                                { label: '2xl', tw: 'rounded-2xl', px: '16px' },
                                                { label: '3xl', tw: 'rounded-3xl', px: '24px' },
                                                { label: 'full', tw: 'rounded-full', px: '9999px' },
                                            ].map(({ label, tw, px }) => (
                                                <div key={label} className="flex flex-col items-center gap-2">
                                                    <div className={`w-14 h-14 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 ${tw}`} />
                                                    <span className="text-[9px] font-mono font-black text-[var(--color-primary)] opacity-70">{label}</span>
                                                    <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-40">{px}</span>
                                                </div>
                                            ))}
                                        </div>
                                    }
                                    code={`{[\n  { label: 'none', tw: 'rounded-none', px: '0px' },\n  { label: 'sm',   tw: 'rounded-sm',   px: '2px' },\n  { label: 'md',   tw: 'rounded-md',   px: '6px' },\n  { label: 'lg',   tw: 'rounded-lg',   px: '8px' },\n  { label: 'xl',   tw: 'rounded-xl',   px: '12px' },\n  { label: '2xl',  tw: 'rounded-2xl',  px: '16px' },\n  { label: '3xl',  tw: 'rounded-3xl',  px: '24px' },\n  { label: 'full', tw: 'rounded-full', px: '9999px' },\n].map(({ label, tw, px }) => (\n  <div key={label} className="flex flex-col items-center gap-2">\n    <div className={\`w-14 h-14 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 \${tw}\`} />\n    <span className="text-[9px] font-mono font-black text-[var(--color-primary)] opacity-70">{label}</span>\n    <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-40">{px}</span>\n  </div>\n))}`}
                                />
                            </section></LazySection>

                            {/* 07 · Dividers */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faCode} number="07" title="Dividers & Separators" />
                                <UIBlock
                                    fullWidth
                                    title="Divider Variants"
                                    children={
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="space-y-5">
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Solid</p>
                                                    <div className="h-px bg-[var(--color-border)]" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Dashed</p>
                                                    <div className="border-t border-dashed border-[var(--color-border)]" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Dotted</p>
                                                    <div className="border-t border-dotted border-[var(--color-border)]" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Dot Chain</p>
                                                    <div className="flex items-center gap-1">
                                                        {[...Array(12)].map((_, i) => <span key={i} className="w-1 h-1 rounded-full bg-[var(--color-border)]" />)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-5">
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">With Label</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-px bg-[var(--color-border)] flex-1" />
                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-50">OR</span>
                                                        <div className="h-px bg-[var(--color-border)] flex-1" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">With Icon</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-px bg-[var(--color-border)] flex-1" />
                                                        <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center">
                                                            <FontAwesomeIcon icon={faPlus} className="text-[8px] text-[var(--color-text-muted)]" />
                                                        </div>
                                                        <div className="h-px bg-[var(--color-border)] flex-1" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Primary Accent</p>
                                                    <div className="h-px bg-[var(--color-primary)]/30" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Vertical</p>
                                                    <div className="flex items-center gap-3 h-8">
                                                        <span className="text-[10px] text-[var(--color-text-muted)]">Item A</span>
                                                        <div className="w-px h-full bg-[var(--color-border)]" />
                                                        <span className="text-[10px] text-[var(--color-text-muted)]">Item B</span>
                                                        <div className="w-px h-full bg-[var(--color-border)]" />
                                                        <span className="text-[10px] text-[var(--color-text-muted)]">Item C</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                    code={`{/* Solid */}\n<div className="h-px bg-[var(--color-border)]" />\n\n{/* Dashed */}\n<div className="border-t border-dashed border-[var(--color-border)]" />\n\n{/* With label */}\n<div className="flex items-center gap-3">\n  <div className="h-px bg-[var(--color-border)] flex-1" />\n  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-50">OR</span>\n  <div className="h-px bg-[var(--color-border)] flex-1" />\n</div>\n\n{/* Vertical */}\n<div className="w-px h-full bg-[var(--color-border)]" />`}
                                />
                            </section></LazySection>

                            {/* 08 · Loading & Progress */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faSpinner} number="08" title="Loading & Progress States" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock
                                        title="Spinners & Loaders"
                                        children={
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-6">
                                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[var(--color-primary)] text-xl" />
                                                    <div className="w-6 h-6 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin" />
                                                    <div className="w-6 h-6 rounded-full border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] border-r-[var(--color-primary)] animate-spin" />
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3].map(i => (
                                                            <div key={i} className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-0.5 items-end h-5">
                                                        {[40, 80, 60, 90, 50].map((h, i) => (
                                                            <div key={i} className="w-1 bg-[var(--color-primary)] rounded-full animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {[
                                                        { w: '65%', color: 'bg-[var(--color-primary)]', label: '65%' },
                                                        { w: '85%', color: 'bg-emerald-500', label: '85%' },
                                                        { w: '30%', color: 'bg-rose-500', label: '30%' },
                                                    ].map(({ w, color, label }) => (
                                                        <div key={label} className="flex items-center gap-3">
                                                            <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                                                <div className={`h-full ${color} rounded-full`} style={{ width: w }} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-[var(--color-text-muted)] w-8 text-right">{label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        }
                                        code={`{/* Bouncing dots */}\n<div className="flex gap-1">\n  {[1, 2, 3].map(i => (\n    <div key={i} className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"\n      style={{ animationDelay: \`\${i * 150}ms\` }}\n    />\n  ))}\n</div>\n\n{/* Progress bar */}\n<div className="flex items-center gap-3">\n  <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">\n    <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: '65%' }} />\n  </div>\n  <span className="text-[10px] font-black text-[var(--color-text-muted)] w-8 text-right">65%</span>\n</div>`}
                                    />
                                    <UIBlock
                                        title="Step Indicator"
                                        children={
                                            <div className="space-y-6">
                                                <div className="flex items-center">
                                                    {['Config', 'Review', 'Deploy', 'Done'].map((step, i) => (
                                                        <div key={i} className="flex items-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className={`w-8 h-8 rounded-full text-[9px] font-black flex items-center justify-center ${i < 2 ? 'bg-[var(--color-primary)] text-white' : i === 2 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-2 border-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                                                                    {i < 2 ? <FontAwesomeIcon icon={faCheck} className="text-[8px]" /> : i + 1}
                                                                </div>
                                                                <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wide whitespace-nowrap">{step}</span>
                                                            </div>
                                                            {i < 3 && <div className={`h-0.5 w-8 mb-4 mx-1 ${i < 2 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-1">
                                                    {[0, 1, 2, 3, 4].map(i => (
                                                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 2 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)]'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        }
                                        code={`<div className="flex items-center">\n  {['Config', 'Review', 'Deploy', 'Done'].map((step, i) => (\n    <div key={i} className="flex items-center">\n      <div className="flex flex-col items-center gap-1">\n        <div className={\`w-8 h-8 rounded-full text-[9px] font-black flex items-center justify-center\n          \${i < 2 ? 'bg-[var(--color-primary)] text-white'\n            : i === 2 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-2 border-[var(--color-primary)]'\n            : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}\`}>\n          {i < 2 ? <FontAwesomeIcon icon={faCheck} className="text-[8px]" /> : i + 1}\n        </div>\n        <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase whitespace-nowrap">{step}</span>\n      </div>\n      {i < 3 && <div className={\`h-0.5 w-8 mb-4 mx-1 \${i < 2 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}\`} />}\n    </div>\n  ))}\n</div>`}
                                    />
                                </div>
                            </section></LazySection>

                            {/* 09 · Tooltip & Keyboard */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faLightbulb} number="09" title="Tooltip & Keyboard Hints" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock
                                        title="Tooltips"
                                        children={
                                            <div className="flex flex-wrap gap-8 items-center pt-8">
                                                <div className="relative group">
                                                    <button className="px-4 h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text)] hover:border-[var(--color-primary)] transition-all">Hover me</button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                        <div className="bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap">Salin ke clipboard</div>
                                                        <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
                                                    </div>
                                                </div>
                                                <div className="relative group">
                                                    <button className="px-4 h-9 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[11px] font-black text-[var(--color-primary)]">Primary tip</button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                        <div className="bg-[var(--color-primary)] text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap">Simpan perubahan — Ctrl+S</div>
                                                        <div className="w-2 h-2 bg-[var(--color-primary)] rotate-45 mx-auto -mt-1" />
                                                    </div>
                                                </div>
                                                <div className="relative group">
                                                    <button className="px-4 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-black text-rose-700">Danger tip</button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                        <div className="bg-rose-600 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap">Aksi ini tidak bisa dibatalkan</div>
                                                        <div className="w-2 h-2 bg-rose-600 rotate-45 mx-auto -mt-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        }
                                        code={`<div className="relative group">\n  <button className="px-4 h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text)] hover:border-[var(--color-primary)] transition-all">\n    Hover me\n  </button>\n  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">\n    <div className="bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap">\n      Salin ke clipboard\n    </div>\n    <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />\n  </div>\n</div>`}
                                    />
                                    <UIBlock
                                        title="Keyboard Shortcuts"
                                        children={
                                            <div className="space-y-4">
                                                {[
                                                    { keys: ['⌘', 'K'], desc: 'Command palette' },
                                                    { keys: ['Ctrl', 'S'], desc: 'Save changes' },
                                                    { keys: ['⌘', 'Z'], desc: 'Undo last action' },
                                                    { keys: ['Esc'], desc: 'Close / cancel' },
                                                ].map(({ keys, desc }) => (
                                                    <div key={desc} className="flex items-center justify-between">
                                                        <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{desc}</span>
                                                        <div className="flex items-center gap-1">
                                                            {keys.map(k => (
                                                                <kbd key={k} className="px-2 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] border-b-[3px] text-[10px] font-mono font-black text-[var(--color-text-muted)] shadow-sm">{k}</kbd>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        }
                                        code={`{[\n  { keys: ['⌘', 'K'],    desc: 'Command palette' },\n  { keys: ['Ctrl', 'S'], desc: 'Save changes' },\n  { keys: ['⌘', 'Z'],    desc: 'Undo last action' },\n  { keys: ['Esc'],       desc: 'Close / cancel' },\n].map(({ keys, desc }) => (\n  <div key={desc} className="flex items-center justify-between">\n    <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{desc}</span>\n    <div className="flex items-center gap-1">\n      {keys.map(k => (\n        <kbd key={k} className="px-2 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] border-b-[3px] text-[10px] font-mono font-black text-[var(--color-text-muted)] shadow-sm">\n          {k}\n        </kbd>\n      ))}\n    </div>\n  </div>\n))}`}
                                    />
                                </div>
                            </section></LazySection>

                            {/* 10 · Iconography */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faGrip} number="10" title="Iconography Reference" />
                                <UIBlock
                                    fullWidth
                                    title="Icon System"
                                    children={
                                        <div className="space-y-3">
                                            {iconGroups.map(({ label, icons }) => (
                                                <div key={label} className="flex items-center gap-3">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40 w-16 shrink-0">{label}</span>
                                                    <div className="flex gap-2">
                                                        {icons.map((icon, i) => (
                                                            <div key={i} onClick={() => copyToClipboard(`fa${label}Icon`)} className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/20 active:scale-90 transition-all cursor-pointer">
                                                                <FontAwesomeIcon icon={icon} className="text-xs" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    }
                                    code={`const iconGroups = [\n  { label: 'Navigation', icons: [faChevronRight, faChevronDown, faArrowRight, faSearch, faFilter] },\n  { label: 'Actions',    icons: [faPlus, faTrash, faCopy, faDownload, faGear] },\n  { label: 'Status',     icons: [faCheck, faXmark, faTriangleExclamation, faCircleInfo, faBell] },\n  { label: 'Users',      icons: [faUser, faUserGroup, faShieldHalved, faKey, faLock] },\n  { label: 'Content',    icons: [faFileLines, faChartLine, faCalendar, faGlobe, faCamera] },\n]\n\n{iconGroups.map(({ label, icons }) => (\n  <div key={label}>\n    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-3">{label}</p>\n    <div className="flex flex-wrap gap-3">\n      {icons.map((icon, i) => (\n        <div key={i} className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/20 active:scale-90 transition-all cursor-pointer">\n          <FontAwesomeIcon icon={icon} className="text-sm" />\n        </div>\n      ))}\n    </div>\n  </div>\n))}`}
                                />
                            </section></LazySection>

                            {/* 11 · Toggle & Switch */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faCheck} number="11" title="Toggle & Switch" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock
                                        title="Toggle Variants"
                                        children={<ToggleVariantsPreview />}
                                        code={`<div className="flex items-center justify-between">\n  <span className="text-[11px] font-black text-[var(--color-text-muted)]">Dark Mode</span>\n  <button className={\`w-11 h-6 rounded-full relative transition-all \${isOn ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)]'}\`}\n    onClick={() => setIsOn(p => !p)}>\n    <span className={\`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform \${isOn ? 'translate-x-5' : 'translate-x-0'}\`} />\n  </button>\n</div>`}
                                    />
                                    <UIBlock
                                        title="Toggle Sizes & States"
                                        children={
                                            <div className="space-y-5">
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Sizes</p>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <button className="w-7 h-4 rounded-full relative bg-[var(--color-primary)]"><span className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm translate-x-3 transition-transform" /></button>
                                                            <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">xs</span>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <button className="w-9 h-5 rounded-full relative bg-[var(--color-primary)]"><span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm translate-x-4 transition-transform" /></button>
                                                            <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">sm</span>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <button className="w-11 h-6 rounded-full relative bg-[var(--color-primary)]"><span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm translate-x-5 transition-transform" /></button>
                                                            <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">md</span>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <button className="w-14 h-7 rounded-full relative bg-[var(--color-primary)]"><span className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm translate-x-7 transition-transform" /></button>
                                                            <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">lg</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Disabled State</p>
                                                    <div className="flex items-center gap-4">
                                                        <button className="w-11 h-6 rounded-full relative bg-[var(--color-primary)] opacity-30 cursor-not-allowed"><span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm translate-x-5" /></button>
                                                        <button className="w-11 h-6 rounded-full relative bg-[var(--color-surface-alt)] border border-[var(--color-border)] opacity-30 cursor-not-allowed"><span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm translate-x-0" /></button>
                                                        <span className="text-[10px] font-black text-[var(--color-text-muted)] opacity-50 uppercase tracking-widest">Disabled</span>
                                                    </div>
                                                </div>
                                            </div>
                                        }
                                        code={`{/* Disabled toggle */}\n<button\n  disabled\n  className="w-11 h-6 rounded-full relative bg-[var(--color-primary)] opacity-30 cursor-not-allowed"\n>\n  <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm translate-x-5" />\n</button>`}
                                    />
                                </div>
                            </section></LazySection>

                            {/* 12 · Checkbox & Radio */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faCheckDouble} number="12" title="Checkbox & Radio" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock
                                        title="Checkbox States"
                                        children={<CheckboxStatesPreview />}
                                        code={`{/* Checked */}\n<label className="flex items-center gap-3 cursor-pointer group">\n  <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 bg-[var(--color-primary)] border border-[var(--color-primary)] transition-all">\n    <FontAwesomeIcon icon={faCheck} className="text-white text-[7px]" />\n  </div>\n  <span className="text-[11px] font-medium text-[var(--color-text)]">Accept terms</span>\n</label>\n\n{/* Indeterminate */}\n<label className="flex items-center gap-3 cursor-pointer group">\n  <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 bg-[var(--color-primary)] border border-[var(--color-primary)]">\n    <div className="w-2 h-0.5 bg-white rounded-full" />\n  </div>\n  <span className="text-[11px] font-medium text-[var(--color-text)]">Select all (3 of 7)</span>\n</label>`}
                                    />
                                    <UIBlock
                                        title="Radio Group"
                                        children={<RadioGroupPreview />}
                                        code={`{plans.map(({ value, label, desc, selected }) => (\n  <label key={value} className={\`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all\n    \${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}\`}>\n    <div className={\`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0\n      \${selected ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'}\`}>\n      {selected && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}\n    </div>\n    <div className="flex-1">\n      <span className={\`text-[11px] font-black \${selected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}\`}>{label}</span>\n      <p className="text-[10px] text-[var(--color-text-muted)] opacity-60">{desc}</p>\n    </div>\n  </label>\n))}`}
                                    />
                                </div>
                            </section></LazySection>

                            {/* 13 · Input States */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faSearch} number="13" title="Input States" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock
                                        title="Text Input Variants"
                                        children={<InputStatesPreview />}
                                        code={`{/* Error state */}\n<div className="space-y-1">\n  <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Email</label>\n  <input\n    className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border border-rose-400 ring-2 ring-rose-400/10 text-sm font-medium text-[var(--color-text)] outline-none transition-all"\n    value={email}\n    onChange={e => setEmail(e.target.value)}\n  />\n  <p className="text-[9px] font-black text-rose-500 flex items-center gap-1">\n    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />\n    Format email tidak valid\n  </p>\n</div>`}
                                    />
                                    <UIBlock
                                        title="Input with Addons"
                                        children={<InputAddonsPreview />}
                                        code={`{/* Input with icon */}\n<div className="relative">\n  <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-xs" />\n  <input placeholder="Cari siswa..." className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] outline-none" />\n</div>\n\n{/* Input with prefix */}\n<div className="flex">\n  <span className="h-10 px-3.5 flex items-center rounded-l-xl bg-[var(--color-surface-alt)] border border-r-0 border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)]">https://</span>\n  <input className="flex-1 h-10 px-3 rounded-r-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium outline-none" />\n</div>`}
                                    />
                                </div>
                            </section></LazySection>

                            {/* 14 · Elevation & Shadow */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faLayerGroup} number="14" title="Elevation & Shadow Scale" />
                                <UIBlock
                                    fullWidth
                                    title="Shadow Tokens"
                                    children={
                                        <div className="space-y-6">
                                            <div className="flex flex-wrap gap-8 items-end py-4">
                                                {[
                                                    { label: 'flat', shadow: 'shadow-none', border: true },
                                                    { label: 'sm', shadow: 'shadow-sm', border: false },
                                                    { label: 'md', shadow: 'shadow-md', border: false },
                                                    { label: 'lg', shadow: 'shadow-lg', border: false },
                                                    { label: 'xl', shadow: 'shadow-xl', border: false },
                                                    { label: '2xl', shadow: 'shadow-2xl', border: false },
                                                    { label: 'inner', shadow: 'shadow-inner', border: true },
                                                ].map(({ label, shadow, border }) => (
                                                    <div key={label} className="flex flex-col items-center gap-3">
                                                        <div className={`w-16 h-16 rounded-2xl bg-[var(--color-surface)] ${shadow} ${border ? 'border border-[var(--color-border)]' : ''} flex items-center justify-center`}>
                                                            <span className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">{label}</span>
                                                        </div>
                                                        <span className="text-[9px] font-mono font-black text-[var(--color-text-muted)] opacity-60">shadow-{label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-4 pt-2 border-t border-[var(--color-border)]">
                                                {[
                                                    { label: 'Card', cls: 'shadow-sm hover:shadow-md', desc: 'bg + hover transition' },
                                                    { label: 'Dropdown', cls: 'shadow-lg', desc: 'floating menu/popover' },
                                                    { label: 'Modal', cls: 'shadow-2xl', desc: 'overlay dialogs' },
                                                ].map(({ label, cls, desc }) => (
                                                    <div key={label} className="p-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-1">
                                                        <p className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest">{label}</p>
                                                        <p className="text-[10px] font-mono text-[var(--color-primary)]">.{cls}</p>
                                                        <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">{desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    }
                                    code={`{/* Usage guide */}\n<div className="shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-[var(--color-surface)] p-4">\n  Card — hover to elevate\n</div>\n\n<div className="shadow-lg rounded-xl bg-[var(--color-surface)] p-2">\n  Dropdown menu\n</div>\n\n<div className="shadow-2xl rounded-2xl bg-[var(--color-surface)] p-6">\n  Modal dialog\n</div>`}
                                />
                            </section></LazySection>

                            {/* 15 · Opacity Scale */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faEye} number="15" title="Opacity Scale" />
                                <UIBlock
                                    fullWidth
                                    title="Opacity Tokens"
                                    children={
                                        <div className="space-y-6">
                                            <div className="flex flex-wrap gap-4 items-end">
                                                {[100, 80, 60, 50, 40, 30, 20, 10, 5].map(val => (
                                                    <div key={val} className="flex flex-col items-center gap-2">
                                                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]" style={{ opacity: val / 100 }} />
                                                        <span className="text-[8px] font-mono font-black text-[var(--color-primary)] opacity-70">{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid md:grid-cols-4 gap-3 pt-2 border-t border-[var(--color-border)]">
                                                {[
                                                    { use: 'Text muted', cls: 'opacity-60', example: 'opacity-60' },
                                                    { use: 'Disabled UI', cls: 'opacity-40', example: 'opacity-40' },
                                                    { use: 'Placeholder', cls: 'opacity-30', example: 'opacity-30' },
                                                    { use: 'Overlay tint', cls: 'opacity-5', example: 'opacity-5' },
                                                ].map(({ use, cls, example }) => (
                                                    <div key={use} className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                        <p className="text-[9px] font-black text-[var(--color-text)] mb-0.5">{use}</p>
                                                        <p className="text-[9px] font-mono text-[var(--color-primary)]">.{example}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    }
                                    code={`{/* Opacity usage examples */}\n{/* Muted text */}\n<span className="opacity-60 text-[var(--color-text-muted)]">Helper text</span>\n\n{/* Disabled element */}\n<button className="opacity-40 cursor-not-allowed" disabled>Disabled</button>\n\n{/* Overlay tint */}\n<div className="absolute inset-0 bg-[var(--color-primary)] opacity-5 rounded-2xl pointer-events-none" />`}
                                />
                            </section></LazySection>

                            {/* 16 · Motion & Animation Tokens */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faSpinner} number="16" title="Motion & Animation Tokens" />
                                <UIBlock
                                    fullWidth
                                    title="Duration & Easing"
                                    children={
                                        <div className="space-y-6">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Duration Scale</p>
                                                    {[
                                                        { name: 'instant', ms: 75, desc: 'button press, checkbox' },
                                                        { name: 'fast', ms: 150, desc: 'hover, tooltip appear' },
                                                        { name: 'normal', ms: 300, desc: 'slide, expand, collapse' },
                                                        { name: 'slow', ms: 500, desc: 'page enter, modal open' },
                                                        { name: 'cinematic', ms: 700, desc: 'intro animation, hero' },
                                                    ].map(({ name, ms, desc }) => (
                                                        <div key={name} className="flex items-center gap-3">
                                                            <span className="text-[9px] font-mono text-[var(--color-primary)] font-black w-16 shrink-0">{ms}ms</span>
                                                            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                                                <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${(ms / 700) * 100}%` }} />
                                                            </div>
                                                            <span className="text-[9px] text-[var(--color-text-muted)] opacity-50 font-black uppercase tracking-widest w-20 shrink-0">{name}</span>
                                                            <span className="text-[9px] text-[var(--color-text-muted)] opacity-40 hidden md:block">{desc}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Easing Curves</p>
                                                    {[
                                                        { name: 'ease-linear', cls: 'transition-all duration-300', tw: 'ease-linear' },
                                                        { name: 'ease-in', cls: 'transition-all duration-300 ease-in', tw: 'ease-in' },
                                                        { name: 'ease-out', cls: 'transition-all duration-300 ease-out', tw: 'ease-out' },
                                                        { name: 'ease-in-out', cls: 'transition-all duration-300 ease-in-out', tw: 'ease-in-out' },
                                                        { name: 'spring (bounce)', cls: 'transition-all duration-500 ease-[cubic-bezier(.34,1.56,.64,1)]', tw: 'custom' },
                                                    ].map(({ name, tw }) => (
                                                        <div key={name} className="flex items-center justify-between py-1 border-b border-[var(--color-border)] last:border-0">
                                                            <span className="text-[10px] font-medium text-[var(--color-text-muted)]">{name}</span>
                                                            <span className="text-[9px] font-mono text-[var(--color-primary)] bg-[var(--color-primary)]/5 px-2 py-0.5 rounded">{tw}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Tailwind Shorthand</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['transition-colors', 'duration-75', 'duration-150', 'duration-300', 'duration-500', 'duration-700', 'ease-in', 'ease-out', 'ease-in-out'].map(cls => (
                                                        <span key={cls} className="px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-mono text-[var(--color-primary)]">{cls}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    }
                                    code={`{/* Recommended combinations */}\n\n{/* Instant — toggle, checkbox */}\n<div className="transition-all duration-75 ease-in-out" />\n\n{/* Default UI — hover, focus */}\n<div className="transition-all duration-150 ease-out" />\n\n{/* Smooth — expand, slide */}\n<div className="transition-all duration-300 ease-in-out" />\n\n{/* Spring — pop, bounce */}\n<div className="transition-all duration-500 ease-[cubic-bezier(.34,1.56,.64,1)]" />`}
                                />
                            </section></LazySection>

                            {/* 17 · Empty States */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faBoxOpen} number="17" title="Empty States" />
                                <UIBlock
                                    fullWidth
                                    title="Empty State Patterns"
                                    children={
                                        <div className="grid md:grid-cols-3 gap-6">
                                            {[
                                                {
                                                    icon: faFileLines,
                                                    iconBg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
                                                    title: 'Belum ada data',
                                                    desc: 'Tambahkan entri pertama untuk memulai menggunakan fitur ini.',
                                                    cta: { label: '+ Tambah Baru', color: 'bg-[var(--color-primary)] text-white' },
                                                    type: 'no-data',
                                                },
                                                {
                                                    icon: faSearch,
                                                    iconBg: 'bg-amber-500/10 text-amber-600',
                                                    title: 'Hasil tidak ditemukan',
                                                    desc: 'Tidak ada yang cocok dengan "guru kelas 6". Coba kata kunci lain.',
                                                    cta: { label: 'Reset Filter', color: 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]' },
                                                    type: 'no-results',
                                                },
                                                {
                                                    icon: faTriangleExclamation,
                                                    iconBg: 'bg-rose-500/10 text-rose-600',
                                                    title: 'Terjadi kesalahan',
                                                    desc: 'Gagal memuat data. Periksa koneksi internet lalu coba lagi.',
                                                    cta: { label: 'Coba Lagi', color: 'bg-rose-500 text-white' },
                                                    type: 'error',
                                                },
                                            ].map(({ icon, iconBg, title, desc, cta, type }) => (
                                                <div key={type} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] gap-3">
                                                    <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
                                                        <FontAwesomeIcon icon={icon} className="text-lg" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[12px] font-black text-[var(--color-text)] mb-1">{title}</h4>
                                                        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed opacity-70">{desc}</p>
                                                    </div>
                                                    <button className={`mt-1 px-4 py-2 rounded-xl text-[10px] font-black ${cta.color} transition-all hover:opacity-90 active:scale-95`}>{cta.label}</button>
                                                </div>
                                            ))}
                                        </div>
                                    }
                                    code={`<div className="flex flex-col items-center text-center p-6 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] gap-3">\n  <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">\n    <FontAwesomeIcon icon={faFileLines} className="text-lg" />\n  </div>\n  <div>\n    <h4 className="text-[12px] font-black text-[var(--color-text)] mb-1">Belum ada data</h4>\n    <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed opacity-70">Tambahkan entri pertama untuk memulai.</p>\n  </div>\n  <button className="mt-1 px-4 py-2 rounded-xl text-[10px] font-black bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95">\n    + Tambah Baru\n  </button>\n</div>`}
                                />
                            </section></LazySection>

                            {/* 18 · Z-Index Scale */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faLayerGroup} number="18" title="Z-Index Scale" />
                                <UIBlock
                                    fullWidth
                                    title="Layering Hierarchy"
                                    children={
                                        <div className="space-y-6">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-4">Layer Stack</p>
                                                    <div className="space-y-2">
                                                        {[
                                                            { level: 'z-0', name: 'Base Content', color: 'bg-slate-500/10 border-slate-500/20 text-slate-600', desc: 'default document flow' },
                                                            { level: 'z-10', name: 'Dropdown / Popover', color: 'bg-sky-500/10 border-sky-500/20 text-sky-700', desc: 'menus, tooltips' },
                                                            { level: 'z-20', name: 'Sticky Header', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700', desc: 'top navbar, sidebar' },
                                                            { level: 'z-30', name: 'Drawer / Sidebar', color: 'bg-violet-500/10 border-violet-500/20 text-violet-700', desc: 'off-canvas panels' },
                                                            { level: 'z-40', name: 'Modal Backdrop', color: 'bg-purple-500/10 border-purple-500/20 text-purple-700', desc: 'overlay scrim' },
                                                            { level: 'z-50', name: 'Modal / Dialog', color: 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)]', desc: 'dialogs, alerts' },
                                                            { level: 'z-[999]', name: 'Toast / Notif', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700', desc: 'always on top' },
                                                        ].map(({ level, name, color, desc }) => (
                                                            <div key={level} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${color}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[9px] font-mono font-black w-16 shrink-0">{level}</span>
                                                                    <span className="text-[10px] font-black">{name}</span>
                                                                </div>
                                                                <span className="text-[9px] opacity-60">{desc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-4">Visual Stack</p>
                                                    <div className="relative h-52 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden">
                                                        <div className="absolute inset-4 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-start p-2 z-0">
                                                            <span className="text-[8px] font-mono text-slate-500 opacity-60">z-0 base</span>
                                                        </div>
                                                        <div className="absolute inset-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-start p-2 z-10">
                                                            <span className="text-[8px] font-mono text-indigo-600 opacity-70">z-20 header</span>
                                                        </div>
                                                        <div className="absolute inset-12 rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-start p-2 z-20">
                                                            <span className="text-[8px] font-mono text-[var(--color-primary)] opacity-80">z-50 modal</span>
                                                        </div>
                                                        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-emerald-500 text-white z-30">
                                                            <span className="text-[8px] font-black">z-[999] toast</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                    code={`{/* Z-index convention */}\n\n{/* Sticky navbar */}\n<header className="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]" />\n\n{/* Modal backdrop */}\n<div className="fixed inset-0 z-40 bg-black/50" />\n\n{/* Modal dialog */}\n<div className="fixed inset-0 z-50 flex items-center justify-center">\n  <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-6">\n    Modal content\n  </div>\n</div>\n\n{/* Toast notification */}\n<div className="fixed bottom-4 right-4 z-[999]">\n  <ToastMessage />\n</div>`}
                                />
                            </section></LazySection>

                            {/* 19 · Select & Textarea */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faFileLines} number="19" title="Select & Textarea" />
                                <UIBlock fullWidth title="Select & Textarea Variants" children={<SelectTextareaPreview />} code={`{/* Single select dengan grouped options */}\n<div className="relative">\n  <select className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[11px] font-black text-[var(--color-text)] outline-none appearance-none cursor-pointer">\n    <optgroup label="Kelas 6">\n      <option value="kelas-6a">Kelas 6A</option>\n    </optgroup>\n  </select>\n  <FontAwesomeIcon icon={faChevronDown} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none" />\n</div>\n\n{/* Textarea dengan char counter */}\n<textarea\n  value={text}\n  onChange={e => setText(e.target.value.slice(0, 200))}\n  rows={3}\n  className="w-full px-3.5 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[11px] outline-none resize-none"\n />`}
                                    dos={['Selalu sertakan label yang jelas di atas select', 'Gunakan optgroup untuk mengelompokkan opsi yang banyak', 'Sertakan counter karakter di sudut kanan bawah textarea']}
                                    donts={['Jangan biarkan select tanpa placeholder atau opsi default', 'Hindari textarea tanpa batas maxLength yang bisa overflow database', "Jangan set resize: 'both' pada textarea yang bisa mengacak layout"]}
                                    apiProps={[
                                        { prop: 'value', type: 'string', defaultVal: "''", desc: 'Nilai yang terpilih atau teks textarea saat ini' },
                                        { prop: 'onChange', type: 'function', defaultVal: 'required', desc: 'Callback (value) dipanggil saat nilai berubah' },
                                        { prop: 'options', type: 'array', defaultVal: '[]', desc: 'Array of { value, label } atau { group, items[] } untuk optgroup' },
                                        { prop: 'placeholder', type: 'string', defaultVal: "'Pilih...'", desc: 'Teks hint saat belum ada pilihan' },
                                        { prop: 'disabled', type: 'boolean', defaultVal: 'false', desc: 'Nonaktifkan interaksi dan tampilkan visual disabled' },
                                        { prop: 'maxLength', type: 'number', defaultVal: 'undefined', desc: 'Batas karakter untuk textarea' },
                                    ]}
                                />
                            </section></LazySection>

                            {/* 20 · Range Slider */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faExpand} number="20" title="Range Slider" />
                                <UIBlock fullWidth title="Slider Variants" children={<RangeSliderPreview />} code={`const [val, setVal] = useState(65)\n\n{/* Custom range slider */}\n<div className="relative h-4 flex items-center">\n  <div className="absolute w-full h-2 rounded-full bg-[var(--color-surface-alt)]" />\n  <div className="absolute h-2 rounded-full bg-[var(--color-primary)]" style={{ width: \`\${val}%\` }} />\n  <input type="range" min="0" max="100" value={val}\n    onChange={e => setVal(+e.target.value)}\n    className="absolute w-full opacity-0 cursor-pointer h-4" />\n  <div className="absolute h-4 w-4 rounded-full bg-white border-2 border-[var(--color-primary)] shadow-md pointer-events-none"\n    style={{ left: \`calc(\${val}% - 8px)\` }} />\n</div>`} />
                            </section></LazySection>

                            {/* 21 · Color Tokens Grid */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faPalette} number="21" title="Color Tokens Grid" />
                                <UIBlock fullWidth title="Full Token Reference"
                                    children={
                                        <div className="space-y-6">
                                            {[
                                                {
                                                    group: 'Brand', tokens: [
                                                        { name: 'primary', var: '--color-primary', desc: 'Main CTA, active states' },
                                                        { name: 'secondary', var: '--color-secondary', desc: 'Supporting accent' },
                                                        { name: 'accent', var: '--color-accent', desc: 'Highlight, gradient pair' },
                                                    ]
                                                },
                                                {
                                                    group: 'Semantic', tokens: [
                                                        { name: 'success', var: '--color-success', desc: 'Positive, saved, online' },
                                                        { name: 'warning', var: '--color-warning', desc: 'Caution, pending' },
                                                        { name: 'danger', var: '--color-danger', desc: 'Error, destructive' },
                                                    ]
                                                },
                                                {
                                                    group: 'Surface', tokens: [
                                                        { name: 'app-bg', var: '--color-app-bg', desc: 'Page background' },
                                                        { name: 'surface', var: '--color-surface', desc: 'Card, panel background' },
                                                        { name: 'surface-alt', var: '--color-surface-alt', desc: 'Subtle bg, hover state' },
                                                        { name: 'border', var: '--color-border', desc: 'Dividers, outlines' },
                                                    ]
                                                },
                                                {
                                                    group: 'Text', tokens: [
                                                        { name: 'text', var: '--color-text', desc: 'Primary body text' },
                                                        { name: 'text-muted', var: '--color-text-muted', desc: 'Secondary, labels, hints' },
                                                    ]
                                                },
                                            ].map(({ group, tokens }) => (
                                                <div key={group}>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-3">{group}</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        {tokens.map(({ name, var: v, desc }) => (
                                                            <div key={name} onClick={() => { navigator.clipboard.writeText(`var(${v})`); addToast(`Copied var(${v})`, 'success') }}
                                                                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] transition-all group">
                                                                <div className="w-10 h-10 rounded-xl border border-[var(--color-border)] shrink-0 shadow-sm" style={{ background: `var(${v})` }} />
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] font-black text-[var(--color-text)] truncate">{name}</p>
                                                                    <p className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50 truncate">{v}</p>
                                                                    <p className="text-[8px] text-[var(--color-text-muted)] opacity-40 truncate">{desc}</p>
                                                                </div>
                                                                <FontAwesomeIcon icon={faCopy} className="text-[8px] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-60 ml-auto shrink-0" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    }
                                    code={`{/* Semua warna pakai CSS variable — auto support dark mode */}\n\n// Penggunaan di Tailwind:\n<div className="bg-[var(--color-surface)] text-[var(--color-text)]">\n  <span className="text-[var(--color-primary)]">Primary</span>\n  <span className="text-[var(--color-text-muted)]">Muted</span>\n</div>\n\n// Di inline style:\n<div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }} />\n\n// Jangan hardcode hex — pakai token:\n// ❌ className="bg-indigo-600"\n// ✅ className="bg-[var(--color-primary)]"`}
                                />
                            </section></LazySection>

                            {/* 22 · Breadcrumb Variants */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faChevronRight} number="22" title="Breadcrumb Variants" />
                                <UIBlock fullWidth title="Breadcrumb Patterns"
                                    children={
                                        <div className="space-y-6">
                                            {/* Default */}
                                            <div className="space-y-1.5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Default</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {['Dashboard', 'Master Data', 'Data Siswa'].map((item, i, arr) => (
                                                        <span key={item} className="flex items-center gap-1.5">
                                                            <span className={`text-[10px] font-black ${i === arr.length - 1 ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50 hover:opacity-100 cursor-pointer hover:text-[var(--color-primary)] transition-colors'}`}>{item}</span>
                                                            {i < arr.length - 1 && <FontAwesomeIcon icon={faChevronRight} className="text-[7px] text-[var(--color-text-muted)] opacity-30" />}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* With badge */}
                                            <div className="space-y-1.5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">With Role Badge</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-[8px] font-black uppercase tracking-widest">Admin</span>
                                                    {['Laporan', 'Raport Bulanan'].map((item, i, arr) => (
                                                        <span key={item} className="flex items-center gap-2">
                                                            <FontAwesomeIcon icon={faChevronRight} className="text-[7px] text-[var(--color-text-muted)] opacity-30" />
                                                            <span className={`text-[10px] font-black ${i === arr.length - 1 ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{item}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Collapsed */}
                                            <div className="space-y-1.5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Collapsed (long path)</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)] opacity-50 hover:opacity-100 cursor-pointer hover:text-[var(--color-primary)] transition-colors">Dashboard</span>
                                                    <FontAwesomeIcon icon={faChevronRight} className="text-[7px] text-[var(--color-text-muted)] opacity-30" />
                                                    <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black cursor-pointer hover:border-[var(--color-primary)] transition-all">···</span>
                                                    <FontAwesomeIcon icon={faChevronRight} className="text-[7px] text-[var(--color-text-muted)] opacity-30" />
                                                    <span className="text-[10px] font-black text-[var(--color-text)]">Detail Siswa</span>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                    code={`// Breadcrumb component\n<Breadcrumb badge="Admin" items={['Master Data', 'Data Siswa']} />\n\n// Manual:\n<div className="flex items-center gap-1.5">\n  {items.map((item, i) => (\n    <span key={item} className="flex items-center gap-1.5">\n      <span className={\`text-[10px] font-black\n        \${i === items.length - 1\n          ? 'text-[var(--color-text)]'\n          : 'text-[var(--color-text-muted)] opacity-50 cursor-pointer hover:text-[var(--color-primary)]'\n        }\`}>\n        {item}\n      </span>\n      {i < items.length - 1 &&\n        <FontAwesomeIcon icon={faChevronRight} className="text-[7px] opacity-30" />}\n    </span>\n  ))}\n</div>`}
                                    dos={['Tampilkan max 4 level — collapse tengah kalau lebih dari itu', 'Buat semua item kecuali terakhir bisa diklik', 'Gunakan role badge di kiri untuk konteks halaman']}
                                    donts={['Jangan ulangi halaman aktif di breadcrumb dan page title', 'Hindari breadcrumb di halaman top-level (Dashboard, Home)', 'Jangan gunakan slash (/) sebagai separator — pakai chevron >']}
                                />
                            </section></LazySection>

                            {/* 23 · Micro-interactions */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faSpinner} number="23" title="Micro-interactions" />
                                <UIBlock fullWidth title="Interaction Patterns"
                                    children={
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {/* Hover lift */}
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Hover Lift</p>
                                                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 hover:border-[var(--color-primary)]/30 transition-all duration-200 cursor-pointer">
                                                    <p className="text-[10px] font-black text-[var(--color-text)]">Hover kartu ini</p>
                                                    <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">Naik + shadow</p>
                                                </div>
                                            </div>
                                            {/* Press scale */}
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Press Scale</p>
                                                <button className="w-full p-4 rounded-2xl bg-[var(--color-primary)] text-white active:scale-95 hover:opacity-90 transition-all duration-150 cursor-pointer">
                                                    <p className="text-[10px] font-black">Klik / Tap</p>
                                                    <p className="text-[9px] opacity-70">Scale down saat ditekan</p>
                                                </button>
                                            </div>
                                            {/* Skeleton pulse */}
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Skeleton Pulse</p>
                                                <div className="space-y-2 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                                    <div className="h-3 rounded-full bg-[var(--color-surface-alt)] animate-pulse w-3/4" />
                                                    <div className="h-3 rounded-full bg-[var(--color-surface-alt)] animate-pulse w-full" />
                                                    <div className="h-3 rounded-full bg-[var(--color-surface-alt)] animate-pulse w-1/2" />
                                                </div>
                                            </div>
                                            {/* Spin loader */}
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Spin Loader</p>
                                                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3">
                                                    <FontAwesomeIcon icon={faSpinner} className="text-[var(--color-primary)] animate-spin text-lg" />
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)]">Memuat data…</span>
                                                </div>
                                            </div>
                                            {/* Fade in */}
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Animate In</p>
                                                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <p className="text-[10px] font-black text-[var(--color-text)]">Slide + Fade</p>
                                                    <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">animate-in dari bawah</p>
                                                </div>
                                            </div>
                                            {/* Bounce dot */}
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Bounce Dots</p>
                                                <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-1.5">
                                                    {[0, 150, 300].map(delay => (
                                                        <div key={delay} className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                                                    ))}
                                                    <span className="text-[9px] text-[var(--color-text-muted)] ml-2">Typing…</span>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                    code={`// Hover lift card\n<div className="hover:-translate-y-1 hover:shadow-lg hover:border-[var(--color-primary)]/30 transition-all duration-200">\n\n// Press scale button\n<button className="active:scale-95 hover:opacity-90 transition-all duration-150">\n\n// Skeleton pulse\n<div className="h-4 rounded-full bg-[var(--color-surface-alt)] animate-pulse" />\n\n// Spin loader\n<FontAwesomeIcon icon={faSpinner} className="animate-spin" />\n\n// Animate in (tailwindcss-animate)\n<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">\n\n// Bounce dots (typing indicator)\n{[0,150,300].map(d => (\n  <div key={d} className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"\n    style={{ animationDelay: \`\${d}ms\` }} />\n))}`}
                                />
                            </section></LazySection>

                            {/* 24 · Scrollbar Styling */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faExpand} number="24" title="Scrollbar Styling" />
                                <UIBlock fullWidth title="Custom Scrollbar Variants"
                                    children={
                                        <div className="grid md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Default (hidden)</p>
                                                <div className="h-32 overflow-y-auto rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-3 space-y-2" style={{ scrollbarWidth: 'none' }}>
                                                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-6 rounded bg-[var(--color-surface)] border border-[var(--color-border)]" />)}
                                                </div>
                                                <p className="text-[8px] text-[var(--color-text-muted)] opacity-50">scrollbar-hide · overflow-y-auto</p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Thin custom</p>
                                                <div className="h-32 overflow-y-auto rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-primary) transparent' }}>
                                                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-6 rounded bg-[var(--color-surface)] border border-[var(--color-border)]" />)}
                                                </div>
                                                <p className="text-[8px] text-[var(--color-text-muted)] opacity-50">scrollbar-width: thin + primary color</p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Auto (OS default)</p>
                                                <div className="h-32 overflow-y-auto rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-3 space-y-2">
                                                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-6 rounded bg-[var(--color-surface)] border border-[var(--color-border)]" />)}
                                                </div>
                                                <p className="text-[8px] text-[var(--color-text-muted)] opacity-50">Default browser scrollbar</p>
                                            </div>
                                        </div>
                                    }
                                    code={`/* CSS Global — index.css */\n\n/* Hide scrollbar tapi tetap scrollable */\n.scrollbar-hide {\n  scrollbar-width: none;\n  -ms-overflow-style: none;\n}\n.scrollbar-hide::-webkit-scrollbar { display: none; }\n\n/* Thin scrollbar dengan warna primary */\n.scrollbar-thin {\n  scrollbar-width: thin;\n  scrollbar-color: var(--color-primary) transparent;\n}\n.scrollbar-thin::-webkit-scrollbar { width: 4px; }\n.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }\n.scrollbar-thin::-webkit-scrollbar-thumb {\n  background: var(--color-primary);\n  border-radius: 999px;\n}\n\n// JSX:\n<div className="overflow-y-auto scrollbar-hide">  {/* tak terlihat */}\n<div className="overflow-y-auto scrollbar-thin">   {/* halus */}`}
                                />
                            </section></LazySection>

                            {/* 25 · Focus Ring / A11Y */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faEye} number="25" title="Focus Ring & A11Y" />
                                <UIBlock fullWidth title="Accessibility Patterns"
                                    children={
                                        <div className="space-y-8">
                                            {/* Focus rings */}
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-4">Focus Ring Variants (Tab untuk lihat)</p>
                                                <div className="flex flex-wrap gap-4">
                                                    <button className="px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface-alt)] transition-all">
                                                        Primary Ring
                                                    </button>
                                                    <button className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface-alt)] transition-all">
                                                        Primary Button
                                                    </button>
                                                    <button className="px-4 py-2 rounded-xl bg-rose-500 text-white text-[10px] font-black focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-[var(--color-surface-alt)] transition-all">
                                                        Danger Button
                                                    </button>
                                                    <input className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all" placeholder="Input focus ring" />
                                                </div>
                                            </div>
                                            {/* ARIA patterns */}
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-4">ARIA & Semantic Patterns</p>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {[
                                                        { label: 'aria-label', example: '<button aria-label="Tutup dialog"><FontAwesomeIcon icon={faXmark} /></button>', desc: 'Wajib untuk tombol icon-only tanpa teks' },
                                                        { label: 'aria-live', example: '<div aria-live="polite">{statusMessage}</div>', desc: 'Announce perubahan dinamis ke screen reader' },
                                                        { label: 'aria-disabled', example: '<button aria-disabled={!valid} onClick={...}>', desc: 'Tetap focusable tapi announce sebagai disabled' },
                                                        { label: 'role="alert"', example: '<div role="alert" className="...">{errorMsg}</div>', desc: 'Error message langsung dibaca screen reader' },
                                                    ].map(({ label, example, desc }) => (
                                                        <div key={label} className="p-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-2">
                                                            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[8px] font-black font-mono">{label}</span>
                                                            <p className="text-[9px] font-mono text-[var(--color-text-muted)] opacity-70 bg-[var(--color-surface)] rounded-lg px-2 py-1.5 leading-relaxed">{example}</p>
                                                            <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">{desc}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Color contrast */}
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-4">Color Contrast (WCAG AA)</p>
                                                <div className="flex flex-wrap gap-3">
                                                    {[
                                                        { bg: 'bg-[var(--color-primary)]', text: 'text-white', label: 'Primary on White', pass: true },
                                                        { bg: 'bg-[var(--color-surface)]', text: 'text-[var(--color-text)]', label: 'Text on Surface', pass: true },
                                                        { bg: 'bg-amber-400', text: 'text-white', label: 'White on Yellow', pass: false },
                                                        { bg: 'bg-[var(--color-surface-alt)]', text: 'text-[var(--color-text-muted)]', label: 'Muted on Alt', pass: true },
                                                    ].map(({ bg, text, label, pass }) => (
                                                        <div key={label} className={`px-4 py-3 rounded-xl ${bg} flex items-center gap-2`}>
                                                            <span className={`text-[9px] font-black ${text}`}>{label}</span>
                                                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md ${pass ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{pass ? 'AA ✓' : 'FAIL ✗'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    }
                                    code={`// Focus ring — selalu gunakan focus-visible, bukan focus\n// focus-visible hanya aktif saat keyboard navigation\n<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2">\n\n// Skip navigation link (untuk keyboard users)\n<a href="#main-content"\n  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-xl">\n  Langsung ke konten\n</a>\n\n// Accessible icon button\n<button aria-label="Hapus item" className="...">\n  <FontAwesomeIcon icon={faTrash} />\n</button>\n\n// Live region untuk dynamic content\n<div aria-live="polite" aria-atomic="true" className="sr-only">\n  {announcement}\n</div>`}
                                    dos={['Selalu test navigasi keyboard — Tab, Enter, Escape, Arrow keys', 'Gunakan focus-visible bukan focus untuk ring — hanya muncul saat keyboard', 'Pastikan semua icon-only button punya aria-label']}
                                    donts={['Jangan hilangkan focus outline dengan outline-none tanpa gantinya', 'Hindari warna teks yang kontrasnya di bawah 4.5:1 (WCAG AA)', 'Jangan andalkan warna saja untuk menyampaikan informasi']}
                                />
                            </section></LazySection>

                        </div>
                    )}
                    {activeTab === 'library' && (
                        <div className="space-y-10">

                            {/* A · Data & Tables */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faFileLines} number="A" title="Data & Tables" />
                                <div className="space-y-8">
                                    <UIBlock fullWidth title="01 · Data Table" children={<DataTablePreview />} code={`const [selected, setSelected] = useState(new Set())\nconst [sortField, setSortField] = useState('name')\nconst [sortDir, setSortDir] = useState('asc')\n\nconst toggleRow = id => {\n  const s = new Set(selected)\n  s.has(id) ? s.delete(id) : s.add(id)\n  setSelected(s)\n}\n\n// Sort logic\nconst sorted = [...data].sort((a, b) => {\n  const v = sortDir === 'asc' ? 1 : -1\n  return a[sortField] > b[sortField] ? v : -v\n})`}
                                        dos={['Tampilkan kolom yang relevan saja, jangan overload tabel', 'Berikan visual feedback yang jelas saat row diselect', 'Sertakan empty state yang informatif saat data kosong', 'Tambahkan sort indicator (arrow) di header kolom']}
                                        donts={['Jangan tampilkan lebih dari 7–8 kolom sekaligus tanpa horizontal scroll', 'Hindari checkbox tanpa aksi bulk yang tersedia', 'Jangan hilangkan pagination pada data lebih dari 20 row', 'Hindari font di bawah 10px yang susah dibaca']}
                                        apiProps={[
                                            { prop: 'data', type: 'array', defaultVal: '[]', desc: 'Array of objects yang akan dirender sebagai baris tabel' },
                                            { prop: 'columns', type: 'array', defaultVal: 'required', desc: 'Definisi kolom: { key, label, sortable, render }' },
                                            { prop: 'onSort', type: 'function', defaultVal: 'undefined', desc: 'Callback (field, dir) dipanggil saat header kolom diklik' },
                                            { prop: 'selectable', type: 'boolean', defaultVal: 'false', desc: 'Tampilkan checkbox untuk seleksi baris' },
                                            { prop: 'onSelect', type: 'function', defaultVal: 'undefined', desc: 'Callback (Set<id>) dipanggil saat seleksi berubah' },
                                            { prop: 'loading', type: 'boolean', defaultVal: 'false', desc: 'Tampilkan skeleton rows saat data sedang dimuat' },
                                        ]}
                                    />
                                    <UIBlock fullWidth title="02 · Filter Bar" children={<FilterBarPreview />} code={`const [filters, setFilters] = useState([\n  { id: 'kelas', label: 'Kelas', value: '6A' },\n  { id: 'status', label: 'Status', value: 'Aktif' },\n])\n\nconst removeFilter = id =>\n  setFilters(prev => prev.filter(f => f.id !== id))\n\n<div className="flex flex-wrap items-center gap-2">\n  {filters.map(f => (\n    <div key={f.id} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[10px] font-black bg-sky-500/10 border-sky-500/20 text-sky-700">\n      {f.label}: {f.value}\n      <button onClick={() => removeFilter(f.id)}>\n        <FontAwesomeIcon icon={faXmark} className="text-[8px]" />\n      </button>\n    </div>\n  ))}\n</div>`} />
                                    <div className="grid lg:grid-cols-2 gap-8">
                                        <UIBlock title="03 · Export Panel" children={
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-[var(--color-text)]">Export Data Siswa</p>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-2">Format</p>
                                                    <div className="flex gap-2">
                                                        {[{ f: 'PDF', icon: faFilePdf, active: true }, { f: 'Excel', icon: faTable, active: false }, { f: 'CSV', icon: faFileLines, active: false }].map(({ f, icon, active }) => (
                                                            <div key={f} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-[10px] font-black transition-colors ${active ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}><FontAwesomeIcon icon={icon} className="text-[9px]" />{f}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-2">Kolom</p>
                                                    <div className="flex flex-wrap gap-2">{['Nama', 'NIS', 'Kelas', 'Nilai'].map((c, i) => <span key={c} className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${i < 3 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>{c}{i < 3 ? ' ✓' : ''}</span>)}</div>
                                                </div>
                                                <button className="w-full h-9 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                                    <FontAwesomeIcon icon={faDownload} className="text-[9px]" /> Download PDF
                                                </button>
                                            </div>
                                        } code={`const [format, setFormat] = useState('PDF')\nconst [cols, setCols] = useState(['Nama','NIS','Kelas'])\n\n<button onClick={handleExport}\n  className="w-full h-9 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black flex items-center justify-center gap-2">\n  <FontAwesomeIcon icon={faDownload} className="text-[9px]" />\n  Download {format}\n</button>`} />
                                        <UIBlock title="04 · Pagination" children={
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] transition-all">‹</button>
                                                    {[1, 2, 3, '…', 12].map((p, i) => <button key={i} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-colors ${p === 2 ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}>{p}</button>)}
                                                    <button className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] transition-all">›</button>
                                                </div>
                                                <button className="w-full py-2 rounded-xl border border-dashed border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">Muat lebih banyak (248 item)</button>
                                            </div>
                                        } code={`// Numbered pagination\n<div className="flex items-center gap-1">\n  <button className="w-8 h-8 rounded-lg border border-[var(--color-border)]">‹</button>\n  {pages.map(p => (\n    <button key={p} onClick={() => setPage(p)}\n      className={\`w-8 h-8 rounded-lg font-black \${currentPage===p ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)]'}\`}>\n      {p}\n    </button>\n  ))}\n  <button className="w-8 h-8 rounded-lg border border-[var(--color-border)]">›</button>\n</div>`} />
                                    </div>
                                </div>
                            </section></LazySection>

                            {/* B · Navigation & Discovery */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faSearch} number="B" title="Navigation & Discovery" />
                                <div className="space-y-8">
                                    <UIBlock fullWidth title="05 · Command Palette" children={<CommandPalettePreview />} code={`const [q, setQ] = useState('')\nconst [open, setOpen] = useState(false)\n\n// Open with ⌘K\nuseEffect(() => {\n  const handler = e => {\n    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {\n      e.preventDefault()\n      setOpen(p => !p)\n    }\n  }\n  window.addEventListener('keydown', handler)\n  return () => window.removeEventListener('keydown', handler)\n}, [])`} />
                                    <div className="grid lg:grid-cols-2 gap-8">
                                        <UIBlock title="06 · Tabs & Segmented" children={<TabsPreview />} code={`const [active, setActive] = useState('semua')\n\n<div className="flex border-b border-[var(--color-border)] gap-1">\n  {tabs.map(({ k, label, count }) => (\n    <button key={k} onClick={() => setActive(k)}\n      className={\`px-3 py-2 text-[10px] font-black border-b-2 -mb-px\n        \${active===k ? 'border-[var(--color-primary)] text-[var(--color-primary)]'\n          : 'border-transparent text-[var(--color-text-muted)]'}\`}>\n      {label}\n      <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[8px] bg-[var(--color-surface-alt)]">{count}</span>\n    </button>\n  ))}\n</div>`}
                                            dos={['Gunakan tab untuk konten yang setara dan sejajar levelnya', 'Tandai tab aktif dengan warna primary dan underline yang jelas', 'Sertakan badge count jika tab berisi daftar item']}
                                            donts={['Jangan nest tab di dalam tab — gunakan accordion sebagai gantinya', 'Hindari lebih dari 6 tab horizontal, gunakan dropdown jika lebih', 'Jangan ubah urutan tab saat tab aktif berubah']}
                                            apiProps={[
                                                { prop: 'tabs', type: 'array', defaultVal: 'required', desc: 'Array of { k, label, count? } untuk setiap tab' },
                                                { prop: 'active', type: 'string', defaultVal: 'required', desc: 'Key tab yang sedang aktif' },
                                                { prop: 'onChange', type: 'function', defaultVal: 'required', desc: 'Callback (key) dipanggil saat tab diklik' },
                                                { prop: 'variant', type: "'underline'|'pill'|'segment'", defaultVal: "'underline'", desc: 'Gaya visual tab' },
                                            ]}
                                        />
                                        <UIBlock title="07 · Dropdown Menu" children={<DropdownPreview />} code={`const [open, setOpen] = useState(false)\n\n<div className="relative">\n  <button onClick={() => setOpen(p => !p)}\n    className="flex items-center gap-2 px-4 h-9 rounded-xl border">\n    Aksi <FontAwesomeIcon icon={faChevronDown}\n      className={\`text-[8px] transition-transform \${open ? 'rotate-180' : ''}\`} />\n  </button>\n  {open && (\n    <div className="absolute top-full mt-1.5 w-44 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl">\n      {/* menu items */}\n    </div>\n  )}\n</div>`}
                                            dos={['Tutup dropdown saat klik di luar area (overlay transparent)', 'Berikan visual hover yang jelas pada setiap item', 'Gunakan divider untuk memisahkan grup aksi yang berbeda', 'Tandai destructive action (hapus) dengan warna merah']}
                                            donts={['Jangan lupa handle keyboard Esc untuk menutup dropdown', 'Hindari lebih dari 10 item tanpa grouping atau search', 'Jangan posisikan dropdown hingga keluar viewport']}
                                            apiProps={[
                                                { prop: 'trigger', type: 'ReactNode', defaultVal: 'required', desc: 'Elemen yang diklik untuk memunculkan dropdown' },
                                                { prop: 'items', type: 'array', defaultVal: '[]', desc: 'Array of { label, icon?, onClick, danger?, divider? }' },
                                                { prop: 'align', type: "'left'|'right'", defaultVal: "'left'", desc: 'Posisi dropdown relatif terhadap trigger' },
                                                { prop: 'onClose', type: 'function', defaultVal: 'undefined', desc: 'Callback dipanggil saat dropdown ditutup' },
                                            ]}
                                        />
                                    </div>
                                </div>
                            </section></LazySection>

                            {/* C · Cards & Profiles */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faUser} number="C" title="Cards & Profiles" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="08 · Stat Cards" children={
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { label: 'Total Siswa', value: '2,840', trend: '+12.5%', up: true, icon: faUser, color: 'indigo' },
                                                { label: 'Kehadiran', value: '94.2%', trend: '-2.1%', up: false, icon: faCheckCircle, color: 'emerald' },
                                                { label: 'Laporan Baru', value: '18', trend: '+5', up: true, icon: faFileLines, color: 'amber' },
                                                { label: 'Skor Sistem', value: '98.2%', trend: 'Stabil', up: true, icon: faShieldHalved, color: 'sky' },
                                            ].map(({ label, value, trend, up, icon, color }) => (
                                                <div key={label} className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-lg transition-all cursor-pointer group">
                                                    <div className={`w-8 h-8 rounded-xl bg-${color}-500/10 text-${color}-600 flex items-center justify-center mb-2`}><FontAwesomeIcon icon={icon} className="text-xs" /></div>
                                                    <div className="text-xl font-black font-heading tracking-tight text-[var(--color-text)]">{value}</div>
                                                    <div className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">{label}</div>
                                                    <div className={`text-[9px] font-black mt-1 ${up ? 'text-emerald-500' : 'text-rose-500'}`}>{up ? '↑' : '↓'} {trend}</div>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`<div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-lg transition-all">\n  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2">\n    <FontAwesomeIcon icon={faUser} className="text-xs" />\n  </div>\n  <div className="text-xl font-black font-heading tracking-tight text-[var(--color-text)]">2,840</div>\n  <div className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">Total Siswa</div>\n  <div className="text-[9px] font-black text-emerald-500 mt-1">↑ +12.5%</div>\n</div>`}
                                        dos={['Tampilkan perubahan % dengan warna hijau (naik) dan merah (turun)', 'Gunakan angka besar + label kecil untuk hierarki visual', 'Sertakan ikon kecil sebagai visual anchor per metric']}
                                        donts={['Jangan tampilkan lebih dari 4 stat card dalam satu baris', 'Hindari angka tanpa satuan atau konteks waktu', 'Jangan gunakan warna yang sama untuk semua card']}
                                        apiProps={[
                                            { prop: 'label', type: 'string', defaultVal: 'required', desc: 'Nama metric yang ditampilkan' },
                                            { prop: 'value', type: 'string|number', defaultVal: 'required', desc: 'Nilai utama, gunakan format yang sudah diformat (misal "2,840")' },
                                            { prop: 'trend', type: 'string', defaultVal: 'undefined', desc: 'Teks perubahan misal "+12.5%" atau "Stabil"' },
                                            { prop: 'up', type: 'boolean', defaultVal: 'true', desc: 'Arah tren untuk menentukan warna emerald/rose' },
                                            { prop: 'icon', type: 'IconDefinition', defaultVal: 'undefined', desc: 'FontAwesome icon untuk visual anchor' },
                                        ]}
                                    />
                                    <UIBlock title="09 · User Profile Card" children={
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 text-sm font-black flex items-center justify-center shrink-0">BU</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-black text-[var(--color-text)]">Budi Utama, S.Pd</p>
                                                    <p className="text-[9px] text-[var(--color-text-muted)]">Guru Matematika · Kelas 5 & 6</p>
                                                    <div className="flex gap-1.5 mt-1.5">
                                                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 text-[8px] font-black">Wali Kelas 6A</span>
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[8px] font-black">Aktif</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <button className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all"><FontAwesomeIcon icon={faEnvelope} className="text-xs" /></button>
                                                    <button className="w-8 h-8 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center justify-center hover:text-[var(--color-primary)] transition-all"><FontAwesomeIcon icon={faEllipsisVertical} className="text-xs" /></button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[{ label: 'Total Siswa', v: '42' }, { label: 'Rata Nilai', v: '87.4' }, { label: 'Kehadiran', v: '98%' }].map(({ label, v }) => (
                                                    <div key={label} className="text-center p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                        <div className="text-[14px] font-black text-[var(--color-text)]">{v}</div>
                                                        <div className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wide opacity-60">{label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    } code={`<div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-4">\n  <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 text-sm font-black flex items-center justify-center shrink-0">BU</div>\n  <div className="flex-1 min-w-0">\n    <p className="text-[12px] font-black text-[var(--color-text)]">Budi Utama, S.Pd</p>\n    <p className="text-[9px] text-[var(--color-text-muted)]">Guru Matematika</p>\n    <div className="flex gap-1.5 mt-1.5">\n      <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 text-[8px] font-black">Wali Kelas 6A</span>\n    </div>\n  </div>\n</div>`} />
                                    <UIBlock title="10 · Onboarding Checklist" children={<OnboardingPreview />} code={`const [steps, setSteps] = useState([\n  { id: 0, label: 'Buat akun admin',   done: true  },\n  { id: 1, label: 'Upload logo',       done: true  },\n  { id: 2, label: 'Atur tahun ajaran', done: false },\n  { id: 3, label: 'Import siswa',      done: false },\n])\n\nconst complete = id =>\n  setSteps(prev => prev.map(s => s.id===id ? {...s, done:true} : s))\n\nconst pct = Math.round((steps.filter(s=>s.done).length / steps.length) * 100)`} />
                                    <UIBlock title="11 · Multi-step Wizard" children={<WizardPreview />} code={`const [step, setStep] = useState(0)\nconst steps = ['Profil', 'Sekolah', 'Akademik', 'Review']\n\n<div className="flex justify-between">\n  <button onClick={() => setStep(p => Math.max(0, p-1))}\n    disabled={step === 0}\n    className="px-4 h-9 rounded-xl border border-[var(--color-border)] text-[10px] font-black disabled:opacity-30">\n    ← Kembali\n  </button>\n  <button onClick={() => setStep(p => Math.min(steps.length-1, p+1))}\n    disabled={step === steps.length - 1}\n    className="px-4 h-9 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black disabled:opacity-40">\n    Lanjut →\n  </button>\n</div>`} />
                                </div>
                            </section></LazySection>

                            {/* D · Overlays & Feedback */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faBell} number="D" title="Overlays & Feedback" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="12 · Toast & Snackbar" children={
                                        <div className="space-y-3">
                                            {[
                                                { type: 'success', icon: faCheckCircle, bg: 'bg-emerald-500/5 border-emerald-500/20 border-l-4 border-l-emerald-500', title: 'Berhasil disimpan!', desc: 'Data siswa berhasil diperbarui', titleColor: 'text-emerald-700', descColor: 'text-emerald-600/70' },
                                                { type: 'error', icon: faXmarkCircle, bg: 'bg-rose-500/5 border-rose-500/20 border-l-4 border-l-rose-500', title: 'Gagal mengunggah', desc: 'Ukuran file melebihi 10MB', titleColor: 'text-rose-700', descColor: 'text-rose-600/70' },
                                                { type: 'warning', icon: faTriangleExclamation, bg: 'bg-amber-500/5 border-amber-500/20 border-l-4 border-l-amber-500', title: 'Sesi akan habis', desc: 'Auto logout dalam 5 menit', titleColor: 'text-amber-700', descColor: 'text-amber-600/70' },
                                            ].map(({ type, icon, bg, title, desc, titleColor, descColor }) => (
                                                <div key={type} className={`flex items-center gap-3 p-3 rounded-xl border ${bg}`}>
                                                    <FontAwesomeIcon icon={icon} className={`${titleColor} text-sm shrink-0`} />
                                                    <div className="flex-1">
                                                        <p className={`text-[10px] font-black ${titleColor}`}>{title}</p>
                                                        <p className={`text-[9px] ${descColor}`}>{desc}</p>
                                                    </div>
                                                    <FontAwesomeIcon icon={faXmark} className="text-[var(--color-text-muted)] text-[9px] opacity-50 cursor-pointer hover:opacity-100 shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    } code={`// Gunakan useToast() dari context\nconst { addToast } = useToast()\n\n// Trigger:\naddToast('Data berhasil disimpan!', 'success')\naddToast('Gagal memuat data', 'error')\naddToast('Sesi akan berakhir', 'warning')`}
                                        dos={['Gunakan warna semantik: hijau=success, merah=error, kuning=warning', 'Tampilkan toast 3–4 detik untuk info, lebih lama untuk error', 'Selalu sediakan tombol dismiss (×) agar user bisa menutup manual']}
                                        donts={['Jangan stack lebih dari 3 toast sekaligus di layar', 'Hindari teks toast yang terlalu panjang — maks 1–2 baris', 'Jangan gunakan toast untuk aksi yang butuh keputusan pengguna']}
                                        apiProps={[
                                            { prop: 'message', type: 'string', defaultVal: 'required', desc: 'Teks utama yang ditampilkan dalam toast' },
                                            { prop: 'type', type: "'success'|'error'|'warning'|'info'", defaultVal: "'info'", desc: 'Variant yang menentukan warna dan ikon' },
                                            { prop: 'duration', type: 'number', defaultVal: '3000', desc: 'Durasi tampil dalam ms, set 0 untuk tidak auto-dismiss' },
                                            { prop: 'onDismiss', type: 'function', defaultVal: 'undefined', desc: 'Callback saat toast ditutup (auto maupun manual)' },
                                        ]}
                                    />
                                    <UIBlock title="13 · Confirm Dialog" children={<ConfirmDialogPreview />} code={`const [input, setInput] = useState('')\nconst confirmed = input === 'HAPUS'\n\n<input\n  value={input}\n  onChange={e => setInput(e.target.value)}\n  placeholder="HAPUS"\n  className={\`w-full h-8 px-3 rounded-lg border text-[11px] font-black outline-none\n    \${confirmed ? 'border-rose-400 ring-2 ring-rose-400/20 text-rose-600'\n      : 'border-[var(--color-border)]'}\`}\n/>\n<button\n  disabled={!confirmed}\n  onClick={handleDelete}\n  className={\`flex-1 h-9 rounded-xl text-[10px] font-black\n    \${confirmed ? 'bg-rose-500 text-white' : 'bg-rose-500/20 text-rose-300 cursor-not-allowed'}\`}>\n  Hapus Permanen\n</button>`} />
                                    <UIBlock title="14 · Notification Feed" children={
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[11px] font-black text-[var(--color-text)]">Notifikasi</span>
                                                <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[8px] font-black">3 baru</span>
                                            </div>
                                            {[
                                                { dot: 'bg-sky-500', title: 'Laporan baru diterima', desc: 'Andi mengirim laporan kelas 6A', time: '2m', unread: true },
                                                { dot: 'bg-emerald-500', title: 'Data siswa disetujui', desc: 'Import 42 siswa berhasil', time: '1h', unread: true },
                                                { dot: 'bg-amber-500', title: 'Jadwal diperbarui', desc: 'Semester 2 jadwal baru', time: '3h', unread: true },
                                                { dot: 'bg-[var(--color-border)]', title: 'Komentar baru', desc: 'Di laporan Q3', time: '1d', unread: false },
                                            ].map((n, i) => (
                                                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${n.unread ? 'bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/8' : 'hover:bg-[var(--color-surface-alt)]'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${n.dot} mt-1.5 shrink-0`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[10px] font-black ${n.unread ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>{n.title}</p>
                                                        <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">{n.desc}</p>
                                                    </div>
                                                    <span className="text-[8px] text-[var(--color-text-muted)] opacity-50 shrink-0">{n.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`{notifications.map(n => (\n  <div key={n.id} className={\`flex items-start gap-3 p-3 rounded-xl cursor-pointer\n    \${n.unread ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]'}\`}>\n    <div className={\`w-2 h-2 rounded-full mt-1.5 shrink-0 \${n.unread ? 'bg-sky-500' : 'bg-[var(--color-border)]'}\`} />\n    <div className="flex-1 min-w-0">\n      <p className="text-[10px] font-black text-[var(--color-text)]">{n.title}</p>\n      <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">{n.desc}</p>\n    </div>\n  </div>\n))}`} />
                                    <UIBlock title="15 · Drawer / Side Panel" children={
                                        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] h-48 flex">
                                            <div className="flex-1 bg-[var(--color-surface-alt)] flex items-center justify-center">
                                                <div className="text-center space-y-1 opacity-40">
                                                    <div className="text-[10px] font-black text-[var(--color-text-muted)]">Main content</div>
                                                    <div className="text-[9px] text-[var(--color-text-muted)]">dimmed overlay</div>
                                                </div>
                                            </div>
                                            <div className="w-48 bg-[var(--color-surface)] border-l border-[var(--color-border)] p-4 shadow-2xl">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[10px] font-black text-[var(--color-text)]">Detail Siswa</span>
                                                    <FontAwesomeIcon icon={faXmark} className="text-[var(--color-text-muted)] text-xs cursor-pointer" />
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 text-sm font-black flex items-center justify-center mb-2">AS</div>
                                                <p className="text-[11px] font-black text-[var(--color-text)]">Andi Setiawan</p>
                                                <p className="text-[9px] text-[var(--color-text-muted)]">Kelas 6A · NIS 2401</p>
                                                <div className="mt-2 space-y-1">
                                                    {[{ l: 'Nilai', v: '92.4' }, { l: 'Hadir', v: '98%' }, { l: 'Tugas', v: '45/48' }].map(({ l, v }) => (
                                                        <div key={l} className="flex justify-between text-[9px]"><span className="text-[var(--color-text-muted)]">{l}</span><span className="font-black text-[var(--color-text)]">{v}</span></div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    } code={`const [isOpen, setIsOpen] = useState(false)\n\n{isOpen && (\n  <>\n    <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsOpen(false)} />\n    <div className="fixed right-0 top-0 h-full w-80 z-50 bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl overflow-y-auto animate-in slide-in-from-right">\n      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">\n        <h3 className="text-[12px] font-black text-[var(--color-text)]">Detail Siswa</h3>\n        <button onClick={() => setIsOpen(false)}>\n          <FontAwesomeIcon icon={faXmark} />\n        </button>\n      </div>\n      {/* content */}\n    </div>\n  </>\n)}`} />
                                </div>
                            </section></LazySection>

                            {/* E · Content Components */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faLayerGroup} number="E" title="Content Components" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="16 · Accordion" children={<AccordionPreview />} code={`const [open, setOpen] = useState(0)\n\n{items.map((item, i) => (\n  <div key={i} className={\`rounded-xl border overflow-hidden transition-all\n    \${open===i ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'}\`}>\n    <button onClick={() => setOpen(open===i ? -1 : i)}\n      className="w-full flex items-center justify-between px-4 py-3">\n      <span className={\`text-[11px] font-black \${open===i ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}\`}>\n        {item.q}\n      </span>\n      <FontAwesomeIcon icon={faChevronDown}\n        className={\`text-[9px] transition-transform \${open===i ? 'rotate-180' : ''}\`} />\n    </button>\n    {open===i && <div className="px-4 pb-3 text-[11px] text-[var(--color-text-muted)]">{item.a}</div>}\n  </div>\n))}`}
                                        dos={['Animasikan rotate chevron 180° saat accordion terbuka', 'Highlight border dengan warna primary pada accordion yang aktif', 'Gunakan accordion untuk FAQ atau konten yang jarang dibuka semua sekaligus']}
                                        donts={['Hindari nested accordion lebih dari 2 level — membingungkan pengguna', 'Jangan sembunyikan informasi kritis di dalam accordion', 'Jangan buka semua accordion secara default tanpa alasan']}
                                        apiProps={[
                                            { prop: 'items', type: 'array', defaultVal: 'required', desc: 'Array of { q: string, a: string|ReactNode }' },
                                            { prop: 'defaultOpen', type: 'number', defaultVal: '0', desc: 'Index item yang terbuka saat pertama render, -1 untuk semua tertutup' },
                                            { prop: 'multiple', type: 'boolean', defaultVal: 'false', desc: 'Izinkan beberapa item terbuka bersamaan' },
                                            { prop: 'onChange', type: 'function', defaultVal: 'undefined', desc: 'Callback (index) dipanggil saat item dibuka/tutup' },
                                        ]}
                                    />
                                    <UIBlock title="17 · Timeline" children={
                                        <div className="space-y-0">
                                            {[
                                                { color: 'bg-[var(--color-primary)]', label: 'Data siswa diperbarui', time: 'Hari ini 09:41', user: 'Admin', icon: faFileLines },
                                                { color: 'bg-emerald-500', label: 'Laporan disetujui', time: 'Kemarin 14:22', user: 'Kepala Sekolah', icon: faCheck },
                                                { color: 'bg-amber-500', label: 'Dokumen diunggah', time: '2 hari lalu', user: 'Tata Usaha', icon: faDownload },
                                                { color: 'bg-sky-500', label: 'Akun dibuat', time: '1 minggu lalu', user: 'System', icon: faUser },
                                            ].map(({ color, label, time, user, icon }, i, arr) => (
                                                <div key={i} className="flex gap-3 items-start">
                                                    <div className="flex flex-col items-center w-7 shrink-0">
                                                        <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center shrink-0`}><FontAwesomeIcon icon={icon} className="text-white text-[9px]" /></div>
                                                        {i < arr.length - 1 && <div className="w-px flex-1 bg-[var(--color-border)] min-h-4 mt-1" />}
                                                    </div>
                                                    <div className={`pb-4 ${i === arr.length - 1 ? '' : 'min-h-10'}`}>
                                                        <p className="text-[10px] font-black text-[var(--color-text)]">{label}</p>
                                                        <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">{user} · {time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`{events.map(({ color, label, time, user, icon }, i) => (\n  <div key={i} className="flex gap-3 items-start">\n    <div className="flex flex-col items-center w-7 shrink-0">\n      <div className={\`w-7 h-7 rounded-full \${color} flex items-center justify-center\`}>\n        <FontAwesomeIcon icon={icon} className="text-white text-[9px]" />\n      </div>\n      {i < events.length - 1 && (\n        <div className="w-px flex-1 bg-[var(--color-border)] min-h-4 mt-1" />\n      )}\n    </div>\n    <div className="pb-4">\n      <p className="text-[10px] font-black text-[var(--color-text)]">{label}</p>\n      <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">{user} · {time}</p>\n    </div>\n  </div>\n))}`} />
                                    <UIBlock title="18 · File Upload" children={
                                        <div className="space-y-3">
                                            <div className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-6 text-center hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all cursor-pointer group">
                                                <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform"><FontAwesomeIcon icon={faArrowUpFromBracket} className="text-sm" /></div>
                                                <p className="text-[11px] font-black text-[var(--color-text)]">Drop file di sini atau klik</p>
                                                <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">PDF, DOC, XLS · max 10MB</p>
                                            </div>
                                            {[{ name: 'laporan_semester1.pdf', size: '2.4 MB', pct: 72, done: false }, { name: 'data_siswa.xlsx', size: '1.1 MB', pct: 100, done: true }].map(f => (
                                                <div key={f.name} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0"><FontAwesomeIcon icon={faFileLines} className="text-xs" /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black text-[var(--color-text)] truncate">{f.name}</p>
                                                        {f.done ? <p className="text-[9px] text-emerald-600 font-black flex items-center gap-1"><FontAwesomeIcon icon={faCheck} className="text-[7px]" /> {f.size} · Selesai</p> : <div className="mt-1 h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden"><div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${f.pct}%` }} /></div>}
                                                    </div>
                                                    {!f.done && <span className="text-[9px] font-black text-[var(--color-primary)]">{f.pct}%</span>}
                                                    <button className="text-[var(--color-text-muted)] hover:text-rose-500 transition-colors"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`<div\n  onDragOver={e => e.preventDefault()}\n  onDrop={handleDrop}\n  onClick={() => fileInput.current?.click()}\n  className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-6 text-center hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all cursor-pointer">\n  <p className="text-[11px] font-black text-[var(--color-text)]">Drop file di sini atau klik</p>\n  <p className="text-[9px] text-[var(--color-text-muted)]">PDF, DOC, XLS · max 10MB</p>\n</div>`} />
                                    <UIBlock title="19 · Rich Text Toolbar" children={
                                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--color-border)]">
                                                {[['B', 'font-black'], ['I', 'italic'], ['U', 'underline']].map(([t, cls]) => <button key={t} className={`w-7 h-7 rounded-lg border border-[var(--color-border)] text-[10px] ${cls} text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all`}>{t}</button>)}
                                                <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />
                                                {[['H1', ''], ['H2', '']].map(t => <button key={t} className="w-8 h-7 rounded-lg border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-all">{t}</button>)}
                                                <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />
                                                {[faLink, faCamera, faFileLines].map((icon, i) => <button key={i} className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-all"><FontAwesomeIcon icon={icon} className="text-[9px]" /></button>)}
                                            </div>
                                            <div contentEditable suppressContentEditableWarning className="p-4 min-h-20 text-[11px] text-[var(--color-text)] leading-relaxed outline-none focus:ring-0" data-placeholder="Mulai mengetik...">
                                                <strong>Catatan Wali Kelas 6A</strong><br />
                                                <span className="text-[var(--color-text-muted)]">Rata-rata kehadiran bulan ini mencapai 94.2%…</span>
                                            </div>
                                        </div>
                                    } code={`<div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">\n  <div className="flex items-center gap-1 p-2 border-b border-[var(--color-border)]">\n    <button onClick={() => document.execCommand('bold')} className="w-7 h-7 rounded-lg font-black text-[10px] hover:bg-[var(--color-primary)]/10">B</button>\n    <button onClick={() => document.execCommand('italic')} className="w-7 h-7 rounded-lg italic text-[10px] hover:bg-[var(--color-primary)]/10">I</button>\n  </div>\n  <div\n    contentEditable\n    className="p-4 min-h-24 text-[11px] outline-none"\n    onInput={e => setContent(e.currentTarget.innerHTML)}\n  />\n</div>`} />
                                </div>
                            </section></LazySection>

                            {/* F · Advanced Patterns */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faGear} number="F" title="Advanced Patterns" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="20 · Date Picker" children={
                                        <div className="space-y-3">
                                            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                                <div className="flex justify-between items-center px-4 py-3 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                                    <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--color-border)] transition-all text-[var(--color-text-muted)] text-[10px]">‹</button>
                                                    <span className="text-[10px] font-black text-[var(--color-text)]">Januari 2025</span>
                                                    <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--color-border)] transition-all text-[var(--color-text-muted)] text-[10px]">›</button>
                                                </div>
                                                <div className="p-3">
                                                    <div className="grid grid-cols-7 gap-1 mb-1">
                                                        {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => <div key={i} className="text-center text-[8px] font-black text-[var(--color-text-muted)] opacity-50 py-1">{d}</div>)}
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1">
                                                        {[null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map((d, i) => (
                                                            <button key={i} className={`h-7 rounded-lg text-[9px] font-black transition-colors ${!d ? '' : 'cursor-pointer'} ${d === 13 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : d === 16 ? 'bg-[var(--color-primary)] text-white' : d && d >= 13 && d <= 16 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : d ? 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]' : ''}`}>{d || ''}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">{['Hari ini', 'Minggu ini', 'Bulan ini'].map(p => <button key={p} className="px-3 py-1 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">{p}</button>)}</div>
                                        </div>
                                    } code={`const [date, setDate] = useState(new Date())\nconst [range, setRange] = useState({ start: null, end: null })\n\n// Preset shortcuts\nconst presets = [\n  { label: 'Hari ini', fn: () => setDate(new Date()) },\n  { label: 'Minggu ini', fn: () => setRange(thisWeek()) },\n  { label: 'Bulan ini', fn: () => setRange(thisMonth()) },\n]`} />
                                    <UIBlock title="21 · Kanban Board" children={
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { col: 'Todo', count: 4, color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-surface-alt)]', cards: ['Absensi Jan', 'Nilai UTS'] },
                                                { col: 'On Going', count: 2, color: 'text-sky-700', bg: 'bg-sky-500/5 border-sky-500/20', cards: ['Laporan Sem1'] },
                                                { col: 'Done', count: 7, color: 'text-emerald-700', bg: 'bg-emerald-500/5 border-emerald-500/20', cards: ['Data Guru', 'Roster Kelas'] },
                                            ].map(({ col, count, color, bg, cards }) => (
                                                <div key={col} className={`rounded-xl p-3 border ${bg}`}>
                                                    <div className={`flex items-center justify-between mb-3 text-[8px] font-black uppercase tracking-widest ${color}`}>
                                                        <span>{col}</span>
                                                        <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">{count}</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {cards.map(c => <div key={c} className={`p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black ${color} cursor-pointer hover:shadow-md transition-all`}>{c}</div>)}
                                                        <button className="w-full p-1.5 rounded-lg border border-dashed border-[var(--color-border)] text-[8px] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">+ Tambah</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`const [columns, setColumns] = useState({\n  todo:    { title:'Todo',    cards: ['Absensi Jan','Nilai UTS'] },\n  ongoing: { title:'On Going', cards: ['Laporan Sem1'] },\n  done:    { title:'Done',    cards: ['Data Guru','Roster'] },\n})\n\nconst moveCard = (card, from, to) => {\n  setColumns(prev => ({\n    ...prev,\n    [from]: { ...prev[from], cards: prev[from].cards.filter(c => c!==card) },\n    [to]:   { ...prev[to],   cards: [...prev[to].cards, card] },\n  }))\n}`} />
                                    <UIBlock title="22 · Rating & Score" children={<RatingPreview />} code={`const [stars, setStars] = useState(4)\nconst [hover, setHover] = useState(null)\n\n<div className="flex items-center gap-2">\n  {[1,2,3,4,5].map(v => (\n    <button key={v}\n      onMouseEnter={() => setHover(v)}\n      onMouseLeave={() => setHover(null)}\n      onClick={() => setStars(v)}\n      className="text-2xl transition-transform hover:scale-110">\n      <span className={(hover ?? stars) >= v ? 'text-amber-400' : 'text-[var(--color-border)]'}>★</span>\n    </button>\n  ))}\n  <span className="text-[11px] font-black text-[var(--color-text-muted)]">{stars}.0 / 5</span>\n</div>`} />
                                    <UIBlock title="23 · Permission Matrix" children={
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-[10px]">
                                                <thead>
                                                    <tr className="border-b border-[var(--color-border)]">
                                                        <th className="text-left p-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Fitur</th>
                                                        {['Admin', 'Guru', 'TU', 'Ortu'].map(r => <th key={r} className="p-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60 text-center">{r}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[
                                                        { f: 'Data Siswa', perms: [true, true, false, false] },
                                                        { f: 'Keuangan', perms: [true, false, true, false] },
                                                        { f: 'Laporan', perms: [true, true, true, true] },
                                                        { f: 'Pengaturan', perms: [true, false, false, false] },
                                                    ].map(({ f, perms }) => (
                                                        <tr key={f} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-alt)] transition-colors">
                                                            <td className="p-2 font-black text-[var(--color-text)]">{f}</td>
                                                            {perms.map((p, i) => (
                                                                <td key={i} className="p-2 text-center">
                                                                    {p ? <FontAwesomeIcon icon={faCheck} className="text-emerald-500 text-sm" /> : <FontAwesomeIcon icon={faXmark} className="text-[var(--color-border)] text-sm" />}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    } code={`const [matrix, setMatrix] = useState({\n  admin: { siswa:true, keuangan:true, laporan:true, settings:true },\n  guru:  { siswa:true, keuangan:false, laporan:true, settings:false },\n  tu:    { siswa:false, keuangan:true, laporan:true, settings:false },\n})\n\nconst toggle = (role, perm) =>\n  setMatrix(prev => ({\n    ...prev,\n    [role]: { ...prev[role], [perm]: !prev[role][perm] }\n  }))`} />
                                    <UIBlock title="24 · Inline Editable" children={<InlineEditPreview />} code={`const [editing, setEditing] = useState(null)\nconst [values, setValues] = useState({\n  nama: 'Andi Setiawan',\n  kelas: '6A',\n  email: 'andi@gmail.com',\n})\n\nconst save = field => {\n  setEditing(null)\n  addToast('Autosaved', 'success')\n}`} />
                                    <UIBlock title="25 · Confirm Dialog" children={<ConfirmDialogPreview />} code={`const [input, setInput] = useState('')\nconst confirmed = input === 'HAPUS'\n\n<button disabled={!confirmed} onClick={handleDelete}\n  className={\`\${confirmed ? 'bg-rose-500 text-white' : 'bg-rose-500/20 text-rose-300 cursor-not-allowed'}\`}>\n  Hapus Permanen\n</button>`} />
                                </div>
                            </section></LazySection>

                            {/* G · Input Extras */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faSearch} number="G" title="Input Extras" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="OTP / PIN Input" children={<OTPInputPreview />} code={`const [otp, setOtp] = useState(['','','','','',''])\n\nconst handleChange = (i, v) => {\n  const d = v.replace(/\\D/g,'').slice(-1)\n  const next = [...otp]; next[i] = d; setOtp(next)\n  // auto-advance\n  if (d && i < 5) document.getElementById(\`otp-\${i+1}\`).focus()\n}\n\n<div className="flex gap-2">\n  {otp.map((v, i) => (\n    <input key={i} id={\`otp-\${i}\`}\n      maxLength={1} value={v}\n      onChange={e => handleChange(i, e.target.value)}\n      className="w-11 h-13 text-center text-[20px] font-black rounded-xl border-2 outline-none"\n    />\n  ))}\n</div>`} />
                                    <UIBlock title="Tag Input (Tokenizer)" children={<TagInputPreview />} code={`const [tags, setTags] = useState(['React','TypeScript'])\nconst [input, setInput] = useState('')\n\nconst addTag = () => {\n  const t = input.trim()\n  if (t && !tags.includes(t) && tags.length < 8) {\n    setTags(p => [...p, t])\n    setInput('')\n  }\n}\n\n<input\n  value={input}\n  onChange={e => setInput(e.target.value)}\n  onKeyDown={e => {\n    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }\n    if (e.key === 'Backspace' && !input) setTags(p => p.slice(0,-1))\n  }}\n  placeholder="Tambah tag…"\n/>`} />
                                    <UIBlock fullWidth title="Multi-select Combobox" children={<ComboboxPreview />} code={`const [q, setQ] = useState('')\nconst [selected, setSelected] = useState([])\nconst [open, setOpen] = useState(false)\n\nconst toggle = name =>\n  setSelected(p => p.includes(name) ? p.filter(x=>x!==name) : [...p, name])\n\nconst filtered = options\n  .filter(n => n.toLowerCase().includes(q.toLowerCase()) && !selected.includes(n))`} />
                                </div>
                            </section></LazySection>

                        </div>
                    )}

                    {/* ── FORMS ── */}
                    {activeTab === 'forms' && (
                        <div className="space-y-10">
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faFileLines} number="A" title="Authentication Forms" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="01 · Login Form" children={<LoginFormPreview />} code={`const [email, setEmail] = useState('')\nconst [pass, setPass] = useState('')\nconst [showPass, setShowPass] = useState(false)\nconst valid = email.includes('@') && pass.length >= 6\n\n<button onClick={submit} disabled={!valid}\n  className={\`w-full h-10 rounded-xl text-[11px] font-black transition-all\n    \${valid ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] cursor-not-allowed'}\`}>\n  Masuk →\n</button>`}
                                        dos={['Tombol submit harus disabled jika email/password belum valid', 'Sertakan toggle show/hide password pada field password', 'Validasi real-time boleh, tapi tampilkan error setelah user blur dari field']}
                                        donts={['Jangan simpan password dalam bentuk apapun di localStorage', 'Hindari reset seluruh form jika hanya 1 field yang error', 'Jangan blokir fitur paste di field password — menyulitkan password manager']}
                                        apiProps={[
                                            { prop: 'onSubmit', type: 'function', defaultVal: 'required', desc: 'Callback ({ email, password }) saat form disubmit' },
                                            { prop: 'loading', type: 'boolean', defaultVal: 'false', desc: 'Tampilkan spinner pada tombol saat proses login berjalan' },
                                            { prop: 'error', type: 'string|null', defaultVal: 'null', desc: 'Pesan error dari server untuk ditampilkan di atas form' },
                                            { prop: 'redirectUrl', type: 'string', defaultVal: "'/'", desc: 'URL tujuan setelah login berhasil' },
                                        ]}
                                    />
                                    <UIBlock title="02 · Register Form" children={
                                        <div className="space-y-3">
                                            <div><h3 className="text-[14px] font-black text-[var(--color-text)]">Daftar Akun Baru</h3><p className="text-[9px] text-[var(--color-text-muted)]">Buat akun sekolah Anda</p></div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Nama Depan', 'Nama Belakang'].map(f => <div key={f} className="space-y-1"><label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{f}</label><input placeholder={f} className="w-full h-9 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all" /></div>)}
                                            </div>
                                            {['Email Sekolah', 'Password', 'Konfirmasi Password'].map(f => <div key={f} className="space-y-1"><label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{f}</label><input type={f.includes('Pass') ? 'password' : 'email'} placeholder={f === 'Email Sekolah' ? 'admin@sekolah.sch.id' : 'Min. 8 karakter'} className="w-full h-9 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all" /></div>)}
                                            <label className="flex items-start gap-2 cursor-pointer"><div className="w-4 h-4 rounded border-2 border-[var(--color-border)] mt-0.5 shrink-0 bg-[var(--color-surface)]" /><span className="text-[9px] text-[var(--color-text-muted)] leading-relaxed">Saya menyetujui <span className="text-[var(--color-primary)] font-black">Syarat & Ketentuan</span> dan <span className="text-[var(--color-primary)] font-black">Kebijakan Privasi</span></span></label>
                                            <button className="w-full h-9 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black hover:opacity-90 active:scale-95 transition-all">Buat Akun →</button>
                                            <p className="text-[9px] text-center text-[var(--color-text-muted)]">Sudah punya akun? <span className="text-[var(--color-primary)] font-black cursor-pointer">Masuk</span></p>
                                        </div>
                                    } code={`{/* Register form pattern */}\n<div className="space-y-3">\n  <div className="grid grid-cols-2 gap-2">\n    <input name="firstName" placeholder="Nama Depan" className="h-9 px-3 rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary)]" />\n    <input name="lastName" placeholder="Nama Belakang" className="h-9 px-3 rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary)]" />\n  </div>\n  <input name="email" type="email" placeholder="Email Sekolah" className="w-full h-9 px-3 rounded-xl border" />\n  <input name="password" type="password" placeholder="Password" className="w-full h-9 px-3 rounded-xl border" />\n  {/* Terms checkbox */}\n  <button type="submit" className="w-full h-9 rounded-xl bg-[var(--color-primary)] text-white font-black">\n    Buat Akun →\n  </button>\n</div>`} />
                                </div>
                            </section></LazySection>
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faSearch} number="B" title="Data Forms" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock fullWidth title="03 · Search & Filter Form" children={<SearchFilterFormPreview />} code={`const [q, setQ] = useState('')\nconst [kelas, setKelas] = useState('semua')\nconst [status, setStatus] = useState('semua')\n\nconst filtered = data\n  .filter(d =>\n    (q === '' || d.nama.toLowerCase().includes(q.toLowerCase())) &&\n    (kelas === 'semua' || d.kelas === kelas) &&\n    (status === 'semua' || d.status === status)\n  )`} />
                                    <UIBlock title="04 · Forgot Password" children={
                                        <div className="space-y-4">
                                            <div className="text-center space-y-2"><div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto"><FontAwesomeIcon icon={faEnvelope} className="text-lg" /></div><h3 className="text-[13px] font-black text-[var(--color-text)]">Lupa Password?</h3><p className="text-[9px] text-[var(--color-text-muted)] leading-relaxed">Masukkan email terdaftar, kami akan kirim link reset password.</p></div>
                                            <div className="space-y-1"><label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Email</label><input placeholder="admin@sekolah.sch.id" className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[11px] font-medium text-[var(--color-text)] outline-none transition-all" /></div>
                                            <button className="w-full h-10 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black hover:opacity-90 transition-all">Kirim Link Reset →</button>
                                            <p className="text-[9px] text-center text-[var(--color-text-muted)]"><span className="text-[var(--color-primary)] font-black cursor-pointer">← Kembali ke Login</span></p>
                                        </div>
                                    } code={`<div className="text-center space-y-2">\n  <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto">\n    <FontAwesomeIcon icon={faEnvelope} className="text-lg" />\n  </div>\n  <h3 className="text-[13px] font-black text-[var(--color-text)]">Lupa Password?</h3>\n  <p className="text-[9px] text-[var(--color-text-muted)] leading-relaxed">Masukkan email terdaftar…</p>\n</div>\n<input placeholder="admin@sekolah.sch.id"\n  className="w-full h-10 px-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none" />\n<button className="w-full h-10 rounded-xl bg-[var(--color-primary)] text-white font-black">Kirim Link Reset →</button>`} />
                                    <UIBlock title="05 · OTP Verification" children={<OTPInputPreview />} code={`const [otp, setOtp] = useState(['','','','','',''])\nconst valid = otp.every(c => c)\n\nconst handleChange = (i, v) => {\n  const d = v.replace(/\\D/g, '').slice(-1)\n  const next = [...otp]; next[i] = d; setOtp(next)\n  if (d && i < 5) document.getElementById(\`otp-\${i+1}\`).focus()\n}`} />
                                    <UIBlock title="06 · Dynamic Multi-field" children={
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Kontak Darurat Siswa</p>
                                            {[{ n: 'Ayah', t: 'Bapak Andi', p: '08123456789' }, { n: 'Ibu', t: 'Ibu Sari', p: '08987654321' }].map((c, i) => (
                                                <div key={i} className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-2">
                                                    <div className="flex items-center justify-between"><span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase">{c.n}</span><button className="text-[8px] font-black text-rose-400 hover:text-rose-600 transition-colors">Hapus</button></div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input defaultValue={c.t} className="h-8 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all" />
                                                        <input defaultValue={c.p} className="h-8 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all" />
                                                    </div>
                                                </div>
                                            ))}
                                            <button className="w-full py-2 rounded-xl border-2 border-dashed border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center justify-center gap-1.5"><FontAwesomeIcon icon={faPlus} className="text-[9px]" />Tambah Kontak</button>
                                        </div>
                                    } code={`const [contacts, setContacts] = useState([{ nama:'', telepon:'' }])\n\nconst addContact = () =>\n  setContacts(p => [...p, { nama:'', telepon:'' }])\n\nconst removeContact = i =>\n  setContacts(p => p.filter((_, idx) => idx !== i))\n\nconst update = (i, field, val) =>\n  setContacts(p => p.map((c, idx) => idx===i ? {...c, [field]:val} : c))`} />
                                    <UIBlock title="07 · Tag Input" children={<TagInputPreview />} code={`const [tags, setTags] = useState(['React'])\nconst [input, setInput] = useState('')\n\nconst addTag = () => {\n  const t = input.trim()\n  if (t && !tags.includes(t) && tags.length < 8) {\n    setTags(p => [...p, t])\n    setInput('')\n  }\n}`} />
                                    <UIBlock title="08 · Multi-select Combobox" children={<ComboboxPreview />} code={`const [selected, setSelected] = useState([])\nconst [q, setQ] = useState('')\nconst [open, setOpen] = useState(false)\n\nconst filtered = options.filter(n =>\n  n.toLowerCase().includes(q.toLowerCase()) &&\n  !selected.includes(n)\n)`} />
                                </div>
                            </section></LazySection>
                        </div>
                    )}

                    {/* ── DATA VIZ ── */}
                    {activeTab === 'dataviz' && (
                        <div className="space-y-10">
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faChartLine} number="A" title="Trend & Comparison" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="01 · Bar Chart" children={<BarChartPreview />} code={`const data = [\n  { l:'Jan', v:82 }, { l:'Feb', v:91 },\n  { l:'Mar', v:75 }, { l:'Apr', v:88 },\n]\nconst max = Math.max(...data.map(d => d.v))\n\n{data.map(({ l, v }) => (\n  <div key={l} className="flex-1 flex flex-col items-center gap-1 group">\n    <div\n      className="w-full rounded-t-lg bg-[var(--color-primary)]/20 group-hover:bg-[var(--color-primary)] transition-all"\n      style={{ height: \`\${(v/max)*80}px\` }}\n    />\n    <span className="text-[8px] font-black text-[var(--color-text-muted)] opacity-60">{l}</span>\n  </div>\n))}`}
                                        dos={['Tampilkan nilai di atas bar saat hover untuk readability', 'Gunakan warna primary konsisten, aksen berbeda untuk highlight', 'Sertakan label sumbu Y dan satuan yang jelas']}
                                        donts={['Jangan mulai sumbu Y dari angka selain 0 tanpa keterangan — misleading', 'Hindari terlalu banyak bar (>12) dalam satu chart tanpa scroll', 'Jangan gunakan 3D bar chart — sulit dibaca dan tidak akurat']}
                                        apiProps={[
                                            { prop: 'data', type: 'array', defaultVal: 'required', desc: 'Array of { l: string, v: number } untuk label dan nilai' },
                                            { prop: 'color', type: 'string', defaultVal: "'var(--color-primary)'", desc: 'Warna bar, bisa CSS variable atau hex' },
                                            { prop: 'height', type: 'number', defaultVal: '120', desc: 'Tinggi area chart dalam pixel' },
                                            { prop: 'showValues', type: 'boolean', defaultVal: 'false', desc: 'Tampilkan angka di atas setiap bar' },
                                        ]}
                                    />
                                    <UIBlock title="02 · Line Chart" children={<LineChartPreview />} code={`const data = [68,74,71,82,79,88,85,92,89,95,91,97]\nconst W=260, H=80, pad=8\nconst max=Math.max(...data), min=Math.min(...data)-5\n\nconst pts = data.map((v,i) => [\n  pad + (i/(data.length-1)) * (W-pad*2),\n  H - pad - ((v-min)/(max-min)) * (H-pad*2)\n])\n\nconst path = pts.map((p,i) => \`\${i===0?'M':'L'}\${p[0]},\${p[1]}\`).join(' ')\n\n<svg viewBox={\`0 0 \${W} \${H}\`}>\n  <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2" />\n</svg>`} />
                                    <UIBlock title="03 · Donut Chart" children={<DonutChartPreview />} code={`// Buat arc dari persentase\nconst makeArc = (startPct, endPct, r=36, cx=50, cy=50) => {\n  const s = startPct * 2 * Math.PI\n  const e = endPct * 2 * Math.PI\n  const x1 = cx + r * Math.sin(s), y1 = cy - r * Math.cos(s)\n  const x2 = cx + r * Math.sin(e), y2 = cy - r * Math.cos(e)\n  const large = (endPct - startPct) > 0.5 ? 1 : 0\n  return \`M\${cx},\${cy} L\${x1},\${y1} A\${r},\${r} 0 \${large},1 \${x2},\${y2} Z\`\n}`} />
                                    <UIBlock title="04 · Sparkline KPI Cards" children={<SparklinePreview />} code={`// Mini line chart inside KPI card\nconst W=80, H=28\nconst max=Math.max(...data), min=Math.min(...data)\n\nconst pts = data.map((v,i) =>\n  \`\${(i/(data.length-1))*W},\${H-((v-min)/(max-min||1))*H}\`\n).join(' ')\n\n<svg viewBox={\`0 0 \${W} \${H}\`} style={{width:'100%',height:28}}>\n  <polyline points={pts}\n    fill="none"\n    stroke={up ? '#22c55e' : '#ef4444'}\n    strokeWidth="1.5"\n    strokeLinecap="round"\n    strokeLinejoin="round"\n  />\n</svg>`} />
                                </div>
                            </section></LazySection>
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faGrip} number="B" title="Distribution & Patterns" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="05 · Heatmap" children={<HeatmapPreview />} code={`const days = ['Sen','Sel','Rab','Kam','Jum']\nconst hours = ['07','08','09','10','11','12','13','14']\n\nconst getColor = v =>\n  v === 0 ? 'var(--color-border)' :\n  v <= 25 ? '#c7d2fe' :\n  v <= 50 ? '#818cf8' :\n  v <= 75 ? '#6366f1' : '#4338ca'\n\n{hours.map(h => (\n  <div key={h} className="flex gap-1 items-center">\n    <span className="w-8 text-[7px] font-mono opacity-50">{h}:00</span>\n    {days.map((_, di) => (\n      <div key={di}\n        className="flex-1 aspect-square rounded cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)]"\n        style={{ background: getColor(getValue(di, hours.indexOf(h))) }}\n      />\n    ))}\n  </div>\n))}`} />
                                    <UIBlock title="06 · Progress Bars" children={
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Performa Kelas per Mapel</p>
                                            {[{ l: 'Matematika', v: 88, c: 'bg-[var(--color-primary)]' }, { l: 'B. Indonesia', v: 92, c: 'bg-emerald-500' }, { l: 'IPA', v: 76, c: 'bg-amber-500' }, { l: 'IPS', v: 83, c: 'bg-sky-500' }, { l: 'Seni Budaya', v: 95, c: 'bg-rose-500' }].map(({ l, v, c }) => (
                                                <div key={l} className="space-y-1">
                                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-[var(--color-text)]">{l}</span><span className="text-[10px] font-black text-[var(--color-text-muted)]">{v}</span></div>
                                                    <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden"><div className={`h-full ${c} rounded-full transition-all`} style={{ width: `${v}%` }} /></div>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`{subjects.map(({ label, value, color }) => (\n  <div key={label} className="space-y-1">\n    <div className="flex items-center justify-between">\n      <span className="text-[10px] font-black text-[var(--color-text)]">{label}</span>\n      <span className="text-[10px] font-black text-[var(--color-text-muted)]">{value}</span>\n    </div>\n    <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">\n      <div className={\`h-full \${color} rounded-full transition-all\`}\n        style={{ width: \`\${value}%\` }} />\n    </div>\n  </div>\n))}`} />
                                </div>
                            </section></LazySection>
                        </div>
                    )}

                    {/* ── TOKENS ── */}
                    {activeTab === 'tokens' && (
                        <div className="space-y-10">
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faPalette} number="A" title="Color Tokens" />
                                <UIBlock fullWidth title="CSS Variable Colors" children={
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { group: 'Brand', tokens: [{ n: 'primary', v: '--color-primary' }, { n: 'secondary', v: '--color-secondary' }, { n: 'accent', v: '--color-accent' }] },
                                                { group: 'Semantic', tokens: [{ n: 'success', v: '--color-success' }, { n: 'warning', v: '--color-warning' }, { n: 'danger', v: '--color-danger' }] },
                                                { group: 'Surface', tokens: [{ n: 'surface', v: '--color-surface' }, { n: 'surface-alt', v: '--color-surface-alt' }] },
                                                { group: 'Text', tokens: [{ n: 'text', v: '--color-text' }, { n: 'text-muted', v: '--color-text-muted' }] },
                                            ].map(({ group, tokens }) => (
                                                <div key={group} className="space-y-2">
                                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">{group}</p>
                                                    {tokens.map(({ n, v }) => (
                                                        <div key={n} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] transition-all group" onClick={() => navigator.clipboard.writeText(`var(${v})`)}>
                                                            <div className="w-8 h-8 rounded-lg border border-[var(--color-border)] shrink-0" style={{ background: `var(${v})` }} />
                                                            <div className="min-w-0"><p className="text-[9px] font-black text-[var(--color-text)] truncate">{n}</p><p className="text-[7px] font-mono text-[var(--color-text-muted)] opacity-50 truncate">{v}</p></div>
                                                            <FontAwesomeIcon icon={faCopy} className="text-[8px] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                } code={`{/* Gunakan CSS variables di Tailwind */}\n\n{/* Di tailwind.config.js: */}\ntheme: {\n  extend: {\n    colors: {\n      primary: 'var(--color-primary)',\n      surface: 'var(--color-surface)',\n    }\n  }\n}\n\n{/* Penggunaan: */}\n<div className="bg-[var(--color-surface)] text-[var(--color-text)]">\n  <button className="bg-[var(--color-primary)] text-white">\n    Primary Action\n  </button>\n</div>`} />
                            </section></LazySection>
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faExpand} number="B" title="Spacing & Sizing Tokens" />
                                <UIBlock fullWidth title="Tailwind Spacing Scale" children={
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Gap / Padding / Margin Reference</p>
                                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40].map(n => (
                                                    <div key={n} className="text-center space-y-1 cursor-pointer group" onClick={() => navigator.clipboard.writeText(`p-${n}`)}>
                                                        <div className="mx-auto rounded bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/20 group-hover:bg-[var(--color-primary)]/30 transition-all" style={{ width: Math.min(n * 3, 48), height: Math.min(n * 3, 48), maxWidth: '100%' }} />
                                                        <p className="text-[7px] font-black text-[var(--color-primary)]">p-{n}</p>
                                                        <p className="text-[6px] font-mono text-[var(--color-text-muted)] opacity-50">{n * 4}px</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-[var(--color-border)]">
                                            <div>
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Border Radius</p>
                                                <div className="flex flex-wrap gap-3 items-end">
                                                    {[{ l: 'sm', r: 2 }, { l: 'md', r: 6 }, { l: 'lg', r: 8 }, { l: 'xl', r: 12 }, { l: '2xl', r: 16 }, { l: '3xl', r: 24 }, { l: 'full', r: 999 }].map(({ l, r }) => (
                                                        <div key={l} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => navigator.clipboard.writeText(`rounded-${l}`)}>
                                                            <div className="w-10 h-10 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/20 transition-all" style={{ borderRadius: Math.min(r, 20) }} />
                                                            <span className="text-[7px] font-black text-[var(--color-primary)]">{l}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-3">Typography Scale</p>
                                                <div className="space-y-1">
                                                    {[{ cls: 'text-xs', size: '12px' }, { cls: 'text-sm', size: '14px' }, { cls: 'text-base', size: '16px' }, { cls: 'text-lg', size: '18px' }, { cls: 'text-xl', size: '20px' }, { cls: 'text-2xl', size: '24px' }, { cls: 'text-3xl', size: '30px' }].map(({ cls, size }) => (
                                                        <div key={cls} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--color-surface-alt)] px-2 rounded-lg transition-colors" onClick={() => navigator.clipboard.writeText(cls)}>
                                                            <span className="font-mono text-[7px] text-[var(--color-primary)] w-20 shrink-0">{cls}</span>
                                                            <span className="font-black text-[var(--color-text)] leading-tight" style={{ fontSize: Math.min(+size.replace('px', ''), 18) + 'px' }}>Teks Contoh</span>
                                                            <span className="text-[7px] font-mono text-[var(--color-text-muted)] opacity-50 ml-auto">{size}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                } code={`{/* Semua token tersedia di className Tailwind */}\n\n{/* Spacing: p-1=4px, p-2=8px, p-4=16px, p-8=32px */}\n<div className="p-4 gap-6 m-2">\n\n{/* Typography: */}\n<h1 className="text-3xl font-black tracking-tight">\n<p className="text-sm font-medium leading-relaxed">\n<span className="text-[9px] uppercase tracking-widest">\n\n{/* Border radius: */}\n<div className="rounded-xl"> {/* 12px */}\n<div className="rounded-2xl"> {/* 16px */}\n<div className="rounded-full"> {/* 9999px */}`} />
                            </section></LazySection>
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faLayerGroup} number="C" title="Shadow & Motion Tokens" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="Shadow Scale" children={
                                        <div className="flex flex-wrap gap-6 items-end py-4">
                                            {[{ l: 'none', s: 'shadow-none', b: true }, { l: 'sm', s: 'shadow-sm' }, { l: 'md', s: 'shadow-md' }, { l: 'lg', s: 'shadow-lg' }, { l: 'xl', s: 'shadow-xl' }, { l: '2xl', s: 'shadow-2xl' }].map(({ l, s, b }) => (
                                                <div key={l} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => navigator.clipboard.writeText(s)}>
                                                    <div className={`w-14 h-14 rounded-2xl bg-[var(--color-surface)] ${s} ${b ? 'border border-[var(--color-border)]' : ''} flex items-center justify-center hover:scale-105 transition-all`}><span className="text-[7px] font-mono text-[var(--color-text-muted)] opacity-50">{l}</span></div>
                                                    <span className="text-[8px] font-mono font-black text-[var(--color-text-muted)] opacity-60">{l}</span>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`{/* Shadow usage guide */}\n.card   → shadow-sm hover:shadow-md\n.dropdown → shadow-lg\n.modal  → shadow-2xl\n.fab    → shadow-xl\n\n{/* In Tailwind: */}\n<div className="shadow-sm hover:shadow-md transition-shadow">\n<div className="shadow-lg"> {/* dropdown */}\n<div className="shadow-2xl"> {/* modal */}`} />
                                    <UIBlock title="Motion Tokens" children={
                                        <div className="space-y-3">
                                            {[{ name: 'instant', ms: 75, cls: 'duration-75', use: 'toggle, checkbox' }, { name: 'fast', ms: 150, cls: 'duration-150', use: 'hover, tooltip' }, { name: 'normal', ms: 300, cls: 'duration-300', use: 'slide, expand' }, { name: 'slow', ms: 500, cls: 'duration-500', use: 'page enter' }, { name: 'cinematic', ms: 700, cls: 'duration-700', use: 'intro, hero' }].map(({ name, ms, cls, use }) => (
                                                <div key={name} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--color-surface-alt)] px-2 py-1.5 rounded-xl transition-colors" onClick={() => navigator.clipboard.writeText(cls)}>
                                                    <span className="text-[9px] font-mono font-black text-[var(--color-primary)] w-20 shrink-0">{ms}ms</span>
                                                    <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-alt)]"><div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${(ms / 700) * 100}%` }} /></div>
                                                    <span className="text-[8px] font-black text-[var(--color-text-muted)] w-16 shrink-0 opacity-60">{name}</span>
                                                    <span className="text-[7px] text-[var(--color-text-muted)] opacity-40 hidden md:block">{use}</span>
                                                </div>
                                            ))}
                                            <p className="text-[8px] text-[var(--color-text-muted)] opacity-40 pt-1">Klik untuk copy class · Default: transition-all duration-150 ease-out</p>
                                        </div>
                                    } code={`{/* Recommended combos */}\n\n{/* Button hover */}\n<button className="transition-all duration-75 ease-in-out hover:scale-[1.02]">\n\n{/* Dropdown open */}\n<div className="transition-all duration-150 ease-out">\n\n{/* Modal entry */}\n<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">\n\n{/* Spring-like bounce */}\n<div className="transition-all duration-500 ease-[cubic-bezier(.34,1.56,.64,1)]">`} />
                                </div>
                            </section></LazySection>
                        </div>
                    )}

                    {/* ── LAYOUT ── */}
                    {activeTab === 'layout' && (
                        <div className="space-y-10">

                            {/* A · Navigation */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faGrip} number="A" title="Navigation" />
                                <div className="space-y-8">
                                    <UIBlock fullWidth title="01 · Sidebar Navigation" children={<SidebarNavPreview />} code={`const [active, setActive] = useState('dashboard')\nconst [collapsed, setCollapsed] = useState(false)\n\n<div className={\`\${collapsed ? 'w-14' : 'w-52'} transition-all duration-300\`}>\n  {groups.map(g => (\n    <div key={g.label}>\n      {!collapsed && <p className="text-[7px] font-black uppercase tracking-widest opacity-50 px-2 mb-1">{g.label}</p>}\n      {g.items.map(item => (\n        <button key={item.key} onClick={() => setActive(item.key)}\n          className={\`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl\n            \${active===item.key ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'\n            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}\`}>\n          <FontAwesomeIcon icon={item.icon} className="text-xs" />\n          {!collapsed && <span className="text-[10px] font-black">{item.label}</span>}\n        </button>\n      ))}\n    </div>\n  ))}\n</div>`}
                                        dos={['Highlight item aktif dengan bg primary/10 dan teks primary yang jelas', 'Grouping item dengan label kategori untuk navigasi yang banyak', 'Dukung collapsed mode — hanya ikon — untuk layar kecil']}
                                        donts={['Jangan ubah urutan navigasi antar halaman — membingungkan user', 'Hindari nesting navigasi lebih dari 2 level di sidebar', 'Jangan sembunyikan sidebar tanpa tombol toggle yang mudah ditemukan']}
                                        apiProps={[
                                            { prop: 'items', type: 'array', defaultVal: 'required', desc: 'Array of { key, label, icon, group? }' },
                                            { prop: 'active', type: 'string', defaultVal: 'required', desc: 'Key item yang sedang aktif saat ini' },
                                            { prop: 'onNavigate', type: 'function', defaultVal: 'required', desc: 'Callback (key) dipanggil saat item diklik' },
                                            { prop: 'collapsed', type: 'boolean', defaultVal: 'false', desc: 'Mode icon-only untuk menghemat ruang layar' },
                                            { prop: 'onCollapse', type: 'function', defaultVal: 'undefined', desc: 'Toggle collapsed state dari luar komponen' },
                                        ]}
                                    />
                                    <UIBlock fullWidth title="02 · Topbar & Navbar Variants" children={<TopbarPreview />} code={`const [search, setSearch] = useState('')\n\n{/* Full topbar */}\n<div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">\n  <div className="flex-1 relative">\n    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px]" />\n    <input value={search} onChange={e => setSearch(e.target.value)}\n      className="w-full h-8 pl-8 pr-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[10px] outline-none" />\n  </div>\n  <div className="relative">\n    <button className="w-8 h-8 rounded-xl flex items-center justify-center"><FontAwesomeIcon icon={faBell} /></button>\n    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center border-2 border-[var(--color-surface)]">3</div>\n  </div>\n</div>`} />
                                    <div className="grid lg:grid-cols-2 gap-8">
                                        <UIBlock title="03 · Mobile Bottom Nav" children={<MobileBottomNavPreview />} code={`const [active, setActive] = useState('home')\nconst tabs = [\n  { key:'home',    icon:faGaugeHigh,    label:'Home',  badge:null },\n  { key:'siswa',   icon:faUsers,         label:'Siswa', badge:3 },\n  { key:'laporan', icon:faClipboardList, label:'Lap.',  badge:null },\n  { key:'setting', icon:faGear,          label:'Set.',  badge:null },\n]\n\n<div className="border-t border-[var(--color-border)] flex">\n  {tabs.map(tab => (\n    <button key={tab.key} onClick={() => setActive(tab.key)}\n      className="flex-1 flex flex-col items-center py-2 gap-0.5 relative">\n      <FontAwesomeIcon icon={tab.icon}\n        className={\`text-xs \${active===tab.key ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}\`} />\n      <span className={\`text-[7px] font-black \${active===tab.key ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}\`}>{tab.label}</span>\n      {tab.badge && <div className="absolute top-1 right-1/4 w-4 h-4 rounded-full bg-rose-500 text-white text-[7px] font-black flex items-center justify-center">{tab.badge}</div>}\n    </button>\n  ))}\n</div>`} />
                                        <UIBlock title="04 · Floating Action Button" children={<FABPreview />} code={`const [open, setOpen] = useState(false)\nconst actions = [\n  { icon:faArrowUpFromBracket, label:'Import' },\n  { icon:faDownload,           label:'Export' },\n  { icon:faFileLines,          label:'Laporan' },\n]\n\n<div className="absolute bottom-4 right-4 flex flex-col items-end gap-2.5">\n  {open && actions.map((a, i) => (\n    <div key={i} className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">\n      <span className="px-2.5 py-1 bg-[var(--color-surface)] rounded-xl text-[9px] font-black shadow-sm">{a.label}</span>\n      <button className="w-9 h-9 rounded-full border flex items-center justify-center">\n        <FontAwesomeIcon icon={a.icon} className="text-xs" />\n      </button>\n    </div>\n  ))}\n  <button onClick={() => setOpen(p => !p)}\n    className={\`w-12 h-12 rounded-full shadow-xl flex items-center justify-center\n      \${open ? 'bg-slate-700 text-white' : 'bg-[var(--color-primary)] text-white'}\`}>\n    <FontAwesomeIcon icon={faPlus} className={\`text-lg transition-transform \${open ? 'rotate-45' : ''}\`} />\n  </button>\n</div>`} />
                                    </div>
                                </div>
                            </section></LazySection>

                            {/* B · Page Templates */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faLayerGroup} number="B" title="Page Templates" />
                                <div className="space-y-8">
                                    <UIBlock fullWidth title="05 · Dashboard Shell" children={
                                        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                                                <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0"><FontAwesomeIcon icon={faGaugeHigh} className="text-white text-[9px]" /></div>
                                                <span className="text-[11px] font-black text-[var(--color-text)]">Laporanmu</span>
                                                <div className="flex-1" />
                                                <FontAwesomeIcon icon={faBell} className="text-[var(--color-text-muted)] text-sm" />
                                                <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 text-[9px] font-black flex items-center justify-center">AS</div>
                                            </div>
                                            <div className="flex" style={{ height: 180 }}>
                                                <div className="w-44 bg-[var(--color-surface)] border-r border-[var(--color-border)] p-3 space-y-1 shrink-0">
                                                    {[{ icon: faGaugeHigh, label: 'Dashboard', active: true }, { icon: faUsers, label: 'Data Siswa' }, { icon: faClipboardList, label: 'Laporan' }, { icon: faCalendar, label: 'Jadwal' }, { icon: faGear, label: 'Pengaturan' }].map(item => (
                                                        <div key={item.label} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${item.active ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                                                            <FontAwesomeIcon icon={item.icon} className="text-[9px] shrink-0" />
                                                            <span className="text-[9px] font-black">{item.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex-1 p-4 bg-[var(--color-surface-alt)] space-y-3">
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[{ l: 'Total Siswa', v: '2,840', c: 'indigo' }, { l: 'Kehadiran', v: '94.2%', c: 'emerald' }, { l: 'Laporan', v: '18', c: 'amber' }].map(({ l, v, c }) => (
                                                            <div key={l} className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                                                <p className="text-[14px] font-black font-heading text-[var(--color-text)]">{v}</p>
                                                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{l}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
                                                        <p className="text-[9px] font-black text-[var(--color-text-muted)] opacity-50 uppercase tracking-widest mb-2">Aktivitas Terbaru</p>
                                                        <div className="space-y-1.5">
                                                            {['Data siswa diperbarui', 'Laporan Q3 dikirim', 'Jadwal baru ditambahkan'].map(t => <div key={t} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" /><span className="text-[9px] text-[var(--color-text-muted)]">{t}</span></div>)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    } code={`// Dashboard Shell: Topbar + Sidebar + Content\n<div className="flex h-screen">\n  <aside className="w-52 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">\n    {/* Logo */}\n    {/* Nav items */}\n    {/* Footer */}\n  </aside>\n  <div className="flex-1 flex flex-col overflow-hidden">\n    <header className="h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-6">\n      {/* Search + Notif + Avatar */}\n    </header>\n    <main className="flex-1 overflow-y-auto p-6 bg-[var(--color-surface-alt)]">\n      {children}\n    </main>\n  </div>\n</div>`} />
                                    <div className="grid lg:grid-cols-2 gap-8">
                                        <UIBlock title="06 · Auth Page Layout" children={
                                            <div className="flex border border-[var(--color-border)] rounded-2xl overflow-hidden h-64">
                                                <div className="w-40 bg-[var(--color-primary)] p-6 flex flex-col items-center justify-center gap-3 shrink-0">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><FontAwesomeIcon icon={faGaugeHigh} className="text-white text-lg" /></div>
                                                    <div className="text-center"><p className="text-[12px] font-black text-white">Laporanmu</p><p className="text-[9px] text-white/60">Ekosistem Sekolah Indonesia</p></div>
                                                    <div className="space-y-1 w-full">
                                                        {['✓ Multi-role akses', '✓ Data terenkripsi', '✓ Real-time sync'].map(f => <p key={f} className="text-[8px] text-white/70 font-medium">{f}</p>)}
                                                    </div>
                                                </div>
                                                <div className="flex-1 p-5 flex flex-col justify-center space-y-3 bg-[var(--color-surface)]">
                                                    <div><p className="text-[14px] font-black text-[var(--color-text)]">Masuk ke Akun</p><p className="text-[9px] text-[var(--color-text-muted)]">Selamat datang kembali!</p></div>
                                                    {['Email', 'Password'].map(f => <div key={f} className="space-y-1"><label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{f}</label><div className="h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-3 flex items-center"><span className="text-[9px] text-[var(--color-text-muted)]">{f === 'Email' ? 'admin@sekolah.sch.id' : '••••••••'}</span></div></div>)}
                                                    <button className="w-full h-9 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black hover:opacity-90 transition-all">Masuk →</button>
                                                    <p className="text-[9px] text-center text-[var(--color-text-muted)]">Lupa password? <span className="text-[var(--color-primary)] font-black cursor-pointer">Reset di sini</span></p>
                                                </div>
                                            </div>
                                        } code={`// Auth: branded sidebar + form\n<div className="flex min-h-screen">\n  <div className="w-1/2 bg-[var(--color-primary)] flex flex-col items-center justify-center p-12">\n    {/* Branding */}\n  </div>\n  <div className="flex-1 flex items-center justify-center p-8">\n    <form className="w-full max-w-sm space-y-4">\n      {/* Inputs */}\n      <button type="submit" className="w-full h-11 rounded-2xl bg-[var(--color-primary)] text-white font-black">Masuk</button>\n    </form>\n  </div>\n</div>`} />
                                        <UIBlock title="07 · Settings Page" children={
                                            <div className="flex border border-[var(--color-border)] rounded-2xl overflow-hidden h-64">
                                                <div className="w-36 bg-[var(--color-surface)] border-r border-[var(--color-border)] p-3 shrink-0">
                                                    {[{ g: 'Akun', items: ['Profil', 'Password', 'Notifikasi'] }, { g: 'Sistem', items: ['Tampilan', 'Integrasi', 'Keamanan'] }].map(({ g, items }) => (
                                                        <div key={g} className="mb-4">
                                                            <p className="text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40 px-2 mb-1.5">{g}</p>
                                                            {items.map((item, i) => <div key={item} className={`px-3 py-1.5 rounded-lg text-[9px] font-black mb-0.5 cursor-pointer ${i === 0 && g === 'Akun' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>{item}</div>)}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex-1 p-4 bg-[var(--color-surface-alt)] space-y-4">
                                                    <p className="text-[11px] font-black text-[var(--color-text)]">Informasi Profil</p>
                                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 text-sm font-black flex items-center justify-center shrink-0">AS</div>
                                                        <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-[var(--color-text)]">Admin Sekolah</p><p className="text-[8px] text-[var(--color-text-muted)]">admin@sekolah.sch.id</p></div>
                                                        <button className="text-[9px] font-black text-[var(--color-primary)]">Edit</button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {['Nama Lengkap', 'Jabatan', 'Nomor HP', 'Kode Sekolah'].map(f => <div key={f} className="space-y-1"><label className="text-[7px] font-black text-[var(--color-text-muted)] uppercase opacity-50">{f}</label><div className="h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]" /></div>)}
                                                    </div>
                                                    <div className="flex justify-end"><button className="px-4 h-8 rounded-xl bg-[var(--color-primary)] text-white text-[9px] font-black">Simpan Perubahan</button></div>
                                                </div>
                                            </div>
                                        } code={`// Settings: sidebar categories + form\n<div className="flex">\n  <nav className="w-48 shrink-0">\n    {categories.map(cat => (\n      <div key={cat.group}>\n        <p className="text-[7px] font-black uppercase tracking-widest opacity-40 px-2 mb-1">{cat.group}</p>\n        {cat.items.map(item => (\n          <button key={item} onClick={() => setActive(item)}\n            className={\`w-full px-3 py-1.5 rounded-lg text-[9px] font-black\n              \${active===item ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}\`}>\n            {item}\n          </button>\n        ))}\n      </div>\n    ))}\n  </nav>\n  <main className="flex-1 p-4">{/* form content */}</main>\n</div>`} />
                                        <UIBlock title="08 · Split Panel (Master-Detail)" children={
                                            <div className="flex border border-[var(--color-border)] rounded-2xl overflow-hidden h-64">
                                                <div className="w-44 bg-[var(--color-surface)] border-r border-[var(--color-border)] overflow-y-auto shrink-0">
                                                    <div className="p-2 border-b border-[var(--color-border)]"><div className="h-7 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-2 flex items-center gap-1.5"><FontAwesomeIcon icon={faSearch} className="text-[8px] text-[var(--color-text-muted)]" /><span className="text-[9px] text-[var(--color-text-muted)]">Cari siswa…</span></div></div>
                                                    {[{ init: 'AS', name: 'Andi Setiawan', kelas: '6A', active: true }, { init: 'BP', name: 'Budi Pratama', kelas: '5B' }, { init: 'CD', name: 'Citra Dewi', kelas: '6A' }, { init: 'DK', name: 'Dian Kusuma', kelas: '4C' }, { init: 'ER', name: 'Eka Rahmawati', kelas: '5A' }].map(s => (
                                                        <div key={s.init} className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer border-l-2 transition-colors ${s.active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-transparent hover:bg-[var(--color-surface-alt)]'}`}>
                                                            <div className={`w-7 h-7 rounded-full text-[8px] font-black flex items-center justify-center shrink-0 ${s.active ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>{s.init}</div>
                                                            <div className="min-w-0"><p className={`text-[9px] font-black truncate ${s.active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{s.name}</p><p className="text-[7px] text-[var(--color-text-muted)] opacity-60">{s.kelas}</p></div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex-1 p-4 bg-[var(--color-surface-alt)] space-y-3">
                                                    <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 text-sm font-black flex items-center justify-center shrink-0">AS</div><div><p className="text-[12px] font-black text-[var(--color-text)]">Andi Setiawan</p><p className="text-[9px] text-[var(--color-text-muted)]">Kelas 6A · NIS 240101</p></div></div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[{ l: 'Nilai', v: '92.4' }, { l: 'Hadir', v: '98%' }, { l: 'Tugas', v: '45/48' }].map(({ l, v }) => <div key={l} className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center"><p className="text-[13px] font-black text-[var(--color-text)]">{v}</p><p className="text-[7px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{l}</p></div>)}
                                                    </div>
                                                    <div className="flex gap-2"><button className="flex-1 h-8 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black border border-[var(--color-primary)]/20">Edit Data</button><button className="h-8 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black"><FontAwesomeIcon icon={faEllipsisVertical} className="text-xs" /></button></div>
                                                </div>
                                            </div>
                                        } code={`// Master-detail split\n<div className="flex h-full">\n  {/* Master list */}\n  <aside className="w-44 border-r border-[var(--color-border)] overflow-y-auto">\n    {items.map(item => (\n      <div key={item.id} onClick={() => setSelected(item.id)}\n        className={\`flex items-center gap-2 px-3 py-2.5 cursor-pointer border-l-2\n          \${selected===item.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'\n          : 'border-transparent hover:bg-[var(--color-surface-alt)]'}\`}>\n        {/* item content */}\n      </div>\n    ))}\n  </aside>\n  {/* Detail panel */}\n  <main className="flex-1 p-4">{/* selected item detail */}</main>\n</div>`} />
                                        <UIBlock title="09 · Chat & Messaging" children={<ChatPreview />} code={`const [messages, setMessages] = useState(initialMessages)\nconst [msg, setMsg] = useState('')\n\nconst send = () => {\n  if (!msg.trim()) return\n  setMessages(prev => [...prev, { from:'me', text:msg, time:'Baru saja' }])\n  setMsg('')\n}\n\n{messages.map((m, i) => (\n  <div key={i} className={\`flex gap-2 items-end \${m.from==='me' ? 'flex-row-reverse' : ''}\`}>\n    <div className={\`max-w-[70%] px-3 py-2 rounded-2xl text-[10px]\n      \${m.from==='me' ? 'bg-[var(--color-primary)] text-white rounded-br-sm'\n      : 'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-bl-sm'}\`}>\n      {m.text}\n    </div>\n  </div>\n))}`} />
                                    </div>
                                </div>
                            </section></LazySection>

                            {/* C · Content Layouts */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faGrip} number="C" title="Content Layouts" />
                                <div className="space-y-8">
                                    <UIBlock fullWidth title="10 · Breakpoint Visualizer" children={<BreakpointPreview />} code={`// Tailwind breakpoints\n// xs:  0px   — 1 col\n// sm:  640px — 1 col\n// md:  768px — 2 col  (md:grid-cols-2)\n// lg:  1024px — 3 col (lg:grid-cols-3)\n// xl:  1280px — 4 col (xl:grid-cols-4)\n// 2xl: 1536px — 4+ col\n\n<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">\n  {items.map(item => <Card key={item.id} {...item} />)}\n</div>`} />
                                    <div className="grid lg:grid-cols-2 gap-8">
                                        <UIBlock title="11 · Grid System Demo" children={
                                            <div className="space-y-3">
                                                {[{ label: '1 col', cols: 1 }, { label: '2 col', cols: 2 }, { label: '3 col', cols: 3 }, { label: '4 col', cols: 4 }, { label: '2:1 sidebar', cols: '2fr 1fr' }].map(({ label, cols }) => (
                                                    <div key={label} className="flex items-center gap-3">
                                                        <span className="text-[9px] font-mono text-[var(--color-text-muted)] w-20 shrink-0">{label}</span>
                                                        <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: typeof cols === 'number' ? `repeat(${cols},1fr)` : cols }}>
                                                            {Array.from({ length: typeof cols === 'number' ? cols : 2 }).map((_, i) => (
                                                                <div key={i} className="h-5 rounded bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/20 flex items-center justify-center"><span className="text-[7px] font-mono text-[var(--color-primary)] opacity-50">1/{typeof cols === 'number' ? cols : i === 0 ? '2' : '1'}</span></div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        } code={`{/* Responsive grid */}\n<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">\n\n{/* Sidebar + content (2:1) */}\n<div className="grid grid-cols-[2fr_1fr] gap-6">\n\n{/* Equal 3-col */}\n<div className="grid grid-cols-3 gap-4">\n\n{/* Auto-fit responsive */}\n<div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">`} />
                                        <UIBlock title="12 · Card Grid Variants" children={
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Auto-fill dengan featured card</p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[{ c: 'bg-indigo-500/10', t: 'Matematika', v: '92' }, { c: 'bg-emerald-500/10', t: 'B. Indonesia', v: '88' }, { c: 'bg-amber-500/10', t: 'IPA', v: '85' }].map(({ c, t, v }) => (
                                                        <div key={t} className={`p-3 rounded-xl ${c} border border-[var(--color-border)]`}><p className="text-[9px] font-black text-[var(--color-text)]">{v}</p><p className="text-[7px] font-black text-[var(--color-text-muted)] opacity-70">{t}</p></div>
                                                    ))}
                                                    <div className="col-span-2 p-3 rounded-xl bg-[var(--color-primary)] flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center"><FontAwesomeIcon icon={faChartLine} className="text-white text-xs" /></div>
                                                        <div><p className="text-[11px] font-black text-white">Rata-rata: 88.3</p><p className="text-[8px] text-white/60">↑ 3.2% dari semester lalu</p></div>
                                                    </div>
                                                    <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[var(--color-primary)] transition-all">
                                                        <FontAwesomeIcon icon={faPlus} className="text-[var(--color-text-muted)] text-sm" />
                                                        <span className="text-[7px] font-black text-[var(--color-text-muted)]">Tambah</span>
                                                    </div>
                                                </div>
                                            </div>
                                        } code={`<div className="grid grid-cols-3 gap-3">\n  {cards.map(card => (\n    <div key={card.id} className="p-3 rounded-xl border">{/* card */}</div>\n  ))}\n  {/* Featured/spanning card */}\n  <div className="col-span-2 p-3 rounded-xl bg-[var(--color-primary)]">\n    {/* highlighted content */}\n  </div>\n  {/* Add card */}\n  <button className="p-3 rounded-xl border border-dashed hover:border-[var(--color-primary)]">\n    <FontAwesomeIcon icon={faPlus} />\n  </button>\n</div>`} />
                                        <UIBlock title="13 · Calendar & Schedule" children={
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <button className="w-7 h-7 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-colors"><FontAwesomeIcon icon={faChevronRight} className="text-[9px] rotate-180" /></button>
                                                    <span className="text-[11px] font-black text-[var(--color-text)]">Januari 2025</span>
                                                    <button className="w-7 h-7 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-colors"><FontAwesomeIcon icon={faChevronRight} className="text-[9px]" /></button>
                                                </div>
                                                <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                                    <div className="grid grid-cols-6 border-b border-[var(--color-border)]">
                                                        {['07:00', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((d, i) => <div key={d} className={`p-2 text-center text-[8px] font-black ${i === 3 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{d}</div>)}
                                                    </div>
                                                    {[
                                                        { time: '07:00', slots: [{ s: 1, label: 'Matematika', c: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700' }, { s: null }, { s: 3, label: 'B.Indo', c: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700', active: true }, { s: null }, { s: null }] },
                                                        { time: '08:00', slots: [{ s: null }, { s: 2, label: 'IPA', c: 'bg-amber-500/10 border-amber-500/30 text-amber-700' }, { s: 3, label: '⚡ Sekarang', c: 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]', active: true }, { s: 4, label: 'Seni', c: 'bg-rose-500/10 border-rose-500/30 text-rose-700' }, { s: 5, label: 'PKN', c: 'bg-sky-500/10 border-sky-500/30 text-sky-700' }] },
                                                    ].map(row => (
                                                        <div key={row.time} className="grid grid-cols-6 border-b border-[var(--color-border)] last:border-0">
                                                            <div className="p-2 text-center text-[7px] font-mono text-[var(--color-text-muted)] opacity-40 flex items-center justify-center">{row.time}</div>
                                                            {row.slots.map((slot, i) => (
                                                                <div key={i} className={`p-1.5 ${slot.active ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                                                    {slot.s && <div className={`rounded-lg px-1.5 py-1 text-[7px] font-black border truncate ${slot.c}`}>{slot.label}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        } code={`{/* Weekly schedule grid */}\n<div className="grid grid-cols-6"> {/* time + 5 days */}\n  {/* Header row */}\n  {['','Senin','Selasa','Rabu','Kamis','Jumat'].map(d => (\n    <div key={d} className="p-2 text-center text-[8px] font-black">{d}</div>\n  ))}\n  {/* Time slots */}\n  {hours.map(hour => (\n    <>\n      <div key={hour} className="text-[7px] font-mono opacity-40">{hour}</div>\n      {days.map(day => (\n        <div key={day}>{getClass(hour, day) && (\n          <div className="rounded-lg p-1 text-[7px] font-black border">{getClass(hour,day).name}</div>\n        )}</div>\n      ))}\n    </>\n  ))}\n</div>`} />
                                        <UIBlock title="14 · Gallery & Media Grid" children={
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-4 gap-1.5">
                                                    {[
                                                        { cls: 'col-span-2 row-span-2', bg: 'bg-indigo-200', icon: faUsers },
                                                        { cls: '', bg: 'bg-emerald-200', icon: faCalendar },
                                                        { cls: '', bg: 'bg-amber-200', icon: faFileLines },
                                                        { cls: '', bg: 'bg-rose-200', icon: faCamera },
                                                        { cls: '', bg: 'bg-sky-200', icon: faGlobe },
                                                    ].map(({ cls, bg, icon }, i) => (
                                                        <div key={i} className={`${cls} ${bg} rounded-xl aspect-square flex items-center justify-center cursor-pointer hover:opacity-90 transition-all relative group overflow-hidden`}>
                                                            <FontAwesomeIcon icon={icon} className="text-white text-xl opacity-60" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center"><FontAwesomeIcon icon={faSearch} className="text-white opacity-0 group-hover:opacity-100 transition-all" /></div>
                                                        </div>
                                                    ))}
                                                    <div className="bg-[var(--color-surface-alt)] border-2 border-dashed border-[var(--color-border)] rounded-xl aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[var(--color-primary)] transition-all">
                                                        <FontAwesomeIcon icon={faPlus} className="text-[var(--color-text-muted)] text-sm" />
                                                        <span className="text-[7px] font-black text-[var(--color-text-muted)]">+12</span>
                                                    </div>
                                                </div>
                                            </div>
                                        } code={`{/* Gallery grid with masonry-ish featured */}\n<div className="grid grid-cols-4 gap-1.5">\n  <div className="col-span-2 row-span-2 bg-indigo-200 rounded-xl aspect-square relative group">\n    <img src={photo.url} className="w-full h-full object-cover rounded-xl" />\n    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-xl" />\n  </div>\n  {otherPhotos.map(photo => (\n    <div key={photo.id} className="rounded-xl aspect-square overflow-hidden">\n      <img src={photo.url} className="w-full h-full object-cover" />\n    </div>\n  ))}\n  <div className="rounded-xl aspect-square border-2 border-dashed flex items-center justify-center cursor-pointer">\n    <span className="text-[9px] font-black text-[var(--color-text-muted)]">+{remaining}</span>\n  </div>\n</div>`} />
                                    </div>
                                </div>
                            </section></LazySection>

                            {/* D · Overlay & State */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faLayerGroup} number="D" title="Overlays & States" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="15 · Modal Variants" children={
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Size Variants</p>
                                            <div className="space-y-2">
                                                {[{ size: 'sm', w: 'w-48' }, { size: 'md', w: 'w-64' }, { size: 'lg', w: 'w-80' }, { size: 'fullscreen', w: 'w-full' }].map(({ size, w }) => (
                                                    <div key={size} className="flex items-center gap-3">
                                                        <span className="text-[9px] font-mono text-[var(--color-text-muted)] w-20 shrink-0">size={size}</span>
                                                        <div className={`${w} bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2 flex items-center justify-between shadow-sm`}>
                                                            <div className="flex gap-1"><div className="h-1.5 rounded bg-[var(--color-border)] w-12" /><div className="h-1.5 rounded bg-[var(--color-border)] w-8" /></div>
                                                            <FontAwesomeIcon icon={faXmark} className="text-[var(--color-text-muted)] text-[9px]" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    } code={`// Modal sizes via prop\n<Modal isOpen={open} onClose={() => setOpen(false)} size="lg">\n  {/* content */}\n</Modal>\n\n// Sizes: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'\n// sm: max-w-sm  (384px)\n// md: max-w-md  (448px)  ← default\n// lg: max-w-lg  (512px)\n// xl: max-w-xl  (576px)\n// fullscreen: fixed inset-0`} />
                                    <UIBlock title="16 · Overlay & Backdrop Stack" children={
                                        <div className="relative border border-[var(--color-border)] rounded-2xl overflow-hidden h-52">
                                            <div className="absolute inset-0 bg-[var(--color-surface-alt)] p-3 flex items-start"><span className="text-[8px] font-black text-[var(--color-text-muted)] opacity-30">z-0 · Main content</span></div>
                                            <div className="absolute inset-0 bg-black/20" />
                                            <div className="absolute inset-4 bg-[var(--color-surface)] rounded-xl shadow-2xl border border-[var(--color-border)] flex flex-col">
                                                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]"><span className="text-[10px] font-black text-[var(--color-text)]">Modal z-50</span><FontAwesomeIcon icon={faXmark} className="text-[var(--color-text-muted)] text-xs cursor-pointer" /></div>
                                                <div className="flex-1 p-4 relative">
                                                    <div className="h-2 rounded bg-[var(--color-border)] w-3/4 mb-2" />
                                                    <div className="h-2 rounded bg-[var(--color-border)] w-1/2" />
                                                    <div className="absolute inset-0 bg-black/20 rounded-b-xl" />
                                                    <div className="absolute inset-3 bg-[var(--color-surface)] rounded-xl shadow-xl border border-[var(--color-border)] p-3">
                                                        <p className="text-[8px] font-black text-[var(--color-text)] mb-1">Confirm Dialog z-[60]</p>
                                                        <div className="flex gap-1.5 justify-end mt-2"><div className="px-3 py-1 rounded-lg border border-[var(--color-border)] text-[7px] font-black text-[var(--color-text-muted)]">Batal</div><div className="px-3 py-1 rounded-lg bg-rose-500 text-[7px] font-black text-white">Hapus</div></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-3 right-3 px-2 py-1 bg-emerald-500 rounded-lg shadow-lg"><span className="text-[7px] font-black text-white">Toast z-[999]</span></div>
                                        </div>
                                    } code={`// Z-index convention\nconst Z = {\n  base:     'z-0',     // normal content\n  dropdown: 'z-10',    // menus, tooltips\n  sticky:   'z-20',    // sticky header\n  drawer:   'z-30',    // side panels\n  backdrop: 'z-40',    // overlay scrim\n  modal:    'z-50',    // dialogs\n  toast:    'z-[999]', // always on top\n}`} />
                                    <UIBlock title="17 · Tooltip Positioning" children={
                                        <div className="grid grid-cols-3 gap-4 place-items-center py-4">
                                            <div />
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-lg">Top center</div>
                                                <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1.5" />
                                                <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black text-[var(--color-text)]">Hover</button>
                                            </div>
                                            <div />
                                            <div className="flex items-center gap-1">
                                                <div className="bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-lg">Left</div>
                                                <div className="w-2 h-2 bg-slate-900 rotate-45 -ml-1.5" />
                                                <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black text-[var(--color-text)]">Hover</button>
                                            </div>
                                            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                                                <p className="text-[8px] font-black text-[var(--color-text)] mb-0.5">Rich Popover</p>
                                                <p className="text-[7px] text-[var(--color-text-muted)]">Konten detail lebih kaya</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black text-[var(--color-text)]">Hover</button>
                                                <div className="w-2 h-2 bg-slate-900 rotate-45 -mr-1.5" />
                                                <div className="bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-lg">Right</div>
                                            </div>
                                            <div />
                                            <div className="flex flex-col items-center gap-1">
                                                <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black text-[var(--color-text)]">Hover</button>
                                                <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1.5" />
                                                <div className="bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-lg">Bottom</div>
                                            </div>
                                            <div />
                                        </div>
                                    } code={`// 8-direction tooltip\n<div className="relative group">\n  <button>Hover me</button>\n  {/* Top */}\n  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">\n    <div className="bg-slate-900 text-white text-[8px] px-2 py-1 rounded-lg whitespace-nowrap">Tooltip text</div>\n    <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />\n  </div>\n  {/* Right: right-full top-1/2 -translate-y-1/2 */}\n  {/* Bottom: top-full left-1/2 */}\n  {/* Left: left-full top-1/2 */}\n</div>`} />
                                    <UIBlock title="18 · Scroll Area & Sticky" children={
                                        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden h-52 flex flex-col">
                                            <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-2.5 flex items-center justify-between z-10 shadow-sm">
                                                <span className="text-[10px] font-black text-[var(--color-text)]">Daftar Siswa</span>
                                                <span className="text-[8px] font-black text-[var(--color-text-muted)] opacity-50">sticky ↑</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto">
                                                {[{ i: 'AS', n: 'Andi Setiawan', k: '6A', c: 'bg-indigo-500/10 text-indigo-600' }, { i: 'BP', n: 'Budi Pratama', k: '5B', c: 'bg-emerald-500/10 text-emerald-700' }, { i: 'CD', n: 'Citra Dewi', k: '6A', c: 'bg-rose-500/10 text-rose-700' }, { i: 'DK', n: 'Dian Kusuma', k: '4C', c: 'bg-amber-500/10 text-amber-700' }, { i: 'ER', n: 'Eka Rahmawati', k: '5A', c: 'bg-sky-500/10 text-sky-700' }].map(s => (
                                                    <div key={s.i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-alt)] transition-colors cursor-pointer">
                                                        <div className={`w-7 h-7 rounded-full ${s.c} text-[8px] font-black flex items-center justify-center shrink-0`}>{s.i}</div>
                                                        <div className="flex-1"><p className="text-[10px] font-black text-[var(--color-text)]">{s.n}</p><p className="text-[8px] text-[var(--color-text-muted)] opacity-60">{s.k}</p></div>
                                                        <FontAwesomeIcon icon={faChevronRight} className="text-[var(--color-text-muted)] text-[9px] opacity-40" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    } code={`{/* Sticky header inside scrollable container */}\n<div className="h-96 overflow-y-auto">\n  <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-2.5 shadow-sm">\n    <h3 className="text-[10px] font-black text-[var(--color-text)]">Daftar Siswa</h3>\n  </div>\n  <div>\n    {items.map(item => (\n      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]">\n        {/* item */}\n      </div>\n    ))}\n  </div>\n</div>`} />
                                </div>
                            </section></LazySection>

                            {/* E · Utility Layouts */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faCode} number="E" title="Utility & Structural" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="19 · Page Header & Hero" children={
                                        <div className="space-y-4">
                                            {[
                                                { style: 'simple', badge: null },
                                                { style: 'with-badge', badge: 'Semester 1' },
                                            ].map(({ style, badge }) => (
                                                <div key={style} className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-2">
                                                    {badge && <div><span className="px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-[9px] font-black">{badge}</span></div>}
                                                    <div className="flex items-end justify-between gap-4">
                                                        <div>
                                                            <div className="text-[9px] text-[var(--color-text-muted)] mb-1">Dashboard / <span className="text-[var(--color-primary)]">Data Siswa</span></div>
                                                            <h2 className="text-[16px] font-black font-heading tracking-tight text-[var(--color-text)]">Data Siswa</h2>
                                                            <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">320 siswa aktif · TA 2024/2025</p>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black text-[var(--color-text-muted)] flex items-center gap-1.5"><FontAwesomeIcon icon={faDownload} className="text-[8px]" />Export</button>
                                                            <button className="h-8 px-3 rounded-xl bg-[var(--color-primary)] text-white text-[9px] font-black flex items-center gap-1.5"><FontAwesomeIcon icon={faPlus} className="text-[8px]" />Tambah</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`<div className="flex items-end justify-between gap-4 mb-6">\n  <div>\n    <Breadcrumb items={['Dashboard', 'Data Siswa']} />\n    <h1 className="text-[24px] font-black font-heading tracking-tight text-[var(--color-text)] mt-1">Data Siswa</h1>\n    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">320 siswa aktif · TA 2024/2025</p>\n  </div>\n  <div className="flex gap-2 shrink-0">\n    <button className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black">Export</button>\n    <button className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black">+ Tambah</button>\n  </div>\n</div>`} />
                                    <UIBlock title="20 · Stepper Layout" children={
                                        <div className="space-y-4">
                                            <div className="flex items-center">
                                                {['Data Diri', 'Sekolah', 'Akademik', 'Review'].map((step, i) => (
                                                    <div key={step} className="flex items-center flex-1 last:flex-none">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className={`w-8 h-8 rounded-full text-[9px] font-black flex items-center justify-center transition-all ${i < 2 ? 'bg-[var(--color-primary)] text-white' : i === 2 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-2 border-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                                                                {i < 2 ? <FontAwesomeIcon icon={faCheck} className="text-[8px]" /> : i + 1}
                                                            </div>
                                                            <span className={`text-[7px] font-black uppercase tracking-wide whitespace-nowrap ${i === 2 ? 'text-[var(--color-primary)]' : i < 2 ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-muted)] opacity-50'}`}>{step}</span>
                                                        </div>
                                                        {i < 3 && <div className={`h-0.5 flex-1 mx-2 mb-4 ${i < 2 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-3">
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Langkah 3 · Akademik</p>
                                                <div className="grid grid-cols-2 gap-2">{['Kelas', 'Tahun Masuk', 'Wali Kelas', 'Jurusan'].map(f => <div key={f} className="h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-3 flex items-center"><span className="text-[9px] text-[var(--color-text-muted)] opacity-50">{f}…</span></div>)}</div>
                                                <div className="flex justify-between pt-1"><button className="px-4 h-9 rounded-xl border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)]">← Kembali</button><button className="px-4 h-9 rounded-xl bg-[var(--color-primary)] text-white text-[9px] font-black">Lanjut →</button></div>
                                            </div>
                                        </div>
                                    } code={`const [step, setStep] = useState(0)\nconst steps = ['Data Diri', 'Sekolah', 'Akademik', 'Review']\n\n{steps.map((label, i) => (\n  <div key={label} className="flex items-center flex-1 last:flex-none">\n    <div className="flex flex-col items-center gap-1">\n      <div className={\`w-8 h-8 rounded-full text-[9px] font-black flex items-center justify-center\n        \${i < step ? 'bg-[var(--color-primary)] text-white'\n        : i === step ? 'border-2 border-[var(--color-primary)] text-[var(--color-primary)]'\n        : 'border border-[var(--color-border)] text-[var(--color-text-muted)]'}\`}>\n        {i < step ? <FontAwesomeIcon icon={faCheck} /> : i + 1}\n      </div>\n      <span className="text-[7px] font-black uppercase">{label}</span>\n    </div>\n    {i < steps.length - 1 && (\n      <div className={\`h-0.5 flex-1 mx-2 mb-4 \${i < step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}\`} />\n    )}\n  </div>\n))}`} />
                                    <UIBlock title="21 · Responsive Table" children={
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-2">Desktop — horizontal scroll</p>
                                                <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                                                    <table className="w-full text-[10px] min-w-[400px]">
                                                        <thead><tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                                            {['Nama', 'Kelas', 'Nilai Rata', 'Status', 'Aksi'].map(h => <th key={h} className="p-2.5 text-left font-black text-[var(--color-text-muted)] uppercase tracking-widest text-[8px] opacity-60">{h}</th>)}
                                                        </tr></thead>
                                                        <tbody>
                                                            {[{ n: 'Andi Setiawan', k: '6A', v: '92.4', s: 'Aktif' }, { n: 'Budi Pratama', k: '5B', v: '78.1', s: 'Pending' }].map(r => (
                                                                <tr key={r.n} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-alt)] transition-colors">
                                                                    <td className="p-2.5 font-black text-[var(--color-text)]">{r.n}</td>
                                                                    <td className="p-2.5 font-mono text-[var(--color-text-muted)]">{r.k}</td>
                                                                    <td className="p-2.5 font-black text-[var(--color-text)]">{r.v}</td>
                                                                    <td className="p-2.5"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${r.s === 'Aktif' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'}`}>{r.s}</span></td>
                                                                    <td className="p-2.5"><button className="text-[9px] font-black text-[var(--color-primary)]">Edit</button></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50 mb-2">Mobile — card per row</p>
                                                <div className="space-y-2">
                                                    {[{ i: 'AS', n: 'Andi Setiawan', k: '6A', v: '92.4', s: 'Aktif', c: 'bg-indigo-500/10 text-indigo-600' }, { i: 'BP', n: 'Budi Pratama', k: '5B', v: '78.1', s: 'Pending', c: 'bg-emerald-500/10 text-emerald-700' }].map(r => (
                                                        <div key={r.i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-md transition-all cursor-pointer">
                                                            <div className={`w-8 h-8 rounded-full ${r.c} text-[9px] font-black flex items-center justify-center shrink-0`}>{r.i}</div>
                                                            <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-[var(--color-text)]">{r.n}</p><p className="text-[8px] text-[var(--color-text-muted)] opacity-60">{r.k} · Nilai {r.v}</p></div>
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black shrink-0 ${r.s === 'Aktif' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>{r.s}</span>
                                                            <FontAwesomeIcon icon={faChevronRight} className="text-[var(--color-text-muted)] text-[9px] opacity-40 shrink-0" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    } code={`{/* Desktop: overflow-x-auto table */}\n<div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">\n  <table className="w-full text-[10px] min-w-[400px]">\n    {/* ... */}\n  </table>\n</div>\n\n{/* Mobile: card fallback (show at sm:hidden) */}\n<div className="space-y-2 sm:hidden">\n  {items.map(item => (\n    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">\n      {/* compact card */}\n    </div>\n  ))}\n</div>\n\n{/* Show table on md+ */}\n<div className="hidden md:block">\n  <table>{/* ... */}</table>\n</div>`} />
                                    <UIBlock title="22 · Page Loading Skeleton" children={
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Skeleton className="h-6 w-32 rounded-xl" />
                                                <Skeleton className="h-9 w-24 rounded-xl" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[0, 1, 2].map(i => <div key={i} className="p-4 rounded-2xl border border-[var(--color-border)] space-y-2"><Skeleton className="h-5 w-16 rounded-lg" /><Skeleton className="h-3 w-24 rounded-lg" /></div>)}
                                            </div>
                                            <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                                                {[0, 1, 2, 3].map(i => (
                                                    <div key={i} className="flex items-center gap-4 p-3 border-b border-[var(--color-border)] last:border-0">
                                                        <Skeleton className="w-8 h-8 rounded-full" />
                                                        <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-32 rounded" /><Skeleton className="h-2 w-20 rounded" /></div>
                                                        <Skeleton className="h-5 w-12 rounded-full" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    } code={`{/* Skeleton states menggunakan <Skeleton /> component */}\n<div className="flex items-center justify-between">\n  <Skeleton className="h-6 w-32 rounded-xl" />\n  <Skeleton className="h-9 w-24 rounded-xl" />\n</div>\n\n<div className="grid grid-cols-3 gap-3">\n  {[0, 1, 2].map(i => (\n    <div key={i} className="p-4 rounded-2xl border border-[var(--color-border)] space-y-2">\n      <Skeleton className="h-5 w-16 rounded-lg" />\n      <Skeleton className="h-3 w-24 rounded-lg" />\n    </div>\n  ))}\n</div>`} />
                                </div>
                            </section></LazySection>

                            {/* F · Special States */}
                            <LazySection><section className="space-y-10">
                                <SectionHeader icon={faFileLines} number="F" title="Special Page States" />
                                <div className="grid lg:grid-cols-2 gap-8">
                                    <UIBlock title="23 · Full Page Empty State" children={
                                        <div className="space-y-4">
                                            {[
                                                { icon: faClipboardList, bg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]', title: 'Belum ada laporan', desc: 'Buat laporan pertama untuk mulai melacak perkembangan siswa.', cta: '+ Buat Laporan', ctaColor: 'bg-[var(--color-primary)] text-white' },
                                                { icon: faSearch, bg: 'bg-amber-500/10 text-amber-600', title: 'Tidak ditemukan', desc: 'Tidak ada siswa yang cocok dengan "kelas 99". Coba kata lain.', cta: 'Reset Filter', ctaColor: 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]' },
                                            ].map(({ icon, bg, title, desc, cta, ctaColor }) => (
                                                <div key={title} className="flex flex-col items-center text-center p-6 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] gap-3">
                                                    <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}><FontAwesomeIcon icon={icon} className="text-lg" /></div>
                                                    <div><h4 className="text-[12px] font-black text-[var(--color-text)] mb-1">{title}</h4><p className="text-[9px] text-[var(--color-text-muted)] leading-relaxed opacity-70">{desc}</p></div>
                                                    <button className={`px-4 py-2 rounded-xl text-[9px] font-black ${ctaColor} hover:opacity-90 active:scale-95 transition-all`}>{cta}</button>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`<div className="flex flex-col items-center text-center p-12 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] gap-4">\n  <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">\n    <FontAwesomeIcon icon={faClipboardList} className="text-2xl" />\n  </div>\n  <div>\n    <h3 className="text-[16px] font-black text-[var(--color-text)] mb-2">Belum ada laporan</h3>\n    <p className="text-[11px] text-[var(--color-text-muted)] max-w-xs leading-relaxed">Buat laporan pertama untuk mulai melacak perkembangan siswa.</p>\n  </div>\n  <button className="px-6 h-10 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black">+ Buat Laporan</button>\n</div>`} />
                                    <UIBlock title="24 · Error Pages" children={
                                        <div className="grid grid-cols-3 gap-3">
                                            {[{ code: '404', msg: 'Halaman tidak ditemukan', color: 'text-[var(--color-primary)]' }, { code: '403', msg: 'Akses ditolak', color: 'text-amber-500' }, { code: '500', msg: 'Server error', color: 'text-rose-500' }].map(({ code, msg, color }) => (
                                                <div key={code} className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex flex-col items-center text-center gap-2">
                                                    <div className={`text-2xl font-black font-heading ${color}`}>{code}</div>
                                                    <p className="text-[8px] font-black text-[var(--color-text)]">{msg}</p>
                                                    <button className={`text-[8px] font-black ${color} hover:underline`}>← Kembali</button>
                                                </div>
                                            ))}
                                        </div>
                                    } code={`// 404 Page\nexport default function NotFoundPage() {\n  const navigate = useNavigate()\n  return (\n    <div className="min-h-screen flex items-center justify-center">\n      <div className="text-center space-y-4">\n        <h1 className="text-[80px] font-black font-heading text-[var(--color-primary)] leading-none">404</h1>\n        <p className="text-[16px] font-black text-[var(--color-text)]">Halaman tidak ditemukan</p>\n        <p className="text-[11px] text-[var(--color-text-muted)]">URL yang kamu akses tidak ada atau sudah dipindahkan.</p>\n        <div className="flex gap-3 justify-center">\n          <button onClick={() => navigate(-1)} className="px-5 h-10 rounded-xl border border-[var(--color-border)] text-[10px] font-black">← Kembali</button>\n          <button onClick={() => navigate('/')} className="px-5 h-10 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black">Dashboard</button>\n        </div>\n      </div>\n    </div>\n  )\n}`} />
                                    <UIBlock title="25 · Print / PDF Layout" children={
                                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                                            <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                                                <div className="space-y-0.5"><p className="text-[10px] font-black text-gray-800">SD NEGERI 01 BANYUWANGI</p><p className="text-[8px] text-gray-500">Jl. Veteran No.1 · (0333) 123456 · sdn01bwi@disdik.go.id</p><p className="text-[8px] text-gray-400">Akreditasi A · NPSN: 20540001</p></div>
                                                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><FontAwesomeIcon icon={faGaugeHigh} className="text-white text-sm" /></div>
                                            </div>
                                            <p className="text-[9px] font-black text-gray-700 text-center uppercase tracking-widest">LAPORAN NILAI SEMESTER 1 · TA 2024/2025</p>
                                            <table className="w-full text-[8px] border-collapse">
                                                <thead><tr className="bg-gray-100"><th className="border border-gray-200 p-1.5 text-left text-gray-600">Mata Pelajaran</th><th className="border border-gray-200 p-1.5 text-gray-600">UTS</th><th className="border border-gray-200 p-1.5 text-gray-600">UAS</th><th className="border border-gray-200 p-1.5 text-gray-600 font-black">Akhir</th></tr></thead>
                                                <tbody>
                                                    {[['Matematika', '85', '90', '88'], ['B. Indonesia', '88', '92', '90'], ['IPA', '82', '87', '85']].map(([m, ...v]) => (
                                                        <tr key={m}>{[m, ...v].map((c, i) => <td key={i} className={`border border-gray-200 p-1.5 ${i === 3 ? 'font-black text-gray-800' : 'text-gray-600'}`}>{c}</td>)}</tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                {['Wali Kelas', 'Kepala Sekolah'].map(r => <div key={r} className="text-center"><div className="h-10 border-b border-gray-300 mb-1" /><p className="text-[7px] text-gray-500">{r}</p></div>)}
                                            </div>
                                        </div>
                                    } code={`// Print-optimized — tambahkan ke CSS global:\n// @media print {\n//   .no-print { display: none; }\n//   .print-only { display: block; }\n// }\n\n<div className="bg-white p-8 print:shadow-none">\n  {/* Header sekolah */}\n  <div className="flex justify-between border-b pb-4 mb-6">\n    <div>\n      <h1 className="text-sm font-black">SD NEGERI 01 BANYUWANGI</h1>\n      <p className="text-xs text-gray-500">Jl. Veteran No.1</p>\n    </div>\n    <img src={logo} className="w-12 h-12" />\n  </div>\n  {/* Tabel nilai */}\n  {/* Tanda tangan */}\n</div>`} />
                                </div>
                            </section></LazySection>

                            {/* Developer Notes */}
                            <LazySection><section className="space-y-4">
                                <SectionHeader icon={faCode} number="G" title="Developer Cheat Sheet" />
                                <div className="grid md:grid-cols-3 gap-4">
                                    {[
                                        { color: 'text-amber-400', icon: faPalette, title: 'Theme Utils', lines: ['.glass — backdrop blur', '.gradient-text — primary clip', '.scrollbar-hide — clean UI', 'animate-in slide-in-from-bottom-6'] },
                                        { color: 'text-emerald-400', icon: faExpand, title: 'Layout Tokens', lines: ['--sidebar-w: 260px', '--content-max: 1280px', '--header-h: 56px', '--card-radius: 1.5rem'] },
                                        { color: 'text-indigo-400', icon: faShieldHalved, title: 'Z-Index Scale', lines: ['dropdown: z-10', 'sticky header: z-20', 'drawer: z-30', 'modal: z-50 / toast: z-[999]'] },
                                    ].map(({ color, icon, title, lines }) => (
                                        <div key={title} className="p-5 rounded-2xl bg-slate-900 border border-white/5 space-y-3">
                                            <div className={`flex items-center gap-2 ${color}`}>
                                                <FontAwesomeIcon icon={icon} className="text-xs" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {lines.map(l => <p key={l} className="text-[10px] font-mono text-sky-300">{l}</p>)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section></LazySection>

                        </div>
                    )}

                </div>

                {/* Floating TOC — pill navigator */}
                {(TOC_DATA[activeTab]?.length > 0) && (() => {
                    const sections = TOC_DATA[activeTab]
                    const activeIdx = Math.max(0, sections.findIndex(s => s.id === activeSectionId))
                    const activeLabel = sections[activeIdx]?.label ?? ''

                    const goTo = (idx) => {
                        const target = sections[idx]
                        if (!target) return
                        document.getElementById(target.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        setActiveSectionId(target.id)
                    }

                    return (
                        <div className="hidden lg:flex fixed bottom-6 right-6 z-30 items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg shadow-black/10 px-1 py-1">
                            {/* Prev */}
                            <button
                                onClick={() => goTo(activeIdx - 1)}
                                disabled={activeIdx === 0}
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                            >
                                <FontAwesomeIcon icon={faChevronDown} className="text-[8px] rotate-180" />
                            </button>

                            {/* Label + counter */}
                            <div className="px-2 flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-black text-[var(--color-text)] truncate max-w-[120px]">{activeLabel}</span>
                                <span className="text-[8px] font-black text-[var(--color-text-muted)] opacity-50 shrink-0">{activeIdx + 1}/{sections.length}</span>
                            </div>

                            {/* Next */}
                            <button
                                onClick={() => goTo(activeIdx + 1)}
                                disabled={activeIdx === sections.length - 1}
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                            >
                                <FontAwesomeIcon icon={faChevronDown} className="text-[8px]" />
                            </button>
                        </div>
                    )
                })()}

                {/* Demo Modal */}
                <Modal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} title="System Configuration Review" size="lg">
                    <div className="space-y-6">
                        <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                            </div>
                            <div className="space-y-1">
                                <h5 className="text-xs font-black text-amber-700 uppercase tracking-widest">Unsaved Changes Detected</h5>
                                <p className="text-xs text-amber-600/80 font-medium leading-relaxed">You are about to modify the global theme preference. This will affect all connected users across the primary cluster.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Target Cluster</label>
                                <div className="h-10 px-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl flex items-center text-[11px] font-bold text-[var(--color-text-muted)]">MAIN_PRODUCTION_01</div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Risk Level</label>
                                <div className="h-10 px-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center text-[10px] font-black text-rose-600 uppercase tracking-widest">CRITICAL_HIGH</div>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border)]">
                            <button onClick={() => setIsDemoModalOpen(false)} className="px-6 h-11 rounded-xl text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">ABORT MISSION</button>
                            <button onClick={() => { setIsDemoModalOpen(false); addToast('Changes deployed successfully!', 'success') }} className="px-6 h-11 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all">DEPLOY CHANGES</button>
                        </div>
                    </div>
                </Modal>
            </PlaygroundCtx.Provider>
        </DashboardLayout>
    )
}