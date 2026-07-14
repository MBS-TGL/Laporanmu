import React from 'react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context/Language'
import { UserMinus, Trash2 } from 'lucide-react'

export function ConfirmEvictModal({
    isOpen,
    onClose,
    studentToEvict,
    onConfirm,
    submitting
}) {
    const { t } = useLanguage()
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dorms.confirm.evict.title')}
            description={t('dorms.confirm.evict.description')}
            icon={UserMinus}
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        {t('dorms.confirm.evict.cancel')}
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <UserMinus className="w-3.5 h-3.5 opacity-70" />
                        )}
                        {t('dorms.confirm.evict.confirm')}
                    </button>
                </div>
            }
        >
            <div className="px-1">
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                    {t('dorms.confirm.evict.text')
                        .split('{name}')
                        .reduce((acc, part, i) => {
                            if (i === 0) return [part.replace('{room}', studentToEvict?.metadata?.kamar || 'Kamar')]
                            return [
                                ...acc,
                                <span key={i} className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">
                                    {studentToEvict?.name}
                                </span>,
                                part.replace('{room}', studentToEvict?.metadata?.kamar || 'Kamar')
                            ]
                        }, [])}
                </p>
            </div>
        </Modal>
    )
}

export function ConfirmDeleteDormModal({
    isOpen,
    onClose,
    dormToDelete,
    students,
    onConfirm,
    submitting
}) {
    const { t, tNum } = useLanguage()
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dorms.confirm.deleteDorm.title')}
            description={t('dorms.confirm.deleteDorm.description')}
            icon={Trash2}
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        {t('dorms.confirm.deleteDorm.cancel')}
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5 opacity-70" />
                        )}
                        {t('dorms.confirm.deleteDorm.confirm')}
                    </button>
                </div>
            }
        >
            <div className="px-1">
                {dormToDelete && (() => {
                    const occupants = students.filter(s => s.metadata?.kamar === dormToDelete.id)
                    if (occupants.length > 0) {
                        return (
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                {t('dorms.confirm.deleteDorm.occupantsText')
                                    .split('{room}')
                                    .reduce((acc, part, i) => {
                                        if (i === 0) return [part.replace('{count}', tNum(occupants.length))]
                                        return [
                                            ...acc,
                                            <span key={i} className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{dormToDelete.id}</span>,
                                            part.replace('{count}', tNum(occupants.length))
                                        ]
                                    }, [])}
                            </p>
                        )
                    }
                    return (
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            {t('dorms.confirm.deleteDorm.noOccupantsText')
                                .split('{room}')
                                .reduce((acc, part, i) => {
                                    if (i === 0) return [part]
                                    return [
                                        ...acc,
                                        <span key={i} className="text-[var(--color-text)] font-black">{dormToDelete.id}</span>,
                                        part
                                    ]
                                }, [])}
                        </p>
                    )
                })()}
            </div>
        </Modal>
    )
}

export function ConfirmDeleteAuditModal({
    isOpen,
    onClose,
    auditToDelete,
    onConfirm,
    submitting
}) {
    const { t } = useLanguage()
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dorms.confirm.deleteAudit.title')}
            description={t('dorms.confirm.deleteAudit.description')}
            icon={Trash2}
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        {t('dorms.confirm.deleteAudit.cancel')}
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5 opacity-70" />
                        )}
                        {t('dorms.confirm.deleteAudit.confirm')}
                    </button>
                </div>
            }
        >
            <div className="px-1">
                {auditToDelete && (
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                        {t('dorms.confirm.deleteAudit.text')
                            .split('{room}')
                            .reduce((acc, part, i) => {
                                if (i === 0) return [part.replace('{date}', auditToDelete.date)]
                                return [
                                    ...acc,
                                    <span key={`room-${i}`} className="text-[var(--color-text)] font-black">{auditToDelete.room}</span>,
                                    ...part.split('{date}').reduce((dAcc, dPart, dI) => {
                                        if (dI === 0) return [dPart]
                                        return [
                                            ...dAcc,
                                            <span key={`date-${dI}`} className="text-[var(--color-text)] font-black">{auditToDelete.date}</span>,
                                            dPart
                                        ]
                                    }, [])
                                ]
                            }, [])}
                    </p>
                )}
            </div>
        </Modal>
    )
}

export function ConfirmDeleteInventoryModal({
    isOpen,
    onClose,
    inventoryToDelete,
    onConfirm,
    pendingInventoryDorm,
    setInventoryModalDorm,
    setPendingInventoryDorm
}) {
    const { t } = useLanguage()
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dorms.confirm.deleteInventory.title')}
            description={t('dorms.confirm.deleteInventory.description')}
            icon={Trash2}
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            onClose()
                            if (pendingInventoryDorm) {
                                setInventoryModalDorm(pendingInventoryDorm)
                                setPendingInventoryDorm(null)
                            }
                        }}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        {t('dorms.confirm.deleteInventory.cancel')}
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                    >
                        <Trash2 className="w-3.5 h-3.5 opacity-70" /> {t('dorms.confirm.deleteInventory.confirm')}
                    </button>
                </div>
            }
        >
            <div className="px-1">
                {inventoryToDelete && (
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                        {t('dorms.confirm.deleteInventory.text')
                            .split('{item}')
                            .reduce((acc, part, i) => {
                                if (i === 0) return [part]
                                return [
                                    ...acc,
                                    <span key={i} className="text-[var(--color-text)] font-black">{inventoryToDelete.item_name}</span>,
                                    part
                                ]
                            }, [])}
                    </p>
                )}
            </div>
        </Modal>
    )
}
