import { forwardRef, useId, useRef, useState } from "react";
import type { RefObject, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { UploadCloud, FileIcon, X } from "lucide-react";
import { cn } from "./utils";

export interface FileUploadProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** accept attribute, e.g. "image/*" */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Controlled selected files. */
  files?: File[];
  onChange?: (files: File[]) => void;
  /** Override the dropzone prompt text. */
  prompt?: ReactNode;
  buttonText?: ReactNode;
  className?: string;
}

/**
 * Styled dropzone + button replacing raw <input type=file>. Drag-and-drop,
 * click to browse, file list with remove, error/hint chrome.
 */
export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(function FileUpload(
  {
    label,
    hint,
    error,
    required,
    accept,
    multiple = false,
    disabled,
    files,
    onChange,
    prompt,
    buttonText,
    className,
  },
  ref,
) {
  const { t } = useTranslation();
  const resolvedPrompt = prompt ?? t('common.ui.fileUploadPrompt');
  const resolvedButtonText = buttonText ?? t('common.ui.fileUploadButton');
  const fieldId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [internal, setInternal] = useState<File[]>([]);
  const isControlled = files !== undefined;
  const selected = isControlled ? files : internal;

  const setFiles = (next: File[]): void => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const addFiles = (list: FileList | null): void => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    setFiles(multiple ? [...selected, ...incoming] : incoming.slice(0, 1));
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || required) && (
        <label htmlFor={fieldId} className="text-sm font-bold text-gray-700">
          {label}
          {required && <span className="text-rose-500 ms-1">*</span>}
        </label>
      )}
      <div
        data-dragging={dragging}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={typeof resolvedPrompt === "string" ? resolvedPrompt : t('common.ui.fileUpload')}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "ui-dropzone cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 text-center glass-card",
          dragging ? "border-indigo-500 bg-indigo-50/60" : "border-slate-300",
          error && "border-rose-400",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <span className="grid place-items-center h-12 w-12 rounded-2xl gradient-primary-soft text-indigo-600">
          <UploadCloud className="h-6 w-6" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-gray-700">{resolvedPrompt}</p>
          <span className="inline-flex">
            <span
              className="ui-press inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl btn-primary-gradient text-white text-xs font-bold cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              {resolvedButtonText}
            </span>
          </span>
        </div>
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as RefObject<HTMLInputElement | null>).current = node;
          }}
          id={fieldId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {selected.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-1">
          {selected.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2.5 rounded-xl bg-white/80 border border-slate-200 px-3 py-2"
            >
              <FileIcon className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-700">
                {file.name}
              </span>
              <span className="text-xs text-gray-400 tabular-nums shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={t('common.ui.fileRemove', { filename: file.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFiles(selected.filter((_, idx) => idx !== i));
                  }}
                  className="ui-press text-gray-400 hover:text-rose-500 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
});
