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
import type { Permission, Role } from "./types";

const PERMISSIONS: Permission[] = ["view", "create", "edit", "delete"];

interface RolesMatrixProps {
  initialRoles: Role[];
  modules: { href: string; label: string }[];
}

// What each role may do in each module: a grid of ticks. Turning off "view"
// hides the module from that role's sidebar. The Owner role is fixed.
export function RolesMatrix({ initialRoles, modules }: RolesMatrixProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [roleId, setRoleId] = useState(initialRoles[1]?.id ?? initialRoles[0].id);
  const [notice, setNotice] = useState<string | null>(null);
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
        {role.locked && ". The Owner role cannot be changed."}
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
      {notice && <FormMessage tone="success">{notice}</FormMessage>}
      <Button
        className="self-start"
        disabled={role.locked}
        onClick={() => setNotice(`${role.name} changed on this page. Saving switches on when roles are connected to the backend; each request is then checked against them.`)}
      >
        Save {role.name} role
      </Button>
    </GlassCard>
  );
}
