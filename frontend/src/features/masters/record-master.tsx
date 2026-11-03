"use client";

import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassTable } from "@/components/ui/glass-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ImportDialog } from "@/components/ui/import-dialog";
import { SearchField } from "@/components/ui/search-field";
import { StatTile } from "@/components/ui/stat-tile";
import type { StatusTone } from "@/components/ui/status-chip";
import { Tooltip } from "@/components/ui/tooltip";
import { fromFormValues, newId, type FieldSpec, type FormValues } from "./record-fields";
import { RecordForm } from "./record-form";
import { ApiError } from "@/lib/api-client";

export interface MasterRecord {
  id: string;
  archived?: boolean;
}

/** Saves through the backend. Without it, changes stay on the page. */
export interface RecordPersistence<T> {
  create: (changes: Record<string, unknown>) => Promise<T>;
  update: (record: T, changes: Record<string, unknown>) => Promise<T>;
  /** Left out: no archive button or Archived filter. */
  archive?: (record: T) => Promise<T>;
  /** Left out: records are never deleted from this screen. */
  remove?: (record: T) => Promise<void>;
}

export interface RowAction<T> {
  label: (record: T) => string;
  icon: ReactNode;
  onClick: (record: T) => void;
}

export interface Column<T> {
  label: string;
  render: (record: T) => ReactNode;
  align?: "right";
}

interface RecordMasterProps<T extends MasterRecord> {
  /** Singular and plural, lower case: "brand", "brands". */
  noun: [string, string];
  /** With `persist`, pass the reloaded list again after a save; it replaces the shown one. */
  initialRecords: T[];
  fields: FieldSpec[];
  columns: Column<T>[];
  /** Text the search box matches against. */
  searchText: (record: T) => string;
  /** The field whose value names a record (used for its id and messages). */
  nameKey: keyof T & string;
  filters?: { label: string; test: (record: T) => boolean }[];
  stats?: (records: T[]) => { label: string; value: string; tone?: StatusTone }[];
  /** Documents using the record. A used record is archived, never deleted. */
  usage?: (record: T) => number;
  /** Defaults for a new record. */
  blank?: Partial<T>;
  /** The backend importer for the Import dialog (backend/src/imports); left out while the master is sample data. */
  importMaster?: string;
  /** A line under the list, e.g. where these records are picked. */
  footnote?: string;
  persist?: RecordPersistence<T>;
  /** Extra fields shown only when adding (a temporary password). */
  createOnlyFields?: FieldSpec[];
  /** Extra buttons on each row, before edit. */
  rowActions?: RowAction<T>[];
}

// The pattern every simple master follows (masters-plan.md, "UI placement"):
// a searchable list, a dialog to add or edit, import from a sheet, and a
// "used in N documents" check that archives instead of deleting. With
// `persist` the changes are saved through the backend; without it they stay
// on the page until the master is connected to the database.
export function RecordMaster<T extends MasterRecord>({
  noun: [one, many],
  initialRecords,
  fields,
  columns,
  searchText,
  nameKey,
  filters = [],
  stats,
  usage,
  blank,
  importMaster,
  footnote,
  persist,
  createOnlyFields = [],
  rowActions = [],
}: RecordMasterProps<T>) {
  const [records, setRecords] = useState(initialRecords);
  // A reloaded list (a new array from the parent) replaces the local copy.
  // The parent must keep the array stable between reloads (useMemo).
  const [loaded, setLoaded] = useState(initialRecords);
  if (loaded !== initialRecords) {
    setLoaded(initialRecords);
    setRecords(initialRecords);
  }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(-1);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canArchive = !persist || Boolean(persist.archive);
  const canRemove = !persist || Boolean(persist.remove);
  const formFields = editing === "new" ? [...fields, ...createOnlyFields] : fields;

  const needle = query.trim().toLowerCase();
  const visible = records.filter(
    (record) =>
      Boolean(record.archived) === showArchived &&
      (filter < 0 || filters[filter].test(record)) &&
      (!needle || searchText(record).toLowerCase().includes(needle)),
  );
  const nameOf = (record: T) => String(record[nameKey]);

  const replace = (saved: T) => setRecords((current) => current.map((record) => (record.id === saved.id ? saved : record)));
  const closeForm = () => (setEditing(null), setSaveError(null));

  const save = async (values: FormValues) => {
    const changes = fromFormValues(formFields, values);
    setSaveError(null);
    if (persist) {
      try {
        if (editing === "new") {
          const created = await persist.create(changes);
          setRecords((current) => [...current, created]);
          setNotice({ tone: "success", text: `${nameOf(created)} added.` });
        } else if (editing) {
          const updated = await persist.update(editing, changes);
          replace(updated);
          setNotice({ tone: "success", text: `${nameOf(updated)} saved.` });
        }
        setEditing(null);
      } catch (error) {
        setSaveError(messageOf(error));
      }
      return;
    }
    if (editing === "new") {
      const id = newId(String(changes[nameKey] ?? one), records.map((record) => record.id));
      setRecords((current) => [...current, { ...blank, ...changes, id } as unknown as T]);
      setNotice({ tone: "success", text: `${String(changes[nameKey])} added on this page. Saving switches on when ${many} are connected to the database.` });
    } else if (editing) {
      setRecords((current) => current.map((record) => (record.id === editing.id ? ({ ...record, ...changes } as T) : record)));
      setNotice({ tone: "success", text: `${String(changes[nameKey])} updated on this page. Saving switches on when ${many} are connected to the database.` });
    }
    setEditing(null);
  };

  const archive = async (record: T) => {
    try {
      if (persist?.archive) replace(await persist.archive(record));
      else setRecords((current) => current.map((candidate) => (candidate.id === record.id ? { ...candidate, archived: !candidate.archived } : candidate)));
      setNotice({ tone: "success", text: `${nameOf(record)} ${record.archived ? "restored" : "archived"}${persist ? "" : " on this page"}.` });
    } catch (error) {
      setNotice({ tone: "error", text: messageOf(error) });
    }
  };

  const remove = async (record: T) => {
    try {
      await persist?.remove?.(record);
      setRecords((current) => current.filter((candidate) => candidate.id !== record.id));
      setNotice({ tone: "success", text: `${nameOf(record)} deleted${persist ? "" : " on this page"}.` });
    } catch (error) {
      setNotice({ tone: "error", text: messageOf(error) });
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {stats && (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {stats(records.filter((record) => !record.archived)).map((stat) => (
            <StatTile key={stat.label} {...stat} />
          ))}
        </div>
      )}

      <GlassCard className="flex flex-col gap-3.5">
        <ListToolbar
          actions={
            <>
              <ImportDialog what={many} master={importMaster} />
              <Button size="lg" onClick={() => setEditing("new")}>
                <Plus aria-hidden="true" />
                New {one}
              </Button>
            </>
          }
        >
          <SearchField
            className="max-w-[340px] flex-[1_1_240px]"
            id={`${many.replace(/\s+/g, "-")}-search`}
            label={`Search ${many}`}
            value={query}
            onChange={setQuery}
            placeholder={`Search ${many}`}
            trailing={`${visible.length} of ${records.filter((record) => Boolean(record.archived) === showArchived).length}`}
          />
          <FilterGroup label="Show">
            <FilterChip selected={filter < 0 && !showArchived} onClick={() => (setFilter(-1), setShowArchived(false))}>
              All
            </FilterChip>
            {filters.map((option, index) => (
              <FilterChip key={option.label} selected={filter === index && !showArchived} onClick={() => (setFilter(index), setShowArchived(false))}>
                {option.label}
              </FilterChip>
            ))}
            {canArchive && (
              <FilterChip selected={showArchived} onClick={() => (setFilter(-1), setShowArchived(true))}>
                Archived
              </FilterChip>
            )}
          </FilterGroup>
        </ListToolbar>

        <GlassTable className="min-w-[720px]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.label} scope="col" className={column.align === "right" ? "text-right" : "text-left"}>
                  {column.label}
                </th>
              ))}
              {usage && (
                <th scope="col" className="text-right">
                  Used in
                </th>
              )}
              <th scope="col" className="text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="font-semibold tabular-nums">
            {visible.map((record) => {
              const used = usage?.(record) ?? 0;
              return (
                <tr key={record.id}>
                  {columns.map((column, index) => (
                    <td key={column.label} className={column.align === "right" ? "text-right" : "text-left"}>
                      {index === 0 ? (
                        <button type="button" onClick={() => setEditing(record)} className="text-left font-semibold hover:text-brand hover:underline">
                          {column.render(record)}
                        </button>
                      ) : (
                        column.render(record)
                      )}
                    </td>
                  ))}
                  {usage && <td className="text-right text-muted">{used ? `${used} documents` : "Not used"}</td>}
                  <td className="text-right whitespace-nowrap">
                    <span className="inline-flex gap-1.5">
                      {rowActions.map((action) => (
                        <IconAction key={action.label(record)} label={action.label(record)} onClick={() => action.onClick(record)}>
                          {action.icon}
                        </IconAction>
                      ))}
                      <IconAction label={`Edit ${nameOf(record)}`} onClick={() => setEditing(record)}>
                        <Pencil aria-hidden="true" className="size-4" />
                      </IconAction>
                      {canArchive && (
                        <IconAction label={record.archived ? `Restore ${nameOf(record)}` : `Archive ${nameOf(record)}`} onClick={() => void archive(record)}>
                          {record.archived ? <ArchiveRestore aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}
                        </IconAction>
                      )}
                      {canRemove && used === 0 && (
                        <IconAction label={`Delete ${nameOf(record)}`} onClick={() => void remove(record)} danger>
                          <Trash2 aria-hidden="true" className="size-4" />
                        </IconAction>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </GlassTable>
        {visible.length === 0 && <p className="py-6 text-center text-[13px] text-muted">No {many} match.</p>}
        {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
        {footnote && <p className="text-xs font-semibold text-muted">{footnote}</p>}
      </GlassCard>

      <GlassModal
        open={editing !== null}
        onOpenChange={(open) => !open && closeForm()}
        title={editing === "new" ? `New ${one}` : `Edit ${editing ? nameOf(editing) : one}`}
        description={usage && editing && editing !== "new" && usage(editing) > 0 ? `Used in ${usage(editing)} documents: archive it rather than delete.` : undefined}
      >
        {editing !== null && (
          <RecordForm
            key={editing === "new" ? "new" : editing.id}
            fields={formFields}
            error={saveError}
            initial={editing === "new" ? (blank as Record<string, unknown>) : (editing as unknown as Record<string, unknown>)}
            submitLabel={editing === "new" ? `Add ${one}` : "Save changes"}
            onSubmit={save}
            onCancel={closeForm}
          />
        )}
      </GlassModal>
    </div>
  );
}

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : "Could not save. Check the connection and try again.");

function IconAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={
          danger
            ? "glass-control glass-press flex size-9 items-center justify-center text-danger-strong hover:bg-danger-tint/80"
            : "glass-control glass-press flex size-9 items-center justify-center text-ink-soft hover:bg-white/80"
        }
      >
        {children}
      </button>
    </Tooltip>
  );
}
