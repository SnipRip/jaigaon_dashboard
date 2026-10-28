import { FileText } from "lucide-react";

// Roughly how the message will look in the customer's WhatsApp: a green
// chat bubble, with the PDF card when one is attached.
export function MessagePreview({ text, document }: { text: string; document?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">Preview</span>
      <div className="rounded-(--radius-tile) bg-ground p-3">
        <div className="ml-auto flex max-w-[92%] flex-col gap-2 rounded-(--radius-tile) rounded-tr-sm bg-success-tint px-3.5 py-2.5 text-sm text-ink shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
          {document && (
            <span className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold">
              <FileText aria-hidden="true" className="size-4 text-danger-strong" />
              {document}.pdf
            </span>
          )}
          <p className="whitespace-pre-line">{text}</p>
        </div>
      </div>
    </div>
  );
}
