import type { Metadata } from "next";
import { GodownsMaster } from "@/features/masters/godowns-master";

export const metadata: Metadata = { title: "Godowns" };

export default function GodownsPage() {
  return <GodownsMaster />;
}
