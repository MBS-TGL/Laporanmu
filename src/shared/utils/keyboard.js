/* Deteksi platform & label tombol keyboard.
   Dipisah dari ShortcutsModal.jsx supaya file itu murni komponen (react-refresh). */

export const IS_MAC =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || '')

const KEY_LABELS = IS_MAC
    ? { Ctrl: '⌘', Alt: '⌥', Shift: '⇧', Esc: 'esc', Enter: '↵' }
    : { Ctrl: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Esc: 'Esc', Enter: 'Enter' }

/** 'Ctrl' → '⌘' di Mac, apa adanya di Windows/Linux. */
export const formatKey = key => KEY_LABELS[key] ?? key
