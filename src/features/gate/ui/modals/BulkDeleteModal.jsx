import { Trash2 } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'
import { getVisitorTypes } from '@features/gate/utils/gateConstants'

export default function BulkDeleteModal({ logs = [], onConfirm, onCancel }) {
  const { language } = useLanguage()
  const count = logs.length

  const visitorTypes = getVisitorTypes(language)
  const typeMeta = Object.fromEntries(visitorTypes.map(t => [t.key, t]))

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={language === 'en' ? 'Delete Entries' : language === 'ar' ? 'حذف الإدخالات' : 'Hapus Entri'}
      description={language === 'en' ? 'This action cannot be undone' : language === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء' : 'Tindakan ini tidak dapat dibatalkan'}
      icon={Trash2}
      iconBg="bg-red-500/10"
      iconColor="text-red-500"
      size="sm"
      mobileVariant="bottom-sheet"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:bg-[var(--color-surface-alt)] transition-all shrink-0">
            {language === 'en' ? 'CANCEL' : language === 'ar' ? 'إلغاء' : 'BATAL'}
          </button>
          <div className="flex-1" />
          <button
            onClick={onConfirm}
            className="h-10 px-6 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'en' ? `DELETE ${count}` : language === 'ar' ? `حذف ${count}` : `HAPUS ${count} ENTRI`}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-3 pt-1">
        {/* Warning */}
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-[11px] text-red-500/80 font-bold">
            {language === 'en' ? 'These entries will be permanently deleted!' : language === 'ar' ? 'سيتم حذف هذه الإدخالات نهائيًا!' : 'Entri berikut akan dihapus permanen!'}
          </p>
        </div>

        {/* Name list */}
        <div className="border border-red-500/20 rounded-xl overflow-hidden">
          <div className="px-3 py-1.5 bg-red-500/5 border-b border-red-500/15">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-500/70">
              {language === 'en' ? `${count} entries to delete` : language === 'ar' ? `${count} إدخالات للحذف` : `${count} entri akan dihapus`}
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border)] max-h-40 overflow-y-auto">
            {logs.map(log => {
              const meta = typeMeta[log.visitor_type] || typeMeta.tamu
              return (
                <div key={log.id} className="flex items-center gap-2.5 px-3 py-1.5">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 ${meta.bg} ${meta.color}`}>{meta.label}</span>
                  <span className="text-[12px] font-bold text-[var(--color-text)] truncate">{log.visitor_name}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 ml-auto">{log.purpose}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
