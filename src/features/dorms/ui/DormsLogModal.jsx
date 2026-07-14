import React from 'react'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import { useLanguage } from '@context/Language'
import { ClipboardList, Check, Clock } from 'lucide-react'

export default function DormsLogModal({
    isOpen,
    onClose,
    newLog,
    setNewLog,
    onSave
}) {
    const { t } = useLanguage()
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dorms.log.title')}
            description={t('dorms.log.description')}
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
                        {t('dorms.log.cancel')}
                    </button>
                    <button
                        type="submit"
                        form="log-form"
                        className="h-10 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                    >
                        <Check className="w-3.5 h-3.5" />
                        {t('dorms.log.save')}
                    </button>
                </div>
            }
        >
            <form id="log-form" onSubmit={onSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.log.labelMusyrif')}</label>
                        <input
                            type="text"
                            required
                            value={newLog.musyrifName}
                            onChange={(e) => setNewLog(prev => ({ ...prev, musyrifName: e.target.value }))}
                            placeholder={t('dorms.log.placeholderMusyrif')}
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                        />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.log.labelShift')}</label>
                        <div className="w-full">
                            <RichSelect
                                value={newLog.shift}
                                onChange={(val) => setNewLog(prev => ({ ...prev, shift: val }))}
                                options={[
                                    { id: 'Malam', name: t('dorms.log.shiftMalam') },
                                    { id: 'Siang', name: t('dorms.log.shiftSiang') }
                                ]}
                                placeholder={t('dorms.log.placeholderShift')}
                                icon={Clock}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.log.labelNotes')}</label>
                    <textarea
                        value={newLog.notes}
                        onChange={(e) => setNewLog(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t('dorms.log.placeholderNotes')}
                        rows="3"
                        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition resize-none"
                    />
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.log.labelIssues')}</label>
                    <input
                        type="text"
                        value={newLog.issues}
                        onChange={(e) => setNewLog(prev => ({ ...prev, issues: e.target.value }))}
                        placeholder={t('dorms.log.placeholderIssues')}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>
            </form>
        </Modal>
    )
}
