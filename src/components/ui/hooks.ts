/**
 * Shared React hooks for the UI primitives layer.
 * Accessible + RTL-aware by construction.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/** Call handler when a click/touch lands outside any of the referenced elements. */
export function useOutsideClick<T extends HTMLElement>(
  onOutsideClick: () => void,
  enabled: boolean = true,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: MouseEvent | TouchEvent): void => {
      const target = event.target as Node | null;
      if (target && ref.current && !ref.current.contains(target)) {
        onOutsideClick();
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onOutsideClick, enabled]);
  return ref;
}

/** Lock body scroll while active (dialogs, sheets). Restores on cleanup. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = original;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [active]);
}

/** Trap focus inside a container; returns ref to attach. */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;
    const selector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusable = (): HTMLElement[] => {
      const nodes = Array.from(node.querySelectorAll(selector)) as HTMLElement[];
      return nodes.filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    };

    // Focus first focusable on activation.
    const focusables = getFocusable();
    focusables[0]?.focus();

    const handleKey = (e: KeyboardEvent): void => {
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", handleKey);
    return () => node.removeEventListener("keydown", handleKey);
  }, [active]);
  return ref;
}

/** True when the user prefers reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (): void => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Media query hook (e.g. useMediaQuery("(min-width: 768px)")). SSR-safe. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (): void => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Returns true when viewport is mobile (<= 640px). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 640px)");
}

/** Controlled-or-uncontrolled state helper. */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<T>(defaultValue);
  const current = isControlled ? (value as T) : internal;
  const setCurrent = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [current, setCurrent];
}

/** Debounce a fast-changing value by `delay` ms (default 300). */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
