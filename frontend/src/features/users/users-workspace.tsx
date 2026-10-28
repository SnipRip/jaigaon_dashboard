"use client";

import { useState } from "react";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { StatusChip } from "@/components/ui/status-chip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ViewTabs } from "@/components/ui/view-tabs";
import { RecordMaster } from "@/features/masters/record-master";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { RolesMatrix } from "./roles-matrix";
import type { ActivityEntry, Role, StaffUser } from "./types";

type Tab = "users" | "roles" | "activity";

const TABS: { value: Tab; label: string }[] = [
  { value: "users", label: "Staff" },
  { value: "roles", label: "Roles and permissions" },
  { value: "activity", label: "Activity" },
];

const STATUS = {
  active: { tone: "success", text: "Active" },
  invited: { tone: "brand", text: "Invited" },
  disabled: { tone: "neutral", text: "Disabled" },
} as const;

interface UsersWorkspaceProps {
  users: StaffUser[];
  roles: Role[];
  activity: ActivityEntry[];
  modules: { href: string; label: string }[];
}

// Users & roles (SOW 18): staff accounts, what each role may do, and who did
// what. Each person signs in with their own account; nobody shares one.
export function UsersWorkspace({ users, roles, activity, modules }: UsersWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("users");
  const roleName = (id: string) => roles.find((role) => role.id === id)?.name ?? id;
  const userName = (id: string) => users.find((user) => user.id === id)?.displayName ?? id;

  return (
    <div className="flex flex-col gap-3.5">
      <ViewTabs label="Users views" tabs={TABS} value={tab} onChange={setTab} />

      {tab === "users" && (
        <RecordMaster<StaffUser>
          noun={["user", "staff"]}
          initialRecords={users}
          nameKey="displayName"
          blank={{ status: "invited", roleId: "sales" }}
          fields={[
            { key: "displayName", label: "Name", kind: "text", required: true },
            { key: "email", label: "Email (signs in with it)", kind: "text", required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
            { key: "phone", label: "Phone", kind: "text", pattern: /^\+?\d{10,13}$/, message: "10 to 13 digits" },
            { key: "roleId", label: "Role", kind: "select", required: true, options: roles.map((role) => ({ value: role.id, label: `${role.name}: ${role.description}` })) },
            {
              key: "status",
              label: "Account",
              kind: "select",
              required: true,
              options: [
                { value: "invited", label: "Invited: sets a password on first sign-in" },
                { value: "active", label: "Active" },
                { value: "disabled", label: "Disabled: cannot sign in" },
              ],
            },
          ]}
          columns={[
            {
              label: "Name",
              render: (user) => (
                <span className="inline-flex items-center gap-2.5">
                  <UserAvatar name={user.displayName} className="size-8 text-xs" />
                  {user.displayName}
                </span>
              ),
            },
            { label: "Email", render: (user) => <span className="text-ink-soft">{user.email}</span> },
            { label: "Role", render: (user) => roleName(user.roleId) },
            { label: "Status", render: (user) => <StatusChip tone={STATUS[user.status].tone}>{STATUS[user.status].text}</StatusChip> },
            { label: "Last seen", render: (user) => (user.lastSeen ? formatDateTime(user.lastSeen) : "Never") },
          ]}
          searchText={(user) => `${user.displayName} ${user.email} ${roleName(user.roleId)}`}
          filters={roles.map((role) => ({ label: role.name, test: (user: StaffUser) => user.roleId === role.id }))}
          stats={(records) => [
            { label: "Staff", value: formatQuantity(records.length) },
            { label: "Active", value: formatQuantity(records.filter((user) => user.status === "active").length) },
            { label: "Invited, not signed in", value: formatQuantity(records.filter((user) => user.status === "invited").length) },
            { label: "Roles", value: formatQuantity(roles.length) },
          ]}
          importColumns={["Name", "Email", "Phone", "Role"]}
          footnote="Invitations are emailed once accounts are created through the backend. Your own profile and password are under Settings."
        />
      )}

      {tab === "roles" && <RolesMatrix initialRoles={roles} modules={modules} />}

      {tab === "activity" && (
        <GlassCard className="flex flex-col gap-3">
          <CardTitle>Activity</CardTitle>
          <GlassTable className="min-w-[620px]">
            <thead>
              <tr>
                <th scope="col" className="text-left">When</th>
                <th scope="col" className="text-left">Who</th>
                <th scope="col" className="text-left">What</th>
                <th scope="col" className="text-left">Record</th>
              </tr>
            </thead>
            <tbody className="font-semibold">
              {activity.map((entry, index) => (
                <tr key={index}>
                  <td>{formatDateTime(entry.at)}</td>
                  <td className="font-semibold">{userName(entry.userId)}</td>
                  <td>{entry.action}</td>
                  <td>{entry.record ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
          <p className="text-xs font-semibold text-muted">Every save, delete and sign-in is logged once the backend records activity.</p>
        </GlassCard>
      )}
    </div>
  );
}
