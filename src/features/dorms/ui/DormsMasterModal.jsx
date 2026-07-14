import React from 'react'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import { useLanguage } from '@context/Language'
import { Bed, Check, VenusAndMars, Info, User2 } from 'lucide-react'

export default function DormsMasterModal({
    isOpen,
    onClose,
    editingDorm,
    newDorm,
    setNewDorm,
    musyrifList,
    onSave,
    submitting
}) {
    const { t } = useLanguage()
    const User2Icon = User2

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingDorm ? t('dorms.master.titleEdit') : t('dorms.master.titleAdd')}
            description={editingDorm ? t('dorms.master.descEdit').replace('{id}', editingDorm.id) : t('dorms.master.descAdd')}
            icon={Bed}
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center justify-between gap-2 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                    >
                        {t('dorms.master.cancel')}
                    </button>
                    <button
                        type="submit"
                        form="dorm-form"
                        disabled={submitting}
                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5" />
                        )}
                        {t('dorms.master.save')}
                    </button>
                </div>
            }
        >
            <form id="dorm-form" onSubmit={onSave} className="space-y-4">
                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.master.labelRoomName')}</label>
                    <input
                        type="text"
                        required
                        disabled={!!editingDorm}
                        value={newDorm.id}
                        onChange={(e) => setNewDorm(prev => ({ ...prev, id: e.target.value }))}
                        placeholder={t('dorms.master.placeholderRoomName')}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.master.labelRoomArab')}</label>
                    <input
                        type="text"
                        value={newDorm.ar || ''}
                        onChange={(e) => setNewDorm(prev => ({ ...prev, ar: e.target.value }))}
                        placeholder={t('dorms.master.placeholderRoomArab')}
                        dir="rtl"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.master.labelCapacity')}</label>
                    <input
                        type="number"
                        required
                        min="1"
                        value={newDorm.capacity}
                        onChange={(e) => setNewDorm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                        placeholder={t('dorms.master.placeholderCapacity')}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.master.labelGender')}</label>
                        <RichSelect
                            usePortal={true}
                            value={newDorm.gender || ''}
                            onChange={(val) => setNewDorm(prev => ({ ...prev, gender: val }))}
                            placeholder={t('dorms.master.allGender')}
                            options={[
                                { id: '', name: t('dorms.master.allGender') },
                                { id: 'putra', name: t('dorms.master.genderPutra') },
                                { id: 'putri', name: t('dorms.master.genderPutri') }
                            ]}
                            icon={VenusAndMars}
                        />
                    </div>
                    <div>
                        <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.master.labelStatus')}</label>
                        <RichSelect
                            usePortal={true}
                            value={newDorm.status || 'active'}
                            onChange={(val) => setNewDorm(prev => ({ ...prev, status: val }))}
                            placeholder={t('dorms.master.statusActive')}
                            options={[
                                { id: 'active', name: t('dorms.master.statusActive') },
                                { id: 'maintenance', name: t('dorms.master.statusMaintenance') },
                                { id: 'full', name: t('dorms.master.statusLocked') }
                            ]}
                            icon={Info}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.master.labelBuilding')}</label>
                    <input
                        type="text"
                        value={newDorm.building || ''}
                        onChange={(e) => setNewDorm(prev => ({ ...prev, building: e.target.value }))}
                        placeholder={t('dorms.master.placeholderBuilding')}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>

                <div>
                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">{t('dorms.master.labelMusyrif')}</label>
                    <RichSelect
                        usePortal={true}
                        value={newDorm.musyrif_id || ''}
                        onChange={(val) => setNewDorm(prev => ({ ...prev, musyrif_id: val }))}
                        placeholder={t('dorms.master.noMusyrif')}
                        searchable
                        options={musyrifList.map(m => ({ id: m.id, name: m.name }))}
                        extraOption={{ id: '', name: t('dorms.master.noMusyrif') }}
                        icon={User2Icon}
                    />
                </div>
            </form>
        </Modal>
    )
}
