"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import type { SelectOption } from "@/components/ui/select-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { ViewTabs } from "@/components/ui/view-tabs";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { SendMessageForm } from "./send-message-form";
import { TemplatesPanel } from "./templates-panel";
import type { MessageTemplate, OptIn, SentMessage } from "./types";

type Tab = "send" | "templates" | "opt-ins" | "history";

const TABS: { value: Tab; label: string }[] = [
  { value: "send", label: "Send" },
  { value: "templates", label: "Templates" },
  { value: "opt-ins", label: "Opt-ins" },
  { value: "history", label: "Messages sent" },
];

const MESSAGE_TONE: Record<SentMessage["status"], StatusTone> = { queued: "neutral", sent: "brand", delivered: "brand", read: "success", failed: "danger" };

interface WhatsappWorkspaceProps {
  templates: MessageTemplate[];
  optIns: OptIn[];
  messages: SentMessage[];
  documents: SelectOption[];
  names: Record<string, string>;
}

// WhatsApp (SOW 6): send templates to opted-in customers, keep the templates
// Meta approves, see who has opted in and what was sent. Sending switches on
// with the WhatsApp Business API; the opt-in form on the website is live.
export function WhatsappWorkspace({ templates, optIns, messages, documents, names }: WhatsappWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("send");
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Opted in" value={formatQuantity(optIns.filter((optIn) => optIn.status === "opted-in").length)} tone="success" />
        <StatTile label="Approved templates" value={formatQuantity(templates.filter((template) => template.status === "approved").length)} />
        <StatTile label="Messages this month" value={formatQuantity(messages.length)} />
        <StatTile label="Failed" value={formatQuantity(messages.filter((message) => message.status === "failed").length)} tone={messages.some((message) => message.status === "failed") ? "danger" : undefined} />
      </div>
      <ViewTabs label="WhatsApp views" tabs={TABS} value={tab} onChange={setTab} />

      {tab === "send" && <SendMessageForm templates={templates} optIns={optIns} documents={documents} />}
      {tab === "templates" && <TemplatesPanel initialTemplates={templates} />}
      {tab === "opt-ins" && (
        <GlassCard className="flex flex-col gap-3">
          <GlassTable className="min-w-[720px]">
            <thead>
              <tr>
                <th scope="col" className="text-left">Name</th>
                <th scope="col" className="text-left">Number</th>
                <th scope="col" className="text-left">Where</th>
                <th scope="col" className="text-left">When</th>
                <th scope="col" className="text-left">Status</th>
              </tr>
            </thead>
            <tbody className="font-semibold">
              {optIns.map((optIn) => (
                <tr key={optIn.id}>
                  <td className="font-semibold">{optIn.name}</td>
                  <td className="tabular-nums">{optIn.phone}</td>
                  <td>{optIn.source === "website" ? "Website form" : "At the counter"}</td>
                  <td>
                    {formatDateTime(optIn.at)}
                    <div className="text-xs text-muted">Consent text v{optIn.consentVersion}</div>
                  </td>
                  <td>
                    <StatusChip tone={optIn.status === "opted-in" ? "success" : "neutral"}>{optIn.status === "opted-in" ? "Opted in" : "Opted out"}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
          <p className="text-xs font-semibold text-muted">The website form records consent with its wording version. A customer who replies STOP is opted out and never messaged again.</p>
        </GlassCard>
      )}
      {tab === "history" && (
        <GlassCard className="flex flex-col gap-3">
          <GlassTable className="min-w-[720px]">
            <thead>
              <tr>
                <th scope="col" className="text-left">Sent</th>
                <th scope="col" className="text-left">To</th>
                <th scope="col" className="text-left">Template</th>
                <th scope="col" className="text-left">Document</th>
                <th scope="col" className="text-left">Status</th>
              </tr>
            </thead>
            <tbody className="font-semibold">
              {[...messages].sort((a, b) => b.at.localeCompare(a.at)).map((message) => (
                <tr key={message.id}>
                  <td>{formatDateTime(message.at)}</td>
                  <td>
                    <div className="font-semibold">{names[message.partyId]}</div>
                    <div className="text-xs text-muted tabular-nums">{message.phone}</div>
                  </td>
                  <td>{message.templateId}</td>
                  <td>{message.document ?? "–"}</td>
                  <td>
                    <StatusChip tone={MESSAGE_TONE[message.status]}>{message.status[0].toUpperCase() + message.status.slice(1)}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
        </GlassCard>
      )}
    </div>
  );
}
