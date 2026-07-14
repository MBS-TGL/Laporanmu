import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faBoxArchive, faTrash, faBroom, faImage, faFilePdf, faFileLines,
    faSpinner, faCircleCheck, faTriangleExclamation, faFolderOpen,
    faMagnifyingGlass, faArrowsRotate, faDatabase
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import Breadcrumb from '@shared/components/Breadcrumb'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'

export default function StoragePage() {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const [buckets, setBuckets] = useState([])
    const [loading, setLoading] = useState(true)
    const [largeFiles, setLargeFiles] = useState([])
    const [loadingFiles, setLoadingFiles] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [scanResults, setScanResults] = useState(null)

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getFileIcon = (mimetype, name) => {
        const fallback = { icon: faFileLines, color: 'text-slate-500' }
        if (!name) return fallback
        const lowerName = name.toLowerCase()
        if (mimetype?.includes('image/') || lowerName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return { icon: faImage, color: 'text-amber-500' }
        if (mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) return { icon: faFilePdf, color: 'text-red-500' }
        if (lowerName.endsWith('.sql')) return { icon: faDatabase, color: 'text-cyan-500' }
        if (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx')) return { icon: faFileLines, color: 'text-emerald-500' }
        if (lowerName.match(/\.(zip|rar|tar|gz)$/)) return { icon: faBoxArchive, color: 'text-indigo-500' }
        return fallback
    }

    const fetchBuckets = async () => {
        setLoading(true)
        setLoadingFiles(true)
        try {
            // Note: listBuckets requires service_role or specific policies for admin.
            // If it fails due to RLS, it means admin needs policies on storage.buckets table.
            const { data, error } = await supabase.storage.listBuckets()
            if (error) throw error
            const validBuckets = data || []
            setBuckets(validBuckets)

            // Fetch files
            let allFiles = []
            for (const b of validBuckets) {
                // List files in root of bucket (limit 100 for performance/safety)
                const { data: files, error: fileErr } = await supabase.storage.from(b.name).list('', {
                    limit: 100,
                    sortBy: { column: 'created_at', order: 'desc' },
                })

                if (!fileErr && files) {
                    for (const f of files) {
                        // Skip folders (usually no id or very small stub)
                        if (!f.id) continue;

                        allFiles.push({
                            ...f,
                            bucketName: b.name,
                            sizeBytes: f.metadata?.size || 0,
                            mimetype: f.metadata?.mimetype
                        })
                    }
                }
            }

            // Sort by size descending
            allFiles.sort((a, b) => b.sizeBytes - a.sizeBytes)
            setLargeFiles(allFiles.slice(0, 10))

        } catch (error) {
            console.error(error)
            addToast('Gagal memuat daftar bucket: ' + error.message, 'error')
        } finally {
            setLoading(false)
            setLoadingFiles(false)
        }
    }

    const handleDeleteFile = async (bucketName, fileName) => {
        if (!confirm(`Yakin ingin menghapus ${fileName} secara permanen dari bucket ${bucketName}?`)) return

        try {
            const { error } = await supabase.storage.from(bucketName).remove([fileName])
            if (error) throw error
            addToast(`File ${fileName} berhasil dihapus`, 'success')
            await logAudit({ 
                action: 'DELETE', 
                source: 'SYSTEM',
                tableName: 'storage', 
                newData: { bucket: bucketName, file: fileName } 
            })
            setLargeFiles(prev => prev.filter(f => !(f.bucketName === bucketName && f.name === fileName)))
        } catch (e) {
            addToast('Gagal menghapus file: ' + e.message, 'error')
        }
    }

    useEffect(() => {
        fetchBuckets()
    }, [])

    const handleScan = async () => {
        setScanning(true)
        setScanResults(null)

        try {
            // 1. Gather all files in our current state (which we just fetched from buckets)
            // Note: Since listBuckets doesn't give us multi-level depth easily without a recursive func,
            // we will use the files we already fetched in `fetchBuckets` state as our scan baseline.
            // A more robust backend cron would do this better, but this works for root files.

            // Re-fetch everything if empty to ensure accuracy
            let allStorageFiles = []
            for (const b of buckets) {
                const { data: files } = await supabase.storage.from(b.name).list('', { limit: 500 })
                if (files) {
                    files.forEach(f => {
                        if (f.id) {
                            allStorageFiles.push({ ...f, bucketName: b.name })
                        }
                    })
                }
            }

            // 2. Gather all URLs from Database
            const dbUrls = new Set()

            // From Students
            const { data: students } = await supabase.from('students').select('photo_url').not('photo_url', 'is', null)
            students?.forEach(s => s.photo_url && dbUrls.add(s.photo_url))

            // From Teachers
            const { data: teachers } = await supabase.from('teachers').select('avatar_url').not('avatar_url', 'is', null)
            teachers?.forEach(t => t.avatar_url && dbUrls.add(t.avatar_url))

            // From Profiles
            const { data: profiles } = await supabase.from('profiles').select('avatar_url').not('avatar_url', 'is', null)
            profiles?.forEach(p => p.avatar_url && dbUrls.add(p.avatar_url))

            // From Settings
            const { data: settings } = await supabase.from('school_settings').select('logo_url').not('logo_url', 'is', null)
            settings?.forEach(s => s.logo_url && dbUrls.add(s.logo_url))

            // 3. Compare and find orphans
            const orphanFiles = []
            let orphanSize = 0

            allStorageFiles.forEach(file => {
                // Determine if this file exists in any of the DB URLs.
                // Note: DB URLs are usually public URLs (https://xxx.supabase.co/storage/v1/object/public/bucketName/fileName)
                // We extract the pure file path from the dbUrl to compare cleanly (ignoring domains, queries, etc)

                const storagePath = `${file.bucketName}/${file.name}`

                let isUsed = false
                for (const url of dbUrls) {
                    try {
                        const parsedUrl = new URL(url)
                        const decodedPathname = decodeURIComponent(parsedUrl.pathname)
                        // If the pathname ends with "bucketName/fileName", it's a match
                        if (decodedPathname.endsWith(storagePath)) {
                            isUsed = true
                            break
                        }
                    } catch {
                        // In case url is just a raw path like "bucketName/fileName" (not a full URL)
                        if (url.includes(storagePath)) {
                            isUsed = true
                            break
                        }
                    }
                }

                if (!isUsed) {
                    orphanFiles.push(file)
                    orphanSize += (file.metadata?.size || 0)
                }
            })

            setScanResults({
                orphanCount: orphanFiles.length,
                orphanSize: formatBytes(orphanSize),
                totalScanned: allStorageFiles.length,
                filesToDelete: orphanFiles // store array of objects {bucketName, name}
            })

            addToast(`Ditemukan ${orphanFiles.length} file sampah`, 'info')

        } catch (error) {
            console.error(error)
            addToast('Gagal memindai storage: ' + error.message, 'error')
        } finally {
            setScanning(false)
        }
    }

    const handleDeleteOrphans = async () => {
        if (!scanResults || scanResults.filesToDelete.length === 0) return
        if (!confirm(`SANGAT BERBAHAYA: Anda yakin ingin menghapus ${scanResults.orphanCount} file ini secara permanen? \n\nTindakan ini tidak dapat dibatalkan.`)) return

        setScanning(true)
        let deletedCount = 0

        try {
            // Group files by bucket to optimize delete bulk operations
            const bucketsMap = {}
            for (const f of scanResults.filesToDelete) {
                if (!bucketsMap[f.bucketName]) bucketsMap[f.bucketName] = []
                bucketsMap[f.bucketName].push(f.name)
            }

            for (const bucketName of Object.keys(bucketsMap)) {
                const filesToRemove = bucketsMap[bucketName]
                const { error } = await supabase.storage.from(bucketName).remove(filesToRemove)
                if (error) throw error
                deletedCount += filesToRemove.length
            }

            addToast(`${deletedCount} file sampah berhasil dibersihkan`, 'success')
            await logAudit({ 
                action: 'DELETE', 
                source: 'SYSTEM',
                tableName: 'storage', 
                newData: { orphan_cleanup: true, count: deletedCount } 
            })
            setScanResults(null)
            fetchBuckets() // reload data

        } catch (error) {
            console.error(error)
            addToast('Gagal menghapus file: ' + error.message, 'error')
        } finally {
            setScanning(false)
        }
    }

    return (
        <DashboardLayout title="Storage Manager">
            <div className="p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['Storage Analysis']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Storage Manager</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase tracking-widest">Admin Only</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Kelola file unggahan, bucket storage, dan bersihkan file sampah.
                        </p>
                    </div>
                    <button onClick={fetchBuckets} disabled={loading}
                        className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[12px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition flex items-center gap-2 shadow-sm">
                        <FontAwesomeIcon icon={faArrowsRotate} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Overview & Buckets */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faFolderOpen} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-[var(--color-text)]">Storage Buckets</h2>
                                    <p className="text-[11px] text-[var(--color-text-muted)]">Daftar bucket yang ada di Supabase</p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="py-10 flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-3">
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl" />
                                    <span className="text-xs font-bold">Memuat buckets...</span>
                                </div>
                            ) : buckets.length === 0 ? (
                                <div className="py-10 text-center text-[var(--color-text-muted)] text-xs">
                                    Tidak ada bucket yang ditemukan atau akses ditolak.
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {buckets.map(b => (
                                        <div key={b.id} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 hover:bg-[var(--color-surface-alt)] transition-colors group cursor-pointer">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                                                    <FontAwesomeIcon icon={faBoxArchive} />
                                                    <span className="text-sm font-black tracking-tight">{b.name}</span>
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                                    {b.public ? 'Public' : 'Private'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                                                Dibuat: {new Date(b.created_at).toLocaleDateString('id-ID')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Large Files (Mock) */}
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-black text-[var(--color-text)]">File Berukuran Besar Baru-baru Ini</h2>
                                {loadingFiles && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[var(--color-text-muted)] text-sm" />}
                            </div>

                            {!loadingFiles && largeFiles.length === 0 ? (
                                <div className="py-6 text-center text-[var(--color-text-muted)] text-xs border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface-alt)]/30">
                                    Tidak ada file yang ditemukan.
                                </div>
                            ) : (
                                <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-2xl overflow-hidden text-sm relative">
                                    {largeFiles.map((f, i) => {
                                        const { icon, color } = getFileIcon(f.mimetype, f.name)
                                        return (
                                            <div key={`${f.bucketName}-${f.id}-${i}`} className="flex items-center justify-between p-3 hover:bg-[var(--color-surface-alt)] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                                                        <FontAwesomeIcon icon={icon} className={color} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[12px] truncate max-w-[140px] sm:max-w-[220px]" title={f.name}>{f.name}</div>
                                                        <div className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-widest">{f.bucketName}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[11px] font-mono font-bold text-[var(--color-text-muted)]">{formatBytes(f.sizeBytes)}</span>
                                                    <button onClick={() => handleDeleteFile(f.bucketName, f.name)} className="w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center" title="Hapus Permanen">
                                                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Orphan File Scanner */}
                    <div className="space-y-6">
                        <div className="glass rounded-[1.5rem] border border-amber-500/30 overflow-hidden relative">
                            {/* Ambient background for the card */}
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

                            <div className="p-6 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/30 shadow-inner">
                                    <FontAwesomeIcon icon={faBroom} className="text-xl" />
                                </div>
                                <h2 className="text-lg font-black text-[var(--color-text)] mb-2">Pembersih Storage</h2>
                                <p className="text-[12px] text-[var(--color-text-muted)] mb-6 leading-relaxed">
                                    Pindai storage untuk menemukan file (seperti pas foto atau dokumen) yang sudah tidak terhubung ke data murid atau sistem mana pun di database.
                                </p>

                                {!scanResults ? (
                                    <button
                                        onClick={handleScan} disabled={scanning}
                                        className="w-full h-12 rounded-xl bg-amber-500 text-white font-black hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                                    >
                                        <FontAwesomeIcon icon={scanning ? faSpinner : faMagnifyingGlass} className={scanning ? 'animate-spin' : ''} />
                                        {scanning ? 'Menyortir Database & Storage...' : 'Mulai Scan Storage'}
                                    </button>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="p-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Hasil Scan</span>
                                                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><FontAwesomeIcon icon={faCircleCheck} /> Selesai</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <div>
                                                    <p className="text-[10px] text-[var(--color-text-muted)]">File Sampah</p>
                                                    <p className="text-xl font-black text-rose-500">{scanResults.orphanCount}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-[var(--color-text-muted)]">Ukuran Total</p>
                                                    <p className="text-xl font-black text-rose-500">{scanResults.orphanSize}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-[10px] text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-2">
                                                Total dipindai: {scanResults.totalScanned.toLocaleString()} file
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDeleteOrphans}
                                                disabled={scanResults.filesToDelete.length === 0 || scanning}
                                                className="flex-1 h-10 rounded-xl bg-rose-500 text-white font-black hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                Hapus Permanen
                                            </button>
                                            <button
                                                onClick={() => setScanResults(null)} disabled={scanning}
                                                className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center justify-center"
                                                title="Batal"
                                            >
                                                <FontAwesomeIcon icon={faBroom} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-blue-500 mt-1 shrink-0" />
                            <div>
                                <p className="text-[12px] font-black text-blue-600 mb-1">Tips Hemat Storage</p>
                                <p className="text-[11px] text-blue-600/80 leading-relaxed">
                                    Pastikan setiap kali data siswa dihapus (misal siswa lulus atau pindah), trigger database juga ikut menghapus file pas foto yang terkait di Supabase Storage.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    )
}