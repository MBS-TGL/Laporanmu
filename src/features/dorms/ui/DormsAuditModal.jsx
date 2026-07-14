import React from 'react'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import { useLanguage } from '@context/Language'
import { ClipboardList, Check, Bed } from 'lucide-react'

export default function DormsAuditModal({
    isOpen,
    onClose,
    newAudit,
    setNewAudit,
    dorms,
    onSave
}) {
    const { t } = useLanguage()
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dorms.audit.title')}
            description={t('dorms.audit.description')}
            icon={ClipboardList}
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center justify-between gap-2 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                    >
                        {t('dorms.audit.cancel')}
                    </button>
                    <button
                        type="submit"
                        form="audit-form"
                        className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                    >
                        <Check className="w-3.5 h-3.5" />
                        {t('dorms.audit.save')}
                    </button>
                </div>
            }
        >
            <form id="audit-form" onSubmit={onSave} className="space-y-4.5">
                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.audit.selectRoom')}</label>
                    <div className="w-full">
                        <RichSelect
                            value={newAudit.room}
                            onChange={(val) => setNewAudit(prev => ({ ...prev, room: val }))}
                            options={dorms.map(r => ({ id: r.id, name: r.id }))}
                            placeholder={t('dorms.audit.selectRoom')}
                            icon={Bed}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.audit.labelKerapian')}</label>
                        <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            value={newAudit.aspects.kerapian}
                            onChange={(e) => setNewAudit(prev => ({
                                ...prev,
                                aspects: { ...prev.aspects, kerapian: Number(e.target.value) }
                             }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                        />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.audit.labelKebersihan')}</label>
                        <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            value={newAudit.aspects.kebersihan}
                            onChange={(e) => setNewAudit(prev => ({
                                ...prev,
                                aspects: { ...prev.aspects, kebersihan: Number(e.target.value) }
                             }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                        />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.audit.labelKeharuman')}</label>
                        <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            value={newAudit.aspects.keharuman}
                            onChange={(e) => setNewAudit(prev => ({
                                ...prev,
                                aspects: { ...prev.aspects, keharuman: Number(e.target.value) }
                             }))}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.audit.labelNotes')}</label>
                    <textarea
                        value={newAudit.notes}
                        onChange={(e) => setNewAudit(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t('dorms.audit.placeholderNotes')}
                        rows="3"
                        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition resize-none"
                    />
                </div>
            </form>
        </Modal>
    )
}
