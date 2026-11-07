"use client";

import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchField } from "@/components/ui/search-field";
import type { SelectOption } from "@/components/ui/select-field";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip";
import { IconAction } from "@/components/ui/icon-action";
import { ApiError } from "@/lib/api-client";
import { formatQuantity } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import type { SchemeView } from "@/types/scheme";
import { SchemeCheckCard } from "./scheme-check-card";
import { SchemeForm } from "./scheme-form";
import { benefitText, conditionText, PARTY_SCOPE_OPTIONS, RATE_SOURCE_OPTIONS, schemeStatus, validityText, type SchemeStatus } from "./scheme-text";
import { deleteScheme, setSchemeArchived, targetKey } from "./schemes-api";

interface SchemesWorkspaceProps {
  schemes: SchemeView[];
  /** Items, categories and brands, keyed "item:…" etc. */
  targetOptions: (SelectOption & { group: string })[];
  itemOptions: SelectOption[];
  customerOptions: SelectOption[];
  /** Reload after a change. */
  onChanged: () => void;
}

const STATUS_TONE: Record<SchemeStatus, StatusTone> = { "In force": "success", "Not started": "neutral", Ended: "warning", Archived: "neutral" };
const FILTERS: SchemeStatus[] = ["In force", "Not started", "Ended", "Archived"];

// Schemes and discounts for customers: the list, a form in a dialog, and a
// check that runs one line through the same rules a quotation uses.
export function SchemesWorkspace({ schemes, targetOptions, itemOptions, customerOptions, onChanged }: SchemesWorkspaceProps) {
  const today = useToday();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SchemeStatus | "All">("All");
  const [editing, setEditing] = useState<SchemeView | "new" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const targetName = useMemo(() => new Map(targetOptions.map((option) => [option.value, option.label])), [targetOptions]);
  const customerName = useMemo(() => new Map(customerOptions.map((option) => [option.value, option.label])), [customerOptions]);
  const statusOf = (scheme: SchemeView) => schemeStatus(scheme, today);

  const needle = query.trim().toLowerCase();
  const visible = schemes.filter((scheme) => {
    const status = statusOf(scheme);
    if (filter === "All" ? status === "Archived" : status !== filter) return false;
    return !needle || `${scheme.name} ${scheme.description ?? ""} ${scheme.notes ?? ""}`.toLowerCase().includes(needle);
  });
  const live = schemes.filter((scheme) => !scheme.isArchived);

  const act = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      setNotice({ tone: "success", text: done });
      onChanged();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save. Check the connection and try again." });
    }
  };

  const itemsText = (scheme: SchemeView) => {
    if (scheme.targets.length === 0) return "Every item";
    const names = scheme.targets.map((target) => targetName.get(targetKey(target)) ?? "Removed");
    return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
  };
  const customersText = (scheme: SchemeView) =>
    scheme.partyScope === "SELECTED"
      ? scheme.partyIds.map((id) => customerName.get(id) ?? "Removed").join(", ")
      : (PARTY_SCOPE_OPTIONS.find((option) => option.value === scheme.partyScope)?.label ?? "");
  const ratesText = (scheme: SchemeView) =>
    scheme.rateSources.length === 3 ? "Any rate" : scheme.rateSources.map((source) => RATE_SOURCE_OPTIONS.find((option) => option.value === source)?.label).join(", ");

  return (
    <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <StatTile label="In force today" value={formatQuantity(live.filter((scheme) => statusOf(scheme) === "In force").length)} tone="success" />
          <StatTile label="Line schemes" value={formatQuantity(live.filter((scheme) => scheme.level === "LINE").length)} />
          <StatTile label="Order schemes" value={formatQuantity(live.filter((scheme) => scheme.level === "ORDER").length)} />
          <StatTile label="Ended" value={formatQuantity(live.filter((scheme) => statusOf(scheme) === "Ended").length)} tone="warning" />
        </div>

        <GlassCard className="flex flex-col gap-3.5">
          <ListToolbar
            actions={
              <Button size="lg" onClick={() => setEditing("new")} disabled={!today}>
                <Plus aria-hidden="true" />
                New scheme
              </Button>
            }
          >
            <SearchField
              className="max-w-[340px] flex-[1_1_240px]"
              id="schemes-search"
              label="Search schemes"
              value={query}
              onChange={setQuery}
              placeholder="Search schemes"
              trailing={`${visible.length}`}
            />
            <FilterGroup label="Show">
              {(["All", ...FILTERS] as const).map((option) => (
                <FilterChip key={option} selected={filter === option} onClick={() => setFilter(option)}>
                  {option}
                </FilterChip>
              ))}
            </FilterGroup>
          </ListToolbar>

          <GlassTable className="min-w-[720px]">
            <thead>
              <tr>
                <th scope="col" className="text-left">Scheme</th>
                <th scope="col" className="text-left">Gives</th>
                <th scope="col" className="text-left">On</th>
                <th scope="col" className="text-left">For</th>
                <th scope="col" className="text-left">Valid</th>
                <th scope="col" className="text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="font-semibold">
              {visible.map((scheme) => {
                const status = statusOf(scheme);
                return (
                  <tr key={scheme.id}>
                    <td className="text-left">
                      <button type="button" onClick={() => setEditing(scheme)} className="text-left font-semibold hover:text-brand hover:underline">
                        {scheme.name}
                      </button>
                      <span className="block text-xs text-muted">{scheme.level === "LINE" ? "Item lines" : "Whole order"}{scheme.stackable ? " · adds on" : ""}</span>
                    </td>
                    <td className="text-left">
                      {benefitText(scheme)}
                      <span className="block text-xs text-muted">{conditionText(scheme)}</span>
                    </td>
                    <td className="text-left">
                      {itemsText(scheme)}
                      <span className="block text-xs text-muted">{ratesText(scheme)}</span>
                    </td>
                    <td className="max-w-[160px] text-left">{customersText(scheme)}</td>
                    <td className="text-left">
                      <span className="flex flex-col items-start gap-1">
                        <span className="text-xs">{validityText(scheme)}</span>
                        <StatusChip tone={STATUS_TONE[status]}>{status}</StatusChip>
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <span className="inline-flex gap-1.5">
                        <IconAction label={`Edit ${scheme.name}`} onClick={() => setEditing(scheme)}>
                          <Pencil aria-hidden="true" className="size-4" />
                        </IconAction>
                        <IconAction
                          label={scheme.isArchived ? `Restore ${scheme.name}` : `Archive ${scheme.name}`}
                          onClick={() => void act(() => setSchemeArchived(scheme.id, !scheme.isArchived), `${scheme.name} ${scheme.isArchived ? "restored" : "archived"}.`)}
                        >
                          {scheme.isArchived ? <ArchiveRestore aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}
                        </IconAction>
                        <IconAction label={`Delete ${scheme.name}`} danger onClick={() => void act(() => deleteScheme(scheme.id), `${scheme.name} deleted.`)}>
                          <Trash2 aria-hidden="true" className="size-4" />
                        </IconAction>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </GlassTable>
          {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No schemes match.</p>}
          {notice && <FormMessage tone={notice.tone} result={notice}>{notice.text}</FormMessage>}
          <p className="text-xs font-semibold text-muted">
            Schemes come off the rate a line takes (special rate, today&rsquo;s rate or a typed one), after any discount typed on the line. Line schemes work per item line; order schemes on the whole quotation, spread over its lines so GST is on what the customer pays.
          </p>
        </GlassCard>
      </div>

      <div className="xl:sticky xl:top-3.5">
        <SchemeCheckCard items={itemOptions} customers={customerOptions} />
      </div>

      <GlassModal open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title={editing === "new" ? "New scheme" : `Edit ${editing?.name ?? "scheme"}`}>
        {editing !== null && today && (
          <SchemeForm
            key={editing === "new" ? "new" : editing.id}
            scheme={editing === "new" ? undefined : editing}
            today={today}
            targetOptions={targetOptions}
            customerOptions={customerOptions}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              setNotice({ tone: "success", text: `${saved.name} saved.` });
              onChanged();
            }}
          />
        )}
      </GlassModal>
    </div>
  );
}
