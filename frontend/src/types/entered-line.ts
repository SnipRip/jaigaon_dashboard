/**
 * A document line as it was entered and is printed (backend items/line-units.ts
 * `enteredView`): any of the item's units. The line's own `quantity`, `rate`
 * and `unit` stay in the base unit for stock and cost.
 */
export interface EnteredLineView {
  unit: string;
  quantity: number;
  rate: number;
  /** Base units in one `unit`. */
  factor: number;
}
