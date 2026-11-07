"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterGroup } from "@/components/ui/filter-group";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { ApiError } from "@/lib/api-client";
import { saveRolePermissions } from "./staff-api";
import type { Permission, Role } from "./types";

const PERMISSIONS: Permission[] = ["view", "create", "edit", "delete"];

interface RolesMatrixProps {
  initialRoles: Role[];
  modules: { href: string; label: string }[];
  onSaved?: () => void;
}

// What each role may do in each module: a grid of ticks. Saved roles are
// checked by the backend on every request. The Administrator role is fixed.
export function RolesMatrix({ initialRoles, modules, onSaved }: RolesMatrixProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [roleId, setRoleId] = useState(initialRoles[1]?.id ?? initialRoles[0].id);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const role = roles.find((candidate) => candidate.id === roleId)!;

  const toggle = (href: string, permission: Permission) => {
    if (role.locked) return;
    setRoles((current) =>
      current.map((candidate) => {
        if (candidate.id !== role.id) return candidate;
        const held = candidate.access[href] ?? [];
        let next = held.includes(permission) ? held.filter((value) => value !== permission) : [...held, permission];
        // Anything beyond viewing needs view; dropping view drops the rest.
        if (permission === "view" && !next.includes("view")) next = [];
        if (permission !== "view" && next.includes(permission) && !next.includes("view")) next = ["view", ...next];
        return { ...candidate, access: { ...candidate.access, [href]: next } };
      }),
    );
    setNotice(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveRolePermissions(role, role.access);
      setRoles((current) => current.map((candidate) => (candidate.id === saved.id ? saved : candidate)));
      const count = saved.userCount ?? 0;
      setNotice({ tone: "success", text: `${saved.name} saved. It applies to its ${count} ${count === 1 ? "user" : "users"} from their next click.` });
      onSaved?.();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "Could not save the role. Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="flex flex-col gap-3.5">
      <CardTitle>Roles and permissions</CardTitle>
      <FilterGroup label="Role">
        {roles.map((candidate) => (
          <FilterChip key={candidate.id} selected={candidate.id === roleId} onClick={() => setRoleId(candidate.id)}>
            {candidate.name}
          </FilterChip>
        ))}
      </FilterGroup>
      <p className="-mt-1 text-sm font-medium text-muted">
        {role.description}
        {role.locked && ". The Administrator role cannot be changed."}
      </p>
      <GlassTable className="min-w-[560px]">
        <thead>
          <tr>
            <th scope="col" className="text-left">Module</th>
            {PERMISSIONS.map((permission) => (
              <th key={permission} scope="col" className="text-center capitalize">
                {permission}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-semibold">
          {modules.map((module) => (
            <tr key={module.href}>
              <td className="font-semibold">{module.label}</td>
              {PERMISSIONS.map((permission) => {
                const on = (role.access[module.href] ?? []).includes(permission);
                return (
                  <td key={permission} className="text-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${role.name} may ${permission} in ${module.label}`}
                      disabled={role.locked}
                      onClick={() => toggle(module.href, permission)}
                      className={clsx(
                        "inline-flex size-[18px] items-center justify-center rounded border disabled:cursor-not-allowed",
                        on ? "border-brand bg-brand text-white" : "border-ink/30 bg-white text-transparent hover:border-ink/50",
                      )}
                    >
                      <Check aria-hidden="true" strokeWidth={3} className="size-3" />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </GlassTable>
      {notice && <FormMessage tone={notice.tone} result={notice}>{notice.text}</FormMessage>}
      <Button className="self-start" disabled={role.locked || saving} onClick={() => void save()}>
        {saving ? "Saving…" : `Save ${role.name} role`}
      </Button>
    </GlassCard>
  );
}
