// Backend routes of the item master. Kept apart from catalog-api.ts (which
// uses client hooks) so server components can import them.
export const CATEGORIES_PATH = "/item-categories";
export const ITEM_GROUPS_PATH = "/item-groups";
export const ITEMS_PATH = "/items";

/** Where an item's pictures are added (POST) and removed (DELETE …/:pictureId), through apiRequest. */
export const itemPicturesPath = (itemId: string) => `${ITEMS_PATH}/${itemId}/pictures`;

/** One picture for an <img>. A picture is never replaced, so the browser may cache each URL for good. */
export const itemPictureUrl = (itemId: string, pictureId: string) => `/api${itemPicturesPath(itemId)}/${pictureId}`;
