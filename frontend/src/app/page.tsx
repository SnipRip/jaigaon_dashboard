import { redirect } from "next/navigation";
import { HOME_PATH } from "@/config/auth";

// The app has no landing page: "/" always goes to the dashboard
// (and src/proxy.ts sends signed-out visitors to /login first).
export default function RootPage() {
  redirect(HOME_PATH);
}
