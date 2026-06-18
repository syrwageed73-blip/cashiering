# UI Primitives

Reusable, accessible, RTL/LTR-agnostic glass components for the Mulham POS app.
Every control replaces a native/default-styled HTML element with an on-brand
equivalent that matches the established premium-glassmorphism design system
(`glass-card-strong`, `modal-content`/`modal-backdrop`, `input-premium`,
`gradient-primary`, etc. — see `src/index.css`).

Import everything from the barrel:

```ts
import { Button, TextField, Select, Modal, ConfirmDialog } from "@/components/ui";
// or relative:
import { Button } from "../ui";
```

## Design guarantees

- **Responsive 320px → 4k.** Touch targets ≥44px on mobile. Popovers/menus
  reposition to stay in viewport and become full-width bottom sheets ≤640px.
- **RTL + LTR parity.** Only CSS logical properties are used
  (`ps-*`, `pe-*`, `ms-*`, `me-*`, `inset-inline-*`, `text-start`). Chevrons,
  steppers, and switch thumbs mirror automatically.
- **Apple-HIG UX.** Distinct hover/focus/active/disabled, visible focus rings
  (`input-premium` glow + `:focus-visible`), 150–300ms transitions, haptic-style
  press (`ui-press` → `scale(0.97)`), `prefers-reduced-motion` respected.
- **WCAG AA.** Proper roles, `aria-*`, full keyboard operability, 4.5:1 contrast,
  no color-only meaning (icons + text accompany every state).
- **Controlled + uncontrolled** for every stateful component (pass `value` to
  control, `defaultValue` for uncontrolled).
- **forwardRef** on all field-style primitives.

## Controlled vs uncontrolled

All stateful components accept either a controlled `value`/`onChange` pair **or**
a `defaultValue` for uncontrolled use. Example:

```tsx
// Controlled
<Select value={role} onChange={setRole} options={...} />
// Uncontrolled
<Select defaultValue="admin" options={...} />
```

---

## Components

### Button
```tsx
<Button variant="primary" size="md" leftIcon={<Plus/>}>إضافة</Button>
<Button variant="danger" loading>حذف</Button>
<Button variant="secondary" fullWidth>إلغاء</Button>
```
**Props:** `variant: primary | secondary | ghost | dark | danger | success`;
`size: sm | md | lg`; `loading`, `fullWidth`, `leftIcon`, `rightIcon`, `href`
(renders an `<a>`). Maps to `btn-primary-gradient` / `btn-dark-gradient`.

### TextField
```tsx
<TextField label="الاسم" required error={err} leftIcon={<User/>} clearable />
```
**Props:** `label`, `hint`, `error`, `required`, `size`, `leftIcon`, `rightIcon`,
`clearable`, `onClear`. Built on `input-premium`. Error → `aria-invalid` + `role=alert`.

### NumberField
```tsx
<NumberField label="الكمية" min={1} max={999} step={1} value={qty} onValueChange={setQty} />
```
**Props:** `min`, `max`, `step`, `value`/`onValueChange` (numeric), plus field chrome.
RTL-aware +/- steppers, clamps to range, `inputMode=decimal`, `tabular-nums`.

### SearchInput
```tsx
<SearchInput placeholder="ابحث عن منتج..." onDebouncedChange={filter} debounceMs={250} />
```
**Props:** `value`, `onChange` (instant), `onDebouncedChange` (debounced), `debounceMs`
(default 300), `clearable`. Leading `Search` icon, clear button.

### Textarea
```tsx
<Textarea label="ملاحظات" autoGrow showCount maxLength={500} />
```
**Props:** `autoGrow` (resizes to content), `showCount`, `maxLength`, field chrome.

### Select (custom listbox — NOT native)
```tsx
<Select label="التصنيف" value={cat} onChange={setCat}
  options={[{value:'a',label:'أ'}, {value:'b',label:'ب', group:'مجموعة'}]} />
```
**Props:** `options: {value,label,disabled?,group?}[]`, `placeholder`, field chrome.
Full listbox keyboard model (↑↓ Home End type-ahead Enter Esc), focus restore,
viewport-clamped popover, mobile sheet. Selected option shows a check.

### MultiSelect
```tsx
<MultiSelect value={tags} onChange={setTags} options={opts} />
```
**Props:** `options: {value,label,disabled?,group?}[]`, `value: string[]`. Chips/tags
for selected items with remove buttons. `aria-multiselectable`, same keyboard model.

### Combobox (searchable select)
```tsx
<Combobox label="المنتج" value={productId} onChange={setProductId}
  options={products.map(p => ({value:p.id, label:p.name, hint:p.sku}))} />
```
**Props:** `options: {value,label,hint?,disabled?}[]`, `searchPlaceholder`,
`emptyText`. Filters by label+hint as you type. Ideal for product/customer pickers.

### Checkbox
```tsx
<Checkbox label="تفعيل" checked={on} onChange={setOn} indeterminate={some} />
```
**Props:** `checked`/`defaultChecked`, `indeterminate` (aria-checked="mixed"),
`label`, `hint`. ≥44px hit area via label wrapper.

### RadioGroup
```tsx
<RadioGroup label="النوع" value={type} onChange={setType}
  options={[{value:'in',label:'داخل'},{value:'out',label:'خارج'}]} orientation="horizontal" />
```
**Props:** `options`, `orientation`, field chrome. Roving tabindex, Arrow-key nav,
`role=radiogroup`.

### Switch
```tsx
<Switch label="الوضع الليلي" checked={dark} onChange={setDark} size="md" />
```
**Props:** `checked`/`defaultChecked`, `size: sm|md|lg`, `label`. `role=switch`,
animated thumb, palette on/off colors, RTL-aware slide.

### SegmentedControl
```tsx
<SegmentedControl value={size} onChange={setSize}
  options={[{value:'58',label:'58mm'},{value:'80',label:'80mm'}]} />
```
**Props:** `options: {value,label,icon?,disabled?}[]`, `fullWidth`, `size`. Pill
segments, animated active pill, `role=radiogroup` + arrow-key nav. Generic over
value type `<T extends string>`.

### Slider
```tsx
<Slider label="السعة" min={0} max={100} value={v} onChange={setV} formatValue={(v)=>`${v}%`} />
```
**Props:** `min`, `max`, `step`, `showValue`, `formatValue`. Indigo→cyan gradient
track with glass thumb, value bubble, `aria-valuenow/text`.

### DateField / TimeField
```tsx
<DateField label="التاريخ" kind="date" value={d} onChange={...} />
<DateField label="الوقت" kind="time" />
<DateField label="التاريخ والوقت" kind="datetime-local" />
```
**Props:** `kind: date | time | datetime-local`, `size`, field chrome. Keeps native
picker for reliability but wraps it in glass chrome with a leading icon.

### FileUpload
```tsx
<FileUpload label="صورة المنتج" accept="image/*" onChange={setFiles} />
<FileUpload multiple files={files} onChange={setFiles} />
```
**Props:** `accept`, `multiple`, `files`/`onChange` (`File[]`), `prompt`, `buttonText`.
Drag-and-drop dropzone, file list with size + remove, keyboard accessible.

### Menu (actions dropdown)
```tsx
<Menu ariaLabel="إجراءات" align="end"
  items={[
    {key:'edit', label:'تعديل', icon:<Pencil/>, onSelect:edit},
    {key:'del', label:'حذف', icon:<Trash/>, danger:true, onSelect:del, dividerAfter:true},
  ]}
  trigger={(p, open) => (
    <Button {...p} variant="secondary" rightIcon={<MoreVertical/>}>إجراءات</Button>
  )} />
```
**Props:** `items: MenuItem[]`, `trigger` render-prop (spread `triggerProps` onto
your button — receives `aria-haspopup/expanded/controls`, `onClick`, `onKeyDown`,
`ref`), `align: start|end`. Full menu keyboard model, viewport-clamped, mobile sheet.

### Tooltip
```tsx
<Tooltip content="هذا الحقل مطلوب" side="top">
  <button>؟</button>
</Tooltip>
```
**Props:** `content`, `side: top|bottom|start|end` (auto-flips), `delay`. Shows on
hover + focus, reduced-motion aware.

### Modal / Dialog
```tsx
<Modal open={open} onClose={close} title="تعديل" size="md"
  footer={<><Button variant="ghost" onClick={close}>إلغاء</Button><Button onClick={save}>حفظ</Button></>}>
  {children}
</Modal>
```
**Props:** `open`, `onClose`, `title`, `description`, `footer`, `size: sm|md|lg|xl|full`,
`closeOnBackdrop`, `showCloseButton`. Focus trap, Esc to close, scroll lock,
`modal-content` + `modal-backdrop` tokens, reduced-motion aware.

### ConfirmDialog
```tsx
<ConfirmDialog open={open} type="danger" title="حذف المنتج"
  message="هل أنت متأكد؟" confirmText="حذف" loading={busy}
  onConfirm={del} onCancel={close} />
```
**Props:** `type: danger | warning | info | success`, `confirmText`, `cancelText`,
`loading`. Mirrors the existing `CustomConfirm` API so views can adopt it without
churn. `CustomConfirm.tsx` continues to work unchanged.

---

## Shared helpers (also exported)

- `cn(...classes)` — conditional class joiner.
- `clamp(v, min, max)`, `uid(prefix)`.
- Hooks: `useOutsideClick`, `useScrollLock`, `useFocusTrap`,
  `usePrefersReducedMotion`, `useMediaQuery`, `useIsMobile`,
  `useControllableState`, `useDebouncedValue`.

## CSS additions

All new styles live in `src/index.css` under the
"UI PRIMITIVES — accessible glass controls" section, consistent with the existing
tokens (`ui-press`, `ui-spinner`, `ui-check-box`, `ui-radio-circle/dot`,
`ui-switch-thumb`, `ui-range`, `ui-native-field`, `ui-popover-scroll`, `ui-chip`,
`ui-tooltip`, `ui-option`, `ui-dropzone`, `ui-number-input`). No new visual language
introduced; no new dependencies.
