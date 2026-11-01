import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemGroupScreen } from "@/features/items/item-screens";

type GroupParams = PageProps<"/items/groups/[groupId]">["params"];

export const metadata: Metadata = { title: "Item group" };

// `params` is request data, so it is read inside a Suspense boundary.
export default function ItemGroupPage({ params }: { params: GroupParams }) {
  return (
    <Suspense>
      <ItemGroupDetail params={params} />
    </Suspense>
  );
}

async function ItemGroupDetail({ params }: { params: GroupParams }) {
  return <ItemGroupScreen groupId={(await params).groupId} />;
}
