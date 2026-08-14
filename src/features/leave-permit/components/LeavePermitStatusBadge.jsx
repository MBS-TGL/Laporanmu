import React from 'react'
import { STATUS_MAP } from '../utils/leavePermitConstants'

export default function LeavePermitStatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.issued
  const Icon = meta.icon

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1.5',
    md: 'px-2.5 py-1 text-[11px] gap-1.5',
  }

  return (
    <span className={`inline-flex items-center font-bold rounded-full border ${meta.color} ${sizeClasses[size] || sizeClasses.sm}`}>
      <Icon className={`${size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} shrink-0`} />
      {meta.label}
    </span>
  )
}
