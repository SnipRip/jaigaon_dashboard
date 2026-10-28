import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hsnCodes } from "@/features/hsn/sample-data";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { ItemGroupForm } from "@/features/items/item-group-form";
import { brands, categories, gstRates, itemGroups, items, units } from "@/features/items/sample-data";

type GroupParams = PageProps<"/items/groups/[groupId]">["params"];

const findGroup = (id: string) => itemGroups.find((group) => group.id === id);

export function generateStaticParams() {
  return itemGroups.map((group) => ({ groupId: group.id }));
}

export async function generateMetadata({ params }: { params: GroupParams }): Promise<Metadata> {
  return { title: findGroup((await params).groupId)?.name ?? "Item group" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function ItemGroupPage({ params }: { params: GroupParams }) {
  return (
    <Suspense>
      <ItemGroupDetail params={params} />
    </Suspense>
  );
}

async function ItemGroupDetail({ params }: { params: GroupParams }) {
  const group = findGroup((await params).groupId);
  if (!group) notFound();

  return (
    <>
      <SampleDataNotice />
      <ItemGroupForm catalog={{ categories, groups: itemGroups, items, hsnCodes }} group={group} brands={brands} units={units} gstRates={gstRates} />
    </>
  );
}
