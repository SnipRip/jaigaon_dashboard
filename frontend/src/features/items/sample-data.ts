// SAMPLE DATA for the Items screens. Categories, item names, sizes, brands,
// bag and bundle weights and blocks-per-CBM come from the company brochure
// (doc/brochure.pdf). Every price, stock figure, supplier, HSN code and GST
// rate is invented or indicative only, and must be confirmed with the
// client's accountant. Replace with backend calls when the item master is
// built.
import type { Category, Item, ItemGroup, StockMovement } from "./types";

export const categories: Category[] = [
  {
    id: "iron-steel",
    name: "Iron & Steel",
    defaults: { gstRatePct: 18, unit: "kg" },
    subCategories: [
      { id: "bars-rods", name: "Bars & rods", defaults: { hsn: "7214" } },
      { id: "pipes", name: "Pipes", defaults: { hsn: "7306" } },
      { id: "sections", name: "Structural sections", defaults: { hsn: "7216" } },
      { id: "plates-sheets", name: "Plates & sheets", defaults: { hsn: "7208" } },
      { id: "wire-nails", name: "Wire & nails", defaults: { hsn: "7217" } },
      { id: "fasteners", name: "Fasteners", defaults: { hsn: "7318", unit: "pcs" } },
      { id: "castings", name: "Castings", defaults: { hsn: "7325", unit: "pcs" } },
    ],
  },
  {
    id: "bricks-blocks",
    name: "Bricks & Blocks",
    defaults: { unit: "pcs" },
    subCategories: [
      { id: "aac-blocks", name: "AAC / fly-ash blocks", defaults: { hsn: "6810", gstRatePct: 18 } },
      { id: "red-bricks", name: "Red bricks", defaults: { hsn: "6904", gstRatePct: 5 } },
    ],
  },
  {
    id: "flooring-stone",
    name: "Flooring & Stone",
    defaults: { gstRatePct: 5 },
    subCategories: [
      { id: "stone-chips", name: "Stone chips", defaults: { hsn: "2517", unit: "bag" } },
      { id: "powders", name: "Powders", defaults: { hsn: "2518", unit: "bag" } },
      { id: "stone-slabs", name: "Granite & marble", defaults: { hsn: "6802", gstRatePct: 18, unit: "sq ft" } },
      { id: "tiles", name: "Tiles", defaults: { hsn: "6907", gstRatePct: 18, unit: "box" } },
    ],
  },
  {
    id: "hardware-plywood",
    name: "Hardware & Plywood",
    defaults: { gstRatePct: 18, unit: "pcs" },
    subCategories: [
      { id: "roofing", name: "Roofing sheets", defaults: { hsn: "7210", unit: "sheet" } },
      { id: "hdpe-pipes", name: "HDPE pipes", defaults: { hsn: "3917", unit: "m" } },
      { id: "plywood", name: "Plywood", defaults: { hsn: "4412", unit: "sheet" } },
      { id: "fittings", name: "Screws & door fittings", defaults: { hsn: "8302" } },
      { id: "ropes-covers", name: "Ropes & covers", defaults: { hsn: "5607" } },
      { id: "tools", name: "Tools & equipment", defaults: { hsn: "8716" } },
    ],
  },
  {
    id: "crusher-parts",
    name: "Crusher Parts",
    defaults: { gstRatePct: 18, unit: "pcs" },
    subCategories: [
      { id: "screens", name: "Screens", defaults: { hsn: "7314" } },
      { id: "jaw-plates", name: "Jaw plates", defaults: { hsn: "8474" } },
      { id: "bearings", name: "Bearings", defaults: { hsn: "8482" } },
      { id: "belts", name: "Belts", defaults: { hsn: "4010" } },
      { id: "springs", name: "Springs", defaults: { hsn: "7320" } },
    ],
  },
  { id: "electricals", name: "Electricals", defaults: { gstRatePct: 18 }, subCategories: [] },
  { id: "sanitary", name: "Sanitary", defaults: { gstRatePct: 18 }, subCategories: [] },
  { id: "paints", name: "Paints", defaults: { gstRatePct: 18, unit: "L" }, subCategories: [] },
];

export const brands = ["Hind TMT", "Swastik", "ISI", "Asian Paints", "Generic"];

export const units = ["kg", "ton", "pcs", "bag", "bundle", "sheet", "box", "sq ft", "cft", "CBM", "m", "L"];

export const godowns = ["Jaigaon store", "Jaigaon yard"];

/** GST slabs offered in pickers. Will come from the GST rates master. */
export const gstRates = [0, 5, 12, 18, 28, 40];

export const itemGroups: ItemGroup[] = [
  {
    id: "tmt-bar",
    name: "TMT Bar Fe 600",
    categoryId: "iron-steel",
    subCategoryId: "bars-rods",
    brand: "Hind TMT",
    description: "Fe 600 grade, 12 m length, Durgapur make",
    attributes: [{ name: "Size", options: ["8 mm", "10 mm", "12 mm", "16 mm", "20 mm", "25 mm"] }],
    defaults: {},
  },
  {
    id: "ms-plain-rod",
    name: "MS Plain Rod",
    categoryId: "iron-steel",
    subCategoryId: "bars-rods",
    brand: "ISI",
    attributes: [{ name: "Size", options: ["8 mm", "10 mm", "12 mm", "16 mm", "20 mm"] }],
    defaults: {},
  },
  {
    id: "aac-block",
    name: "AAC Block 600×200",
    categoryId: "bricks-blocks",
    subCategoryId: "aac-blocks",
    attributes: [{ name: "Thickness", options: ["125 mm", "150 mm", "200 mm", "250 mm"] }],
    defaults: {},
  },
  {
    id: "red-brick",
    name: "Red Brick 8×3×2.5 in",
    categoryId: "bricks-blocks",
    subCategoryId: "red-bricks",
    attributes: [{ name: "Class", options: ["First class", "Second class"] }],
    defaults: {},
  },
  {
    id: "mosaic-chips",
    name: "Mosaic Stone Chips",
    categoryId: "flooring-stone",
    subCategoryId: "stone-chips",
    description: "13 kg bag",
    attributes: [
      { name: "Colour", options: ["Black", "White"] },
      { name: "Grade", options: ["2B (10 mm)", "2 No. (6 mm)", "0 No. (1 mm)"] },
    ],
    defaults: {},
  },
  {
    id: "plywood",
    name: "Plywood 8×4 ft",
    categoryId: "hardware-plywood",
    subCategoryId: "plywood",
    attributes: [{ name: "Thickness", options: ["12 mm", "18 mm"] }],
    defaults: {},
  },
];

type ItemSeed = Omit<Item, "overrides" | "alternateUnits" | "reorderLevel"> &
  Partial<Pick<Item, "overrides" | "alternateUnits" | "reorderLevel">>;

const item = (seed: ItemSeed): Item => ({ overrides: {}, alternateUnits: [], reorderLevel: 0, ...seed });

// Approximate kg per 12 m bar, used for the "pcs" alternate unit.
const TMT_KG_PER_BAR: Record<string, number> = {
  "8 mm": 4.74, "10 mm": 7.4, "12 mm": 10.66, "16 mm": 18.96, "20 mm": 29.6, "25 mm": 46.2,
};
const TMT_STOCK: Record<string, number> = {
  "8 mm": 3200, "10 mm": 5400, "12 mm": 4850, "16 mm": 7200, "20 mm": 1450, "25 mm": 0,
};

const AAC: Record<string, { perCbm: number; kg: number; stock: number; price: number }> = {
  "125 mm": { perCbm: 66.7, kg: 12, stock: 420, price: 58 },
  "150 mm": { perCbm: 55.6, kg: 14.4, stock: 960, price: 68 },
  "200 mm": { perCbm: 41.7, kg: 19.2, stock: 1860, price: 92 },
  "250 mm": { perCbm: 33.3, kg: 24, stock: 610, price: 114 },
};

export const items: Item[] = [
  ...Object.entries(TMT_KG_PER_BAR).map(([size, kgPerBar]) =>
    item({
      id: `tmt-${size.replace(" mm", "")}`,
      name: `TMT Bar Fe 600 ${size}`,
      sku: `IS-TMT-${size.replace(" mm", "")}`,
      categoryId: "iron-steel",
      subCategoryId: "bars-rods",
      groupId: "tmt-bar",
      attributeValues: { Size: size },
      brand: "Hind TMT",
      alternateUnits: [{ unit: "pcs", baseQuantity: kgPerBar }, { unit: "ton", baseQuantity: 1000 }],
      mrp: 64,
      sellingPrice: 60.5,
      minSellingPrice: 55,
      costPrice: 52.4,
      preferredSupplier: "Hind Steel, Durgapur",
      stock: TMT_STOCK[size],
      reorderLevel: 2500,
    }),
  ),
  ...["8 mm", "10 mm", "12 mm", "16 mm", "20 mm"].map((size, index) =>
    item({
      id: `rod-${size.replace(" mm", "")}`,
      name: `MS Plain Rod ${size}`,
      sku: `IS-ROD-${size.replace(" mm", "")}`,
      categoryId: "iron-steel",
      subCategoryId: "bars-rods",
      groupId: "ms-plain-rod",
      attributeValues: { Size: size },
      brand: "ISI",
      alternateUnits: [{ unit: "ton", baseQuantity: 1000 }],
      sellingPrice: 58,
      costPrice: 50.2,
      stock: [900, 1300, 650, 400, 220][index],
      reorderLevel: 500,
    }),
  ),
  ...Object.entries(AAC).map(([thickness, block]) =>
    item({
      id: `aac-${thickness.replace(" mm", "")}`,
      name: `AAC Block 600×200×${thickness.replace(" mm", "")}`,
      sku: `BR-AAC-${thickness.replace(" mm", "")}`,
      categoryId: "bricks-blocks",
      subCategoryId: "aac-blocks",
      groupId: "aac-block",
      attributeValues: { Thickness: thickness },
      alternateUnits: [{ unit: "CBM", baseQuantity: block.perCbm }],
      weightKg: block.kg,
      mrp: Math.round(block.price * 1.08),
      sellingPrice: block.price,
      minSellingPrice: Math.round(block.price * 0.88),
      costPrice: Math.round(block.price * 0.8),
      stock: block.stock,
      reorderLevel: 800,
    }),
  ),
  ...["First class", "Second class"].map((grade, index) =>
    item({
      id: `brick-${index + 1}`,
      name: `Red Brick ${grade}`,
      sku: `BR-RED-${index + 1}`,
      categoryId: "bricks-blocks",
      subCategoryId: "red-bricks",
      groupId: "red-brick",
      attributeValues: { Class: grade },
      alternateUnits: [{ unit: "thousand", baseQuantity: 1000 }],
      weightKg: 2.5,
      sellingPrice: index === 0 ? 11.5 : 9,
      costPrice: index === 0 ? 9.2 : 7.1,
      stock: index === 0 ? 18000 : 6500,
      reorderLevel: 10000,
    }),
  ),
  ...["Black", "White"].flatMap((colour) =>
    ["2B (10 mm)", "2 No. (6 mm)", "0 No. (1 mm)"].map((grade) =>
      item({
        id: `chips-${colour.toLowerCase()}-${grade.split(" ")[0].toLowerCase()}`,
        name: `${colour} Mosaic Chips ${grade}`,
        sku: `FL-MC-${colour[0]}${grade.split(" ")[0].replace(".", "")}`,
        categoryId: "flooring-stone",
        subCategoryId: "stone-chips",
        groupId: "mosaic-chips",
        attributeValues: { Colour: colour, Grade: grade },
        alternateUnits: [{ unit: "kg", baseQuantity: 1 / 13 }],
        weightKg: 13,
        sellingPrice: colour === "White" ? 340 : 290,
        costPrice: colour === "White" ? 270 : 228,
        stock: colour === "White" && grade.startsWith("0") ? 8 : 120,
        reorderLevel: 40,
      }),
    ),
  ),
  ...["12 mm", "18 mm"].map((thickness) =>
    item({
      id: `ply-${thickness.replace(" mm", "")}`,
      name: `Plywood 8×4 ft ${thickness}`,
      sku: `HW-PLY-${thickness.replace(" mm", "")}`,
      categoryId: "hardware-plywood",
      subCategoryId: "plywood",
      groupId: "plywood",
      attributeValues: { Thickness: thickness },
      alternateUnits: [{ unit: "sq ft", baseQuantity: 1 / 32 }],
      mrp: thickness === "18 mm" ? 2650 : 1980,
      sellingPrice: thickness === "18 mm" ? 2480 : 1850,
      costPrice: thickness === "18 mm" ? 2090 : 1560,
      stock: thickness === "18 mm" ? 240 : 45,
      reorderLevel: 60,
    }),
  ),
  item({ id: "angle-50", name: "MS Angle 50×50×6", sku: "IS-ANG-5056", categoryId: "iron-steel", subCategoryId: "sections", brand: "ISI", sellingPrice: 66, costPrice: 58.9, stock: 2140, reorderLevel: 1000 }),
  item({ id: "channel-100", name: "MS Channel 100×50", sku: "IS-CH-100", categoryId: "iron-steel", subCategoryId: "sections", brand: "ISI", sellingPrice: 67, costPrice: 59.4, stock: 1380, reorderLevel: 800 }),
  item({ id: "joist-150", name: "MS Beam / Joist 150×75", sku: "IS-JST-150", categoryId: "iron-steel", subCategoryId: "sections", brand: "ISI", sellingPrice: 69, costPrice: 61, stock: 620, reorderLevel: 800 }),
  item({ id: "round-pipe-40", name: "MS Round Pipe 40 NB", sku: "IS-RP-40", categoryId: "iron-steel", subCategoryId: "pipes", brand: "ISI", sellingPrice: 72, costPrice: 63.5, stock: 980, reorderLevel: 500 }),
  item({ id: "square-pipe-40", name: "MS Square Pipe 40×40", sku: "IS-SP-40", categoryId: "iron-steel", subCategoryId: "pipes", brand: "ISI", sellingPrice: 73, costPrice: 64, stock: 410, reorderLevel: 500 }),
  item({ id: "plate-6", name: "MS Plate 6 mm", sku: "IS-PL-6", categoryId: "iron-steel", subCategoryId: "plates-sheets", brand: "ISI", sellingPrice: 68, costPrice: 60.2, stock: 1750, reorderLevel: 600 }),
  item({ id: "chequered-5", name: "Chequered Plate 5 mm", sku: "IS-CP-5", categoryId: "iron-steel", subCategoryId: "plates-sheets", brand: "ISI", sellingPrice: 71, costPrice: 62.8, stock: 530, reorderLevel: 400 }),
  item({ id: "binding-wire", name: "Binding Wire 22 G", sku: "IS-BW-22", categoryId: "iron-steel", subCategoryId: "wire-nails", overrides: { unit: "bundle" }, alternateUnits: [{ unit: "kg", baseQuantity: 1 / 25 }], weightKg: 25, mrp: 2150, sellingPrice: 2020, minSellingPrice: 1900, costPrice: 1780, stock: 12, reorderLevel: 20 }),
  item({ id: "wire-nail", name: "Wire Nail, assorted", sku: "IS-WN-25", categoryId: "iron-steel", subCategoryId: "wire-nails", overrides: { hsn: "7317", unit: "bag" }, alternateUnits: [{ unit: "kg", baseQuantity: 1 / 25 }], weightKg: 25, mrp: 2400, sellingPrice: 2250, costPrice: 1935, stock: 96, reorderLevel: 30 }),
  item({ id: "gi-wire", name: "GI Wire, hot dip", sku: "IS-GI-HD", categoryId: "iron-steel", subCategoryId: "wire-nails", sellingPrice: 86, costPrice: 74, stock: 640, reorderLevel: 300 }),
  item({ id: "nut-bolt", name: "Nut Bolt with Washer M16", sku: "IS-NB-M16", categoryId: "iron-steel", subCategoryId: "fasteners", sellingPrice: 18, costPrice: 13.5, stock: 4200, reorderLevel: 1000 }),
  item({ id: "manhole-cover", name: "CI Manhole Cover, medium duty", sku: "IS-MH-MD", categoryId: "iron-steel", subCategoryId: "castings", brand: "Swastik", weightKg: 65, sellingPrice: 4850, costPrice: 4100, stock: 14, reorderLevel: 10 }),
  item({ id: "dolomite", name: "Dolomite Powder", sku: "FL-DOL-50", categoryId: "flooring-stone", subCategoryId: "powders", alternateUnits: [{ unit: "kg", baseQuantity: 1 / 50 }], weightKg: 50, sellingPrice: 420, costPrice: 345, stock: 210, reorderLevel: 80 }),
  item({ id: "ppgi-sheet", name: "PPGI Sheet 0.45 mm, 10 ft", sku: "HW-PPGI-10", categoryId: "hardware-plywood", subCategoryId: "roofing", sellingPrice: 1480, costPrice: 1260, stock: 150, reorderLevel: 50 }),
  item({ id: "hdpe-63", name: "HDPE Pipe 63 mm", sku: "HW-HDPE-63", categoryId: "hardware-plywood", subCategoryId: "hdpe-pipes", sellingPrice: 118, costPrice: 96, stock: 900, reorderLevel: 300 }),
  item({ id: "tarpaulin", name: "Plastic Tarpaulin 18×24 ft", sku: "HW-TARP-1824", categoryId: "hardware-plywood", subCategoryId: "ropes-covers", overrides: { hsn: "3926" }, sellingPrice: 1650, costPrice: 1320, stock: 35, reorderLevel: 20 }),
  item({ id: "wheelbarrow", name: "Wheel Barrow, single wheel", sku: "HW-WB-1", categoryId: "hardware-plywood", subCategoryId: "tools", sellingPrice: 3400, costPrice: 2850, stock: 0, reorderLevel: 5 }),
  item({ id: "jaw-plate", name: "Crusher Jaw Plate, fixed", sku: "CR-JP-F", categoryId: "crusher-parts", subCategoryId: "jaw-plates", weightKg: 310, sellingPrice: 38500, costPrice: 32600, stock: 4, reorderLevel: 2 }),
  item({ id: "v-belt", name: "V-Belt C-120", sku: "CR-VB-C120", categoryId: "crusher-parts", subCategoryId: "belts", sellingPrice: 1250, costPrice: 980, stock: 22, reorderLevel: 10 }),
];

/** Recent stock movements for the item page's activity section. */
export function sampleMovements(target: Item): StockMovement[] {
  const opening = Math.round(target.stock * 0.6);
  return [
    { date: "2026-04-01", kind: "Opening", reference: "Opening stock", quantity: opening, rate: target.costPrice },
    { date: "2026-09-18", kind: "Purchase", reference: "PUR-2609-014", party: target.preferredSupplier ?? "Bhoomi And Buildings Pvt Ltd", quantity: Math.round(target.stock * 0.7), rate: target.costPrice },
    { date: "2026-10-06", kind: "Sale", reference: "INV-2610-031", party: "Tashi Construction, Thimphu", quantity: -Math.round(target.stock * 0.25), rate: target.sellingPrice },
    { date: "2026-10-21", kind: "Sale", reference: "INV-2610-058", party: "Druk Builders, Phuentsholing", quantity: -Math.round(target.stock * 0.05), rate: target.sellingPrice },
  ];
}
