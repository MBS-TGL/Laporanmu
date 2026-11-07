import { useState, useEffect, useCallback } from 'react'

/**
 * useFormDraft — primitif scaffolding form modal (draft + validasi UX).
 * Menggantikan pola berulang di FormModal per fitur: state form + populate
 * saat edit, touched/attemptedSubmit, status field (normal/error/success),
 * dan progress "X% Lengkap". Field-set & handler submit tetap milik fitur.
 *
 * const draft = useFormDraft({ isOpen, selectedItem, buildDraft })
 * // buildDraft(item | null) → objek form awal (fitur tangani kasus add & edit)
 *
 * - Efek [isOpen]: populate via buildDraft(selectedItem) + reset error/touched.
 * - getStatus(field, isRequired): 'error' jika touched/attempted & kosong,
 *   'success' jika terisi, 'warning' jika ada di map warnings — dipakai untuk
 *   border input / status RichSelect.
 * - handleSubmit milik fitur memanggil beginSubmit() lalu fail('pesan') bila
 *   validasi gagal, atau lanjut onSubmit(payload).
 *
 * warnings = { field: (value) => true | 'warning' }  // status peringatan non-blocking
 */
export function useFormDraft({ isOpen, selectedItem, buildDraft, warnings }) {
    const [form, setForm] = useState(null)
    const [formError, setFormError] = useState('')
    const [touched, setTouched] = useState({})
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setForm(buildDraft(selectedItem))
        setFormError('')
        setTouched({})
        setAttemptedSubmit(false)
        // buildDraft sengaja tidak masuk deps: fitur membaca list-nya via closure
        // saat modal dibuka (perilaku sama dengan effect scaffolding lama).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, selectedItem])

    const setField = useCallback((key, val) => {
        setForm(prev => (prev ? { ...prev, [key]: val } : prev))
    }, [])

    const markTouched = useCallback((field) => {
        setTouched(prev => ({ ...prev, [field]: true }))
    }, [])

    const beginSubmit = useCallback(() => {
        setAttemptedSubmit(true)
        setFormError('')
    }, [])

    const fail = useCallback((msg) => setFormError(msg), [])

    const getStatus = useCallback((field, isRequired = false) => {
        const value = form?.[field]
        const isTouched = touched[field] || attemptedSubmit

        const warn = warnings?.[field]
        if (value && warn && warn(value)) return 'warning'

        if (isRequired) {
            if (isTouched && (!value || (typeof value === 'string' && !value.trim()))) return 'error'
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        } else {
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        }
        return 'normal'
    }, [form, touched, attemptedSubmit, warnings])

    const overallProgress = useCallback((fields) => {
        if (!form) return 0
        const filled = fields.filter(f => form[f]).length
        return Math.round((filled / fields.length) * 100)
    }, [form])

    return {
        form,
        setForm,
        setField,
        touched,
        markTouched,
        attemptedSubmit,
        beginSubmit,
        fail,
        formError,
        setFormError,
        getStatus,
        overallProgress,
    }
}
