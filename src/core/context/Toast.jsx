import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCheckCircle, faExclamationTriangle, faXmarkCircle,
    faXmark, faRotateLeft, faCircleInfo, faFilePdf, faCloudArrowUp
} from '@fortawesome/free-solid-svg-icons'
import { useLanguage } from './Language'

const ToastContext = createContext({})

// ─── Konfigurasi Tampilan Per Tipe Toast (Ikon, Warna Background, Warna Border) ───
const TOAST_TYPES = {
    success: { icon: faCheckCircle, bg: 'bg-emerald-600', border: 'border-emerald-400/30' },
    error: { icon: faXmarkCircle, bg: 'bg-red-600', border: 'border-red-400/30' },
    info: { icon: faCircleInfo, bg: 'bg-indigo-600', border: 'border-indigo-400/30' },
    warning: { icon: faExclamationTriangle, bg: 'bg-amber-500', border: 'border-amber-300/30' },
    undo: { icon: faCheckCircle, bg: 'bg-[#3730a3]', border: 'border-indigo-400/30' },
    pdf: { icon: faFilePdf, bg: 'bg-rose-600', border: 'border-rose-400/30' },
    upload: { icon: faCloudArrowUp, bg: 'bg-sky-600', border: 'border-sky-400/30' },
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    // Simpan ID Timer setTimeout Per Toast Di useRef (Bukan useState) Karena Timer Ini Bukan
    // Bagian Dari Tampilan Yang Perlu Memicu Re-Render — Hanya Dibutuhkan Untuk Dibatalkan
    // (clearTimeout) Saat Toast Ditutup Manual Atau Saat Undo Dipilih
    const timerRefs = useRef({})
    // [FIX] Ref terpisah untuk melacak timer exit (300ms animasi fade-out) —
    // agar bisa di-clear juga saat unmount, mencegah setState dipanggil setelah unmount
    const exitTimerRefs = useRef({})
    const { t } = useLanguage()

    // [FIX] Cleanup semua timer yang masih berjalan saat ToastProvider unmount.
    // Tanpa ini, setTimeout di removeToast (exit animation 300ms) dan auto-dismiss timer
    // bisa masih berjalan dan memanggil setToasts setelah component sudah unmount —
    // yang di React 18 tidak crash tapi tetap membuang resource dan bisa menimbulkan
    // warning di test environment.
    useEffect(() => {
        return () => {
            Object.values(timerRefs.current).forEach(clearTimeout)
            Object.values(exitTimerRefs.current).forEach(clearTimeout)
        }
    }, [])

    // Hapus Toast Dalam Dua Tahap: Tandai "exiting" Dulu Untuk Memicu Animasi Keluar (Class
    // toast-exit Di CSS), Baru Setelah 300ms (Durasi Animasi) Benar-Benar Dihapus Dari Array.
    // Tanpa Tahap Ini, Toast Akan Hilang Mendadak Tanpa Animasi Fade-Out.
    // clearTimeout Dipanggil Untuk Membatalkan Timer Auto-Dismiss Jika removeToast Dipicu Manual
    // (Misalnya Klik Tombol Close) Sebelum Timer Itu Habis, Dan Entry timerRefs.current[id]
    // Dibersihkan Agar Tidak Menumpuk Selamanya Di Memory Selama Toast Terus Bermunculan
    // Sepanjang Sesi Penggunaan App.
    const removeToast = useCallback((id) => {
        clearTimeout(timerRefs.current[id])
        delete timerRefs.current[id]

        // [FIX] Rename 'toast' agar tidak shadow 't' dari useLanguage() di scope luar —
        // sebelumnya: prev.map(t => ...) dan prev.filter(t => ...) yang membingungkan
        setToasts(prev => prev.map(toast => toast.id === id ? { ...toast, exiting: true } : toast))

        // [FIX] Simpan exit timer ke exitTimerRefs agar bisa di-clear saat unmount
        exitTimerRefs.current[id] = setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id))
            delete exitTimerRefs.current[id]
        }, 300)
    }, [])

    // Tampilkan Toast Biasa Yang Hilang Otomatis Setelah `duration` Milidetik
    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { id, message, type }])

        timerRefs.current[id] = setTimeout(() => {
            removeToast(id)
        }, duration)

        return id
    }, [removeToast])

    // Tampilkan Toast Dengan Tombol "Batalkan" Dan Progress Bar Visual — Dipakai Untuk Aksi Yang
    // Bisa Diurungkan (Misalnya Hapus Data). Berbeda Dari addToast, Fungsi Ini Mengembalikan
    // { id, cancel } Sehingga Pemanggil Bisa Membatalkan Timer Secara Manual Dari Luar Jika Perlu
    // (Misalnya Saat Aksi Undo Sudah Pasti Tidak Mungkin Dipakai Lagi)
    const addUndoToast = useCallback((message, onUndo, undoDuration = 5000) => {
        const id = Date.now() + Math.random()

        setToasts(prev => [...prev, {
            id,
            message,
            type: 'undo',
            undoDuration,
            startedAt: Date.now(),
            onUndo,
        }])

        timerRefs.current[id] = setTimeout(() => {
            removeToast(id)
        }, undoDuration)

        const cancel = () => {
            removeToast(id)
        }

        return { id, cancel }
    }, [removeToast])

    // Dipanggil Saat Tombol "Batalkan" Diklik: Tutup Toast (removeToast Otomatis Membatalkan
    // Timer Auto-Dismiss-Nya), Lalu Jalankan Callback onUndo Yang Diberikan Pemanggil Toast Ini
    const handleUndo = useCallback((toast) => {
        removeToast(toast.id)
        toast.onUndo?.()
    }, [removeToast])

    // [FIX] useMemo pada value — tanpa ini object baru dibuat setiap render ToastProvider
    // (dipicu setiap kali ada toast masuk/keluar), menyebabkan semua consumer useToast()
    // ikut re-render meski addToast/addUndoToast/removeToast tidak berubah
    const contextValue = useMemo(
        () => ({ addToast, addUndoToast, removeToast }),
        [addToast, addUndoToast, removeToast]
    )

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            {/* Container Toast — Posisi Fixed Di Pojok Kanan Atas, Menumpuk Vertikal */}
            <div className="fixed top-4 right-4 left-4 sm:left-auto z-[99999] flex flex-col gap-2 sm:max-w-sm">
                {toasts.map(toast => {
                    const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info
                    const isUndo = toast.type === 'undo'

                    return (
                        <div
                            key={toast.id}
                            className={`${config.bg} ${config.border} ${toast.exiting ? 'toast-exit' : 'toast-enter'}
                                text-white px-3 py-2.5 sm:px-4 rounded-xl shadow-xl flex items-center gap-3 border relative overflow-hidden`}
                        >
                            {/* Progress Bar Yang Menyusut Mengikuti Sisa Waktu Sebelum Toast Undo Otomatis Tertutup */}
                            {isUndo && (
                                <div
                                    className="absolute bottom-0 left-0 h-0.5 bg-white/40 rounded-full"
                                    style={{
                                        animation: `shrink ${toast.undoDuration}ms linear forwards`,
                                        width: '100%',
                                    }}
                                />
                            )}

                            <FontAwesomeIcon icon={config.icon} className="text-base sm:text-lg shrink-0" />
                            <span className="flex-1 text-[11px] sm:text-sm font-semibold">{toast.message}</span>

                            {/* Tombol Batalkan — Hanya Tampil Untuk Toast Bertipe Undo */}
                            {isUndo && (
                                <button
                                    onClick={() => handleUndo(toast)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-[10px] font-black uppercase tracking-widest shrink-0"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                                    {t('toastUndoMsg') || 'Batalkan'}
                                </button>
                            )}

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0"
                            >
                                <FontAwesomeIcon icon={faXmark} className="text-xs" />
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Keyframe Animasi "shrink" Untuk Progress Bar Toast Undo Di Atas — Lebar Menyusut Dari 100% Ke 0% */}
            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </ToastContext.Provider>
    )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used within ToastProvider')
    return context
}