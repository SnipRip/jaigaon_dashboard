import type { Metadata } from "next";
import { BrandsMaster } from "@/features/masters/brands-master";

export const metadata: Metadata = { title: "Brands" };

export default function BrandsPage() {
  return <BrandsMaster />;
}
