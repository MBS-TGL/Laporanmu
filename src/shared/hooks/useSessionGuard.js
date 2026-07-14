import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@lib/supabase'

export function useSessionGuard(intervalMs = 15000) {
    const navigate = useNavigate()

    useEffect(() => {
        const checkSession = async () => {
            // getUser() selalu verifikasi ke server — tidak pakai cache lokal
            const { data: { user }, error } = await supabase.auth.getUser()

            if (!user || error) {
                await supabase.auth.signOut()
                navigate('/login?reason=session_expired')
            }
        }

        // Cek saat pertama render
        checkSession()

        // Polling tiap 15 detik (lebih responsif dari 30)
        const interval = setInterval(checkSession, intervalMs)
        return () => clearInterval(interval)
    }, [navigate, intervalMs])
}