/**
 * The fields an update DTO actually carries. class-transformer leaves a key
 * set to undefined for every field with a @Transform, so spreading the DTO
 * would wipe stored values. Null stays: it clears an optional field.
 */
export const definedFields = <T extends object>(dto: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
