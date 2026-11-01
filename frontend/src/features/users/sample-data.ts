// SAMPLE DATA for the activity log only: invented entries until the backend
// records activity. Staff accounts and roles are real (backend `staff`,
// `access-roles`).
import type { ActivityEntry } from "./types";

export const activity: ActivityEntry[] = [
  { at: "2026-10-28T09:12:00+05:30", who: "Sales Counter", action: "Created quotation", record: "QT/2627/0046" },
  { at: "2026-10-27T18:02:00+05:30", who: "Accounts Desk", action: "Recorded receipt", record: "RCT/2627/0030" },
  { at: "2026-10-27T16:40:00+05:30", who: "Admin User", action: "Changed GST rate history", record: "HSN 6810" },
  { at: "2026-10-26T11:15:00+05:30", who: "Accounts Desk", action: "Attached BRC", record: "EXP/2627/0003" },
  { at: "2026-10-24T10:05:00+05:30", who: "Accounts Desk", action: "Saved bill", record: "PUR/2627/0016" },
];
