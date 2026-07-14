import { useRef, useCallback } from 'react';

/**
 * useLongPress custom hook
 * @param {Function} onLongPress - Callback when long press is detected
 * @param {Object} options - { delay, onClick }
 */
export default function useLongPress(onLongPress, { delay = 500, onClick = null } = {}) {
    const timerRef = useRef();
    const sourceRef = useRef();
    const longPressTriggeredRef = useRef(false);

    const start = useCallback((event) => {
        event.persist();
        longPressTriggeredRef.current = false;
        sourceRef.current = event.target;
        timerRef.current = setTimeout(() => {
            onLongPress(event);
            longPressTriggeredRef.current = true;
        }, delay);
    }, [onLongPress, delay]);

    const clear = useCallback((event, shouldTriggerClick = true) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (shouldTriggerClick && !longPressTriggeredRef.current && onClick) {
            onClick(event);
        }
        longPressTriggeredRef.current = false;
    }, [onClick]);

    return {
        onMouseDown: (e) => start(e),
        onTouchStart: (e) => start(e),
        onMouseUp: (e) => clear(e),
        onMouseLeave: (e) => clear(e, false),
        onTouchEnd: (e) => clear(e),
    };
}

