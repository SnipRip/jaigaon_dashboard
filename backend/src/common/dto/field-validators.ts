import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsISO8601, IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';
import { ISO_DATE_PATTERN } from '../dates.js';

// Validators for the number and code fields the masters share, so every DTO
// checks rupees, quantities, GST and HSN the same way.

/** Rupees, up to 2 decimals. */
export const IsAmount = () =>
  applyDecorators(IsNumber({ maxDecimalPlaces: 2 }), Min(0), Max(9_999_999_999));

/** Rupees that may be below zero, such as an overdraft's opening balance. */
export const IsSignedAmount = () =>
  applyDecorators(IsNumber({ maxDecimalPlaces: 2 }), Min(-9_999_999_999), Max(9_999_999_999));

/** A stock or conversion quantity, up to 3 decimals. */
export const IsQuantity = (decimals = 3) =>
  applyDecorators(IsNumber({ maxDecimalPlaces: decimals }), Min(0), Max(9_999_999_999));

/** A GST rate in percent: 0, 5, 18 … */
export const IsGstRate = () =>
  applyDecorators(IsNumber({ maxDecimalPlaces: 2 }), Min(0), Max(100));

/** A discount in percent, up to 2 decimals. The pricing rules narrow the range. */
export const IsDiscountPct = () =>
  applyDecorators(IsNumber({ maxDecimalPlaces: 2 }), Min(0), Max(100));

/** A real calendar day as YYYY-MM-DD (2026-02-30 fails). */
export const IsIsoDate = (message: string) =>
  applyDecorators(Matches(ISO_DATE_PATTERN, { message }), IsISO8601({ strict: true }, { message }));

export const HSN_PATTERN = /^\d{4,8}$/;
/** HSN as stored on an item: 4, 6 or 8 digits (exports need 8). */
export const ITEM_HSN_PATTERN = /^(\d{4}|\d{6}|\d{8})$/;

export const IsHsn = (pattern = HSN_PATTERN) =>
  applyDecorators(
    Matches(pattern, {
      message:
        pattern === ITEM_HSN_PATTERN
          ? 'HSN is 4, 6 or 8 digits; exports need all 8'
          : 'HSN is 4 to 8 digits',
    }),
  );

/** A phone number with its country code: +919635312988. */
export const IsPhone = () =>
  Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone must include the country code, for example +919635312988',
  });

/** `?includeArchived=true` on list routes. */
export class ListQueryDto {
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean;
}
