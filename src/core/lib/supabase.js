import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const checkDemoMode = () => {
    if (!supabaseUrl || !supabaseAnonKey) return true
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (params.get('demo') === 'true') {
            localStorage.setItem('laporanmu_force_demo', 'true')
            return true
        }
        if (params.get('demo') === 'false') {
            localStorage.removeItem('laporanmu_force_demo')
            return false
        }
        return localStorage.getItem('laporanmu_force_demo') === 'true'
    }
    return false
}

export const isDemoMode = checkDemoMode()

if (isDemoMode) {
    console.warn('[Laporanmu] Supabase env tidak ditemukan — berjalan dalam Demo Mode.')
    console.info('[Laporanmu] Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY untuk koneksi real.')
}

const makeMockChain = (data = []) => {
    let isSingle = false
    const builder = () => {};
    
    const proxy = new Proxy(builder, {
        get(target, prop) {
            if (prop === 'then') {
                return (onFulfilled) => {
                    const resultData = isSingle ? (data[0] || null) : data
                    return Promise.resolve({ data: resultData, error: null, count: data.length }).then(onFulfilled)
                }
            }
            if (prop === 'single') {
                isSingle = true
                return proxy
            }
            if (prop === 'getPublicUrl') {
                return () => ({ data: { publicUrl: 'https://via.placeholder.com/150' } })
            }
            return proxy;
        },
        apply(target, thisArg, argumentsList) {
            return proxy;
        }
    })
    
    return proxy
}

const MOCK_DATA = {
    students: [
        { id: 's1', name: 'Budi Santoso', class_id: 'c1', total_points: 95, registration_code: 'REG001', gender: 'L', status: 'aktif' },
        { id: 's2', name: 'Siti Maryam', class_id: 'c2', total_points: 105, registration_code: 'REG002', gender: 'P', status: 'aktif' },
        { id: 's3', name: 'Muhammad Ali', class_id: 'c1', total_points: -15, registration_code: 'REG003', gender: 'L', status: 'aktif' },
        { id: 's4', name: 'Fatima Zahra', class_id: 'c2', total_points: 120, registration_code: 'REG004', gender: 'P', status: 'aktif' },
        { id: 's5', name: 'Ahmad Faiz', class_id: 'c1', total_points: -5, registration_code: 'REG005', gender: 'L', status: 'aktif' }
    ],
    classes: [
        { id: 'c1', name: '10A Boarding Putra' },
        { id: 'c2', name: '10B Boarding Putri' },
        { id: 'c3', name: '11A Boarding Putra' }
    ],
    point_rules: [
        { id: 'r1', name: 'Terlambat Masuk Kelas', points: -5, is_negative: true, status: 'active', category: 'Kedisiplinan', description: 'Terlambat memasuki ruang kelas setelah bel masuk berbunyi' },
        { id: 'r2', name: 'Membantu Membersihkan Masjid', points: 10, is_negative: false, status: 'active', category: 'Sikap', description: 'Secara sukarela membantu membersihkan area masjid pesantren' },
        { id: 'r3', name: 'Merusak Fasilitas Sekolah', points: -50, is_negative: true, status: 'active', category: 'Tata Tertib', description: 'Merusak sarana prasarana sekolah secara sengaja maupun tidak sengaja' },
        { id: 'r4', name: 'Selesai Hafalan Juz 30', points: 30, is_negative: false, status: 'active', category: 'Prestasi', description: 'Berhasil menyelesaikan hafalan Juz 30 dengan lancar' }
    ],
    reports: [
        { id: 'rep1', student_id: 's1', violation_type_id: 'r1', points: -5, notes: 'Terlambat 15 menit', reported_at: new Date().toISOString(), teacher_name: 'Ustadz Ahmad' },
        { id: 'rep2', student_id: 's2', violation_type_id: 'r2', points: 10, notes: 'Membersihkan teras depan', reported_at: new Date().toISOString(), teacher_name: 'Ustadz Faisal' },
        { id: 'rep3', student_id: 's3', violation_type_id: 'r3', points: -50, notes: 'Memecahkan kaca jendela kelas', reported_at: new Date(Date.now() - 86400000).toISOString(), teacher_name: 'Ustadz Ahmad' }
    ],
    gate_logs: [
        { id: 'g1', visitor_name: 'Budi Santoso', visitor_type: 'siswa', check_in: new Date().toISOString(), check_out: null },
        { id: 'g2', visitor_name: 'Siti Maryam', visitor_type: 'siswa', check_in: new Date(Date.now() - 3600000).toISOString(), check_out: null }
    ],
    profiles: [
        { id: 'demo-dev', email: 'dev@laporanmu.id', role: 'developer', name: 'Developer' },
        { id: 'demo-admin', email: 'admin@laporanmu.id', role: 'admin', name: 'Administrator' },
        { id: 'demo-guru', email: 'guru@laporanmu.id', role: 'guru', name: 'Budi Santoso' },
        { id: 'demo-satpam', email: 'satpam@laporanmu.id', role: 'satpam', name: 'Penjaga Gerbang' },
        { id: 'demo-viewer', email: 'viewer@laporanmu.id', role: 'viewer', name: 'Demo Viewer' }
    ]
}

const demoGuard = new Proxy({}, {
    get(_, prop) {
        if (prop === 'auth') {
            return {
                getSession: () => {
                    const demoSession = localStorage.getItem('laporanmu_demo_session') || sessionStorage.getItem('laporanmu_demo_session')
                    const user = demoSession ? JSON.parse(demoSession) : null
                    return Promise.resolve({ data: { session: user ? { user } : null } })
                },
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                signOut: () => {
                    localStorage.removeItem('laporanmu_demo_session')
                    sessionStorage.removeItem('laporanmu_demo_session')
                    return Promise.resolve()
                },
                signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
                getUser: () => {
                    const demoSession = localStorage.getItem('laporanmu_demo_session') || sessionStorage.getItem('laporanmu_demo_session')
                    const user = demoSession ? JSON.parse(demoSession) : null
                    return Promise.resolve({ data: { user }, error: null })
                }
            }
        }
        if (prop === 'storage') {
            return makeMockChain([])
        }
        if (prop === 'from') {
            return (table) => makeMockChain(MOCK_DATA[table] || [])
        }
        return makeMockChain([])
    }
})

export const supabase = isDemoMode
    ? demoGuard
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        }
    })