import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus, Users, HeartHandshake } from 'lucide-react'

export const QuickActions = memo(function QuickActions() {
    return (
        <div className="rounded-[1.5rem] p-5 bg-[var(--color-surface)] border border-border relative overflow-hidden group hover:shadow-md transition-all duration-500">
            <div className="mb-5 relative z-10">
                <p className="text-[13px] font-black text-[var(--color-text)]">Aksi Cepat</p>
                <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Navigasi halaman utama</p>
            </div>
            <div className="space-y-2.5 relative z-10">
                <Link to="/boarding/behavior" className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--color-primary)] hover:brightness-110 active:scale-[0.98] text-white transition-all shadow-lg">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <Plus className="text-sm" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-black leading-tight">Input Perilaku</p>
                        <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest mt-0.5">Poin & Prestasi</p>
                    </div>
                </Link>
                <Link to="/master/students" className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:shadow-lg group/btn transition-all">
                    <div className="w-9 h-9 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
                        <Users />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">Data Siswa</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest opacity-60 mt-0.5">Database Pusat</p>
                    </div>
                </Link>
                <Link to="/raport" className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:shadow-lg group/btn transition-all">
                    <div className="w-9 h-9 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
                        <ClipboardList />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">Raport Bulanan</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest opacity-60 mt-0.5">Progress Pengisian</p>
                    </div>
                </Link>
                <Link to="/boarding/counseling" className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:shadow-lg group/btn transition-all">
                    <div className="w-9 h-9 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
                        <HeartHandshake className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">Konseling & BK</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest opacity-60 mt-0.5">Bimbingan Santri</p>
                    </div>
                </Link>
            </div>
        </div>
    )
})
