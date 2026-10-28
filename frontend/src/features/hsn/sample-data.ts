// SAMPLE DATA for the HSN / SAC master. Codes are the chapter headings that
// fit the brochure's products and the services bought around them; the rates
// and dates are INDICATIVE ONLY and must be confirmed by the client's
// accountant against the current GST rate notifications before use.
import type { HsnCode } from "./types";

const current = (ratePct: number) => [{ ratePct, from: "2025-09-22" }];

export const hsnCodes: HsnCode[] = [
  { code: "7214", kind: "HSN", description: "Bars and rods of iron or non-alloy steel (TMT, plain rods)", rates: current(18) },
  { code: "7306", kind: "HSN", description: "Other tubes and pipes of iron or steel (MS round and square pipe)", rates: current(18) },
  { code: "7216", kind: "HSN", description: "Angles, shapes and sections of iron or steel", rates: current(18) },
  { code: "7208", kind: "HSN", description: "Flat-rolled products of iron or steel, hot-rolled (plates, chequered plate)", rates: current(18) },
  { code: "7217", kind: "HSN", description: "Wire of iron or non-alloy steel (binding wire, GI wire)", rates: current(18) },
  { code: "7317", kind: "HSN", description: "Nails, tacks and similar articles of iron or steel", rates: current(18) },
  { code: "7318", kind: "HSN", description: "Screws, bolts, nuts and washers of iron or steel", rates: current(18) },
  { code: "7325", kind: "HSN", description: "Other cast articles of iron or steel (CI manhole cover)", rates: current(18) },
  { code: "6810", kind: "HSN", description: "Articles of cement or concrete, incl. AAC and fly-ash blocks", rates: current(18) },
  { code: "6904", kind: "HSN", description: "Ceramic building bricks", rates: current(5), notes: "Brick rates have special conditions. Confirm with the accountant." },
  { code: "2517", kind: "HSN", description: "Pebbles, gravel, broken stone and stone chips", rates: current(5) },
  { code: "2518", kind: "HSN", description: "Dolomite, including powder", rates: current(5) },
  { code: "6802", kind: "HSN", description: "Worked monumental or building stone (granite, marble)", rates: current(18) },
  { code: "6907", kind: "HSN", description: "Ceramic flags, paving and floor tiles", rates: current(18) },
  { code: "7210", kind: "HSN", description: "Flat-rolled iron or steel, clad, plated or coated (PPGI, GC sheet)", rates: current(18) },
  { code: "3917", kind: "HSN", description: "Tubes, pipes and hoses of plastics (HDPE pipe)", rates: current(18) },
  { code: "4412", kind: "HSN", description: "Plywood, veneered panels and similar laminated wood", rates: current(18) },
  { code: "8302", kind: "HSN", description: "Base-metal mountings and fittings for doors", rates: current(18) },
  { code: "5607", kind: "HSN", description: "Twine, cordage and ropes (PP rope)", rates: current(18) },
  { code: "3926", kind: "HSN", description: "Other articles of plastics (tarpaulin)", rates: current(18) },
  { code: "8716", kind: "HSN", description: "Trailers and other non-powered vehicles (wheelbarrow)", rates: current(18) },
  { code: "7314", kind: "HSN", description: "Cloth, grill and netting of iron or steel wire (crusher screens)", rates: current(18) },
  { code: "8474", kind: "HSN", description: "Crushing and grinding machinery and parts (jaw plates)", rates: current(18) },
  { code: "8482", kind: "HSN", description: "Ball or roller bearings", rates: current(18) },
  { code: "4010", kind: "HSN", description: "Conveyor or transmission belts of rubber (V-belt)", rates: current(18) },
  { code: "7320", kind: "HSN", description: "Springs of iron or steel", rates: current(18) },
  {
    code: "9965",
    kind: "SAC",
    description: "Goods transport services (truck freight by a transport agency)",
    rates: current(5),
    reverseCharge: true,
    notes: "Usually under reverse charge: the transporter bills without GST and we pay it.",
  },
  { code: "9967", kind: "SAC", description: "Supporting transport services (loading, unloading, cargo handling)", rates: current(18) },
  { code: "9985", kind: "SAC", description: "Support services, incl. labour supply", rates: current(18) },
  { code: "9971", kind: "SAC", description: "Financial services (bank charges)", rates: current(18) },
  { code: "9972", kind: "SAC", description: "Real estate services (godown rent)", rates: current(18) },
];
