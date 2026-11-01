"use client";

import { useRouter } from "next/navigation";
import { LoadNotice } from "@/components/ui/load-notice";
import { formOptions, openingMovements, saveItem, saveItemGroup, useItemMasters, type ItemMasters } from "./catalog-api";
import { CategoriesWorkspace } from "./categories-workspace";
import { ItemActivity } from "./item-activity";
import { ItemForm } from "./item-form";
import { ItemGroupForm } from "./item-group-form";
import { GST_RATES } from "./item-rules";
import { ItemsWorkspace } from "./items-workspace";

// The item screens, each loading the item master first (catalog-api.ts).
// Pages stay server components and render one of these.

function WithMasters({ what, children }: { what: string; children: (masters: ItemMasters, reload: () => Promise<void>) => React.ReactNode }) {
  const { masters, error, reload } = useItemMasters();
  if (!masters) return <LoadNotice error={error} what={what} />;
  return children(masters, reload);
}

export function ItemsScreen() {
  return <WithMasters what="items">{(masters) => <ItemsWorkspace catalog={masters.catalog} />}</WithMasters>;
}

export function ItemCategoriesScreen() {
  return (
    <WithMasters what="categories">
      {(masters, reload) => (
        <CategoriesWorkspace masters={masters} onChanged={reload} units={formOptions(masters).units} gstRates={GST_RATES} />
      )}
    </WithMasters>
  );
}

/** A new item when `itemId` is absent. */
export function ItemScreen({ itemId }: { itemId?: string }) {
  const router = useRouter();
  return (
    <WithMasters what="the item">
      {(masters, reload) => {
        const item = itemId ? masters.catalog.items.find((candidate) => candidate.id === itemId) : undefined;
        const view = itemId ? masters.itemViews.get(itemId) : undefined;
        if (itemId && (!item || !view)) return <LoadNotice error={new Error("This item does not exist, or it is archived.")} what="the item" />;
        const form = (
          <ItemForm
            key={item?.id ?? "new"}
            catalog={masters.catalog}
            item={item}
            {...formOptions(masters)}
            gstRates={GST_RATES}
            onSave={async (values, overridden) => {
              const saved = await saveItem(masters, item, values, overridden);
              await reload();
              if (!item) router.push(`/items/${saved.id}`);
            }}
          />
        );
        if (!item || !view) return form;
        return (
          <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_360px]">
            {form}
            <ItemActivity catalog={masters.catalog} item={item} movements={openingMovements(masters, view)} />
          </div>
        );
      }}
    </WithMasters>
  );
}

/** A new item group when `groupId` is absent. */
export function ItemGroupScreen({ groupId }: { groupId?: string }) {
  const router = useRouter();
  return (
    <WithMasters what="the item group">
      {(masters, reload) => {
        const group = groupId ? masters.catalog.groups.find((candidate) => candidate.id === groupId) : undefined;
        if (groupId && !group) return <LoadNotice error={new Error("This item group does not exist, or it is archived.")} what="the item group" />;
        const { brands, units } = formOptions(masters);
        return (
          <ItemGroupForm
            key={group?.id ?? "new"}
            catalog={masters.catalog}
            group={group}
            brands={brands}
            units={units}
            gstRates={GST_RATES}
            onSave={async (values, overridden, lines) => {
              const saved = await saveItemGroup(masters, group, values, overridden, lines);
              await reload();
              if (!group) router.push(`/items/groups/${saved.id}`);
            }}
          />
        );
      }}
    </WithMasters>
  );
}
