"use client";

import { Icon } from "./Icon";

const inputBase =
  "w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-colors";

export function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-label-lg font-label-lg text-primary">
        {label}
        {required && <span className="text-secondary"> *</span>}
      </label>
      {children}
      {hint && <p className="text-body-sm font-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function TextInput(props: InputProps) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

type AreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export function TextArea(props: AreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full min-h-[104px] p-4 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md font-body-md text-on-surface placeholder:text-on-tertiary-container resize-none focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-colors ${props.className ?? ""}`}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string; options: { value: string; label: string }[] };
export function Select({ placeholder, options, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${inputBase} appearance-none pr-10 ${props.value ? "" : "text-on-tertiary-container"}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-on-surface">
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="expand_more" className="text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/** Upload de documento (CRM/diploma). Mostra o nome do arquivo escolhido. */
export function FileField({
  label,
  hint,
  fileName,
  onFile,
}: {
  label: string;
  hint?: string;
  fileName?: string;
  onFile: (file: File | null) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <label className="flex items-center gap-3 h-12 px-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low cursor-pointer hover:border-secondary transition-colors">
        <Icon name="upload_file" className="text-secondary" />
        <span className={`text-body-md font-body-md truncate ${fileName ? "text-on-surface" : "text-on-tertiary-container"}`}>
          {fileName ?? "Enviar foto do documento"}
        </span>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </Field>
  );
}
