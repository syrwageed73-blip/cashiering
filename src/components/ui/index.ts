/**
 * UI primitives barrel — premium glass components, accessible, RTL/LTR agnostic.
 *
 * Every control replaces a native/default-styled HTML element with an on-brand
 * glass equivalent that matches the established design system tokens
 * (glass-card-strong, modal-content/modal-backdrop, input-premium, gradient-*).
 *
 * Re-export individual components or import the whole namespace:
 *   import { Button, Select, Modal } from "@/components/ui";
 */
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { TextField } from "./TextField";
export type { TextFieldProps, FieldSize } from "./TextField";

export { NumberField } from "./NumberField";
export type { NumberFieldProps } from "./NumberField";

export { SearchInput } from "./SearchInput";
export type { SearchInputProps } from "./SearchInput";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

export { MultiSelect } from "./MultiSelect";
export type { MultiSelectProps, MultiSelectOption } from "./MultiSelect";

export { Combobox } from "./Combobox";
export type { ComboboxProps, ComboboxOption } from "./Combobox";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { RadioGroup } from "./Radio";
export type { RadioGroupProps, RadioOption } from "./Radio";

export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";

export { SegmentedControl } from "./SegmentedControl";
export type { SegmentedControlProps, SegmentOption } from "./SegmentedControl";

export { Slider } from "./Slider";
export type { SliderProps } from "./Slider";

export { DateField } from "./DateField";
export type { DateFieldProps } from "./DateField";

export { FileUpload } from "./FileUpload";
export type { FileUploadProps } from "./FileUpload";

export { Menu } from "./Menu";
export type { MenuProps, MenuItem, MenuTriggerProps } from "./Menu";

export { Tooltip } from "./Tooltip";
export type { TooltipProps } from "./Tooltip";

export { Modal } from "./Modal";
export type { ModalProps } from "./Modal";

export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps, ConfirmType } from "./ConfirmDialog";

// Shared helpers (rarely needed by consumers, but exposed for advanced composition).
export { cn, clamp, uid } from "./utils";
export {
  useOutsideClick,
  useScrollLock,
  useFocusTrap,
  usePrefersReducedMotion,
  useMediaQuery,
  useIsMobile,
  useControllableState,
  useDebouncedValue,
} from "./hooks";
