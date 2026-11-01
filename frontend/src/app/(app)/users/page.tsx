import type { Metadata } from "next";
import { NAV_ITEMS } from "@/config/navigation";
import { activity } from "@/features/users/sample-data";
import { UsersWorkspace } from "@/features/users/users-workspace";

export const metadata: Metadata = { title: "Users & roles" };

// Staff and roles are real; only the Activity tab is still sample data and
// says so itself.
export default function UsersPage() {
  return <UsersWorkspace activity={activity} modules={NAV_ITEMS.map(({ href, label }) => ({ href, label }))} />;
}
