import { STATUS_MAP } from '../utils/permitConstants'
import { Badge } from '@shared/components'

// Status → varian token Badge (satu sumber warna, pola docs/ui.md).
// issued=primary · departed=warning · returned=success · overdue=danger · cancelled=neutral
const VARIANT_BY_STATUS = {
  issued: 'primary',
  departed: 'warning',
  returned: 'success',
  overdue: 'danger',
  cancelled: 'neutral',
}

// Ukuran via override padding — base Badge: px-2.5 py-0.5 text-xs.
const SIZE_CLASS = {
  xs: '!px-1.5',
  sm: '!px-2',
  md: '',
}

export default function StatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.issued
  const Icon = meta.icon

  return (
    <Badge
      variant={VARIANT_BY_STATUS[status] || VARIANT_BY_STATUS.issued}
      className={SIZE_CLASS[size] || SIZE_CLASS.sm}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {meta.label}
    </Badge>
  )
}
