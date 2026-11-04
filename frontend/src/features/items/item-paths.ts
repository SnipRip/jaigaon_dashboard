// Backend routes of the item master. Kept apart from catalog-api.ts (which
// uses client hooks) so server components can import them.
export const CATEGORIES_PATH = "/item-categories";
export const ITEM_GROUPS_PATH = "/item-groups";
export const ITEMS_PATH = "/items";

/** Where an item's picture is uploaded and removed (through apiRequest). */
export const itemPicturePath = (itemId: string) => `${ITEMS_PATH}/${itemId}/picture`;

/** The picture for an <img>. The version changes with the picture, so the browser may cache each URL for good. */
export const itemPictureUrl = (itemId: string, version: string) =>
  `/api${itemPicturePath(itemId)}?v=${encodeURIComponent(version)}`;
