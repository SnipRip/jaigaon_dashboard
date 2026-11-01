import type { Metadata } from "next";
import { Suspense } from "react";
import { ItemScreen } from "@/features/items/item-screens";

type ItemParams = PageProps<"/items/[itemId]">["params"];

export const metadata: Metadata = { title: "Item" };

// `params` is request data, so it is read inside a Suspense boundary.
export default function ItemPage({ params }: { params: ItemParams }) {
  return (
    <Suspense>
      <ItemDetail params={params} />
    </Suspense>
  );
}

async function ItemDetail({ params }: { params: ItemParams }) {
  return <ItemScreen itemId={(await params).itemId} />;
}
