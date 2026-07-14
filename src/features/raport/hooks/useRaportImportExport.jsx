import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { BULAN, STORAGE_BUCKET } from '@utils/reports/raportConstants'
import { buildWaLines, escapeCsvCell, calcAvg } from '@utils/reports/raportHelpers'
import { RAPORT_TYPES, getClassLevel, getGradePredicate } from '@utils/reports/raportTypeRegistry'
import { buildRaportPDFHtml } from '@features/raport/utils/raportPrintHtml'
import { preloadRaportFonts } from '@features/raport/utils/raportFonts'

// Helper for persistent caching keys
const getCacheKey = (studentId, rType, month, year, semester, acadYear) => {
    if (rType === 'bulanan') {
        return `raport_link_${studentId}_bulanan_${month}_${year}`
    } else {
        const safeAcadYear = String(acadYear || '').replace(/\//g, '_')
        return `raport_link_${studentId}_${rType}_${semester}_${safeAcadYear}`
    }
}

// Helper withTimeout agar html2canvas tidak hang selamanya
const withTimeout = (promise, ms, label = 'Operasi') =>
    Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout setelah ${ms / 1000}s`)), ms)),
    ])

/**
 * Mengonversi seluruh element <img> di dalam cloneEl menjadi Base64 data URL.
 * Menggunakan element gambar asli (origEl) yang sudah pasti ter-load di DOM.
 * Ini krusial karena Browserless di cloud tidak bisa mengakses local dev assets
 * (seperti http://localhost:5173/src/assets/logo.png) atau relative paths.
 */
const convertImagesToBase64 = async (origEl, cloneEl) => {
    const origImgs = Array.from(origEl.querySelectorAll('img'))
    const cloneImgs = Array.from(cloneEl.querySelectorAll('img'))

    await Promise.all(cloneImgs.map(async (cloneImg, idx) => {
        const origImg = origImgs[idx]
        if (!origImg) return
        if (cloneImg.src.startsWith('data:')) return

        const getCanvasBase64 = (img) => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            return canvas.toDataURL('image/png')
        }

        // 1. Coba convert dengan Canvas menggunakan gambar asli (sangat cepat & aman jika loaded + CORS ok)
        try {
            if (origImg.naturalWidth > 0) {
                cloneImg.src = getCanvasBase64(origImg)
                return
            }
        } catch (e) {
            console.warn('[PDF Logo] Canvas conversion failed on original image, trying dynamic load:', e)
        }

        // 2. Coba buat new Image dengan crossOrigin='anonymous' (untuk local asset / Supabase URL yang belum ter-CORS di DOM asli)
        try {
            const base64 = await new Promise((resolve, reject) => {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => {
                    try {
                        resolve(getCanvasBase64(img))
                    } catch (err) {
                        reject(err)
                    }
                }
                img.onerror = () => reject(new Error('Failed to load image dynamically'))
                img.src = cloneImg.src
            })
            cloneImg.src = base64
            return
        } catch (e) {
            console.warn('[PDF Logo] Dynamic image canvas conversion failed, falling back to fetch:', e)
        }

        // 3. Fallback: Fetch file lalu convert ke base64
        try {
            const res = await fetch(cloneImg.src)
            const blob = await res.blob()
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
            })
            cloneImg.src = base64
        } catch (e) {
            console.error('Failed to convert image to base64:', cloneImg.src, e)
            // Pastikan URL minimal absolut agar Browserless bisa mencobanya jika itu domain publik
            if (cloneImg.src.startsWith('/') || cloneImg.src.startsWith('./')) {
                cloneImg.src = new URL(cloneImg.src, window.location.origin).href
            }
        }
    }))
}

// Helper to check if a public URL exists (e.g. not deleted from Supabase)
const checkUrlExists = async (url) => {
    if (!url) return false
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Range': 'bytes=0-0' }
        })
        return response.ok || response.status === 206
    } catch (e) {
        console.warn('[Storage Cache] Check failed (network/CORS), assuming exists:', e)
        return true
    }
}

export function useRaportImportExport(core, { printContainerRef, silentPrintRef, pageSize }) {
    const {
        addToast,
        selectedClass,
        selectedMonth,
        selectedYear,
        musyrif,
        students,
        scores,
        extras,
        setPreviewStudentId,
        setPrintQueue,
        setPrintRenderedCount,
        selectedStudentIds,
        bulanObj,
        settings,
        reportType,
        selectedSemester,
        academicYear,
        classLevel
    } = core

    // ── Local states ──
    const [raportLinks, setRaportLinks] = useState({}) // cache PDF links to avoid double uploading
    const [sendingWA, setSendingWA] = useState({}) // studentId -> 'generating' | 'uploading' | 'done' | null
    const [waBlastConfirm, setWaBlastConfirm] = useState(null)
    const [waBlast, setWaBlast] = useState(null) // { queue, idx, done, failed, active, status }
    const [zipBlast, setZipBlast] = useState(null) // { queue, idx, done, failed, total, active, status }
    const [exporting, setExporting] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportOpen] = useState(false)

    // Digital/Wet Signature States
    const [signMode, setSignMode] = useState(() => {
        try {
            return localStorage.getItem('raport_sign_mode') ?? 'basah'
        } catch {
            return 'basah'
        }
    }) // 'basah' | 'digital'
    const [signatures, setSignatures] = useState(null)
    const signaturesCache = useRef(null) // cache agar tidak re-fetch tiap toggle

    // Untuk reset cache saat kelas berubah
    useEffect(() => {
        signaturesCache.current = null
        setSignatures(null)
    }, [selectedClass?.id])

    // Fungsi fetch — panggil saat signMode berubah ke 'digital'
    const fetchSignatures = async (classId) => {
        if (!classId) return
        if (signaturesCache.current) {
            setSignatures(signaturesCache.current)
            return
        }

        try {
            // Step 1: ambil homeroom_teacher_id dari class
            const { data: classData, error: classErr } = await supabase
                .from('classes')
                .select('homeroom_teacher_id')
                .eq('id', classId)
                .single()

            if (classErr) throw classErr
            const homeroomTeacherId = classData?.homeroom_teacher_id

            // Step 2: ambil TTD pengasuh + wali kelas sekaligus
            const { data: sigs, error: sigsErr } = await supabase
                .from('signatures')
                .select('role, signature_url, person_id, teachers:person_id(name)')
                .eq('is_active', true)
                .in('person_id', [homeroomTeacherId, import.meta.env.VITE_PENGASUH_ID].filter(Boolean))

            if (sigsErr) throw sigsErr

            const result = {
                pengasuh: {
                    nama: sigs?.find(s => s.role === 'pengasuh')?.teachers?.name ?? null,
                    url: sigs?.find(s => s.role === 'pengasuh')?.signature_url ?? null
                },
                wali_kelas: {
                    nama: sigs?.find(s => s.role === 'wali_kelas')?.teachers?.name ?? null,
                    url: sigs?.find(s => s.role === 'wali_kelas')?.signature_url ?? null
                }
            }

            signaturesCache.current = result
            setSignatures(result)
        } catch (err) {
            console.error('[Signatures] Error fetching signatures:', err)
        }
    }

    // Toggle handler
    const handleToggleSignMode = () => {
        const next = signMode === 'basah' ? 'digital' : 'basah'
        setSignMode(next)
        try {
            localStorage.setItem('raport_sign_mode', next)
        } catch (e) {
            console.error(e)
        }
        if (next === 'digital') {
            fetchSignatures(selectedClass?.id)
        }
    }

    // Fetch signatures on init if mode is digital
    useEffect(() => {
        if (signMode === 'digital' && selectedClass?.id) {
            fetchSignatures(selectedClass.id)
        }
    }, [signMode, selectedClass?.id])

    // Helper to get cached link
    const getCachedRaportLink = useCallback((studentId) => {
        const key = getCacheKey(studentId, reportType, selectedMonth, selectedYear, selectedSemester, academicYear)
        try {
            return localStorage.getItem(key) || null
        } catch (e) {
            console.error('Error reading localStorage cache:', e)
            return null
        }
    }, [reportType, selectedMonth, selectedYear, selectedSemester, academicYear])

    // Helper to set cached link
    const cacheRaportLink = useCallback((studentId, url) => {
        const key = getCacheKey(studentId, reportType, selectedMonth, selectedYear, selectedSemester, academicYear)
        try {
            localStorage.setItem(key, url)
            setRaportLinks(prev => ({ ...prev, [studentId]: url }))
        } catch (e) {
            console.error('Error writing localStorage cache:', e)
        }
    }, [reportType, selectedMonth, selectedYear, selectedSemester, academicYear])

    // Synchronize in-memory cache state when student list or period changes
    useEffect(() => {
        if (!students || !students.length) {
            setRaportLinks({})
            return
        }
        const loaded = {}
        students.forEach(s => {
            const key = getCacheKey(s.id, reportType, selectedMonth, selectedYear, selectedSemester, academicYear)
            try {
                const val = localStorage.getItem(key)
                if (val) loaded[s.id] = val
            } catch (e) {
                console.error(e)
            }
        })
        setRaportLinks(loaded)
    }, [students, reportType, selectedMonth, selectedYear, selectedSemester, academicYear])

    // Abort controllers
    const waBlastAbortRef = useRef(false)
    const zipAbortRef = useRef(false)

    // ── Fonnte API helper ──
    const fonnteToken = import.meta.env.VITE_FONNTE_TOKEN || ''

    // Kirim pesan teks via Fonnte
    const sendFonnteMessage = useCallback(async (target, message) => {
        if (!fonnteToken) return false
        try {
            const params = new URLSearchParams()
            params.append('target', target)
            params.append('message', message)
            const res = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: { 'Authorization': fonnteToken },
                body: params
            })
            const data = await res.json()
            return data.status === true
        } catch (err) {
            console.error('[Fonnte] Error sending text:', err)
            return false
        }
    }, [fonnteToken])

    // Kirim file PDF via Fonnte menggunakan URL publik Supabase
    // Wajib menggunakan FormData agar Fonnte dapat memproses URL file dengan benar
    const sendFonnteFile = useCallback(async (target, pdfUrl, filename) => {
        if (!fonnteToken || !pdfUrl) return false
        try {
            const formData = new FormData()
            formData.append('target', target)
            formData.append('url', pdfUrl)
            formData.append('message', filename || 'Raport PDF')
            formData.append('filename', filename || 'raport.pdf')
            const res = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: { 'Authorization': fonnteToken },
                body: formData
            })
            const data = await res.json()
            console.log('[Fonnte] File send response:', data)
            return data.status === true
        } catch (err) {
            console.error('[Fonnte] Error sending file:', err)
            return false
        }
    }, [fonnteToken])

    // ── WhatsApp message builder (returns raw text) ──
    const buildWaMessage = useCallback((student, pdfUrl = null) => {
        const lines = buildWaLines({
            student,
            sc: scores[student.id] || {},
            extras: extras[student.id],
            bulanObj,
            selectedYear,
            selectedClass,
            musyrif,
            pdfUrl,
            waFooter: settings.wa_footer,
            reportTypeId: reportType
        })
        return lines.join('\n')
    }, [scores, extras, bulanObj, selectedYear, selectedClass, musyrif, settings, reportType])

    // ── Send text only ──
    const sendWATextOnly = useCallback(async (student) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
        const message = buildWaMessage(student)

        // Try Fonnte first
        const sent = await sendFonnteMessage(phone, message)
        if (sent) {
            addToast(`✅ WA terkirim ke wali ${student.name.split(' ')[0]}`, 'success')
        } else {
            // Fallback to wa.me
            const tab = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
            if (!tab) addToast('Popup diblokir.', 'warning')
            else addToast(`📲 WA dibuka untuk ${student.name.split(' ')[0]}`, 'info')
        }
    }, [buildWaMessage, sendFonnteMessage, addToast])

    // ── Generate PDF Blob ──
    // Menggunakan Browserless.io via Supabase Edge Function untuk rendering pixel-perfect.
    // Fallback ke html2canvas+jsPDF jika Edge Function tidak tersedia.
    const generatePDFBlob = useCallback(async (student, contextOverride = {}) => {
        const activeBulanObj = contextOverride.bulanObj ?? bulanObj
        const activeYear = contextOverride.year ?? selectedYear
        const bulanStr = activeBulanObj?.id_str || String(contextOverride.month ?? selectedMonth)
        const safeName = student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
        const filename = `${safeName}_${bulanStr}_${activeYear}.pdf`
        const storagePath = `${activeYear}/${bulanStr}/${filename}`

        // Pastikan card sudah di-render di printContainerRef
        let cardEl = printContainerRef.current?.querySelector(`.raport-card[data-student-id="${student.id}"]`)
        if (!cardEl) {
            if (silentPrintRef) silentPrintRef.current = true
            setPrintRenderedCount(0); setPrintQueue([student.id])
            await new Promise(resolve => {
                let t = 0
                const timer = setInterval(() => {
                    const card = printContainerRef.current?.querySelector(`.raport-card[data-student-id="${student.id}"]`)
                    if (card) { cardEl = card; clearInterval(timer); resolve() }
                    if (++t > 80) { clearInterval(timer); resolve() }
                }, 100)
            })
        }
        if (!cardEl) throw new Error('Gagal render raport card')

        // Tunggu font & gambar siap
        await preloadRaportFonts()

        // Preload semua img di dalam cardEl
        const cardImgs = cardEl.querySelectorAll('img')
        await Promise.allSettled(Array.from(cardImgs).map(img => new Promise(res => {
            if (img.complete && img.naturalWidth > 0) return res()
            img.onload = res; img.onerror = res
        })))
        await new Promise(r => setTimeout(r, 300))

        // ── Coba Browserless via Supabase Edge Function (primary) ──
        try {
            // Buat clone untuk modifikasi image ke base64 agar tidak merusak DOM asli/preview
            const cardCloneForHTML = cardEl.cloneNode(true)
            await convertImagesToBase64(cardEl, cardCloneForHTML)
            const htmlContent = buildRaportPDFHtml(cardCloneForHTML, pageSize)

            const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
                'generate-raport-pdf',
                {
                    body: { htmlContent, filename, storagePath, pageSize },
                }
            )

            if (edgeError) throw edgeError
            if (!edgeData?.path) throw new Error('Edge function tidak mengembalikan path')

            // Ambil blob dari Supabase Storage
            const { data: blobData, error: downloadError } = await supabase.storage
                .from('raport-mbs')
                .download(edgeData.path)

            if (downloadError) throw downloadError
            if (!blobData) throw new Error('Gagal download PDF dari storage')

            if (silentPrintRef) silentPrintRef.current = false
            setPrintQueue([])
            setPrintRenderedCount(0)

            return { blob: blobData, filename }

        } catch (browserlessErr) {
            // ── Fallback ke html2canvas + jsPDF ──
            console.warn('Browserless Edge Function gagal, fallback ke html2canvas:', browserlessErr)
            return await _generatePDFBlobFallback({ cardEl, filename, pageSize })
        }

    }, [bulanObj, selectedMonth, selectedYear, printContainerRef, setPrintQueue, setPrintRenderedCount, pageSize])

    // ── Fallback: html2canvas + jsPDF (jika Browserless tidak tersedia) ──
    const _generatePDFBlobFallback = useCallback(async ({ cardEl, filename, pageSize: ps }) => {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf')
        ])

        const W = ps === 'f4' ? 812 : 794
        const H = ps === 'f4' ? 1247 : 1123
        const naturalW = cardEl.offsetWidth || cardEl.scrollWidth || W
        const naturalH = cardEl.offsetHeight || cardEl.scrollHeight || H

        const wrapper = document.createElement('div')
        wrapper.style.cssText = [
            'position:absolute', 'left:-99999px', 'top:-99999px',
            `width:${naturalW}px`, `height:${naturalH}px`,
            'overflow:hidden', 'background:white', 'z-index:-9999',
        ].join(';')

        const cardClone = cardEl.cloneNode(true)
        cardClone.style.cssText += [
            'position:relative', 'top:0', 'left:0',
            `width:${naturalW}px`, `min-width:${naturalW}px`, `height:${naturalH}px`,
            'margin:0', 'box-shadow:none', 'border:none', 'border-radius:0',
        ].join(';')

        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
            wrapper.appendChild(el.cloneNode(true))
        })

        const overrideStyle = document.createElement('style')
        overrideStyle.textContent = `
            .divider-gradient { background: linear-gradient(90deg, #1a5c35, #c8a400, #1a5c35) !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .raport-card table:not(.raport-header-table) td,
            .raport-card table:not(.raport-header-table) th {
                vertical-align: middle !important;
                padding-top: 3px !important;
                padding-bottom: 3px !important;
                line-height: 1.2 !important;
            }
        `
        wrapper.appendChild(overrideStyle)
        wrapper.appendChild(cardClone)
        document.body.appendChild(wrapper)

        const cloneImgs = cardClone.querySelectorAll('img')
        await Promise.allSettled(Array.from(cloneImgs).map(img => new Promise(res => {
            if (img.complete && img.naturalWidth > 0) return res()
            img.onload = res; img.onerror = res
            if (!img.complete) { const s = img.src; img.src = ''; img.crossOrigin = 'anonymous'; img.src = s }
        })))
        await new Promise(r => setTimeout(r, 300))

        try {
            const canvas = await withTimeout(
                html2canvas(wrapper, {
                    scale: 3, useCORS: true, allowTaint: false,
                    backgroundColor: '#ffffff', width: naturalW, height: naturalH,
                    scrollX: 0, scrollY: 0, logging: false, imageTimeout: 15000,
                    onclone: (doc) => {
                        doc.querySelectorAll('.school-name-ar, .school-subtitle-ar, [dir="rtl"]').forEach(el => {
                            el.style.direction = 'rtl'; el.style.unicodeBidi = 'embed'; el.style.whiteSpace = 'nowrap'
                        })
                        doc.querySelectorAll('table:not(.raport-header-table) td, table:not(.raport-header-table) th').forEach(cell => {
                            cell.style.setProperty('vertical-align', 'middle', 'important')
                            cell.style.setProperty('padding-top', '3px', 'important')
                            cell.style.setProperty('padding-bottom', '3px', 'important')
                            cell.style.setProperty('line-height', '1.2', 'important')
                        })
                    }
                }),
                25000, 'Render PDF'
            )
            const pdf = new jsPDF({ unit: 'mm', format: ps === 'f4' ? [215, 330] : 'a4', orientation: 'portrait', compress: true })
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, ps === 'f4' ? 215 : 210, ps === 'f4' ? 330 : 297)
            const blob = pdf.output('blob')
            if (!blob || blob.size < 5000) throw new Error('PDF terlalu kecil')
            return { blob, filename }
        } finally {
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
            setPrintQueue([])
            setPrintRenderedCount(0)
            if (silentPrintRef) silentPrintRef.current = false
        }
    }, [setPrintQueue, setPrintRenderedCount])

    // ── Upload to Supabase ──
    const uploadToSupabase = useCallback(async (blob, filename) => {
        const path = `${selectedYear}/${bulanObj?.id_str || selectedMonth}/${filename}`
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, blob, { contentType: 'application/pdf', cacheControl: '3600', upsert: true })

        if (error) throw error
        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
        if (!pub?.publicUrl) throw new Error('Gagal mendapatkan public URL')
        return pub.publicUrl
    }, [selectedMonth, selectedYear, bulanObj])

    // ── Generate and send WA ──
    const generateAndSendWA = useCallback(async (student) => {
        if (!student.phone) { addToast('Nomor WA wali tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')

        // Cek persistent cache raportLinks terlebih dahulu
        let cachedUrl = getCachedRaportLink(student.id)
        if (cachedUrl) {
            const exists = await checkUrlExists(cachedUrl)
            if (!exists) {
                const key = getCacheKey(student.id, reportType, selectedMonth, selectedYear, selectedSemester, academicYear)
                localStorage.removeItem(key)
                setRaportLinks(prev => {
                    const next = { ...prev }
                    delete next[student.id]
                    return next
                })
                cachedUrl = null
            }
        }

        if (cachedUrl) {
            setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))
            const message = buildWaMessage(student, cachedUrl)
            const sent = await sendFonnteMessage(phone, message)
            if (sent) {
                addToast(`✅ PDF Raport terkirim ke wali ${student.name.split(' ')[0]}`, 'success')
            } else {
                // Fallback to wa.me
                const tab = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                if (!tab) addToast('Popup diblokir.', 'warning')
                else addToast(`📲 WA dibuka untuk ${student.name.split(' ')[0]}`, 'info')
            }
            return
        }

        setSendingWA(prev => ({ ...prev, [student.id]: 'generating' }))
        try {
            const { blob, filename } = await generatePDFBlob(student)
            if (zipAbortRef.current || waBlastAbortRef.current) return

            setSendingWA(prev => ({ ...prev, [student.id]: 'uploading' }))
            const publicUrl = await uploadToSupabase(blob, filename)
            cacheRaportLink(student.id, publicUrl)

            setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))
            const message = buildWaMessage(student, publicUrl)
            const sent = await sendFonnteMessage(phone, message)
            if (sent) {
                addToast(`✅ PDF Raport terkirim ke wali ${student.name.split(' ')[0]}`, 'success')
            } else {
                // Fallback to wa.me
                const tab = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                if (!tab) addToast('Popup diblokir.', 'warning')
                else addToast(`📲 WA dibuka untuk ${student.name.split(' ')[0]}`, 'info')
            }
        } catch (e) {
            console.error('WA send error:', e)
            addToast(`Gagal kirim WA ke ${student.name.split(' ')[0]}: ${e.message}`, 'error')
            setSendingWA(prev => ({ ...prev, [student.id]: null }))
        }
    }, [getCachedRaportLink, cacheRaportLink, generatePDFBlob, uploadToSupabase, sendFonnteMessage, buildWaMessage, addToast, reportType, selectedMonth, selectedYear, selectedSemester, academicYear])

    // ── Blast WA ──
    const runWaBlast = useCallback(async (queue, abortRef, isDebug = false) => {
        let done = 0, failed = 0
        setWaBlast({ queue, idx: 0, done: 0, failed: 0, active: true, status: isDebug ? 'simulating' : 'generating' })
        for (let i = 0; i < queue.length; i++) {
            if (abortRef.current) break
            setWaBlast(prev => prev ? { ...prev, idx: i } : null)
            const student = queue[i]
            try {
                const phone = student.phone?.replace(/\D/g, '').replace(/^0/, '62')
                if (!phone) { failed++; continue }

                let url = 'https://laporanmu.github.io/mock_debug_preview.pdf'

                if (!isDebug) {
                    url = getCachedRaportLink(student.id)
                    if (url) {
                        const exists = await checkUrlExists(url)
                        if (!exists) {
                            const key = getCacheKey(student.id, reportType, selectedMonth, selectedYear, selectedSemester, academicYear)
                            localStorage.removeItem(key)
                            setRaportLinks(prev => {
                                const next = { ...prev }
                                delete next[student.id]
                                return next
                            })
                            url = null
                        }
                    }

                    if (!url) {
                        setWaBlast(prev => prev ? { ...prev, idx: i, status: 'generating' } : null)
                        const { blob, filename } = await generatePDFBlob(student)
                        if (abortRef.current) break

                        setWaBlast(prev => prev ? { ...prev, idx: i, status: 'uploading' } : null)
                        url = await uploadToSupabase(blob, filename)
                        cacheRaportLink(student.id, url)
                    }
                }

                if (abortRef.current) break
                setWaBlast(prev => prev ? { ...prev, idx: i, status: isDebug ? 'simulating' : 'sending' } : null)

                // Gunakan sendFonnteMessage (teks) dengan menyisipkan URL PDF karena Fonnte Free tidak support file
                const message = buildWaMessage(student, url)

                let sent = false
                if (isDebug) {
                    console.log(`%c[WA BLAST SIMULASI] Nomor: ${phone} (${student.name})\nPesan:\n${message}`, 'background: #e1f5fe; color: #0277bd; padding: 4px; border-radius: 4px;')
                    sent = true
                    await new Promise(r => setTimeout(r, 200))
                } else {
                    sent = await sendFonnteMessage(phone, message)
                    // Pause 1s to prevent rate limit
                    await new Promise(r => setTimeout(r, 1000))
                }

                if (sent) done++
                else failed++
            } catch (e) { failed++; console.error('WA Blast item error:', e) }
            setWaBlast(prev => prev ? { ...prev, done, failed } : null)
        }
        setWaBlast(prev => prev ? { ...prev, active: false } : null)
        addToast(isDebug ? `WA Blast Simulasi selesai: ${done} terproses (Lihat log di developer console!)` : `WA Blast selesai: ${done} terkirim, ${failed} gagal`, 'info')
    }, [getCachedRaportLink, cacheRaportLink, generatePDFBlob, uploadToSupabase, sendFonnteMessage, buildWaMessage, addToast, reportType, selectedMonth, selectedYear, selectedSemester, academicYear])

    // ── Blast ZIP ──
    const runZipBlast = useCallback(async (stuList, archEntry = null) => {
        const [{ default: JSZip }] = await Promise.all([import('jszip')])
        const zip = new JSZip()
        let done = 0, failed = 0
        const total = stuList.length
        zipAbortRef.current = false
        setZipBlast({ queue: stuList, idx: 0, done: 0, failed: 0, total, active: true, status: 'generating' })

        const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
        const bulanStr = archEntry ? BULAN.find(b => b.id === archEntry.month)?.id_str : (bulanObj?.id_str || String(selectedMonth))
        const yearStr = archEntry ? archEntry.year : selectedYear
        for (let i = 0; i < stuList.length; i++) {
            if (zipAbortRef.current) {
                break
            }
            const student = stuList[i]
            setZipBlast(prev => prev ? { ...prev, idx: i, status: 'generating' } : null)
            try {
                setPreviewStudentId(student.id)
                await new Promise(r => setTimeout(r, 350))
                if (zipAbortRef.current) break
                const archCtx = archEntry ? { bulanObj: BULAN.find(b => b.id === archEntry.month), year: archEntry.year, month: archEntry.month } : {}
                const { blob, filename } = await generatePDFBlob(student, archCtx)
                if (zipAbortRef.current) break
                zip.file(filename, blob)
                done++
            } catch (e) { failed++; console.error('ZIP item error:', e) }
            setZipBlast(prev => prev ? { ...prev, done, failed } : null)
        }

        if (zipAbortRef.current) {
            setZipBlast(null)
            return
        }

        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Raport_${archEntry?.class_name || selectedClass?.name || 'Kelas'}_${bulanStr}_${yearStr}.zip`
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 5000)
            setZipBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
            addToast(`ZIP berhasil: ${done} raport diunduh`, 'success')

            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: rtObj.dbTable,
                newData: { format: 'ZIP_ARCHIVE', count: done, failed_count: failed, class_name: archEntry?.class_name || selectedClass?.name, month: archEntry ? archEntry.month : selectedMonth, year: archEntry ? archEntry.year : selectedYear }
            })
        } catch (e) { addToast('Gagal membuat ZIP: ' + e.message, 'error'); setZipBlast(null) }
    }, [generatePDFBlob, selectedMonth, selectedYear, selectedClass, reportType, bulanObj, addToast, setPreviewStudentId])

    // ── Get selected or active students ──
    const getSelectedOrActiveStudents = useCallback((scope) => {
        if (scope === 'selected') {
            return students.filter(s => selectedStudentIds.includes(s.id))
        }
        return students
    }, [students, selectedStudentIds])

    // ── Handle Export ZIP ──
    const handleExportZipModal = useCallback((scope) => {
        const targetStudents = getSelectedOrActiveStudents(scope)
        if (!targetStudents.length) {
            addToast('Tidak ada data untuk diexport', 'warning')
            return
        }
        runZipBlast(targetStudents, null)
    }, [getSelectedOrActiveStudents, runZipBlast, addToast])

    // ── Handle Print All ──
    const handlePrintAllModal = useCallback((scope) => {
        const targetStudents = getSelectedOrActiveStudents(scope)
        if (!targetStudents.length) {
            addToast('Tidak ada data untuk dicetak', 'warning')
            return
        }
        setPrintRenderedCount(0)
        setPrintQueue(targetStudents.map(s => s.id))
    }, [getSelectedOrActiveStudents, setPrintQueue, setPrintRenderedCount, addToast])

    // ── Handle Export CSV ──
    const handleExportCSVModal = useCallback((scope, options) => {
        setExporting(true)
        try {
            const targetStudents = getSelectedOrActiveStudents(scope)
            if (!targetStudents.length) {
                addToast('Tidak ada data untuk diexport', 'warning')
                return
            }

            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
            const criteria = rtObj.getCriteria(selectedClass)

            const headerMap = {
                nama: 'Nama',
                avg: 'Rata-rata',
                predikat: 'Predikat',
                berat_badan: 'BB(kg)',
                tinggi_badan: 'TB(cm)',
                ziyadah: 'Ziyadah',
                murojaah: "Muroja'ah",
                hari_sakit: 'Sakit',
                hari_izin: 'Izin',
                hari_alpa: 'Alpa',
                hari_pulang: 'Pulang',
                catatan: 'Catatan'
            }
            criteria.forEach(k => {
                headerMap[k.key] = k.id
            })

            const activeColumns = options.columns || []
            const headers = options.includeHeader !== false ? ['No', ...activeColumns.map(col => headerMap[col] || col)] : []

            const rows = targetStudents.map((s, i) => {
                const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                const avg = calcAvg(sc, criteria)
                const predikat = avg ? getGradePredicate(Number(avg), reportType, classLevel)?.id || '' : ''

                const rowData = [i + 1]
                activeColumns.forEach(col => {
                    if (col === 'nama') rowData.push(s.name)
                    else if (col === 'avg') rowData.push(avg ?? '')
                    else if (col === 'predikat') rowData.push(predikat)
                    else if (col === 'berat_badan') rowData.push(ex.berat_badan ?? '')
                    else if (col === 'tinggi_badan') rowData.push(ex.tinggi_badan ?? '')
                    else if (col === 'ziyadah') rowData.push(ex.ziyadah ?? '')
                    else if (col === 'murojaah') rowData.push(ex.murojaah ?? '')
                    else if (col === 'hari_sakit') rowData.push(ex.hari_sakit ?? '')
                    else if (col === 'hari_izin') rowData.push(ex.hari_izin ?? '')
                    else if (col === 'hari_alpa') rowData.push(ex.hari_alpa ?? '')
                    else if (col === 'hari_pulang') rowData.push(ex.hari_pulang ?? '')
                    else if (col === 'catatan') rowData.push(ex.catatan ?? '')
                    else {
                        const val = sc[col]
                        rowData.push(val !== '' && val !== undefined && val !== null ? Number(val) : '')
                    }
                })
                return rowData
            })

            const allRows = options.includeHeader !== false ? [headers, ...rows] : rows
            const csv = allRows.map(r => r.map(escapeCsvCell).join(',')).join('\n')
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${options.fileName || 'export'}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            addToast(`CSV berhasil diexport (${targetStudents.length} santri)`, 'success')
            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: rtObj.dbTable,
                newData: { format: 'CSV', count: targetStudents.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear, scope }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export CSV: ' + e.message, 'error')
        } finally {
            setExporting(false)
        }
    }, [students, scores, extras, selectedClass, selectedMonth, selectedYear, reportType, classLevel, addToast, selectedStudentIds, getSelectedOrActiveStudents])

    // ── Handle Export Excel ──
    const handleExportExcelModal = useCallback(async (scope, options) => {
        setExporting(true)
        try {
            const targetStudents = getSelectedOrActiveStudents(scope)
            if (!targetStudents.length) {
                addToast('Tidak ada data untuk diexport', 'warning')
                return
            }

            const XLSX = await import('xlsx')

            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
            const criteria = rtObj.getCriteria(selectedClass)

            const headerMap = {
                nama: 'Nama',
                avg: 'Rata-rata',
                predikat: 'Predikat',
                berat_badan: 'BB(kg)',
                tinggi_badan: 'TB(cm)',
                ziyadah: 'Ziyadah',
                murojaah: "Muroja'ah",
                hari_sakit: 'Sakit',
                hari_izin: 'Izin',
                hari_alpa: 'Alpa',
                hari_pulang: 'Pulang',
                catatan: 'Catatan'
            }
            criteria.forEach(k => {
                headerMap[k.key] = k.id
            })

            const activeColumns = options.columns || []
            const headers = options.includeHeader !== false ? ['No', ...activeColumns.map(col => headerMap[col] || col)] : []

            const rows = targetStudents.map((s, i) => {
                const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                const avg = calcAvg(sc, criteria)
                const predikat = avg ? getGradePredicate(Number(avg), reportType, classLevel)?.id || '' : ''

                const rowData = [i + 1]
                activeColumns.forEach(col => {
                    if (col === 'nama') rowData.push(s.name)
                    else if (col === 'avg') rowData.push(avg ? Number(avg) : '')
                    else if (col === 'predikat') rowData.push(predikat)
                    else if (col === 'berat_badan') rowData.push(ex.berat_badan !== '' && ex.berat_badan !== undefined ? Number(ex.berat_badan) : '')
                    else if (col === 'tinggi_badan') rowData.push(ex.tinggi_badan !== '' && ex.tinggi_badan !== undefined ? Number(ex.tinggi_badan) : '')
                    else if (col === 'ziyadah') rowData.push(ex.ziyadah ?? '')
                    else if (col === 'murojaah') rowData.push(ex.murojaah ?? '')
                    else if (col === 'hari_sakit') rowData.push(ex.hari_sakit !== '' && ex.hari_sakit !== undefined ? Number(ex.hari_sakit) : '')
                    else if (col === 'hari_izin') rowData.push(ex.hari_izin !== '' && ex.hari_izin !== undefined ? Number(ex.hari_izin) : '')
                    else if (col === 'hari_alpa') rowData.push(ex.hari_alpa !== '' && ex.hari_alpa !== undefined ? Number(ex.hari_alpa) : '')
                    else if (col === 'hari_pulang') rowData.push(ex.hari_pulang !== '' && ex.hari_pulang !== undefined ? Number(ex.hari_pulang) : '')
                    else if (col === 'catatan') rowData.push(ex.catatan ?? '')
                    else {
                        const val = sc[col]
                        rowData.push(val !== '' && val !== undefined && val !== null ? Number(val) : '')
                    }
                })
                return rowData
            })

            const allRows = options.includeHeader !== false ? [headers, ...rows] : rows
            const ws = XLSX.utils.aoa_to_sheet(allRows)
            ws['!cols'] = [{ wch: 4 }, ...activeColumns.map(col => ({ wch: col === 'nama' || col === 'catatan' ? 28 : 12 }))]

            const wb = XLSX.utils.book_new()
            const sheetName = `${bulanObj?.id_str || ''} ${selectedYear}`.trim().slice(0, 31)
            XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Raport')
            XLSX.writeFile(wb, `${options.fileName || 'export'}.xlsx`)

            addToast(`XLSX berhasil diexport (${targetStudents.length} santri)`, 'success')
            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: rtObj.dbTable,
                newData: { format: 'XLSX', count: targetStudents.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear, scope }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export XLSX: ' + e.message, 'error')
        } finally {
            setExporting(false)
        }
    }, [students, scores, extras, selectedClass, bulanObj, selectedYear, reportType, classLevel, addToast, selectedMonth, selectedStudentIds, getSelectedOrActiveStudents])

    // ── Handle Export All Classes ──
    const handleExportAllClassesModal = useCallback(async (customFileName) => {
        setExporting(true)
        try {
            const XLSX = await import('xlsx')
            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan

            const { data: allCls, error: clsErr } = await supabase.from('classes').select('id, name')
            if (clsErr) throw clsErr

            const { data: allStu, error: stuErr } = await supabase.from('students').select('id, name, class_id').is('deleted_at', null).order('name')
            if (stuErr) throw stuErr

            // Add month/year or semester filters depending on periodType
            let query = supabase.from(rtObj.dbTable).select('*')
            if (rtObj.periodType === 'monthly') {
                query = query.eq('month', selectedMonth).eq('year', selectedYear)
            } else {
                query = query.eq('report_type', reportType).eq('semester', selectedSemester).eq('academic_year', academicYear)
            }
            const { data: allRep, error: repErr } = await query
            if (repErr) throw repErr

            const wb = XLSX.utils.book_new()
            let sheetAdded = 0

            for (const cls of allCls) {
                const classStudents = allStu.filter(s => s.class_id === cls.id)
                if (classStudents.length === 0) continue

                const clsLevel = getClassLevel(cls)
                const criteria = rtObj.getCriteria(cls)

                // Headers
                const headers = ['No', 'Nama']
                criteria.forEach(k => {
                    headers.push(k.id)
                })
                headers.push('Rata-rata', 'Predikat', 'BB(kg)', 'TB(cm)', 'Ziyadah', "Muroja'ah", 'Hari Sakit', 'Hari Izin', 'Hari Alpa', 'Hari Pulang', 'Catatan')

                const rows = classStudents.map((s, i) => {
                    const rep = allRep.find(r => r.student_id === s.id) || {}

                    const sc = {}
                    criteria.forEach(k => {
                        sc[k.key] = rep[k.key]
                    })
                    const avg = calcAvg(sc, criteria)
                    const predikat = avg ? getGradePredicate(Number(avg), reportType, clsLevel)?.id || '' : ''

                    const rowData = [
                        i + 1, s.name
                    ]
                    criteria.forEach(k => {
                        const val = rep[k.key]
                        rowData.push(val !== null && val !== undefined ? Number(val) : '')
                    })
                    rowData.push(
                        avg ? Number(avg) : '', predikat,
                        rep.berat_badan !== null && rep.berat_badan !== undefined ? Number(rep.berat_badan) : '',
                        rep.tinggi_badan !== null && rep.tinggi_badan !== undefined ? Number(rep.tinggi_badan) : '',
                        rep.ziyadah ?? '', rep.murojaah ?? '',
                        rep.hari_sakit !== null && rep.hari_sakit !== undefined ? Number(rep.hari_sakit) : '',
                        rep.hari_izin !== null && rep.hari_izin !== undefined ? Number(rep.hari_izin) : '',
                        rep.hari_alpa !== null && rep.hari_alpa !== undefined ? Number(rep.hari_alpa) : '',
                        rep.hari_pulang !== null && rep.hari_pulang !== undefined ? Number(rep.hari_pulang) : '',
                        rep.catatan || '',
                    )
                    return rowData
                })

                const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

                // columns width
                const colWidths = [{ wch: 4 }, { wch: 28 }]
                criteria.forEach(() => {
                    colWidths.push({ wch: 10 })
                })
                colWidths.push(
                    { wch: 10 }, { wch: 12 }, { wch: 7 }, { wch: 7 }, { wch: 12 }, { wch: 12 },
                    { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 30 }
                )
                ws['!cols'] = colWidths

                const sheetName = (cls.name || 'Kelas').replace(/[\\/?*\[\]]/g, '').substring(0, 31)
                XLSX.utils.book_append_sheet(wb, ws, sheetName)
                sheetAdded++
            }

            if (sheetAdded === 0) {
                addToast('Tidak ada data siswa untuk diexport', 'warning')
                return
            }

            const finalFileName = customFileName || `Raport_Semua_Kelas_${bulanObj?.id_str || ''}_${selectedYear}`
            XLSX.writeFile(wb, `${finalFileName}.xlsx`)

            addToast(`Semua kelas berhasil diexport (${sheetAdded} sheet)`, 'success')
            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: rtObj.dbTable,
                newData: { format: 'XLSX_ALL_CLASSES', month: selectedMonth, year: selectedYear }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export semua kelas: ' + e.message, 'error')
        } finally {
            setExporting(false)
        }
    }, [selectedMonth, selectedYear, reportType, selectedSemester, academicYear, bulanObj, addToast])

    return {
        raportLinks, setRaportLinks, sendingWA, setSendingWA,
        waBlastConfirm, setWaBlastConfirm, waBlast, setWaBlast,
        zipBlast, setZipBlast, exporting, setExporting,
        isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportOpen: setIsExportOpen,
        waBlastAbortRef, zipAbortRef,
        buildWaMessage, sendWATextOnly, generatePDFBlob, uploadToSupabase,
        generateAndSendWA, runWaBlast, runZipBlast,
        handleExportCSV: handleExportCSVModal, handleExportExcel: handleExportExcelModal, handleExportAllClasses: handleExportAllClassesModal,
        handleExportZip: handleExportZipModal, handlePrintAll: handlePrintAllModal,
        signMode, handleToggleSignMode, signatures
    }
}