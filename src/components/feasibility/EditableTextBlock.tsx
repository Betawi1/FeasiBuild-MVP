"use client";

interface EditableTextBlockProps {
  text: string;
  isEditing: boolean;
  onChange: (newText: string) => void;
  className?: string;
  placeholder?: string;
}

export default function EditableTextBlock({
  text,
  isEditing,
  onChange,
  className = "",
  placeholder = "Click to edit...",
}: EditableTextBlockProps) {
  if (!isEditing) {
    return <p className={`${className} whitespace-pre-wrap`}>{text}</p>;
  }

  return (
    <div className={`relative group ${className}`}>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 bg-slate-50 border border-emerald-500/50 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y min-h-[80px]"
      />
      <div className="absolute bottom-2 right-2 text-emerald-500 opacity-50">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </div>
    </div>
  );
}
