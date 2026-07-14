import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useToast, useLanguage } from '@context'
import DashboardLayout from '@core/layouts/DashboardLayout'
import PageHeader from '@shared/components/PageHeader'
import { StatCard } from '@shared/components/DataDisplay'
import StatsCarousel from '@shared/components/StatsCarousel'
import {
    Bed, Users, Star, ClipboardList, Sparkles, CheckSquare, ShieldAlert,
    Sliders, Download, FileSpreadsheet, Eye, EyeOff, Plus
} from 'lucide-react'

// Custom Hook
import { useDormsData } from '@features/dorms/hooks/useDormsData'

// UI — Modals
import DormsAssignModal from '@features/dorms/ui/DormsAssignModal'
import DormsExportModal from '@features/dorms/ui/DormsExportModal'
import DormsImportModal from '@features/dorms/ui/DormsImportModal'
import DormsBulkAssignModal from '@features/dorms/ui/DormsBulkAssignModal'
import { DormsInventoryModal, DormsInventoryFormModal } from '@features/dorms/ui/DormsInventoryModal'
import DormsAuditModal from '@features/dorms/ui/DormsAuditModal'
import DormsLogModal from '@features/dorms/ui/DormsLogModal'
import DormsMasterModal from '@features/dorms/ui/DormsMasterModal'
import {
    ConfirmEvictModal,
    ConfirmDeleteDormModal,
    ConfirmDeleteAuditModal,
    ConfirmDeleteInventoryModal
} from '@features/dorms/ui/DormsConfirmModals'

// UI — Tabs
import DormTabPlotting from '@features/dorms/ui/DormTabPlotting'
import DormTabCleanliness from '@features/dorms/ui/DormTabCleanliness'
import DormTabMusyrif from '@features/dorms/ui/DormTabMusyrif'
import DormTabKelola from '@features/dorms/ui/DormTabKelola'

// Utilities
import { getPortalContainer } from '@features/dorms/utils/dormUtils'

export default function DormsPage() {
    const { addToast } = useToast()
    const { language, t, tNum } = useLanguage()

    const [activeTab, setActiveTab] = useState('plotting') // 'plotting' | 'kebersihan' | 'musyrif' | 'kelola_kamar'
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)
    const headerMenuBtnRef = useRef(null)
    const importFileInputRef = useRef(null)

    const data = useDormsData(addToast)

    // Mount/unmount header dropdown with animation delay
    useEffect(() => {
        if (isHeaderMenuOpen) {
            setHeaderMenuMounted(true)
        } else {
            const t = setTimeout(() => setHeaderMenuMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isHeaderMenuOpen])

    // Close header menu on outside click
    useEffect(() => {
        if (!isHeaderMenuOpen) return
        const handler = (e) => {
            if (headerMenuBtnRef.current && !headerMenuBtnRef.current.contains(e.target) && !e.target.closest('#portal-dorm-header-menu')) {
                setIsHeaderMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isHeaderMenuOpen])

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 space-y-5">
                {/* --- HEADER --- */}
                <PageHeader
                    badge={t('dorms.badge')}
                    breadcrumbs={[t('dorms.breadcrumbs')]}
                    title={t('dorms.title')}
                    subtitle={t('dorms.subtitle')}
                    actions={
                        <>
                            {/* Dropdown: Opsi Ekspor */}
                            <div className="relative">
                                <button
                                    ref={headerMenuBtnRef}
                                    onClick={() => {
                                        if (!isHeaderMenuOpen) {
                                            setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect())
                                        }
                                        setIsHeaderMenuOpen(v => !v)
                                    }}
                                    className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${
                                        isHeaderMenuOpen
                                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                            : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'
                                    }`}
                                    title={t('dorms.dataOptions')}
                                >
                                    <Sliders className="w-4 h-4" />
                                </button>
                                
                                {headerMenuMounted && headerMenuRect && createPortal(
                                    <>
                                        <div
                                            className={`fixed inset-0 z-[9990] bg-black/[0.08] transition-opacity duration-200 ${isHeaderMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                            onClick={() => setIsHeaderMenuOpen(false)}
                                        />
                                        <div
                                            className={`fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-[opacity,transform] duration-200 ease-out origin-top-right ${
                                                isHeaderMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                                            }`}
                                            style={{ top: headerMenuRect.bottom + 8, left: Math.max(10, headerMenuRect.right - 224) }}
                                        >
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">{t('dorms.dataOptions')}</p>
                                            <button
                                                onClick={() => {
                                                    setIsHeaderMenuOpen(false);
                                                    const initialDataset = activeTab === 'kebersihan' ? 'cleanliness' : 'plotting';
                                                    data.handleOpenExportModal(initialDataset);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Download className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[11px] font-black leading-tight">{t('dorms.exportDormData')}</p>
                                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xlsx / csv / pdf</p>
                                                </div>
                                            </button>
                                            <div className="h-px bg-[var(--color-border)] my-1" />
                                            <button
                                                onClick={() => { setIsHeaderMenuOpen(false); data.setIsImportModalOpen(true); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Download className="w-4 h-4 rotate-180" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[11px] font-black leading-tight">{t('dorms.importPlotting')}</p>
                                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xlsx / csv</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>,
                                    getPortalContainer('portal-dorm-header-menu')
                                )}
                            </div>

                            {/* Privasi */}
                            <button
                                onClick={() => setIsPrivacyMode(v => !v)}
                                className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all ${
                                    isPrivacyMode
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                                title={isPrivacyMode ? t('dorms.privacyModeOn') : t('dorms.privacyModeOff')}
                            >
                                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{t('dorms.privacy')}</span>
                            </button>

                            {/* Primary: Assign Santri */}
                            <button
                                onClick={() => data.handleOpenAssignModal(null)}
                                className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t('dorms.assignStudent')}</span>
                            </button>
                        </>
                    }
                />

                {/* --- STATS CAROUSEL / STAT CARDS --- */}
                <StatsCarousel count={4} className="mb-5">
                    <StatCard
                        onClick={() => { setActiveTab('plotting'); data.setSelectedRoomTab('All'); }}
                        isActive={activeTab === 'plotting' && data.selectedRoomTab === 'All'}
                        icon={Users}
                        label={t('dorms.statTotalStudents')}
                        value={data.stats.totalCount}
                        suffix={t('dorms.suffixSantri')}
                        color="indigo"
                    />

                    <StatCard
                        onClick={() => { setActiveTab('kelola_kamar'); }}
                        isActive={activeTab === 'kelola_kamar'}
                        icon={Bed}
                        label={t('dorms.statTotalRooms')}
                        value={data.dorms.length}
                        suffix={t('dorms.suffixRooms')}
                        color="emerald"
                    />

                    <StatCard
                        onClick={() => { setActiveTab('plotting'); data.setSelectedRoomTab('Assigned'); }}
                        isActive={activeTab === 'plotting' && data.selectedRoomTab === 'Assigned'}
                        icon={CheckSquare}
                        label={t('dorms.statPlotting')}
                        value={data.stats.assignedCount}
                        suffix={t('dorms.suffixSantri')}
                        color="primary"
                    />

                    <StatCard
                        onClick={() => { setActiveTab('plotting'); data.setSelectedRoomTab('Unassigned'); }}
                        isActive={activeTab === 'plotting' && data.selectedRoomTab === 'Unassigned'}
                        icon={ShieldAlert}
                        label={t('dorms.statUnassigned')}
                        value={data.stats.unassignedCount}
                        suffix={t('dorms.suffixSantri')}
                        color="amber"
                    />
                </StatsCarousel>

                {/* --- NAVIGATION TABS --- */}
                <div className="flex gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-full sm:w-fit overflow-x-auto scrollbar-hide shrink-0">
                    <button
                        onClick={() => setActiveTab('plotting')}
                        className={`flex-1 sm:flex-none h-9 px-6 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'plotting' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <Bed className="w-3.5 h-3.5 shrink-0" />
                        <span>{t('dorms.tabPlotting')}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('kelola_kamar')}
                        className={`flex-1 sm:flex-none h-9 px-6 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'kelola_kamar' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{t('dorms.tabManage')}</span>
                    </button>
                </div>

                {/* --- ACTIVE TAB VIEWS --- */}
                {activeTab === 'plotting' && (
                    <DormTabPlotting
                        searchQuery={data.searchQuery}
                        setSearchQuery={data.setSearchQuery}
                        selectedRoomTab={data.selectedRoomTab}
                        setSelectedRoomTab={data.setSelectedRoomTab}
                        viewMode={data.viewMode}
                        setViewMode={data.setViewMode}
                        selectedIds={data.selectedIds}
                        setSelectedIds={data.setSelectedIds}
                        showAdvFilter={data.showAdvFilter}
                        setShowAdvFilter={data.setShowAdvFilter}
                        activeFilters={data.activeFilters}
                        selectedClassFilter={data.selectedClassFilter}
                        setSelectedClassFilter={data.setSelectedClassFilter}
                        classesList={data.classesList}
                        dorms={data.dorms}
                        selectedGenderFilter={data.selectedGenderFilter}
                        setSelectedGenderFilter={data.setSelectedGenderFilter}
                        selectedBuildingFilter={data.selectedBuildingFilter}
                        setSelectedBuildingFilter={data.setSelectedBuildingFilter}
                        buildingOptions={data.buildingOptions}
                        loading={data.loading}
                        filteredStudents={data.filteredStudents}
                        paginatedStudents={data.paginatedStudents}
                        isPrivacyMode={isPrivacyMode}
                        toggleSelect={data.toggleSelect}
                        handleOpenEvictModal={data.handleOpenEvictModal}
                        handleOpenAssignModal={data.handleOpenAssignModal}
                        allSelected={data.allSelected}
                        toggleAll={data.toggleAll}
                        page={data.page}
                        setPage={data.setPage}
                        pageSize={data.pageSize}
                        setPageSize={data.setPageSize}
                        jumpPage={data.jumpPage}
                        setJumpPage={data.setJumpPage}
                        handleBulkUnassign={data.handleBulkUnassign}
                        setIsBulkAssignModalOpen={data.setIsBulkAssignModalOpen}
                        setSelectedBulkRoom={data.setSelectedBulkRoom}
                        students={data.students}
                    />
                )}

                {activeTab === 'kelola_kamar' && (
                    <DormTabKelola
                        setEditingDorm={data.setEditingDorm}
                        setNewDorm={data.setNewDorm}
                        setIsDormModalOpen={data.setIsDormModalOpen}
                        loadingDorms={data.loadingDorms}
                        dorms={data.dorms}
                        students={data.students}
                        musyrifList={data.musyrifList}
                        setInventoryModalDorm={data.setInventoryModalDorm}
                        handleOpenDeleteDormModal={data.handleOpenDeleteDormModal}
                    />
                )}
            </div>

            {/* --- MODALS --- */}
            <DormsAssignModal
                isOpen={data.isAssignModalOpen}
                onClose={() => data.setIsAssignModalOpen(false)}
                studentToAssign={data.studentToAssign}
                selectedTargetRoom={data.selectedTargetRoom}
                setSelectedTargetRoom={data.setSelectedTargetRoom}
                assignStep={data.assignStep}
                setAssignStep={data.setAssignStep}
                isHeaderAssign={data.isHeaderAssign}
                dorms={data.dorms}
                students={data.students}
                setStudentToAssign={data.setStudentToAssign}
                onSave={data.handleSaveAssignment}
                submitting={data.submitting}
            />

            <DormsExportModal
                isOpen={data.isExportModalOpen}
                onClose={() => data.setIsExportModalOpen(false)}
                defaultDataset={data.exportDataset}
                students={data.students}
                audits={data.audits}
                inventories={data.inventories}
                dorms={data.dorms}
                selectedIds={data.selectedIds}
                addToast={addToast}
            />

            <DormsImportModal
                isOpen={data.isImportModalOpen}
                onClose={() => data.setIsImportModalOpen(false)}
                importing={data.importing}
                importStep={data.importStep}
                setImportStep={data.setImportStep}
                importPreview={data.importPreview}
                importFileName={data.importFileName}
                importFileInputRef={importFileInputRef}
                importDragOver={data.importDragOver}
                setImportDragOver={data.setImportDragOver}
                processImportFile={data.processImportFile}
                students={data.students}
                dorms={data.dorms}
                handleDownloadTemplate={data.handleDownloadTemplate}
                importFileHeaders={data.importFileHeaders}
                SYSTEM_COLS={data.SYSTEM_COLS}
                importColumnMapping={data.importColumnMapping}
                setImportColumnMapping={data.setImportColumnMapping}
                importRawData={data.importRawData}
                importLoading={data.importLoading}
                setImportLoading={data.setImportLoading}
                buildImportPreview={data.buildImportPreview}
                importIssues={data.importIssues}
                importValidationOpen={data.importValidationOpen}
                setImportValidationOpen={data.setImportValidationOpen}
                importProgress={data.importProgress}
                handleCommitImport={data.handleCommitImport}
                hasImportBlockingErrors={data.hasImportBlockingErrors}
                importReadyRows={data.importReadyRows}
                handleImportCellEdit={data.handleImportCellEdit}
                importEditCell={data.importEditCell}
                setImportEditCell={data.setImportEditCell}
                handleRemoveImportRow={data.handleRemoveImportRow}
                handleBulkFix={data.handleBulkFix}
            />

            <DormsBulkAssignModal
                isOpen={data.isBulkAssignModalOpen}
                onClose={() => data.setIsBulkAssignModalOpen(false)}
                selectedCount={data.selectedIds.length}
                selectedStudents={(data.students || []).filter(s => (data.selectedIds || []).includes(s.id))}
                onRemoveStudent={(id) => data.setSelectedIds(prev => prev.filter(x => x !== id))}
                selectedRoom={data.selectedBulkRoom}
                setSelectedRoom={data.setSelectedBulkRoom}
                dorms={data.dorms}
                onSave={data.handleBulkAssignSave}
                submitting={data.bulkSubmitting}
            />

            <DormsInventoryModal
                inventoryModalDorm={data.inventoryModalDorm}
                setInventoryModalDorm={data.setInventoryModalDorm}
                inventories={data.inventories}
                setSelectedDormForInventory={data.setSelectedDormForInventory}
                setEditingInventoryItem={data.setEditingInventoryItem}
                setNewInventoryItem={data.setNewInventoryItem}
                setIsInventoryModalOpen={data.setIsInventoryModalOpen}
                setInventoryToDelete={data.setInventoryToDelete}
                setIsConfirmDeleteInventoryOpen={data.setIsConfirmDeleteInventoryOpen}
                pendingInventoryDorm={data.pendingInventoryDorm}
                setPendingInventoryDorm={data.setPendingInventoryDorm}
            />

            <DormsInventoryFormModal
                isOpen={data.isInventoryModalOpen}
                onClose={() => data.setIsInventoryModalOpen(false)}
                selectedDormForInventory={data.selectedDormForInventory}
                editingInventoryItem={data.editingInventoryItem}
                newInventoryItem={data.newInventoryItem}
                setNewInventoryItem={data.setNewInventoryItem}
                submittingInventory={data.submittingInventory}
                handleSaveInventoryItem={data.handleSaveInventoryItem}
                pendingInventoryDorm={data.pendingInventoryDorm}
                setInventoryModalDorm={data.setInventoryModalDorm}
                setPendingInventoryDorm={data.setPendingInventoryDorm}
                setEditingInventoryItem={data.setEditingInventoryItem}
            />

            <DormsAuditModal
                isOpen={data.isAuditModalOpen}
                onClose={() => data.setIsAuditModalOpen(false)}
                newAudit={data.newAudit}
                setNewAudit={data.setNewAudit}
                dorms={data.dorms}
                onSave={data.handleSaveAudit}
            />

            <DormsLogModal
                isOpen={data.isLogModalOpen}
                onClose={() => data.setIsLogModalOpen(false)}
                newLog={data.newLog}
                setNewLog={data.setNewLog}
                onSave={data.handleSaveLog}
            />

            <DormsMasterModal
                isOpen={data.isDormModalOpen}
                onClose={() => data.setIsDormModalOpen(false)}
                editingDorm={data.editingDorm}
                newDorm={data.newDorm}
                setNewDorm={data.setNewDorm}
                musyrifList={data.musyrifList}
                onSave={data.handleSaveDorm}
                submitting={data.submittingDorm}
            />

            {/* --- CONFIRMATION MODALS --- */}
            <ConfirmEvictModal
                isOpen={data.isConfirmEvictOpen}
                onClose={() => data.setIsConfirmEvictOpen(false)}
                studentToEvict={data.studentToEvict}
                onConfirm={data.handleConfirmEvict}
                submitting={data.submitting}
            />

            <ConfirmDeleteDormModal
                isOpen={data.isConfirmDeleteDormOpen}
                onClose={() => data.setIsConfirmDeleteDormOpen(false)}
                dormToDelete={data.dormToDelete}
                students={data.students}
                onConfirm={data.handleConfirmDeleteDorm}
                submitting={data.submittingDeleteDorm}
            />

            <ConfirmDeleteAuditModal
                isOpen={data.isConfirmDeleteAuditOpen}
                onClose={() => data.setIsConfirmDeleteAuditOpen(false)}
                auditToDelete={data.auditToDelete}
                onConfirm={data.handleConfirmDeleteAudit}
                submitting={data.submittingDeleteAudit}
            />

            <ConfirmDeleteInventoryModal
                isOpen={data.isConfirmDeleteInventoryOpen}
                onClose={() => data.setIsConfirmDeleteInventoryOpen(false)}
                inventoryToDelete={data.inventoryToDelete}
                onConfirm={data.handleConfirmDeleteInventory}
                pendingInventoryDorm={data.pendingInventoryDorm}
                setInventoryModalDorm={data.setInventoryModalDorm}
                setPendingInventoryDorm={data.setPendingInventoryDorm}
            />
        </DashboardLayout>
    )
}
