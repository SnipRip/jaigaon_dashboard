"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextField } from "@/components/ui/text-field";
import { MessagePreview } from "./message-preview";
import { fillTemplate } from "./template-rules";
import type { MessageTemplate, OptIn } from "./types";

interface SendMessageFormProps {
  templates: MessageTemplate[];
  optIns: OptIn[];
  /** Quotations and invoices that can go with a message. */
  documents: SelectOption[];
}

// Send one approved template to a customer who has opted in. Only opted-in
// numbers are offered: WhatsApp's policy and our own consent record
// (jaigaon_web, whatsapp-policy) require it.
export function SendMessageForm({ templates, optIns, documents }: SendMessageFormProps) {
  const reachable = optIns.filter((optIn) => optIn.status === "opted-in");
  const approved = templates.filter((template) => template.status === "approved");
  const [optInId, setOptInId] = useState(reachable[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(approved[0]?.id ?? "");
  const [document, setDocument] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const template = approved.find((candidate) => candidate.id === templateId);
  const recipient = reachable.find((candidate) => candidate.id === optInId);
  const documentLabel = documents.find((option) => option.value === document)?.label;

  const send = () => {
    if (!recipient || !template) return setMessage({ tone: "error", text: "Pick an opted-in customer and an approved template." });
    if (template.variables.some((_, index) => !values[index]?.trim())) return setMessage({ tone: "error", text: "Fill in every blank of the template." });
    if (template.withDocument && !document) return setMessage({ tone: "error", text: "This template sends a PDF: pick the quotation or invoice." });
    setMessage({ tone: "success", text: `Ready to send to ${recipient.phone}. Sending switches on when the WhatsApp Business API is connected.` });
  };

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <GlassCard className="flex flex-col gap-3.5">
        <CardTitle>Send a message</CardTitle>
        <SelectField label="To (opted in only)" options={reachable.map((optIn) => ({ value: optIn.id, label: `${optIn.name} · ${optIn.phone}` }))} value={optInId || undefined} onValueChange={setOptInId} />
        <SelectField
          label="Template (approved only)"
          options={approved.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
          value={templateId || undefined}
          onValueChange={(id) => {
            setTemplateId(id);
            setValues([]);
          }}
        />
        {template?.withDocument && <SelectField label="Attach" options={documents} value={document || undefined} onValueChange={setDocument} />}
        {template?.variables.map((label, index) => (
          <TextField
            key={`${template.id}-${label}`}
            label={label}
            value={values[index] ?? ""}
            onChange={(event) => setValues((current) => Object.assign([...current], { [index]: event.target.value }))}
          />
        ))}
        {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
        <Button variant="success" onClick={send} size="lg">
          <Send aria-hidden="true" className="size-[18px]" />
          Send on WhatsApp
        </Button>
      </GlassCard>
      <GlassCard className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{recipient?.name ?? "No one picked"}</CardTitle>
          {recipient && <StatusChip tone="success">Opted in {recipient.at.slice(0, 10)}</StatusChip>}
        </div>
        {template ? (
          <MessagePreview text={fillTemplate(template, template.variables.map((label, index) => values[index] || `[${label}]`))} document={template.withDocument ? documentLabel?.split(" ·")[0].replace(/\//g, "-") : undefined} />
        ) : (
          <p className="text-sm font-semibold text-muted">No approved template yet.</p>
        )}
      </GlassCard>
    </div>
  );
}
