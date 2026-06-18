/**
 * Shared utilities for the UI primitives layer.
 * Pure helpers — no React, no side effects.
 */

/** Merge conditional class names (lightweight clsx alternative). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Generate a stable unique id (SSR-safe, no useId needed for non-component cases). */
let idCounter = 0;
export function uid(prefix = "ui"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Type guard: is the value a string with content? */
export function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Resolve logical direction for the given element. Falls back to RTL (app default)
 * when not determinable. Use to mirror icons/chevrons under dir=ltr vs dir=rtl.
 */
export function getDirection(el: HTMLElement | null | undefined): "rtl" | "ltr" {
  if (!el) return "rtl";
  const dir = (el.ownerDocument?.dir || "rtl").toLowerCase();
  return dir === "ltr" ? "ltr" : "rtl";
}
