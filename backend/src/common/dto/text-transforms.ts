// class-transformer helpers shared by DTOs: trim text, and turn an empty
// string into null so an optional field can be cleared.
export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Trimmed, upper case: a required code such as an LUT ARN. */
export const code = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

/** Trimmed, upper case, blank → null: GSTIN, PAN, IFSC, IEC, Udyam number. */
export const codeOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const code = value.trim().toUpperCase();
  return code === '' ? null : code;
};

export const lowerCaseEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
