import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPaperPlane,
    faRobot,
    faTimes,
    faUserTie,
    faShieldAlt,
    faBolt,
    faChevronDown,
    faCheckCircle,
    faChevronLeft,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons'
import { askAi } from '@lib/ai'

export default function ChatAssistant({ isOpen: controlledIsOpen, onOpenChange }) {
    const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false)
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : uncontrolledIsOpen

    const setIsOpen = (val) => {
        if (onOpenChange) {
            onOpenChange(val)
        } else {
            setUncontrolledIsOpen(val)
        }
    }

    const [showInvite, setShowInvite] = useState(false)
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Halo Kak! 😊 Saya **Asisten**. Ada yang ingin ditanyakan seputar aturan sekolah atau fitur aplikasi?' }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef(null)
    const scrollContainerRef = useRef(null)

    // Auto-Invite handle
    useEffect(() => {
        const timer = setTimeout(() => { if (!isOpen) setShowInvite(true) }, 12000)
        return () => clearTimeout(timer)
    }, [isOpen])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isOpen])

    // Scroll Handlers for PC Arrows
    const scrollChips = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = direction === 'left' ? -150 : 150
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        }
    }

    const renderContent = (text) => {
        if (!text) return ""
        // Normalize: collapse multiple newlines into one
        let cleanText = text.replace(/\n\s*\n/g, '\n').trim()

        let formatted = cleanText
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-indigo-600 dark:text-indigo-400">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic opacity-80">$1</em>')
            // Expert Listing — support bullets & numbers
            .replace(/^\d+\.\s+(.*)/gm, '<div class="flex gap-2 ml-1 my-0.5"><span class="font-bold text-indigo-500">$&</span></div>')
            .replace(/^\s*[-•]\s+(.*)/gm, '<div class="flex gap-2 ml-1 my-0.5"><span class="text-indigo-500 opacity-50">•</span> <span>$1</span></div>')
            .replace(/\n/g, '<br />')
        return <div className="prose-compact prose prose-sm max-w-none dark:prose-invert">{<div dangerouslySetInnerHTML={{ __html: formatted }} />}</div>
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return
        const userMsg = input.trim()
        
        // Context memory (last 4 msgs)
        const history = messages
            .slice(-4)
            .map(m => ({ role: m.role, content: m.content }))

        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setInput('')
        setIsLoading(true)
        setShowInvite(false)

        const botReply = await askAi(userMsg, "chat", history)
        
        setMessages(prev => [...prev, { role: 'assistant', content: botReply }])
        setIsLoading(false)
    }

    if (!isOpen) {
        // If the chat assistant is controlled from the parent layout (e.g., TopBar button), 
        // hide the floating FAB bubble to prevent blocking dashboard content.
        if (controlledIsOpen !== undefined) {
            return null
        }

        return (
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 group">
                {showInvite && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-indigo-100 dark:border-white/5 animate-in slide-in-from-right-5 fade-in duration-500 max-w-[200px] relative">
                        <button onClick={() => setShowInvite(false)} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-[10px] text-slate-400"><FontAwesomeIcon icon={faTimes} /></button>
                        <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-relaxed">Halo! 👋 Ada yang bisa <span className="text-indigo-600">Asisten</span> bantu?</p>
                    </div>
                )}
                <button onClick={() => setIsOpen(true)} className="px-6 h-14 bg-indigo-600 text-white shadow-lg rounded-full flex items-center gap-3 hover:scale-105 transition-all group overflow-hidden">
                    <div className="relative"><FontAwesomeIcon icon={faRobot} className="text-lg" /><span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" /></div>
                    <span className="text-sm font-bold tracking-tight">Tanya Aku!</span>
                </button>
            </div>
        )
    }

    return (
        <div className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[620px] max-h-[85vh] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-white dark:border-white/10 rounded-[2.8rem] shadow-2xl flex flex-col overflow-hidden z-[100] animate-in zoom-in-95 duration-300">
            
            {/* Balanced Integrated Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-black/[0.02]">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                        <FontAwesomeIcon icon={faRobot} className="text-white text-[14px]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-[13.5px] font-bold text-slate-900 dark:text-white font-heading tracking-tight">Asisten</h3>
                            <FontAwesomeIcon icon={faCheckCircle} className="text-[10px] text-blue-500" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Online</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors">
                    <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                </button>
            </div>

            {/* Tight Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                        <div className={`max-w-[90%] px-4 py-2.5 text-[13px] leading-relaxed relative shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none border border-black/[0.03]'}`}>{renderContent(msg.content)}</div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 dark:bg-white/5 px-6 py-4 rounded-[1.8rem] rounded-tl-[0.4rem] border border-black/5"><div className="flex gap-2"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" /><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" /><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" /></div></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Slim Premium Footer */}
            <div className="px-6 pb-6 pt-3 bg-white/50 dark:bg-black/20 border-t border-black/[0.03]">
                
                {/* Slim Quick Actions - One Row Indented */}
                <div className="relative mb-4 group/chips">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
                        {[
                            { icon: faBolt, label: 'Cek Poin' },
                            { icon: faUserTie, label: 'Daftar Guru' },
                            { icon: faShieldAlt, label: 'Aturan Sekolah' },
                            { icon: faCheckCircle, label: 'Fitur API' }
                        ].map((q, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setInput(q.label)} 
                                className="shrink-0 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-white/5 border border-black/[0.03] text-[10.5px] font-bold text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-2 snap-start shadow-sm"
                            >
                                <FontAwesomeIcon icon={q.icon} className="text-[9px] opacity-40" />
                                {q.label}
                            </button>
                        ))}
                        <div className="shrink-0 w-8 h-1" />
                    </div>
                    {/* Visual indicators for more chips */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-950 to-transparent pointer-events-none" />
                </div>

                {/* WhatsApp Style Input - Compact */}
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input 
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ketik pesan..."
                        className="flex-1 h-11 px-5 rounded-full bg-slate-100/80 dark:bg-slate-900 border-none outline-none text-[13px] font-medium focus:ring-2 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
                    />
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-11 h-11 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0"
                    >
                        <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                    </button>
                </form>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .prose-compact p { margin-top: 0.1em !important; margin-bottom: 0.1em !important; line-height: 1.4 !important; }
                .prose-compact ul, .prose-compact ol { margin-top: 0.2em !important; margin-bottom: 0.2em !important; }
                .prose-compact li { margin-top: 0 !important; margin-bottom: 0 !important; }
                .prose-compact br { content: ""; display: block; margin: 0.2em 0; }
            `}} />
        </div>
    )
}
