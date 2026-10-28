"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { SelectField } from "@/components/ui/select-field";
import { StatusChip } from "@/components/ui/status-chip";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { MessagePreview } from "./message-preview";
import { fillTemplate, placeholdersIn, placeholdersInOrder, PURPOSES, TEMPLATE_NAME, TEMPLATE_STATUS_TEXT } from "./template-rules";
import type { MessageTemplate } from "./types";

const schema = z
  .object({
    name: z.string().trim().regex(TEMPLATE_NAME, "Lower case letters, digits and _ only"),
    purpose: z.enum(["quotation", "invoice", "payment-reminder", "shipment", "general"]),
    category: z.enum(["utility", "marketing"]),
    language: z.enum(["en", "hi", "bn"]),
    body: z.string().trim().min(10, "Write the message").max(1024, "Meta allows 1,024 characters"),
    variables: z.string(),
    withDocument: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!placeholdersInOrder(values.body)) ctx.addIssue({ code: "custom", path: ["body"], message: "Number the blanks {{1}}, {{2}} … with no gaps" });
    const labels = values.variables.split(",").map((label) => label.trim()).filter(Boolean);
    if (labels.length !== placeholdersIn(values.body).length) ctx.addIssue({ code: "custom", path: ["variables"], message: `Name each of the ${placeholdersIn(values.body).length} blanks, comma separated` });
  });
type TemplateValues = z.infer<typeof schema>;

const STATUS_TONE = { approved: "success", pending: "warning", rejected: "danger", draft: "neutral" } as const;

const toValues = (template?: MessageTemplate): TemplateValues => ({
  name: template?.name ?? "",
  purpose: template?.purpose ?? "general",
  category: template?.category ?? "utility",
  language: template?.language ?? "en",
  body: template?.body ?? "",
  variables: template?.variables.join(", ") ?? "",
  withDocument: template?.withDocument ?? false,
});

// Message templates (masters-plan.md H29). WhatsApp only delivers business
// messages from templates Meta has approved, so each one is written here,
// previewed, and submitted for approval.
export function TemplatesPanel({ initialTemplates }: { initialTemplates: MessageTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | "new">(initialTemplates[0]?.id ?? "new");
  const selected = templates.find((template) => template.id === selectedId);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <GlassCard className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Templates</CardTitle>
          <Button className="ml-auto" onClick={() => setSelectedId("new")}>
            <Plus aria-hidden="true" className="size-[18px]" />
            New template
          </Button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {templates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                aria-pressed={template.id === selectedId}
                onClick={() => setSelectedId(template.id)}
                className={`glass-press flex w-full flex-col items-start gap-1 rounded-[18px] px-4 py-3 text-left ${template.id === selectedId ? "glass-selected" : "glass-inset hover:bg-white/60"}`}
              >
                <span className="text-sm font-bold">{template.name}</span>
                <span className="flex flex-wrap gap-1.5">
                  <StatusChip tone={STATUS_TONE[template.status]}>{TEMPLATE_STATUS_TEXT[template.status]}</StatusChip>
                  <StatusChip tone="neutral">{PURPOSES.find((purpose) => purpose.value === template.purpose)?.label}</StatusChip>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </GlassCard>
      <TemplateEditor
        key={selectedId}
        template={selected}
        onSave={(saved) => {
          setTemplates((current) => (current.some((template) => template.id === saved.id) ? current.map((template) => (template.id === saved.id ? saved : template)) : [...current, saved]));
          setSelectedId(saved.id);
        }}
      />
    </div>
  );
}

function TemplateEditor({ template, onSave }: { template?: MessageTemplate; onSave: (template: MessageTemplate) => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateValues>({ resolver: zodResolver(schema), defaultValues: toValues(template) });
  const [body, variables, withDocument] = useWatch({ control, name: ["body", "variables", "withDocument"] });
  const labels = variables.split(",").map((label) => label.trim());

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <CardTitle>{template ? `Edit ${template.name}` : "New template"}</CardTitle>
      <form
        noValidate
        className="flex flex-col gap-3.5"
        onSubmit={handleSubmit((values) => {
          onSave({
            id: template?.id ?? values.name,
            ...values,
            variables: values.variables.split(",").map((label) => label.trim()).filter(Boolean),
            status: template?.status === "approved" ? "pending" : (template?.status ?? "draft"),
          });
          setMessage("Saved on this page. Submitting to Meta switches on when the WhatsApp Business API is connected; an edited approved template goes back for approval.");
        })}
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField label="Template name" placeholder="quotation_sent" error={errors.name?.message} {...register("name")} />
          <Controller
            control={control}
            name="purpose"
            render={({ field }) => <SelectField label="Used for" options={PURPOSES} value={field.value} onValueChange={field.onChange} />}
          />
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <SelectField
                label="Meta category"
                options={[
                  { value: "utility", label: "Utility: about an order or account" },
                  { value: "marketing", label: "Marketing: offers, news" },
                ]}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <SelectField
                label="Language"
                options={[
                  { value: "en", label: "English" },
                  { value: "hi", label: "Hindi" },
                  { value: "bn", label: "Bengali" },
                ]}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </div>
        <TextArea label="Message" rows={5} hint="Use {{1}}, {{2}} … for the parts filled in when sending." error={errors.body?.message} {...register("body")} />
        <TextField label="What each blank holds" placeholder="Customer name, Quotation number, Amount" error={errors.variables?.message} {...register("variables")} />
        <Controller
          control={control}
          name="withDocument"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              <FilterChip selected={field.value} onClick={() => field.onChange(true)}>
                Sends a PDF
              </FilterChip>
              <FilterChip selected={!field.value} onClick={() => field.onChange(false)}>
                Text only
              </FilterChip>
            </div>
          )}
        />
        <MessagePreview text={fillTemplate({ body }, placeholdersIn(body).map((number) => `[${labels[number - 1] || `blank ${number}`}]`))} document={withDocument ? "QT-2627-0047" : undefined} />
        {message && <FormMessage tone="success">{message}</FormMessage>}
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit">Save template</Button>
          <Button variant="success" disabled>
            Submit to Meta
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
