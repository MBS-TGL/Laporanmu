import { useState, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faImage, faSearch, faSpinner, faXmark, 
    faCheck, faCloudArrowUp, faTrash, faFilter,
    faChevronLeft, faChevronRight
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '@lib/supabase'
import { useToast } from '@context'

const MediaLibraryModal = memo(({ isOpen, onClose, onSelect, currentSelection }) => {
    const { addToast } = useToast()
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all') // all | thumbnails | content
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, img: null, isDeleting: false })
    const [selectedAsset, setSelectedAsset] = useState(null)
    const [isDragging, setIsDragging] = useState(false)

    const fetchMedia = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch from thumbnails folder
            const { data: thumbData, error: thumbErr } = await supabase.storage.from('news').list('thumbnails', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            })
            
            // Fetch from content folder
            const { data: contentData, error: contentErr } = await supabase.storage.from('news').list('content', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            })

            if (thumbErr || contentErr) throw new Error('Gagal memuat galeri')

            const mappedThumbs = (thumbData || []).map(f => ({
                id: f.id,
                name: f.name,
                type: 'thumbnails',
                url: supabase.storage.from('news').getPublicUrl(`thumbnails/${f.name}`).data.publicUrl,
                created_at: f.created_at,
                size: f.metadata?.size,
                mimetype: f.metadata?.mimetype
            }))

            const mappedContent = (contentData || []).map(f => ({
                id: f.id,
                name: f.name,
                type: 'content',
                url: supabase.storage.from('news').getPublicUrl(`content/${f.name}`).data.publicUrl,
                created_at: f.created_at,
                size: f.metadata?.size,
                mimetype: f.metadata?.mimetype
            }))

            setImages([...mappedThumbs, ...mappedContent].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)))
            
            // Auto-select first image if nothing selected
            if (!currentSelection && images.length > 0 && !selectedAsset) {
                // Not auto-selecting to avoid confusion, but we could
            }
        } catch (err) {
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        if (isOpen) fetchMedia()
    }, [isOpen, fetchMedia])

    const handleFiles = async (files) => {
        if (!files || files.length === 0) return
        setUploading(true)
        let successCount = 0
        for (let i = 0; i < files.length; i++) {
            setUploadProgress(Math.round(((i) / files.length) * 100))
            const file = files[i]
            if (file.size > 5 * 1024 * 1024) {
                addToast(`${file.name} terlalu besar (Maks 5MB)`, 'error')
                continue
            }
            if (!file.type.startsWith('image/')) {
                addToast(`${file.name} bukan file gambar`, 'error')
                continue
            }
            const ext = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
            const { error } = await supabase.storage.from('news').upload(`thumbnails/${fileName}`, file)
            if (error) addToast(`Gagal: ${file.name}`, 'error')
            else successCount++
        }
        if (successCount > 0) {
            addToast(`${successCount} gambar berhasil diunggah`, 'success')
            fetchMedia()
        }
        setUploading(false)
        setUploadProgress(0)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!uploading) setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        if (uploading) return
        
        const files = Array.from(e.dataTransfer.files)
        handleFiles(files)
    }

    const handleDelete = async () => {
        if (!deleteConfirm.img) return
        setDeleteConfirm(prev => ({ ...prev, isDeleting: true }))

        try {
            const filePath = `${deleteConfirm.img.type}/${deleteConfirm.img.name}`
            const { data, error } = await supabase.storage.from('news').remove([filePath])
            
            if (error) throw error
            
            // Cek apakah ada file yang benar-benar terhapus
            if (!data || data.length === 0) {
                throw new Error('Gagal menghapus: File tidak ditemukan atau Anda tidak memiliki izin (periksa RLS Policy di Supabase).')
            }

            setImages(prev => prev.filter(i => !(i.name === deleteConfirm.img.name && i.type === deleteConfirm.img.type)))
            addToast('Gambar berhasil dihapus permanen', 'success')
            setDeleteConfirm({ isOpen: false, img: null, isDeleting: false })
        } catch (err) {
            addToast(err.message, 'error')
            setDeleteConfirm(prev => ({ ...prev, isDeleting: false }))
        }
    }

    const filteredImages = images.filter(img => {
        const matchesSearch = img.name.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = filter === 'all' || img.type === filter
        return matchesSearch && matchesFilter
    })

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            <div 
                className="relative w-full max-w-5xl bg-[var(--color-surface)] rounded-[2.5rem] border border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-[12000] bg-[var(--color-primary)]/10 backdrop-blur-sm border-4 border-dashed border-[var(--color-primary)] m-4 rounded-[2rem] flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                        <div className="w-20 h-20 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-3xl shadow-2xl animate-bounce">
                            <FontAwesomeIcon icon={faCloudArrowUp} />
                        </div>
                        <p className="mt-4 text-lg font-black text-[var(--color-primary)] uppercase tracking-widest">Lepaskan untuk Upload</p>
                    </div>
                )}
                
                {/* Header */}
                <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-surface-alt)]/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xl">
                            <FontAwesomeIcon icon={faImage} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[var(--color-text)] tracking-tight">Media Library</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Kelola & Pilih Aset Visual Informasi</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <label className={`h-10 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--color-primary)]/20 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCloudArrowUp} />}
                            {uploading ? `Uploading ${uploadProgress}%` : 'Upload Baru'}
                            <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFiles(Array.from(e.target.files || []))} />
                        </label>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-500 transition-colors">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-4 bg-[var(--color-surface-alt)]/10 shrink-0">
                    <div className="relative flex-1 group w-full">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Cari file berdasarkan nama..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-11 pl-12 pr-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-bold outline-none transition-all"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl shrink-0 w-full sm:w-auto">
                        {[
                            { id: 'all', label: 'Semua' },
                            { id: 'thumbnails', label: 'Thumbs' },
                            { id: 'content', label: 'Content' }
                        ].map(t => (
                            <button 
                                key={t.id}
                                onClick={() => setFilter(t.id)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === t.id ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[var(--color-surface)]">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--color-text-muted)]">
                                <FontAwesomeIcon icon={faSpinner} className="text-4xl animate-spin text-[var(--color-primary)]" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Memuat Library...</p>
                            </div>
                        ) : filteredImages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--color-text-muted)] opacity-40">
                                <FontAwesomeIcon icon={faImage} size="5x" />
                                <p className="font-bold text-center">Belum ada gambar {search ? 'yang cocok' : 'di folder ini'}.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredImages.map(img => (
                                    <div 
                                        key={img.url}
                                        onClick={() => setSelectedAsset(img)}
                                        onDoubleClick={() => onSelect(img.url)}
                                        className={`group relative aspect-square rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300 ${selectedAsset?.url === img.url ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'} ${currentSelection === img.url ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[var(--color-surface)]' : ''}`}
                                    >
                                        <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={img.name} />
                                        
                                        {/* Select Indicator */}
                                        {currentSelection === img.url && (
                                            <div className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-lg animate-in zoom-in-50">
                                                <FontAwesomeIcon icon={faCheck} />
                                            </div>
                                        )}

                                        {/* Delete Button */}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setDeleteConfirm({ isOpen: true, img, isDeleting: false })
                                            }}
                                            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-lg active:scale-95"
                                            title="Hapus aset"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                        </button>

                                        {/* Type Badge */}
                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-tighter opacity-70">
                                            {img.type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details Sidebar */}
                    <div className={`border-l border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 overflow-hidden hidden md:flex flex-col transition-all duration-300 ${selectedAsset ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
                        {selectedAsset ? (
                            <div className="p-6 space-y-6 w-80 shrink-0">
                                <div className="aspect-video rounded-xl overflow-hidden border border-[var(--color-border)] shadow-sm bg-white">
                                    <img src={selectedAsset.url} className="w-full h-full object-contain bg-slate-50" />
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="pb-4 border-b border-[var(--color-border)]">
                                        <h3 className="text-xs font-black text-[var(--color-text)] uppercase tracking-widest mb-1 truncate" title={selectedAsset.name}>
                                            {selectedAsset.name}
                                        </h3>
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-60">
                                            Diunggah {new Date(selectedAsset.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter mb-1">Ukuran</p>
                                            <p className="text-[10px] font-black text-[var(--color-text)]">{(selectedAsset.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter mb-1">Format</p>
                                            <p className="text-[10px] font-black text-[var(--color-text)] uppercase">{selectedAsset.mimetype?.split('/')[1] || 'IMG'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Asset URL</label>
                                        <div className="flex gap-2">
                                            <input readOnly value={selectedAsset.url} className="flex-1 h-9 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-medium outline-none" />
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedAsset.url)
                                                    addToast('URL disalin ke clipboard', 'success')
                                                }}
                                                className="w-9 h-9 shrink-0 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faCheck} className="text-xs" />
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => onSelect(selectedAsset.url)}
                                        className="w-full h-11 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 active:scale-95 transition-all"
                                    >
                                        Pilih Gambar Ini
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Footer Selection Info */}
                <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between shrink-0">
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] italic">
                        * Pilih gambar untuk menjadikannya thumbnail berita.
                    </p>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">Tutup</button>
                    </div>
                </div>

                {/* Custom Delete Confirmation Overlay */}
                {deleteConfirm.isOpen && (
                    <div className="absolute inset-0 z-[11000] flex items-center justify-center p-6 bg-black/10 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-[2rem] border border-[var(--color-border)] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-2xl mx-auto mb-6">
                                <FontAwesomeIcon icon={faTrash} />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text)] text-center mb-2">Hapus Aset Permanen?</h3>
                            <p className="text-xs text-[var(--color-text-muted)] text-center mb-8 leading-relaxed">
                                File <span className="text-[var(--color-text)] font-black">"{deleteConfirm.img?.name}"</span> akan dihapus selamanya dari server. Berita yang menggunakan gambar ini mungkin akan mengalami error.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setDeleteConfirm({ isOpen: false, img: null, isDeleting: false })}
                                    disabled={deleteConfirm.isDeleting}
                                    className="h-12 rounded-xl border border-[var(--color-border)] text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    disabled={deleteConfirm.isDeleting}
                                    className="h-12 rounded-xl bg-rose-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleteConfirm.isDeleting ? (
                                        <>
                                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                            Menghapus...
                                        </>
                                    ) : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
})

MediaLibraryModal.displayName = 'MediaLibraryModal'
export default MediaLibraryModal
