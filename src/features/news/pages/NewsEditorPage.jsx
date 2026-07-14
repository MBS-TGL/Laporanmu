import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPen, faFilter, faGlobe, faEye, faImage, faTags, faUserPen,
    faHashtag, faClock, faCheck, faXmark, faSpinner, faPlus,
    faArrowUpRightFromSquare, faMagicWandSparkles, faChevronLeft,
    faCloudArrowUp, faTriangleExclamation, faTrash, faAlignLeft,
    faBookOpen, faNewspaper, faFloppyDisk, faUser, faChevronDown,
    faEyeSlash, faShareNodes, faRotateLeft, faCheckCircle,
    faMoon, faCloudRain, faCoffee, faLeaf,
    faBackward, faPlay, faPause, faForward, faMusic, faKeyboard, faRepeat,
    faArrowRight, faCircleInfo, faMaximize
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import Breadcrumb from '@shared/components/Breadcrumb'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { useSchoolSettings } from '@context/SchoolSettings'
import MediaLibraryModal from '@features/news/components/MediaLibraryModal'
import Modal from '@shared/components/Modal'
import { askAi } from '@lib/ai'

// ─── Helpers ────────────────────────────────────────────────────────────────────
const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)
const getReadTime = (html) => {
    if (!html) return 1
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()
    const words = text.split(/\s+/).filter(Boolean).length
    const images = (html.match(/<img/g) || []).length

    // Standard: 200 words per minute
    // Plus 12 seconds for first image, 11 for second, ..., 3 for tenth+
    const imageTime = Array.from({ length: images }, (_, i) => Math.max(3, 12 - i))
        .reduce((acc, curr) => acc + curr, 0) / 60

    const wordTime = words / 200
    return Math.max(1, Math.ceil(wordTime + imageTime))
}
const decodeEntities = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const getExcerpt = (html, maxLen = 160) => { const text = decodeEntities(html); return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text }
const isFormEmpty = (form) => {
    const cleanTitle = (form.title || '').trim()
    const cleanContent = (form.content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
    return !cleanTitle && !cleanContent
}

export default function NewsEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { settings } = useSchoolSettings()
    const { profile: authProfile } = useAuth()
    const isEdit = Boolean(id)

    const [form, setForm] = useState({
        title: '',
        excerpt: '',
        content: '',
        tag: 'Informasi',
        image_url: '',
        image_alt: '',
        is_published: false,
        is_featured: false,
        scheduled_at: '',
        meta_title: '',
        meta_description: '',
        slug: '',
        display_name: '',
        focus_keyword: '',
        seo_score: 0,
    })

    const [isLoading, setIsLoading] = useState(isEdit)
    const [isSaving, setIsSaving] = useState(false)
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [imageError, setImageError] = useState('')
    const [activeTab, setActiveTab] = useState('content') // content | settings | seo
    const [isGeneratingSeo, setIsGeneratingSeo] = useState(false)
    const [isSidePreview, setIsSidePreview] = useState(window.innerWidth > 1024)
    const [seoView, setSeoView] = useState('search') // search | social
    const fileInputRef = useRef(null)
    const quillRef = useRef(null)
    const zenTitleRef = useRef(null)

    const [isDragging, setIsDragging] = useState(false)
    const [lastSaved, setLastSaved] = useState(null)
    const [hasDraft, setHasDraft] = useState(false)
    const [isDraftDismissed, setIsDraftDismissed] = useState(false)
    const [showExitModal, setShowExitModal] = useState(false)
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
    const [isZenMode, setIsZenMode] = useState(false)

    // Auto-resize Zen Title on mount
    useEffect(() => {
        if (isZenMode && zenTitleRef.current) {
            zenTitleRef.current.style.height = 'auto'
            zenTitleRef.current.style.height = zenTitleRef.current.scrollHeight + 'px'
        }
    }, [isZenMode])
    const [existingTags, setExistingTags] = useState([])
    const [showTagSuggestions, setShowTagSuggestions] = useState(false)
    const [seoAnalysis, setSeoAnalysis] = useState([])

    // ── Enterprise Sultan Features ──
    const [showCommandPalette, setShowCommandPalette] = useState(false)
    const [isAiModalOpen, setIsAiModalOpen] = useState(false)
    const [showRevisionHistory, setShowRevisionHistory] = useState(false)
    const [revisions, setRevisions] = useState([])
    const [isGeneratingAi, setIsGeneratingAi] = useState(false)

    // Safety check: ensure modal is closed on mount
    useEffect(() => {
        setIsAiModalOpen(false);
    }, []);

    // ── Real-time Presence State ──
    const [collaborators, setCollaborators] = useState([])
    const presenceChannel = useRef(null)

    // ── Supabase Presence Logic ──
    useEffect(() => {
        if (!id || !authProfile) return

        // Initialize Channel
        const channelId = `news_editor_${id}`
        presenceChannel.current = supabase.channel(channelId, {
            config: { presence: { key: authProfile.id } }
        })

        // Handle Presence Sync
        presenceChannel.current
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.current.presenceState()
                const users = []
                for (const key in state) {
                    const presence = state[key][0]
                    if (presence.user_id !== authProfile.id) {
                        users.push(presence)
                    }
                }
                setCollaborators(users)
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                const user = newPresences[0]
                if (user.user_id !== authProfile.id) {
                    addToast(`${user.name} bergabung mengedit`, 'info')
                }
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                const user = leftPresences[0]
                if (user.user_id !== authProfile.id) {
                    // Optional: No toast for leaving to avoid noise
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.current.track({
                        user_id: authProfile.id,
                        name: authProfile.name || authProfile.email?.split('@')[0] || 'Editor',
                        email: authProfile.email,
                        avatar_url: authProfile.avatar_url || null,
                        last_active: new Date().toISOString()
                    })
                }
            })

        return () => {
            if (presenceChannel.current) {
                presenceChannel.current.unsubscribe()
            }
        }
    }, [id, authProfile, addToast])

    // ── Auto-save to LocalStorage (Create Mode Only) ──
    useEffect(() => {
        if (isEdit) return
        const draft = localStorage.getItem('news_draft')
        if (draft && !isDraftDismissed) {
            const parsed = JSON.parse(draft)
            // Only show if draft has meaningful content and current form is effectively empty
            if (!isFormEmpty(parsed) && isFormEmpty(form)) {
                setHasDraft(true)
            }
        }
    }, [isEdit, isDraftDismissed, form.title, form.content])

    useEffect(() => {
        if (isEdit || isSaving) return
        const timer = setTimeout(() => {
            if (!isFormEmpty(form)) {
                localStorage.setItem('news_draft', JSON.stringify(form))
            } else {
                // If form becomes empty (e.g. user deleted everything), clean up potential ghost draft
                localStorage.removeItem('news_draft')
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [form, isEdit, isSaving])

    const recoverDraft = () => {
        const draft = localStorage.getItem('news_draft')
        if (draft) {
            setForm(JSON.parse(draft))
            addToast('Draft berhasil dipulihkan', 'success')
        }
        setHasDraft(false)
    }

    const discardDraft = () => {
        localStorage.removeItem('news_draft')
        setHasDraft(false)
        setIsDraftDismissed(true)
        addToast('Draft dihapus dari memori', 'info')
    }

    // ── Editor Handlers ──
    const imageHandler = useCallback(() => {
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/*')
        input.click()
        input.onchange = async () => {
            const file = input.files[0]
            if (file) {
                // simple size check
                if (file.size > 5 * 1024 * 1024) {
                    addToast('Gagal: Ukuran gambar melebihi 5MB', 'error')
                    return
                }
                const ext = file.name.split('.').pop()
                const fileName = `content-${Date.now()}-${crypto.randomUUID()}.${ext}`
                const { error } = await supabase.storage.from('news').upload(`content/${fileName}`, file)

                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('news').getPublicUrl(`content/${fileName}`)
                    const quill = quillRef.current.getEditor()
                    const range = quill.getSelection(true) // Get cursor position
                    quill.insertEmbed(range.index, 'image', publicUrl)

                    // Sultan Feature: Auto-Alt Text based on Title
                    setTimeout(() => {
                        const images = quill.root.querySelectorAll('img');
                        const lastImg = images[images.length - 1];
                        if (lastImg) lastImg.alt = form.title || 'Informasi Laporanmu';
                    }, 100);

                    quill.setSelection(range.index + 1) // Move cursor after image
                } else {
                    addToast('Gagal upload gambar: ' + error.message, 'error')
                }
            }
        }
    }, [addToast, form.title])

    // State for Editor Command Strip (Replaces Modals)
    const [commandStrip, setCommandStrip] = useState({ open: false, type: '', text: '', url: '' });

    // Handle Smart Link Paste
    const setupSmartPaste = useCallback((editor) => {
        editor.root.addEventListener('paste', (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('Text');

            // Regex to identify URL
            const urlRegex = /^(https?:\/\/[^\s]+)$/;
            if (urlRegex.test(pastedText.trim())) {
                const range = editor.getSelection();
                if (range && range.length > 0) {
                    e.preventDefault();
                    editor.format('link', pastedText.trim());
                    addToast('Teks berhasil ditautkan!', 'success');
                    return;
                }
            }
        });
    }, [addToast]);

    // ── Sultans Feature: Zen Ambience ──
    const ambienceOptions = [
        { id: 'none', label: 'None', icon: faMoon },
        { id: 'rain', label: 'Rainy Day', icon: faCloudRain, url: 'https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg' },
        { id: 'cafe', label: 'Library', icon: faCoffee, url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
        { id: 'forest', label: 'Nature', icon: faLeaf, url: 'https://assets.mixkit.co/active_storage/sfx/2431/2431-preview.mp3' } // Better Forest birds
    ];

    const [ambience, setAmbience] = useState({ type: 'none', playing: false, url: '', title: '', volume: 0.4, repeat: true });
    const [isTyping, setIsTyping] = useState(false);
    const typingTimerRef = useRef(null);
    const [typewriterEnabled, setTypewriterEnabled] = useState(true);
    const [customMusic, setCustomMusic] = useState('');
    const audioRef = useRef(null);
    const typewriterRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2550/2550-preview.mp3')); // Real Mechanical KB
    const ytPlayerRef = useRef(null);

    // YT Player Loader
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(tag);
        }
    }, []);

    // YouTube API Setup
    const setupYTPlayer = useCallback((videoId) => {
        const createPlayer = () => {
            if (ytPlayerRef.current && ytPlayerRef.current.destroy) ytPlayerRef.current.destroy();
            ytPlayerRef.current = new window.YT.Player('yt-player-container', {
                height: '0', width: '0', videoId: videoId,
                playerVars: { autoplay: 1, controls: 0, loop: ambience.repeat ? 1 : 0, playlist: videoId },
                events: {
                    onReady: (e) => {
                        e.target.mute();
                        e.target.playVideo();
                        setTimeout(() => e.target.unMute(), 500);
                    },
                    onStateChange: (e) => {
                        if (e.data === window.YT.PlayerState.ENDED && ambience.repeat) e.target.playVideo();
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            createPlayer();
        } else {
            // Wait for API if not ready
            window.onYouTubeIframeAPIReady = createPlayer;
        }
    }, []);

    // Effect for Audio & YT synchronization
    useEffect(() => {
        if (audioRef.current) {
            if (ambience.playing && ambience.type !== 'none' && ambience.type !== 'custom_yt') {
                const opt = ambienceOptions.find(o => o.id === ambience.type);
                const sourceUrl = ambience.type === 'custom_audio' ? ambience.url : opt?.url;
                if (sourceUrl) {
                    audioRef.current.src = sourceUrl;
                    audioRef.current.volume = ambience.volume ?? 0.4;
                    audioRef.current.load();
                    audioRef.current.play().catch(e => console.warn('Autoplay blocked'));
                }
            } else {
                audioRef.current.pause();
            }
        }

        if (ytPlayerRef.current && ytPlayerRef.current.playVideo) {
            if (ambience.type === 'custom_yt' && ambience.playing) {
                ytPlayerRef.current.setVolume((ambience.volume ?? 0.4) * 100);
                ytPlayerRef.current.playVideo();
            } else if (ytPlayerRef.current.pauseVideo) {
                ytPlayerRef.current.pauseVideo();
            }
        }
    }, [ambience.type, ambience.playing, ambience.url, ambience.volume]);

    // Mechanical Typewriter Feedback
    const playTypewriter = useCallback(() => {
        if (!typewriterEnabled || !isZenMode) return;
        typewriterRef.current.currentTime = 0;
        typewriterRef.current.volume = 0.15;
        typewriterRef.current.play().catch(() => { });
    }, [typewriterEnabled, isZenMode]);

    // Immersive Ghost UI logic
    const handleActiveTyping = useCallback(() => {
        if (!isZenMode) return;
        setIsTyping(true);
        playTypewriter();
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 2500);
    }, [isZenMode, playTypewriter]);

    // ── Table of Contents Generator ──
    const [toc, setToc] = useState([]);
    useEffect(() => {
        const doc = new DOMParser().parseFromString(form.content, 'text/html');
        const headers = Array.from(doc.querySelectorAll('h2, h3')).map(h => ({
            text: h.innerText,
            level: h.tagName.toLowerCase(),
            id: h.innerText.toLowerCase().replace(/\s+/g, '-')
        }));
        setToc(headers);
    }, [form.content]);

    // Custom Toolbar Handlers
    const calculateSEOScore = useCallback((content, title, excerpt, keyword) => {
        let score = 0;
        const text = content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
        const words = text.split(/\s+/).filter(Boolean).length;

        if (title.length >= 20 && title.length <= 60) score += 15;
        if (excerpt && excerpt.length >= 100 && excerpt.length <= 160) score += 15;
        if (words >= 300) score += 20;
        if (content.includes('<img')) score += 15;
        if (content.includes('<a href=')) score += 10;
        if (keyword && title.toLowerCase().includes(keyword.toLowerCase())) score += 15;
        if (keyword && text.toLowerCase().slice(0, 500).includes(keyword.toLowerCase())) score += 10;

        return Math.min(score, 100);
    }, []);

    // ── Sultans Feature: Drag & Drop Image ──
    const setupDragAndDrop = useCallback((editor) => {
        editor.root.addEventListener('drop', async (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files && files[0] && files[0].type.startsWith('image/')) {
                const range = editor.getSelection(true);
                // Trigger the same upload logic as imageHandler
                const file = files[0];
                const ext = file.name.split('.').pop();
                const filePath = `content/${Date.now()}-${crypto.randomUUID()}.${ext}`;
                const { error } = await supabase.storage.from('news').upload(filePath, file);

                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('news').getPublicUrl(filePath);
                    editor.insertEmbed(range.index, 'image', publicUrl);
                    addToast('Gambar berhasil di-drop & upload!', 'success');
                }
            }
        });
    }, [addToast]);

    // ── Bubble Menu State ──
    const [bubbleMenu, setBubbleMenu] = useState({ show: false, x: 0, y: 0 });

    const setupBubbleMenu = useCallback((editor) => {
        editor.on('selection-change', (range) => {
            if (range && range.length > 0) {
                const bounds = editor.getBounds(range.index, range.length);
                const editorBounds = editor.root.getBoundingClientRect();
                setBubbleMenu({
                    show: true,
                    x: bounds.left + (bounds.width / 2) - 60, // Center bubble
                    y: bounds.top - 45
                });
            } else {
                setBubbleMenu(s => ({ ...s, show: false }));
            }
        });
    }, []);

    // Custom Toolbar Handlers
    const handlers = useMemo(() => ({
        link: function () {
            const range = this.quill.getSelection();
            let url = '';
            let text = '';

            if (range) {
                text = this.quill.getText(range.index, range.length);
                // Detect if current selection is already a link
                const [leaf] = this.quill.getLeaf(range.index);
                if (leaf && leaf.parent && leaf.parent.domNode.tagName === 'A') {
                    url = leaf.parent.domNode.href;
                }
            }

            setCommandStrip(curr => ({
                open: curr.type === 'link' ? !curr.open : true,
                type: 'link',
                text: text || curr.text,
                url: url
            }));
        },
        video: function () {
            setCommandStrip(curr => ({
                open: curr.type === 'video' ? !curr.open : true,
                type: 'video',
                text: '',
                url: ''
            }));
        },
        image: imageHandler
    }), [imageHandler]);

    // ── Sultans Feature: Global Keyboard Shortcuts ──
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+K -> Command Palette
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowCommandPalette(curr => !curr);
            }
            // Ctrl+L -> Link (Internal Quill Link)
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                if (quillRef.current) {
                    const editor = quillRef.current.getEditor();
                    handlers.link.call({ quill: editor });
                }
            }
            // Ctrl+J -> AI Assistant
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
                e.preventDefault();
                setIsAiModalOpen(true);
            }
            // Esc -> Close Modals
            if (e.key === 'Escape') {
                setShowCommandPalette(false);
                setIsAiModalOpen(false);
                setShowExitModal(false);
                setIsMediaModalOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handlers, isZenMode]);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ color: [] }, { background: [] }],
                [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }, { align: [] }],
                ['blockquote', 'code-block', 'link', 'image', 'video', 'clean']
            ],
            handlers: handlers
        },
        clipboard: { matchVisual: false }
    }), [handlers]);

    // ── Fetch Existing Tags ──
    useEffect(() => {
        const fetchTags = async () => {
            const { data: tags, error } = await supabase.from('news').select('tag')
            if (tags && !error) {
                const uniqueTags = [...new Set(tags.map(t => t.tag))].filter(Boolean)
                setExistingTags(uniqueTags)
            }
        }
        fetchTags()
    }, [])

    // ── Set default author display name from profile ──
    useEffect(() => {
        if (!isEdit && authProfile && !form.display_name) {
            setForm(f => ({
                ...f,
                display_name: authProfile.name || authProfile.email?.split('@')[0] || 'Admin'
            }))
        }
    }, [authProfile, isEdit, form.display_name])

    // ── Inject Quill Tooltips ──
    useEffect(() => {
        const timer = setTimeout(() => {
            const tooltips = {
                '.ql-bold': 'Tebal',
                '.ql-italic': 'Miring',
                '.ql-underline': 'Garis Bawah',
                '.ql-strike': 'Coret',
                '.ql-list[value="ordered"]': 'List Angka',
                '.ql-list[value="bullet"]': 'List Titik',
                '.ql-indent[value="-1"]': 'Kurangi Indentasi',
                '.ql-indent[value="+1"]': 'Tambah Indentasi',
                '.ql-link': 'Sisipkan Tautan',
                '.ql-image': 'Unggah Gambar ke Supabase',
                '.ql-video': 'Sisipkan Video Youtube',
                '.ql-blockquote': 'Kutipan',
                '.ql-code-block': 'Blok Kode',
                '.ql-clean': 'Hapus Format (Clean)',
                '.ql-align': 'Perataan Teks',
                '.ql-color': 'Warna Teks',
                '.ql-background': 'Warna Latar',
                '.ql-header': 'Ukuran Judul / Heading'
            }

            const toolbar = document.querySelector('.ql-toolbar')
            if (toolbar) {
                Object.entries(tooltips).forEach(([selector, text]) => {
                    toolbar.querySelectorAll(selector).forEach(el => el.setAttribute('title', text))
                })
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [])

    // ── Fetch Data for Edit ──
    useEffect(() => {
        if (!isEdit) return
        const fetchNews = async () => {
            const { data, error } = await supabase.from('news').select('*').eq('id', id).single()
            if (error) {
                addToast('Gagal memuat data berita', 'error')
                navigate('/admin/news')
            } else if (data) {
                setForm({
                    title: data.title || '',
                    excerpt: data.excerpt || '',
                    content: data.content || '',
                    tag: data.tag || 'Informasi',
                    image_url: data.image_url || '',
                    image_alt: data.image_alt || '',
                    is_published: data.is_published ?? false,
                    is_featured: data.is_featured ?? false,
                    scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : '',
                    meta_title: data.meta_title || '',
                    meta_description: data.meta_description || '',
                    slug: data.slug || '',
                    display_name: data.display_name || '',
                    focus_keyword: data.focus_keyword || '',
                    seo_score: data.seo_score || 0,
                })
                setImagePreview(data.image_url || null)
            }
            setIsLoading(false)
        }
        fetchNews()
    }, [id, isEdit, addToast, navigate])

    const calculatedReadTime = useMemo(() => getReadTime(form.content), [form.content])

    // ── Window unsaved changes warning ──
    useEffect(() => {
        const hasChanges = form.title || form.content
        const handleBeforeUnload = (e) => {
            if (hasChanges && !isSaving) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [form.title, form.content, isSaving])

    const handleGoBack = () => {
        const hasChanges = form.title || form.content
        if (hasChanges && !isEdit) {
            setShowExitModal(true)
        } else {
            navigate('/admin/news')
        }
    }

    // ── Keyboard Shortcuts (Ctrl+S / Ctrl+Enter) ──
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) {
                e.preventDefault()
                e.stopPropagation()
                // Directly call handleSave logic if title/content exists
                if (form.title.trim() && form.content.trim() && !isSaving) {
                    handleSave()
                }
            }
        }
        document.addEventListener('keydown', handler, true) // Use capture to bypass editor intercept
        return () => document.removeEventListener('keydown', handler, true)
    }, [form.title, form.content, isSaving]) // Simplified dependencies since handleSave is defined inside

    // ── SEO Logic ──
    const analyzeSeo = useCallback(() => {
        const text = decodeEntities(form.content)
        const wordCount = text.split(/\s+/).filter(Boolean).length
        const kw = form.focus_keyword.toLowerCase()
        const metaDesc = form.meta_description.toLowerCase()
        const title = form.title.toLowerCase()
        const slug = form.slug.toLowerCase()

        let score = 0
        const checks = []

        // Title Checks
        if (form.title.length >= 50 && form.title.length <= 60) { score += 15; checks.push({ label: 'Panjang Judul Ideal', st: 'success' }) }
        else { checks.push({ label: 'Judul sebaiknya 50-60 karakter', st: 'warning' }) }

        // Meta Checks
        if (form.meta_description.length >= 120 && form.meta_description.length <= 160) { score += 15; checks.push({ label: 'Panjang Meta Deskripsi Ideal', st: 'success' }) }
        else { checks.push({ label: 'Meta deskripsi sebaiknya 120-160 karakter', st: 'warning' }) }

        // Keyword Checks
        if (kw) {
            if (title.includes(kw)) { score += 20; checks.push({ label: 'Keyword ada di Judul', st: 'success' }) }
            else { checks.push({ label: 'Keyword tidak ditemukan di Judul', st: 'error' }) }

            if (slug.includes(kw)) { score += 15; checks.push({ label: 'Keyword ada di Slug URL', st: 'success' }) }
            else { checks.push({ label: 'Keyword tidak ditemukan di Slug', st: 'error' }) }

            if (metaDesc.includes(kw)) { score += 15; checks.push({ label: 'Keyword ada di Meta Deskripsi', st: 'success' }) }
            else { checks.push({ label: 'Keyword tidak ditemukan di Meta', st: 'error' }) }

            if (text.toLowerCase().slice(0, 500).includes(kw)) { score += 10; checks.push({ label: 'Keyword ada di paragraf pembuka', st: 'success' }) }
            else { checks.push({ label: 'Keyword tidak ada di awal konten', st: 'warning' }) }
        } else {
            checks.push({ label: 'Tentukan kata kunci utama!', st: 'info' })
        }

        // Length
        if (wordCount > 300) { score += 10; checks.push({ label: 'Panjang konten memadai (>300 kata)', st: 'success' }) }
        else { checks.push({ label: 'Konten terlalu pendek untuk SEO', st: 'warning' }) }

        setSeoAnalysis(checks)
        setForm(f => ({ ...f, seo_score: score }))
    }, [form.content, form.title, form.meta_description, form.slug, form.focus_keyword])

    useEffect(() => {
        const timer = setTimeout(() => analyzeSeo(), 1000)
        return () => clearTimeout(timer)
    }, [analyzeSeo])

    const generateAiSeo = () => {
        if (!form.content || isGeneratingSeo) return
        setIsGeneratingSeo(true)

        setTimeout(() => {
            const text = decodeEntities(form.content)
            const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 20)
            const metaDesc = sentences.length > 0
                ? (sentences[0] + (sentences[1] ? '. ' + sentences[1] : '')).slice(0, 155).trim() + '...'
                : text.slice(0, 155).trim() + '...'

            setForm(f => ({
                ...f,
                meta_title: f.title.trim().slice(0, 60),
                meta_description: metaDesc,
                excerpt: f.excerpt || metaDesc,
                slug: f.slug || slugify(f.title),
                // Try to guess keyword from title (first 2 words)
                focus_keyword: f.focus_keyword || f.title.split(' ').slice(0, 2).join(' ')
            }))

            setIsGeneratingSeo(false)
            addToast('SEO Metadata & Keyword berhasil di-generate', 'success')
        }, 1200)
    }

    const handleTitleChange = (val) => {
        setForm(f => ({
            ...f,
            title: val,
            slug: (f.slug && isEdit) ? f.slug : slugify(val),
            meta_title: f.meta_title || val.slice(0, 60),
        }))
        handleActiveTyping();
    }

    const refreshSlug = () => {
        if (!form.title) return
        setForm(f => ({ ...f, slug: slugify(form.title) }))
        addToast('Slug URL diperbarui dari judul', 'info')
    }

    // ── Handlers ──
    const handleContentChange = (content) => {
        setForm(f => ({
            ...f,
            content
        }))
        handleActiveTyping();
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        setImageError('')
        if (!file) return
        if (!file.type.startsWith('image/')) { setImageError('File harus berupa gambar'); return }
        if (file.size > 5 * 1024 * 1024) { setImageError('Ukuran file maksimal 5MB'); return }
        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(file)
    }

    const handleSave = async (e) => {
        e?.preventDefault()
        setIsSaving(true)

        if (!form.title.trim()) { addToast('Judul tidak boleh kosong', 'warning'); setIsSaving(false); return }
        if (form.title.length > 60) { addToast('Judul terlalu panjang (Maks 60)', 'warning'); setIsSaving(false); return }
        if (!form.content.trim() || form.content === '<p><br></p>') { addToast('Konten informasi belum diisi', 'warning'); setIsSaving(false); return }

        try {
            const user = (await supabase.auth.getUser()).data.user
            let imageUrl = form.image_url

            if (imageFile) {
                if (form.image_url) {
                    const oldPath = form.image_url.split('/storage/v1/object/public/news/')[1]
                    if (oldPath) await supabase.storage.from('news').remove([oldPath])
                }
                const ext = imageFile.name.split('.').pop()
                const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`
                const { error: uploadError } = await supabase.storage.from('news').upload(`thumbnails/${fileName}`, imageFile)
                if (uploadError) {
                    addToast('Upload gagal: ' + uploadError.message, 'error')
                    setIsSaving(false)
                    return
                }
                const { data: { publicUrl } } = supabase.storage.from('news').getPublicUrl(`thumbnails/${fileName}`)
                imageUrl = publicUrl
            }

            const finalSlug = (form.slug.trim() || slugify(form.title)).toLowerCase().replace(/\s+/g, '-')
            const finalExcerpt = form.excerpt.trim() || getExcerpt(form.content)

            const slugQuery = supabase.from('news').select('id').eq('slug', finalSlug)
            if (isEdit) slugQuery.neq('id', id)
            const { data: existingSlug } = await slugQuery
            if (existingSlug?.length > 0) {
                addToast('Slug URL sudah digunakan. Ubah slug terlebih dahulu.', 'error')
                setIsSaving(false)
                return
            }

            const payload = {
                title: form.title,
                slug: finalSlug,
                excerpt: finalExcerpt,
                content: form.content,
                tag: form.tag,
                image_url: imageUrl,
                image_alt: form.image_alt || form.title,
                is_published: form.is_published,
                is_featured: form.is_featured,
                scheduled_at: form.scheduled_at || null,
                meta_title: form.meta_title || form.title,
                meta_description: form.meta_description || finalExcerpt,
                read_time: calculatedReadTime,
                focus_keyword: form.focus_keyword || null,
                seo_score: form.seo_score || 0,
                display_name: form.display_name || null,
                author: user?.email || 'Admin',
                updated_at: new Date().toISOString()
            }

            let error, data
            if (isEdit) {
                const result = await supabase.from('news').update(payload).eq('id', id).select()
                error = result.error; data = result.data
            } else {
                const result = await supabase.from('news').insert([payload]).select()
                error = result.error; data = result.data
            }

            if (error) { addToast('Error: ' + error.message, 'error'); return }
            if (!data?.length) { addToast('Gagal menyimpan — cek RLS policy', 'error'); return }

            addToast(isEdit ? 'Informasi diperbarui' : 'Informasi ditambahkan', 'success')
            setLastSaved(new Date())

            // ── Save Revision (Enterprise) ──
            if (isEdit) {
                try {
                    await supabase.from('news_revisions').insert({
                        news_id: id,
                        content: form.content,
                        title: form.title,
                        author_id: authProfile.id,
                        author_name: authProfile.name || authProfile.email?.split('@')[0]
                    })
                } catch (revErr) { console.warn('Revision failed:', revErr) }
            }

            // Clear draft after success
            if (!isEdit) localStorage.removeItem('news_draft')

            await logAudit({
                action: isEdit ? 'UPDATE' : 'INSERT',
                source: user?.id || 'SYSTEM',
                tableName: 'news',
                recordId: data[0].id,
                newData: data[0]
            })

            navigate('/admin/news')
        } catch (error) {
            addToast('Terjadi kesalahan: ' + error.message, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const ConfirmExitModal = ({ isOpen, onClose, onConfirm }) => {
        if (!isOpen) return null
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] animate-in fade-in duration-300" onClick={onClose} />
                <div className="relative w-full max-w-[380px] bg-[var(--color-surface)] rounded-[2.5rem] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="p-8 text-center pb-6">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 text-xl mx-auto mb-6">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                        </div>
                        <h3 className="text-xl font-black text-[var(--color-text)] mb-3 tracking-tight">Batalkan Penulisan?</h3>
                        <p className="text-[12px] font-bold text-[var(--color-text-muted)] leading-relaxed px-4 opacity-80">
                            Ada perubahan yang belum disimpan. Konten yang baru saja kamu tulis akan hilang secara permanen.
                        </p>
                    </div>
                    <div className="flex gap-3 px-8 pb-8 pt-2">
                        <button onClick={onClose}
                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] active:scale-95 transition-all">
                            Batal
                        </button>
                        <button onClick={onConfirm}
                            className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:brightness-110 active:scale-95 transition-all">
                            Ya, Buang
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )
    }

    // Setup Smart Features
    useEffect(() => {
        if (quillRef.current && typeof quillRef.current.getEditor === 'function') {
            try {
                const editor = quillRef.current.getEditor();
                if (editor) {
                    setupSmartPaste(editor);
                    setupDragAndDrop(editor);
                    setupBubbleMenu(editor);
                }
            } catch (e) {
                console.warn('Quill not ready for smart features yet');
            }
        }
    }, [setupSmartPaste, setupDragAndDrop, setupBubbleMenu]);

    // Update SEO Score on changes
    useEffect(() => {
        setForm(f => ({
            ...f,
            seo_score: calculateSEOScore(form.content, form.title, form.excerpt, form.focus_keyword)
        }));
    }, [form.content, form.title, form.excerpt, form.focus_keyword, calculateSEOScore]);

    if (isLoading) {
        return (
            <DashboardLayout title="Loading Editor...">
                <div className="max-w-[1800px] mx-auto space-y-6">
                    <div className="h-32 bg-[var(--color-surface-alt)] animate-pulse rounded-[2rem]" />
                    <div className="flex gap-6">
                        <div className="flex-1 space-y-6">
                            <div className="h-12 w-64 bg-[var(--color-surface-alt)] animate-pulse rounded-xl" />
                            <div className="h-[500px] bg-[var(--color-surface-alt)] animate-pulse rounded-[2rem]" />
                        </div>
                        <div className="hidden xl:block w-[400px] h-[700px] bg-[var(--color-surface-alt)] animate-pulse rounded-[2rem]" />
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title={isEdit ? 'Edit Informasi' : 'Buat Informasi Baru'}>
            <div className="w-full mx-auto space-y-5">

                {/* ── Draft Recovery Alert ── */}
                {(hasDraft && !isDraftDismissed) && (
                    <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-4 px-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Draft Ditemukan!</p>
                                <p className="text-[9px] font-bold text-amber-600/80">Kamu punya tulisan yang belum diselesaikan sebelumnya.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={discardDraft} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all">Abaikan</button>
                            <button onClick={recoverDraft} className="px-6 py-3 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Pulihkan Konten</button>
                        </div>
                    </div>
                )}

                {/* ── Header ── */}
                <div className="bg-[var(--color-surface)] p-5 md:p-6 rounded-[1.5rem] border border-[var(--color-border)] shadow-sm space-y-4">
                    <Breadcrumb items={[
                        'Admin',
                        'Informasi',
                        isEdit ? 'Edit' : 'Create'
                    ]} />

                    <div className="flex items-center justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-2 md:gap-4 min-w-0">
                            <button onClick={handleGoBack} className="shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl md:rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                                <FontAwesomeIcon icon={faChevronLeft} className="text-xs md:text-sm" />
                            </button>
                            <h1 className="text-lg md:text-2xl font-black font-heading tracking-tight text-[var(--color-text)] truncate">
                                {isEdit ? 'Edit Informasi' : 'Tulis Informasi Baru'}
                            </h1>
                        </div>

                        {/* ── Collaborators Presence ── */}
                        {isEdit && (
                            <div className="hidden md:flex items-center -space-x-2 ml-4 mr-auto border-l border-[var(--color-border)] pl-6">
                                {collaborators.map((user, idx) => (
                                    <div key={idx} className="relative group cursor-help">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} className="w-8 h-8 rounded-full border-2 border-[var(--color-surface)] shadow-sm object-cover" alt={user.name} />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-[10px] font-black shadow-sm">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {/* Status Glow */}
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--color-surface)]" />

                                        {/* Tooltip */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[110] shadow-xl">
                                            {user.name} sedang mengedit
                                        </div>
                                    </div>
                                ))}

                                {collaborators.length > 0 && (
                                    <div className="ml-4 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Kolaborasi Aktif</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                            <button type="button" onClick={handleGoBack}
                                className="h-9 md:h-10 px-3 md:px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] md:text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                Batal
                            </button>
                            <button type="button" onClick={handleSave} disabled={isSaving || !form.title.trim() || !form.content.trim()}
                                className="h-9 md:h-10 px-4 md:px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[var(--color-primary)]/20">
                                {isSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} />}
                                <span className="hidden xs:inline">{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                                <span className="xs:hidden">{isSaving ? '...' : (isEdit ? 'Update' : 'Kirim')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Mobile Sticky Footer ── */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] p-4 bg-[var(--color-surface)]/80 backdrop-blur-md border-t border-[var(--color-border)] shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] flex items-center gap-3">
                    <button type="button" onClick={handleSave} disabled={isSaving || !form.title.trim() || !form.content.trim()}
                        className="flex-1 h-12 rounded-2xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all">
                        {isSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} />}
                        <span>{isSaving ? 'Menyimpan...' : (isEdit ? 'Update Informasi' : 'Terbitkan Sekarang')}</span>
                    </button>
                </div>

                {/* Quill global styles scoped */}
                <style>{`
                    .ql-toolbar.ql-snow { 
                        border: 1px solid var(--color-border) !important; 
                        border-radius: 1rem 1rem 0 0; 
                        background: var(--color-surface-alt); 
                        padding: 6px 8px;
                        display: flex;
                        flex-wrap: nowrap;
                        gap: 2px;
                        align-items: center;
                        position: relative;
                        z-index: 20;
                        overflow: visible !important;
                    }
                    /* On Tablet/Mobile allow wrap so dropdowns don't clip and tools stay accessible */
                    @media (max-width: 1024px) {
                        .ql-toolbar.ql-snow { flex-wrap: wrap; gap: 6px; }
                    }
                    .ql-toolbar.ql-snow .ql-formats { 
                        margin-right: 4px !important; 
                        display: flex;
                        align-items: center;
                        gap: 2px;
                    }
                    .ql-snow .ql-picker.ql-header { width: 85px !important; }
                    .ql-snow .ql-picker-options {
                        border-radius: 8px !important;
                        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1) !important;
                        z-index: 100 !important;
                    }
                    .ql-container.ql-snow { border: 1px solid var(--color-border) !important; border-top: none !important; border-radius: 0 0 1rem 1rem; background: var(--color-surface); min-height: 300px; font-family: inherit; }
                    .ql-editor { font-size: 14px; font-weight: 500; color: var(--color-text); padding: 16px; line-height: 1.6; min-height: 300px; }
                    .ql-editor.ql-blank::before { color: var(--color-text-muted); font-style: normal; opacity: 0.5; }
                    .ql-stroke { stroke: var(--color-text-muted) !important; }
                    .ql-fill { fill: var(--color-text-muted) !important; }
                    .ql-picker { color: var(--color-text-muted) !important; }
                    .ql-active .ql-stroke { stroke: var(--color-primary) !important; }
                    .ql-active .ql-fill { fill: var(--color-primary) !important; }
                    .preview-content { overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
                    .preview-content p { margin-bottom: 1.25rem; }
                    .preview-content p:last-child { margin-bottom: 0; }
                    .preview-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; }
                    .preview-content pre, .preview-content code { white-space: pre-wrap; word-break: break-all; }
                    
                    /* Static Video Preview in Sidebar */
                    .ql-video-static-preview {
                        position: relative !important;
                        width: 100% !important;
                        aspect-ratio: 16/9 !important;
                        border-radius: 1rem !important;
                        overflow: hidden !important;
                        margin: 1.5rem 0 !important;
                        border: 1px solid var(--color-border) !important;
                        cursor: not-allowed !important;
                        background: var(--color-surface-alt) !important;
                    }
                    .ql-video-static-preview img {
                        margin: 0 !important;
                        display: block !important;
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                    }

                     /* Video styling */
                    .ql-video { width: 100%; aspect-ratio: 16/9; border-radius: 1rem; margin: 1rem 0; shadow: 0 10px 30px -10px rgba(0,0,0,0.1); }
                `}</style>

                <form id="news-form" onSubmit={handleSave} className="flex flex-col xl:flex-row gap-6">
                    {/* ── Main Column ── */}
                    <div className="flex-1 space-y-6">

                        {/* Tab Nav */}
                        <div className="flex items-center justify-between sm:justify-start gap-1 md:gap-2 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full sm:w-fit shadow-sm overflow-hidden">
                            {[
                                { id: 'content', label: 'Konten', icon: faPen },
                                { id: 'settings', label: 'Pengaturan', icon: faFilter },
                                { id: 'seo', label: 'SEO', icon: faGlobe },
                                ...(!isSidePreview ? [{ id: 'preview', label: 'Preview', icon: faEye }] : []),
                            ].map(t => (
                                <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest transition-all duration-300 ${activeTab === t.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] active' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'}`}>
                                    <FontAwesomeIcon icon={t.icon} className="text-[10px] sm:text-xs" />
                                    <span className="whitespace-nowrap">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Contains Content / Settings / SEO / Preview depending on active tab */}
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.5rem] p-5 md:p-6 shadow-sm">

                            {/* ── KONTEN TAB ── */}
                            {activeTab === 'content' && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-80">
                                                    <FontAwesomeIcon icon={faNewspaper} className="mr-2" />Judul Informasi <span className="text-rose-500">*</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAiModalOpen(true)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 animate-pulse-slow"
                                                >
                                                    <FontAwesomeIcon icon={faMagicWandSparkles} className="text-[8px]" />
                                                    ASISTEN AI
                                                </button>
                                            </div>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${(form.title?.length || 0) > 60 ? 'bg-rose-500/10 text-rose-500' : (form.title?.length || 0) >= 50 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                {form.title?.length || 0}/60
                                            </span>
                                        </div>
                                        <input required type="text" value={form.title}
                                            onChange={e => handleTitleChange(e.target.value)}
                                            placeholder="Judul Berita/Pengumuman..."
                                            className="w-full px-4 h-11 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-base font-bold placeholder:font-medium placeholder:text-sm placeholder:text-[var(--color-text-muted)] outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-80">
                                                <FontAwesomeIcon icon={faAlignLeft} className="mr-2" />Ringkasan Singkat
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <button type="button"
                                                    onClick={() => {
                                                        const plainText = (form.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();

                                                        if (plainText.length < 50) {
                                                            addToast('Konten terlalu pendek untuk dirangkum secara efektif.', 'info');
                                                            return;
                                                        }

                                                        const summary = plainText.slice(0, 160) + (plainText.length > 160 ? '...' : '');
                                                        setForm(f => ({ ...f, excerpt: summary }));
                                                        addToast('Ringkasan SEO berhasil diekstrak dari konten.', 'success');
                                                    }}
                                                    className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] flex items-center gap-1.5 transition-all bg-[var(--color-primary)]/5 px-2 py-1 rounded-lg hover:bg-[var(--color-primary)]/10">
                                                    <FontAwesomeIcon icon={faMagicWandSparkles} />
                                                    Generate Otomatis
                                                </button>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${(form.excerpt?.length || 0) > 160 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                    {form.excerpt?.length || 0}/160
                                                </span>
                                            </div>
                                        </div>
                                        <input type="text" value={form.excerpt}
                                            onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                                            placeholder="Ringkasan singkat (opsional)..."
                                            className="w-full px-4 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-medium placeholder:font-medium placeholder:text-sm placeholder:text-[var(--color-text-muted)] outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between mt-6 mb-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-80">
                                                <FontAwesomeIcon icon={faBookOpen} className="mr-2" />Isi Informasi <span className="text-rose-500">*</span>
                                            </label>
                                            {/* Preview toggle desktop */}
                                            <div className="flex items-center gap-2">
                                                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-500/5 border border-slate-500/10 text-[var(--color-text-muted)] text-[9px] font-black uppercase tracking-widest">
                                                    <FontAwesomeIcon icon={faClock} className="text-[var(--color-primary)]/50" />
                                                    {calculatedReadTime} menit baca
                                                </div>

                                                <button type="button" onClick={() => setIsSidePreview(p => !p)}
                                                    className={`hidden xl:flex items-center gap-2 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${isSidePreview ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]' : 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white shadow-lg shadow-[var(--color-primary)]/10'}`}>
                                                    <FontAwesomeIcon icon={isSidePreview ? faEyeSlash : faEye} />
                                                    <span>{isSidePreview ? 'Tutup Preview' : 'Live Preview'}</span>
                                                </button>

                                                <button type="button" onClick={() => setIsZenMode(true)}
                                                    className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-sm font-black text-[10px] uppercase tracking-widest group"
                                                    title="Focus Zen Mode">
                                                    <FontAwesomeIcon icon={faMaximize} className="text-xs group-hover:scale-110 transition-transform" />
                                                    <span>Focus Mode</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] overflow-hidden shadow-sm focus-within:border-[var(--color-primary)]/50 focus-within:ring-4 focus-within:ring-[var(--color-primary)]/5 transition-all duration-300">
                                            <style>{`
                                                    .ql-container.ql-snow { border: none !important; }
                                                    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid var(--color-border) !important; background: var(--color-surface-alt) !important; }
                                                    .ql-editor { 
                        min-height: 400px; 
                        padding: 1.5rem !important; 
                        line-height: 1.6 !important;
                    }
                    /* Pixel-perfect Placeholder Alignment */
                    .ql-editor.ql-blank::before {
                        left: 1.5rem !important;
                        right: 1.5rem !important;
                        font-style: normal !important;
                        opacity: 0.3 !important;
                        pointer-events: none !important;
                    }
                                                `}</style>

                                            {/* Command Strip UI (Enterprise Style) */}
                                            <div className={`absolute top-[42px] inset-x-0 z-[30] flex justify-center transition-all duration-300 ease-out ${commandStrip.open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                                                <div className="mx-4 mt-2 p-2 flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl rounded-2xl min-w-[400px] max-w-[600px] w-full animate-in zoom-in-95">
                                                    <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-[10px] shadow-sm ${commandStrip.type === 'link' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        <FontAwesomeIcon icon={commandStrip.type === 'link' ? faPen : faBookOpen} />
                                                    </div>

                                                    {commandStrip.type === 'link' && (
                                                        <input type="text" value={commandStrip.text}
                                                            onChange={e => setCommandStrip(s => ({ ...s, text: e.target.value }))}
                                                            placeholder="Teks tautan..."
                                                            className="w-28 h-8 px-3 text-[11px] font-bold rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] outline-none focus:border-blue-500/50 transition-all" />
                                                    )}

                                                    <input type="url" value={commandStrip.url}
                                                        onChange={e => setCommandStrip(s => ({ ...s, url: e.target.value }))}
                                                        autoFocus={commandStrip.open}
                                                        placeholder={commandStrip.type === 'link' ? "Masukkan URL (https://...)" : "Tempel link video YouTube..."}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                const editor = quillRef.current.getEditor();
                                                                const range = editor.getSelection() || { index: editor.getLength() - 1, length: 0 };

                                                                if (commandStrip.type === 'link') {
                                                                    if (commandStrip.text && (!range || range.length === 0)) {
                                                                        editor.insertText(range.index, commandStrip.text, 'link', commandStrip.url);
                                                                    } else {
                                                                        editor.format('link', commandStrip.url);
                                                                    }
                                                                } else {
                                                                    let url = commandStrip.url.trim();
                                                                    if (url.includes('youtube.com/watch?v=')) url = url.replace('watch?v=', 'embed/');
                                                                    else if (url.includes('youtu.be/')) url = 'https://www.youtube.com/embed/' + url.split('youtu.be/')[1];
                                                                    editor.insertEmbed(range.index, 'video', url);
                                                                }
                                                                setCommandStrip(s => ({ ...s, open: false }));
                                                                addToast(`${commandStrip.type === 'link' ? 'Tautan' : 'Video'} berhasil disisipkan`, 'success');
                                                            } else if (e.key === 'Escape') {
                                                                setCommandStrip(s => ({ ...s, open: false }));
                                                            }
                                                        }}
                                                        className="flex-1 h-8 px-3 text-[11px] font-black rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] outline-none focus:border-[var(--color-primary)]/50 transition-all" />

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button type="button" onClick={() => setCommandStrip(s => ({ ...s, open: false }))}
                                                            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 transition-all text-[10px]" title="Batal (Esc)"><FontAwesomeIcon icon={faRotateLeft} /></button>
                                                        <button type="button" disabled={!commandStrip.url}
                                                            onClick={() => {
                                                                const event = new KeyboardEvent('keydown', { key: 'Enter' });
                                                                // Manually trigger the enter logic 
                                                                const editor = quillRef.current.getEditor();
                                                                const range = editor.getSelection() || { index: editor.getLength() - 1, length: 0 };
                                                                if (commandStrip.type === 'link') {
                                                                    if (commandStrip.text && (!range || range.length === 0)) editor.insertText(range.index, commandStrip.text, 'link', commandStrip.url);
                                                                    else editor.format('link', commandStrip.url);
                                                                } else {
                                                                    let url = commandStrip.url.trim();
                                                                    if (url.includes('youtube.com/watch?v=')) url = url.replace('watch?v=', 'embed/');
                                                                    else if (url.includes('youtu.be/')) url = 'https://www.youtube.com/embed/' + url.split('youtu.be/')[1];
                                                                    editor.insertEmbed(range.index, 'video', url);
                                                                }
                                                                setCommandStrip(s => ({ ...s, open: false }));
                                                                addToast('Berhasil disisipkan', 'success');
                                                            }}
                                                            className={`h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-md transition-all active:scale-95 ${commandStrip.type === 'link' ? 'bg-blue-500 shadow-blue-500/10' : 'bg-rose-500 shadow-rose-500/10'}`}>OK</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bubble Contextual Menu (Medium Style) */}
                                            {bubbleMenu.show && (
                                                <div className="absolute z-[40] flex items-center gap-1 p-1 bg-slate-900 shadow-xl rounded-xl border border-white/10 animate-in fade-in zoom-in-95 duration-200"
                                                    style={{ left: bubbleMenu.x, top: bubbleMenu.y, transform: 'translateY(-100%)' }}>
                                                    <button type="button" onClick={() => quillRef.current.getEditor().format('bold', !quillRef.current.getEditor().getFormat().bold)}
                                                        className="w-8 h-8 rounded-lg text-white hover:bg-white/20 transition-all flex items-center justify-center text-xs"><FontAwesomeIcon icon={faBold} /></button>
                                                    <button type="button" onClick={() => quillRef.current.getEditor().format('italic', !quillRef.current.getEditor().getFormat().italic)}
                                                        className="w-8 h-8 rounded-lg text-white hover:bg-white/20 transition-all flex items-center justify-center text-xs"><FontAwesomeIcon icon={faItalic} /></button>
                                                    <button type="button" onClick={() => handlers.link.call({ quill: quillRef.current.getEditor() })}
                                                        className="w-8 h-8 rounded-lg text-white hover:bg-white/20 transition-all flex items-center justify-center text-xs"><FontAwesomeIcon icon={faLink} /></button>
                                                    <div className="w-[1px] h-4 bg-white/10 mx-1" />
                                                    <button type="button" onClick={() => quillRef.current.getEditor().format('header', 2)}
                                                        className="w-8 h-8 rounded-lg text-white hover:bg-white/20 transition-all flex items-center justify-center text-[10px] font-black">H2</button>
                                                </div>
                                            )}


                                            <ReactQuill theme="snow" value={form.content} ref={quillRef}
                                                placeholder="Tulis detail informasi di sini..."
                                                onChange={handleContentChange}
                                                modules={modules}
                                                className="flex-1"
                                            />
                                            <div className="flex items-center justify-between p-4 bg-[var(--color-surface-alt)]/50 border-t border-[var(--color-border)] rounded-b-[1.5rem]">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] group cursor-help transition-all" title="Target: > 100 kata untuk SEO yang baik">
                                                        <FontAwesomeIcon icon={faAlignLeft} className={`${(form.content?.replace(/<[^>]*>/g, '').length || 0) > 500 ? 'text-emerald-500' : 'text-[var(--color-primary)]/50'}`} />
                                                        <span>{form.content?.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim().split(/\s+/).filter(Boolean).length || 0} Kata</span>
                                                    </div>
                                                    <div className="hidden sm:flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                                                        <FontAwesomeIcon icon={faHashtag} />
                                                        <span>{form.content?.length || 0} Karakter</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {/* Health Indicator */}
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                                        <div className="flex -space-x-1">
                                                            {[
                                                                {
                                                                    check: form.title.length >= 20 && form.title.length <= 60,
                                                                    icon: "T",
                                                                    label: form.title.length >= 20 && form.title.length <= 60 ? "Judul Sudah Ideal" : "Judul Terlalu Pendek / Belum Terisi"
                                                                },
                                                                {
                                                                    check: form.excerpt?.length >= 100,
                                                                    icon: "S",
                                                                    label: form.excerpt?.length >= 100 ? "Ringkasan Sudah Cukup" : "Ringkasan Terlalu Pendek"
                                                                },
                                                                {
                                                                    check: form.content.replace(/<[^>]*>/g, '').length > 200,
                                                                    icon: "C",
                                                                    label: form.content.replace(/<[^>]*>/g, '').length > 200 ? "Isi Konten Sudah Informatif" : "Isi Konten Terlalu Singkat"
                                                                },
                                                                {
                                                                    check: !!form.image_url,
                                                                    icon: "I",
                                                                    label: !!form.image_url ? "Gambar Utama Sudah Ada" : "Gambar Utama Belum Ada"
                                                                }
                                                            ].map((item, i) => (
                                                                <div key={i}
                                                                    title={item.label}
                                                                    className={`w-5 h-5 rounded-full border-2 border-[var(--color-surface)] flex items-center justify-center text-[7px] font-black cursor-help transition-all hover:scale-110 ${item.check ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                                    {item.icon}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Post Health</span>
                                                    </div>

                                                    <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-[var(--color-text-muted)] py-1.5 px-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                                                        <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                                                            <FontAwesomeIcon icon={faUser} className="text-[10px]" />
                                                        </div>
                                                        <span className="opacity-80 font-heading">{form.display_name || 'Admin'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── SETTINGS TAB ── */}
                            {activeTab === 'settings' && (
                                <div className="space-y-5 animate-in fade-in duration-300 max-w-3xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kategori</label>
                                            <div className="relative group">
                                                <input type="text" value={form.tag}
                                                    onChange={e => { setForm(f => ({ ...f, tag: e.target.value })); setShowTagSuggestions(true) }}
                                                    onFocus={() => setShowTagSuggestions(true)}
                                                    placeholder="Pilih atau ketik kategori..."
                                                    className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all"
                                                />
                                                <FontAwesomeIcon icon={faTags} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] opacity-40 pointer-events-none" />

                                                {showTagSuggestions && existingTags.length > 0 && (
                                                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-[var(--color-border)] rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="px-3 pb-2 mb-1 border-b border-[var(--color-border)]">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Saran Kategori</p>
                                                        </div>
                                                        <div className="max-h-[160px] overflow-y-auto">
                                                            {['Informasi', 'Pengumuman', 'Akademik', 'Event', 'Prestasi', ...existingTags.filter(t => !['Informasi', 'Pengumuman', 'Akademik', 'Event', 'Prestasi'].includes(t))]
                                                                .filter(t => t.toLowerCase().includes(form.tag.toLowerCase()))
                                                                .map((t, idx) => (
                                                                    <button key={idx} type="button" onClick={() => { setForm(f => ({ ...f, tag: t })); setShowTagSuggestions(false) }}
                                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)] transition-colors">
                                                                        {t}
                                                                    </button>
                                                                ))}
                                                        </div>
                                                        <div className="mx-3 mt-1 pt-2 border-t border-[var(--color-border)]">
                                                            <button type="button" onClick={() => setShowTagSuggestions(false)} className="text-[9px] font-black uppercase tracking-widest text-rose-500">Tutup</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama Penulis</label>
                                            <input type="text" value={form.display_name}
                                                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                                                placeholder="Tulis nama penulis..."
                                                className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Slug */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Slug URL</label>
                                                <button type="button" onClick={refreshSlug} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:underline flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[8px]" /> Sinkron Judul
                                                </button>
                                            </div>
                                            <div className="flex group">
                                                <div className="h-10 px-4 flex items-center bg-[var(--color-surface)] border border-r-0 border-[var(--color-border)] rounded-l-xl text-xs font-black text-[var(--color-text-muted)] opacity-60">/news/</div>
                                                <input type="text" value={form.slug}
                                                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                                    className="flex-1 h-10 px-4 rounded-r-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-bold outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        {/* Jadwal */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Jadwal Tayang</label>
                                            <input type="datetime-local" value={form.scheduled_at}
                                                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                                                className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Thumbnail Upload */}
                                    <div className="space-y-2.5">
                                        <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Thumbnail Utama</label>
                                        <div onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImageChange({ target: { files: [f] } }) }}
                                            className={`h-32 relative group cursor-pointer overflow-hidden rounded-[1.25rem] border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 bg-[var(--color-surface-alt)]/50'}`}>
                                            {imagePreview ? (
                                                <>
                                                    <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Thumbnail" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="group/btn relative px-5 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl flex items-center gap-2 hover:bg-[var(--color-primary)] hover:text-white transition-all">
                                                            <FontAwesomeIcon icon={faPen} /> Ganti
                                                        </button>
                                                        <button type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setImagePreview(null);
                                                                setImageFile(null);
                                                                setForm(f => ({ ...f, image_url: '' }));
                                                            }}
                                                            className="w-10 h-10 bg-rose-500 text-white rounded-xl shadow-xl flex items-center justify-center hover:bg-rose-600 transition-all" title="Hapus Gambar">
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="h-full flex items-center justify-center p-6 text-center gap-6">
                                                    <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:scale-110 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)]/30 transition-all shadow-sm">
                                                        <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-widest mb-1">{isDragging ? 'Lepas Gambar' : 'Klik atau Seret Gambar'}</p>
                                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60">Format JPG, PNG atau WEBP (Maksimal 5MB)</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

                                        <div className="flex items-center justify-between mt-2">
                                            {imageError ? (
                                                <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                                                    <FontAwesomeIcon icon={faTriangleExclamation} /> {imageError}
                                                </p>
                                            ) : <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setIsMediaModalOpen(true)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 rounded-xl transition-colors flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faImage} /> Pilih dari Galeri
                                                </button>
                                            </div>}

                                            {imagePreview && (
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); setForm(f => ({ ...f, image_url: '' })) }}
                                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faTrash} /> Hapus Gambar
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Alt Text Gambar</label>
                                            <input type="text" value={form.image_alt}
                                                onChange={e => setForm(f => ({ ...f, image_alt: e.target.value }))}
                                                placeholder="Deskripsi gambar untuk aksesibilitas netra & SEO..."
                                                className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Visibility Switches */}
                                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex flex-col md:flex-row gap-6 md:divide-x md:divide-[var(--color-border)]">
                                        <div className="flex items-center gap-4 pr-6 min-w-[200px]">
                                            <label className="relative inline-flex items-center cursor-pointer scale-90">
                                                <input type="checkbox" checked={form.is_published}
                                                    onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                                                    className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </label>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Visibilitas</p>
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate">{form.is_published ? 'Publik' : 'Draft Pribadi'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 md:pl-6 min-w-[200px]">
                                            <label className="relative inline-flex items-center cursor-pointer scale-90">
                                                <input type="checkbox" checked={form.is_featured}
                                                    onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                                                    className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                                            </label>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Urutan</p>
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate">{form.is_featured ? 'Hot News (Top)' : 'Berita Standar'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── SEO TAB ── */}
                            {activeTab === 'seo' && (
                                <div className="space-y-4 animate-in fade-in duration-300 max-w-5xl pb-5">
                                    <div className="flex flex-col lg:flex-row items-stretch gap-4">
                                        {/* Score Card */}
                                        <div className="lg:w-[310px] p-4 rounded-[1.5rem] bg-indigo-50 border border-indigo-100 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12" />

                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner ${form.seo_score >= 80 ? 'bg-emerald-500 text-white' : form.seo_score >= 50 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                    {form.seo_score}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/60 mb-0.5">Overall SEO Health</p>
                                                    <p className="text-xs font-black text-indigo-950 uppercase tracking-tight leading-tight">
                                                        {form.seo_score >= 80 ? 'Sangat Optimal' : form.seo_score >= 50 ? 'Butuh Perbaikan' : 'Buruk (Segera Perbaiki)'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-900/40">Focus Keyword</label>
                                                <input type="text" value={form.focus_keyword}
                                                    onChange={e => setForm(f => ({ ...f, focus_keyword: e.target.value }))}
                                                    placeholder="Contoh: PPDB 2024..."
                                                    className="w-full h-10 px-4 rounded-xl bg-white border border-indigo-100 focus:border-indigo-400 text-sm font-bold text-indigo-950 outline-none transition-all placeholder:text-indigo-900/20"
                                                />
                                            </div>
                                        </div>

                                        {/* Real-time Checklist */}
                                        <div className="flex-1 p-4 rounded-[1.5rem] bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] flex flex-col gap-3.5">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">SEO Analysis Checklist</h4>
                                                <button type="button" onClick={generateAiSeo} disabled={isGeneratingSeo || !form.content}
                                                    className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap">
                                                    {isGeneratingSeo ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[8px]" /> : <FontAwesomeIcon icon={faMagicWandSparkles} className="text-[8px]" />}
                                                    {isGeneratingSeo ? 'Gen...' : 'AI Optimizer'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5 overflow-y-auto pr-2 custom-scrollbar">
                                                {seoAnalysis.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-2.5 text-[9px] sm:text-[10px]">
                                                        <div className={`w-3.5 h-3.5 shrink-0 mt-0.5 rounded-full flex items-center justify-center text-[6px] ${item.st === 'success' ? 'bg-emerald-500 text-white' : item.st === 'error' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                            <FontAwesomeIcon icon={item.st === 'success' ? faCheck : item.st === 'error' ? faXmark : faTriangleExclamation} />
                                                        </div>
                                                        <span className={`font-bold leading-tight ${item.st === 'success' ? 'text-emerald-700/80' : item.st === 'error' ? 'text-rose-700/80' : 'text-amber-700/80'}`}>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-border)]">
                                                <div className="flex items-center h-7 gap-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg w-fit">
                                                    <button type="button" onClick={() => setSeoView('search')}
                                                        className={`h-full px-3 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${seoView === 'search' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>Google</button>
                                                    <button type="button" onClick={() => setSeoView('social')}
                                                        className={`h-full px-3 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${seoView === 'social' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>Social</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">SEO Title</label>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${form.meta_title?.length > 60 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                        {form.meta_title?.length || 0}/60
                                                    </span>
                                                </div>
                                                <input type="text" value={form.meta_title}
                                                    onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                                                    placeholder="Headline untuk hasil pencarian..."
                                                    className="w-full h-12 px-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-bold outline-none transition-all shadow-sm"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Meta Description</label>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${form.meta_description?.length > 160 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                        {form.meta_description?.length || 0}/160
                                                    </span>
                                                </div>
                                                <textarea value={form.meta_description}
                                                    onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                                                    placeholder="Tulis ringkasan konten yang informatif..."
                                                    className="w-full h-32 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-medium outline-none transition-all resize-none shadow-sm leading-relaxed"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                                                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                                    <FontAwesomeIcon icon={seoView === 'search' ? faGlobe : faShareNodes} className="opacity-50" />
                                                    {seoView === 'search' ? 'Google Search Preview' : 'Social Media Card Preview'}
                                                </p>
                                                <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-tighter whitespace-nowrap">Live Simulation</span>
                                            </div>

                                            {seoView === 'search' ? (
                                                <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1f1f33] border border-[var(--color-border)] shadow-xl animate-in zoom-in-95 duration-500">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
                                                            {settings.logo_url ? (
                                                                <img src={settings.logo_url} className="w-full h-full object-contain p-0.5" alt="Favicon" />
                                                            ) : (
                                                                <FontAwesomeIcon icon={faGlobe} className="text-xs text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[12px] font-medium text-[#202124] dark:text-[#dadce0] truncate uppercase tracking-tighter">{settings.school_name_id}</span>
                                                            <span className="text-[11px] text-[#4d5156] dark:text-[#bdc1c6] truncate">
                                                                https://{settings.app_domain} › news › {form.slug || 'slug'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-xl text-[#1a0dab] dark:text-[#8ab4f8] font-normal hover:underline cursor-pointer mb-1 truncate">
                                                        {form.meta_title || form.title || 'Judul Halaman...'}
                                                    </h3>
                                                    <p className="text-[13px] text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 leading-relaxed">
                                                        <span className="text-gray-400 mr-1">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} —</span>
                                                        {form.meta_description || form.excerpt || 'Ringkasan berita akan tampil di sini saat pengunjung mencari melalui Google...'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="max-w-[380px] rounded-xl bg-white dark:bg-[#202c33] border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl animate-in zoom-in-95 duration-500">
                                                    {imagePreview ? (
                                                        <img src={imagePreview} className="w-full aspect-[2/1] object-cover" alt="Card" />
                                                    ) : (
                                                        <div className="w-full aspect-[2/1] bg-gray-100 flex items-center justify-center text-gray-300">
                                                            <FontAwesomeIcon icon={faImage} size="2x" />
                                                        </div>
                                                    )}
                                                    <div className="p-3 border-l-4 border-emerald-500 bg-[#f0f2f5] dark:bg-[#111b21]/50 space-y-0.5">
                                                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                                            {form.meta_title || form.title || 'Judul Konten'}
                                                        </h4>
                                                        <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                                                            {form.meta_description || form.excerpt || 'Dapatkan informasi selengkapnya...'}
                                                        </p>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                                            {settings.app_domain?.toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-[10px] text-[var(--color-text-muted)] italic font-medium leading-relaxed">
                                                * Pratinjau di atas adalah simulasi metadata OpenGraph (OG) saat link artikel dibagikan di WhatsApp, Facebook, atau LinkedIn.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── MOBILE PREVIEW TAB ── */}
                            {activeTab === 'preview' && (
                                <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
                                    {imagePreview && <img src={imagePreview} className="w-full h-64 md:h-80 object-cover rounded-[2rem] shadow-xl border border-[var(--color-border)]" alt="Preview" />}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="px-4 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-black uppercase tracking-widest">{form.tag}</span>
                                        <span className="text-[var(--color-text-muted)] text-sm font-bold flex items-center gap-2">
                                            <FontAwesomeIcon icon={faClock} className="opacity-50" /> {calculatedReadTime} menit baca
                                        </span>
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-black font-heading leading-tight text-[var(--color-text)]">
                                        {form.title || 'Judul Utama Informasi Akan Ditampilkan Dengan Gaya Tipografi Heading'}
                                    </h2>
                                    <div className="flex items-center gap-4 py-6 border-y border-[var(--color-border)]">
                                        <div className="w-12 h-12 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-xl text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faUser} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-[var(--color-text)]">{form.display_name || 'Admin Platform'}</span>
                                            <span className="text-xs font-medium text-[var(--color-text-muted)]">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="preview-content text-base md:text-lg text-[var(--color-text)] leading-relaxed prose prose-lg dark:prose-invert prose-headings:font-black prose-a:text-[var(--color-primary)] max-w-none"
                                        dangerouslySetInnerHTML={{ __html: form.content || '<p class="opacity-30 italic">Tulis konten untuk melihat preview aslinya di sini...</p>' }} />
                                </div>
                            )}

                        </div>
                    </div>

                    {/* ── Desktop Live Preview Sidebar ── */}
                    {isSidePreview && (
                        <div className="hidden xl:flex flex-col w-[450px] border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 rounded-[2rem] overflow-hidden sticky top-[120px] h-[calc(100vh-140px)] animate-in slide-in-from-right-8 duration-500 shadow-xl">

                            {/* Browser/Device Header */}
                            <div className="h-12 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-5 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-400 shadow-sm" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
                                </div>
                                <span className="text-[10px] font-black tracking-widest uppercase text-[var(--color-primary)] flex items-center gap-2 bg-[var(--color-primary)]/10 px-3 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                    Live Preview
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[var(--color-surface)] m-4 rounded-[1.5rem] border border-[var(--color-border)] shadow-sm">
                                <div className="space-y-6">
                                    {imagePreview && (
                                        <img src={imagePreview} className="w-full aspect-[4/3] object-cover rounded-[1.5rem] shadow-md border border-[var(--color-border)]" alt="Preview Thumbnail" />
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap pb-2">
                                        <span className="px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-sm shadow-[var(--color-primary)]/30">{form.tag}</span>
                                        <span className="text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-widest"><FontAwesomeIcon icon={faClock} className="mr-1" /> {calculatedReadTime} mnt</span>
                                    </div>
                                    <h2 className="text-2xl font-black font-heading leading-snug text-[var(--color-text)]">
                                        {form.title || 'Judul Simulasi UI'}
                                    </h2>
                                    <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5 pt-2 mt-4">
                                        <div className="w-10 h-10 rounded-[1rem] bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faUser} className="text-sm" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-[var(--color-text)] leading-none mb-1">{form.display_name || 'Admin'}</span>
                                            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">{new Date().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="preview-content mt-4 max-w-none prose prose-sm dark:prose-invert prose-headings:font-black prose-headings:tracking-tight prose-a:text-[var(--color-primary)] prose-img:rounded-xl text-[var(--color-text)] opacity-90"
                                        dangerouslySetInnerHTML={{
                                            __html: (form.content || '<p class="opacity-30 italic">Tulis di editor untuk melihat simulasi hasil akhir...</p>')
                                                // Convert YouTube embed URLs to static "Unplayable" Premium Placeholders
                                                .replace(/<p>(https?:\/\/www\.youtube\.com\/embed\/([^<]+))<\/p>/g, (match, url, id) => `
                                                    <div class="ql-video-static-preview group">
                                                        <img src="https://img.youtube.com/vi/${id.split('?')[0]}/maxresdefault.jpg" class="w-full aspect-video object-cover" />
                                                        <div class="absolute inset-0 bg-black/20 flex items-center justify-center transition-all group-hover:bg-black/40">
                                                            <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-2xl">
                                                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                                            </div>
                                                        </div>
                                                        <div class="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[8px] font-black text-white uppercase tracking-widest border border-white/10">Preview Only</div>
                                                    </div>
                                                `)
                                                .replace(/<a[^>]+href="(https?:\/\/www\.youtube\.com\/embed\/([^"]+))"[^>]*>.*?<\/a>/g, (match, url, id) => `
                                                    <div class="ql-video-static-preview group">
                                                        <img src="https://img.youtube.com/vi/${id.split('?')[0]}/maxresdefault.jpg" class="w-full aspect-video object-cover" />
                                                        <div class="absolute inset-0 bg-black/20 flex items-center justify-center transition-all group-hover:bg-black/40">
                                                            <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-2xl">
                                                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                                            </div>
                                                        </div>
                                                        <div class="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[8px] font-black text-white uppercase tracking-widest border border-white/10">Preview Only</div>
                                                    </div>
                                                `)
                                        }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Zen Mode Editor Portal ── */}

                    {isZenMode && createPortal(
                        <div className="fixed inset-0 z-[99999] bg-[var(--color-surface)] flex flex-col animate-in fade-in duration-500 overflow-y-auto custom-scrollbar focus-zen-container">
                            {/* Vignette effect for focus */}
                            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-surface)_100%)] opacity-40 z-[1]" />

                            {/* Header - Adaptive & Translucent */}
                            <div className={`sticky top-0 z-[30] bg-[var(--color-surface)]/80 backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-[var(--color-border)] transition-all duration-700 ${isTyping ? 'opacity-10 pointer-events-none translate-y-[-10px]' : 'opacity-100'}`}>
                                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-sm sm:text-base" />
                                    </div>
                                    <div className="truncate">
                                        <h2 className="text-base sm:text-xl font-black text-[var(--color-text)] tracking-tight">Focus Zen Mode</h2>
                                        <p className="hidden sm:block text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] opacity-50">Editor Bebas Gangguan</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 shrink-0">
                                    {/* Zen Ambience - mood factor */}
                                    <div className="hidden md:flex items-center gap-1.5 bg-slate-500/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                                        {ambienceOptions.map(opt => (
                                            <button key={opt.id} onClick={() => setAmbience({ ...ambience, type: opt.id, playing: opt.id === 'none' ? false : true, title: opt.label, url: '' })}
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${ambience.type === opt.id ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5'}`}
                                                title={opt.label}>
                                                <FontAwesomeIcon icon={opt.icon} className="text-sm" />
                                            </button>
                                        ))}

                                        <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1" />

                                        <button
                                            onClick={() => setTypewriterEnabled(!typewriterEnabled)}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${typewriterEnabled ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-slate-400 opacity-40'}`}
                                            title="Typewriter Sound">
                                            <FontAwesomeIcon icon={faKeyboard} className="text-xs" />
                                        </button>

                                        <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-1" />

                                        <div className="hidden pointer-events-none opacity-0 invisible" id="yt-player-container"></div>

                                        <input
                                            type="text"
                                            placeholder="Paste Link..."
                                            value={customMusic}
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                setCustomMusic(val);
                                                const ytMatch = val.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w\-]{11})/);

                                                if (ytMatch && ytMatch[1]) {
                                                    const videoId = ytMatch[1];
                                                    setAmbience({ type: 'custom_yt', url: videoId, playing: true, title: 'Loading Music...' });

                                                    if (setupYTPlayer) setupYTPlayer(videoId);

                                                    // Fetch Title
                                                    try {
                                                        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                                                        const data = await res.json();
                                                        setAmbience(prev => ({ ...prev, title: data.title }));
                                                    } catch (err) {
                                                        setAmbience(prev => ({ ...prev, title: 'YouTube Track' }));
                                                    }
                                                } else if (val.match(/\.(mp3|ogg|wav)$/) || val.includes('stream')) {
                                                    setAmbience({ type: 'custom_audio', url: val, playing: true, title: val.split('/').pop() });
                                                }
                                            }}
                                            className="w-32 h-8 px-3 rounded-lg bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-[9px] font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/50 transition-all placeholder:opacity-30"
                                        />

                                        {ambience.type !== 'none' && ambience.type !== 'custom_yt' && (
                                            <audio ref={audioRef} loop crossOrigin="anonymous" />
                                        )}
                                    </div>

                                    <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.seo_score >= 80 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${form.seo_score >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        Score: {form.seo_score}
                                    </div>
                                    <button onClick={() => setIsZenMode(false)}
                                        className="h-11 px-7 rounded-2xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[var(--color-primary)]/20 active:scale-95 transition-all">
                                        Simpan & Keluar Zen
                                    </button>
                                </div>
                            </div>

                            {/* Editor Canvas Container */}
                            <div className="relative z-[10] flex-1 max-w-5xl mx-auto w-full px-6 pt-12 pb-32 sm:pt-20 sm:pb-44 flex flex-col items-center">
                                {/* Floating Navigation Map (ToC) */}
                                {toc.length > 0 && (
                                    <div className="fixed left-8 top-32 w-64 hidden xl:block z-[20] animate-in slide-in-from-left-8 duration-700">
                                        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
                                                    <FontAwesomeIcon icon={faAlignLeft} className="text-sm" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Navigate article</span>
                                            </div>
                                            <div className="space-y-4">
                                                {toc.map((item, idx) => (
                                                    <a key={idx} href={`#${item.id}`}
                                                        className={`block text-xs font-bold transition-all hover:text-[var(--color-primary)] leading-relaxed ${item.level === 'h3' ? 'pl-4 opacity-70' : ''}`}>
                                                        {item.text}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Zen Player ── */}
                                {ambience.type !== 'none' && (
                                    <div className={`fixed right-8 bottom-8 z-[100] transition-all duration-700 group ${isTyping ? 'opacity-5 blur-sm scale-90 translate-x-4' : 'opacity-100'}`}>
                                        <div className="relative flex items-center bg-slate-950 dark:bg-black backdrop-blur-3xl rounded-full border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.9)] transition-all duration-500 ease-out w-14 h-14 hover:w-auto hover:h-[72px] hover:px-6 overflow-hidden group-hover:rounded-[2.5rem]">

                                            {/* Vinyl Wrapper - Fixed Center */}
                                            <div className="flex items-center justify-center shrink-0 w-14 h-14 relative z-10">
                                                {/* Dynamic Aura Glow */}
                                                {ambience.playing && (
                                                    <div className={`absolute inset-2 rounded-full blur-md opacity-40 animate-pulse transition-all duration-1000 ${ambience.type === 'rain' ? 'bg-blue-500' :
                                                        ambience.type === 'cafe' ? 'bg-amber-500' :
                                                            ambience.type === 'forest' ? 'bg-emerald-500' :
                                                                'bg-purple-500'
                                                        }`} />
                                                )}

                                                {/* Vinyl / Record Disk */}
                                                <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border-2 transition-all duration-1000 ${ambience.playing ? 'animate-[spin_4s_linear_infinite]' : 'rotate-45'
                                                    } ${ambience.type === 'rain' ? 'border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]' :
                                                        ambience.type === 'cafe' ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]' :
                                                            ambience.type === 'forest' ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                                                                'border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                                    }`}>
                                                    <div className="absolute inset-1 rounded-full border border-white/10" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-white/40 z-10" />
                                                    <FontAwesomeIcon icon={faMusic} className={`text-white transition-all ${ambience.playing ? 'scale-110 opacity-70' : 'scale-90 opacity-20'
                                                        } ${ambience.type === 'rain' ? 'text-blue-400' :
                                                            ambience.type === 'cafe' ? 'text-amber-400' :
                                                                ambience.type === 'forest' ? 'text-emerald-400' :
                                                                    'text-purple-400'
                                                        }`} />
                                                </div>

                                                {/* Zen Visualizer (Bars) */}
                                                {ambience.playing && (
                                                    <div className="absolute right-0.5 flex gap-0.5 h-4 items-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {[0.8, 1.2, 1.0].map((speed, i) => (
                                                            <div key={i} className={`w-0.5 animate-[bounce_ease-in-out_infinite] ${ambience.type === 'rain' ? 'bg-blue-400' :
                                                                ambience.type === 'cafe' ? 'bg-amber-400' :
                                                                    ambience.type === 'forest' ? 'bg-emerald-400' :
                                                                        'bg-purple-400'
                                                                }`} style={{
                                                                    animationDuration: `${speed}s`,
                                                                    animationDelay: `${i * 0.15}s`
                                                                }} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Controls & Info - Expands on Hover */}
                                            <div className="flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-150 whitespace-nowrap">
                                                <div className="flex flex-col -space-y-0.5 min-w-[150px]">
                                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Now Playing</span>
                                                    <span className="text-sm font-black text-white truncate max-w-[200px] leading-none">
                                                        {ambience.title || (ambienceOptions.find(o => o.id === ambience.type)?.label || 'Ambience')}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-5 focus:outline-none">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (ambience.type === 'custom_yt' && ytPlayerRef.current) ytPlayerRef.current.seekTo(ytPlayerRef.current.getCurrentTime() - 10);
                                                            else if (audioRef.current) audioRef.current.currentTime -= 10;
                                                        }}
                                                        className="text-white opacity-40 hover:opacity-100 transition-colors text-[11px]">
                                                        <FontAwesomeIcon icon={faBackward} />
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAmbience({ ...ambience, playing: !ambience.playing });
                                                        }}
                                                        className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center text-[11px] shadow-lg hover:scale-110 active:scale-95 transition-all">
                                                        <FontAwesomeIcon icon={ambience.playing ? faPause : faPlay} />
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (ambience.type === 'custom_yt' && ytPlayerRef.current) ytPlayerRef.current.seekTo(ytPlayerRef.current.getCurrentTime() + 10);
                                                            else if (audioRef.current) audioRef.current.currentTime += 10;
                                                        }}
                                                        className="text-white opacity-40 hover:opacity-100 transition-colors text-[11px]">
                                                        <FontAwesomeIcon icon={faForward} />
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAmbience({ ...ambience, repeat: !ambience.repeat });
                                                        }}
                                                        className={`text-[11px] transition-all ${ambience.repeat ? 'text-[var(--color-primary)]' : 'text-white opacity-30 hover:opacity-100'}`}>
                                                        <FontAwesomeIcon icon={faRepeat} />
                                                    </button>

                                                    <div className="w-[1px] h-4 bg-white/10 mx-1" />

                                                    <div className="flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faMusic} className="text-[10px] text-white/20" />
                                                        <input
                                                            type="range" min="0" max="1" step="0.05"
                                                            value={ambience.volume ?? 0.4}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                setAmbience({ ...ambience, volume: parseFloat(e.target.value) });
                                                            }}
                                                            className="w-20 h-1 accent-white bg-white/20 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="w-full max-w-[720px] space-y-8">
                                    <textarea
                                        ref={zenTitleRef}
                                        value={form.title}
                                        onChange={e => {
                                            handleTitleChange(e.target.value);
                                            handleActiveTyping();
                                        }}
                                        onInput={e => {
                                            e.target.style.height = 'auto'
                                            e.target.style.height = e.target.scrollHeight + 'px'
                                        }}
                                        placeholder="Apa yang ingin Anda ceritakan hari ini?"
                                        rows={1}
                                        className="w-full text-3xl sm:text-5xl font-black font-heading bg-transparent outline-none border-none placeholder:opacity-15 text-[var(--color-text)] leading-[1.2] tracking-tight resize-none overflow-hidden"
                                    />

                                    <div className="flex-1 flex flex-col zen-quill-wrapper">
                                        <ReactQuill
                                            theme="snow"
                                            value={form.content}
                                            ref={quillRef}
                                            onChange={handleContentChange}
                                            modules={modules}
                                            placeholder="Mulai menulis cerita Anda di sini..."
                                            className="flex-1"
                                        />
                                        <style>{`
                                        .fixed .ql-container.ql-snow { border: none !important; height: auto !important; min-height: 500px !important; }
                                        .fixed .ql-toolbar.ql-snow { 
                                            border: 1px solid var(--color-border) !important; 
                                            border-radius: 1.5rem !important; 
                                            background: var(--color-surface) !important; 
                                            margin-bottom: 3rem; 
                                            position: sticky; 
                                            top: 86px; 
                                            z-index: 40; 
                                            padding: 10px 20px !important;
                                            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
                                            display: flex;
                                            flex-wrap: wrap;
                                            justify-content: center;
                                        }
                                        .fixed .ql-editor { 
                                            font-size: 1.25rem; 
                                            padding: 0 !important; 
                                            line-height: 1.9; 
                                            color: var(--color-text); 
                                            font-family: inherit;
                                            opacity: 0.95;
                                            height: auto !important;
                                            overflow: visible !important;
                                        }
                                        .fixed .ql-editor.ql-blank::before { left: 0 !important; font-size: 1.2rem; font-style: normal; opacity: 0.2; }
                                        .fixed .ql-editor strong { font-weight: 800; color: var(--color-primary); }
                                        .fixed .ql-editor h2 { font-weight: 900; letter-spacing: -0.02em; margin-top: 2.5rem; }
                                    `}</style>
                                    </div>
                                </div>

                                {/* Floating Stats & Auto-save */}
                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[50] flex items-center gap-3 px-6 py-3 bg-[var(--color-surface)]/80 backdrop-blur-md border border-[var(--color-border)] rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-60">
                                        <FontAwesomeIcon icon={faAlignLeft} className="text-[var(--color-primary)]" />
                                        <span>{form.content?.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim().split(/\s+/).filter(Boolean).length || 0} Kata</span>
                                    </div>
                                    <div className="w-px h-3 bg-[var(--color-border)]" />
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                                        <FontAwesomeIcon icon={faCloudArrowUp} className="animate-pulse" />
                                        <span>Tersimpan Otomatis</span>
                                    </div>
                                    <div className="w-px h-3 bg-[var(--color-border)]" />
                                    <div className="flex items-center gap-2 text-[9px] font-black text-[var(--color-text-muted)] opacity-40">
                                        <span className="px-1.5 py-0.5 rounded border border-[var(--color-border)] uppercase">Ctrl+K</span>
                                        <span>Palette</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-black text-[var(--color-text-muted)] opacity-40">
                                        <span className="px-1.5 py-0.5 rounded border border-[var(--color-border)] uppercase">Ctrl+J</span>
                                        <span>AI</span>
                                    </div>
                                </div>

                                <div className="text-center pt-16 pb-16 text-[9px] font-black text-[var(--color-text-muted)] opacity-20 uppercase tracking-[0.4em] pointer-events-none">
                                    Focus Mode • Kedamaian dalam Tulisan
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                </form>

                <ConfirmExitModal
                    isOpen={showExitModal}
                    onClose={() => setShowExitModal(false)}
                    onConfirm={() => navigate('/admin/news')}
                />

                <MediaLibraryModal
                    isOpen={isMediaModalOpen}
                    onClose={() => setIsMediaModalOpen(false)}
                    currentSelection={form.image_url}
                    onSelect={(url) => {
                        setForm(f => ({ ...f, image_url: url }))
                        setImagePreview(url)
                        setImageFile(null)
                        setIsMediaModalOpen(false)
                        addToast('Gambar dari galeri dipilih', 'success')
                    }}
                />

                <CommandPalette
                    isOpen={showCommandPalette}
                    onClose={() => setShowCommandPalette(false)}
                    actions={[
                        { id: 'save', label: 'Simpan Informasi', icon: faFloppyDisk, shortcut: 'Ctrl+S', action: () => handleSave() },
                        { id: 'media', label: 'Buka Media Library', icon: faImage, shortcut: 'M', action: () => setIsMediaModalOpen(true) },
                        { id: 'zen', label: 'Toggle Zen Mode', icon: faMoon, shortcut: 'Z', action: () => setIsZenMode(!isZenMode) },
                        { id: 'ai', label: 'Buka AI Assistant', icon: faMagicWandSparkles, shortcut: 'Ctrl+J', action: () => setIsAiModalOpen(true) },
                        { id: 'history', label: 'Riwayat Revisi', icon: faRotateLeft, action: () => setShowRevisionHistory(true) },
                        { id: 'back', label: 'Kembali ke Daftar', icon: faChevronLeft, action: handleGoBack },
                    ]}
                />

                <AiAssistant
                    isOpen={isAiModalOpen}
                    onClose={() => setIsAiModalOpen(false)}
                    content={form.content}
                    title={form.title}
                    onApply={(newContent) => setForm(f => ({ ...f, content: newContent }))}
                />

                <RevisionHistoryModal
                    isOpen={showRevisionHistory}
                    onClose={() => setShowRevisionHistory(false)}
                    id={id}
                />
            </div>
        </DashboardLayout>
    )
}

// ─── Sub-Components (Internal) ──────────────────────────────────────────────────

function CommandPalette({ isOpen, onClose, actions }) {
    const [search, setSearch] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const filtered = actions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()))
    useEffect(() => { if (isOpen) { setSearch(''); setActiveIndex(0) } }, [isOpen])
    useEffect(() => {
        const handleKeys = (e) => {
            if (!isOpen) return
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev + 1) % filtered.length) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length) }
            if (e.key === 'Enter') { e.preventDefault(); filtered[activeIndex]?.action(); onClose() }
        }
        window.addEventListener('keydown', handleKeys); return () => window.removeEventListener('keydown', handleKeys)
    }, [isOpen, activeIndex, filtered, onClose])
    if (!isOpen) return null
    return createPortal(
        <div className="fixed inset-0 z-[11000] flex items-start justify-center pt-24 px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-xl bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-3">
                    <FontAwesomeIcon icon={faFilter} className="text-[var(--color-text-muted)] opacity-30" />
                    <input autoFocus placeholder="Ketik perintah atau navigasi..." className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-[var(--color-text)]" value={search} onChange={e => setSearch(e.target.value)} />
                    <div className="px-2 py-1 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">ESC</div>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                    {filtered.map((opt, i) => (
                        <div key={opt.id} onClick={() => { opt.action(); onClose() }} className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${i === activeIndex ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text)]'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === activeIndex ? 'bg-white/20' : 'bg-[var(--color-surface-alt)] group-hover:bg-white/10 opacity-70'}`}>
                                    <FontAwesomeIcon icon={opt.icon} className="text-sm" />
                                </div>
                                <span className="text-[13px] font-bold">{opt.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>, document.body
    )
}

function AiAssistant({ isOpen, onClose, content, title, onApply }) {
    const [prompt, setPrompt] = useState('')
    const [result, setResult] = useState('')
    const [loading, setLoading] = useState(false)

    const handleGenerate = async (presetTone = null) => {
        if (!prompt && !presetTone) return
        setLoading(true)

        const instruction = presetTone
            ? `Rewrite artikel ini dengan gaya ${presetTone}.`
            : prompt;

        const fullPrompt = `Konteks Artikel Saat Ini:\nJudul: ${title}\nKonten: ${content}\n\nInstruksi Editor: ${instruction}`
        const res = await askAi(fullPrompt, "editor")

        setResult(res)
        setLoading(false)
    }

    const tones = [
        { label: 'Formal', val: 'FORMAL', icon: faUserPen, color: 'text-blue-500', bg: 'bg-blue-500/5', hover: 'hover:bg-blue-500/10' },
        { label: 'Santai', val: 'SANTAI', icon: faCoffee, color: 'text-amber-500', bg: 'bg-amber-500/5', hover: 'hover:bg-amber-500/10' },
        { label: 'Prof-Zen', val: 'PROFESSIONAL-ZEN', icon: faMoon, color: 'text-purple-500', bg: 'bg-purple-500/5', hover: 'hover:bg-purple-500/10' },
    ]

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Asisten Penulisan AI"
            description="Mesin Penulisan Cerdas Enterprise"
            icon={faMagicWandSparkles}
            size="md"
            footer={
                <div className="flex items-center justify-center gap-2 w-full opacity-60">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-indigo-500 text-[9px]" />
                    <span className="text-[9px] font-black text-[var(--color-text-muted)] tracking-tight">
                        Hasil AI perlu ditinjau kembali oleh manusia.
                    </span>
                </div>
            }
        >
            <div className="space-y-5">
                {/* Tone Presets Strategy - More Compact */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-1">
                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Gaya Bahasa</label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {tones.map(t => (
                            <button key={t.val} onClick={() => handleGenerate(t.val)} className={`group relative h-9 rounded-xl border border-[var(--color-border)] ${t.bg} flex items-center justify-center gap-2 transition-all duration-300 ${t.hover} hover:border-indigo-500/30 active:scale-95`}>
                                <FontAwesomeIcon icon={t.icon} className={`text-[10px] ${t.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                                <span className="text-[9px] font-black uppercase tracking-tight text-[var(--color-text)]">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[var(--color-border)] opacity-30"></span></div>
                    <div className="relative flex justify-center">
                        <span className="bg-[var(--color-surface)] px-3 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] italic">Instruksi Kustom</span>
                    </div>
                </div>

                {/* Input Area - More Compact */}
                <div className="space-y-3">
                    <div className="group relative">
                        <textarea
                            autoFocus
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Contoh: Buat konten lebih singkat, padat, dan gunakan bahasa yang lebih persuasif..."
                            className="w-full h-24 p-5 rounded-2xl bg-[var(--color-surface-alt)] border border-transparent outline-none focus:border-indigo-500/20 focus:bg-[var(--color-surface)] text-[13px] font-medium leading-relaxed transition-all duration-300 resize-none shadow-inner scrollbar-none"
                        />
                        <div className="absolute bottom-3 right-5 text-[8px] font-black uppercase tracking-widest text-slate-300 opacity-30 group-focus-within:opacity-100 transition-opacity">
                            Ghost Prompt
                        </div>
                    </div>

                    <button
                        disabled={!prompt || loading}
                        onClick={() => handleGenerate()}
                        className="group relative w-full h-10 rounded-xl bg-indigo-600 overflow-hidden shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 active:scale-95 disabled:opacity-50"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600"></div>
                        <div className="relative flex items-center justify-center gap-2">
                            {loading ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-white text-xs" />
                            ) : (
                                <>
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white">Olah Konten</span>
                                    <FontAwesomeIcon icon={faArrowRight} className="text-white/40 text-[10px] group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </div>
                    </button>
                </div>

                {/* Result Card - Optimized Padding */}
                {result && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-3 duration-500">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80">AI Response</label>
                            </div>
                        </div>

                        <div className="relative group p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 text-[12px] font-medium leading-relaxed shadow-inner">
                            <div className="text-[var(--color-text)] opacity-90 whitespace-pre-wrap">{result}</div>
                            <div className="mt-5 flex justify-end">
                                <button
                                    onClick={() => { onApply(result); onClose(); }}
                                    className="h-9 px-6 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/10"
                                >
                                    Terapkan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

function RevisionHistoryModal({ isOpen, onClose, id }) {
    if (!isOpen) return null
    return createPortal(
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
            <div className="w-full max-w-lg bg-[var(--color-surface)] rounded-[2rem] border border-[var(--color-border)] shadow-2xl p-8 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 text-xl"><FontAwesomeIcon icon={faRotateLeft} /></div>
                    <div>
                        <h3 className="text-lg font-black text-[var(--color-text)]">Riwayat Revisi</h3>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">Snapshot konten artikel ini</p>
                    </div>
                </div>
                <div className="space-y-3 opacity-40 text-center py-12 border-2 border-dashed border-[var(--color-border)] rounded-2xl">
                    <p className="text-[11px] font-black uppercase tracking-widest">Belum ada riwayat revisi</p>
                    <p className="text-[9px]">Revisi akan tercatat otomatis setiap kali Anda klik Simpan.</p>
                </div>
                <button onClick={onClose} className="w-full h-11 mt-6 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)]">Tutup</button>
            </div>
        </div>, document.body
    )
}


