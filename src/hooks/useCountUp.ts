import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 → target over `duration` ms.
 * Uses ease-out cubic: fast at start, decelerates toward the end.
 * Re-runs whenever `target` changes.
 */
export function useCountUp(target: number, duration = 3000): number {
    const [count, setCount] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef<number>(0);

    useEffect(() => {
        // Cancel any running animation
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        // If target is 0, just set immediately
        if (target === 0) {
            setCount(0);
            return;
        }

        startValueRef.current = 0; // always count from 0
        startTimeRef.current = null;

        function step(timestamp: number) {
            if (startTimeRef.current === null) {
                startTimeRef.current = timestamp;
            }

            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic: 1 - (1-t)^3
            const eased = 1 - Math.pow(1 - progress, 3);

            const current = Math.round(startValueRef.current + eased * (target - startValueRef.current));
            setCount(current);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(step);
            } else {
                setCount(target); // snap to exact value at end
            }
        }

        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [target, duration]);

    return count;
}
