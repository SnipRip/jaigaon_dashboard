import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { hsnCodes } from "@/features/hsn/sample-data";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { ItemActivity } from "@/features/items/item-activity";
import { ItemForm } from "@/features/items/item-form";
import { brands, categories, godowns, gstRates, itemGroups, items, sampleMovements, units } from "@/features/items/sample-data";

type ItemParams = PageProps<"/items/[itemId]">["params"];

const findItem = (id: string) => items.find((item) => item.id === id);

export function generateStaticParams() {
  return items.map((item) => ({ itemId: item.id }));
}

export async function generateMetadata({ params }: { params: ItemParams }): Promise<Metadata> {
  return { title: findItem((await params).itemId)?.name ?? "Item" };
}

// `params` is request data, so it is read inside a Suspense boundary.
export default function ItemPage({ params }: { params: ItemParams }) {
  return (
    <Suspense>
      <ItemDetail params={params} />
    </Suspense>
  );
}

async function ItemDetail({ params }: { params: ItemParams }) {
  const item = findItem((await params).itemId);
  if (!item) notFound();
  const catalog = { categories, groups: itemGroups, items, hsnCodes };

  return (
    <>
      <SampleDataNotice />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ItemForm catalog={catalog} item={item} brands={brands} units={units} godowns={godowns} gstRates={gstRates} />
        <ItemActivity catalog={catalog} item={item} movements={sampleMovements(item)} />
      </div>
    </>
  );
}
