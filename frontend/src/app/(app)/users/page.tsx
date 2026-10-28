import type { Metadata } from "next";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { NAV_ITEMS } from "@/config/navigation";
import { activity, roles, staff } from "@/features/users/sample-data";
import { UsersWorkspace } from "@/features/users/users-workspace";

export const metadata: Metadata = { title: "Users & roles" };

export default function UsersPage() {
  return (
    <>
      <SampleDataNotice />
      <UsersWorkspace users={staff} roles={roles} activity={activity} modules={NAV_ITEMS.map(({ href, label }) => ({ href, label }))} />
    </>
  );
}
