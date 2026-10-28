// "One Lakh Twelve Thousand Rupees and Fifty Paise Only": invoices print the
// total in words, in Indian numbering (crore, lakh, thousand).
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(value: number): string {
  if (value < 20) return ONES[value];
  return [TENS[Math.floor(value / 10)], ONES[value % 10]].filter(Boolean).join(" ");
}

function belowThousand(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

function wholeInWords(value: number): string {
  if (value === 0) return "Zero";
  const crore = Math.floor(value / 1_00_00_000);
  const lakh = Math.floor((value % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((value % 1_00_000) / 1000);
  const rest = value % 1000;
  return [
    crore ? `${wholeInWords(crore)} Crore` : "",
    lakh ? `${belowHundred(lakh)} Lakh` : "",
    thousand ? `${belowHundred(thousand)} Thousand` : "",
    rest ? belowThousand(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function amountInWords(amount: number, currency: "INR" | "BTN" = "INR"): string {
  const rounded = Math.round(amount * 100);
  const whole = Math.floor(rounded / 100);
  const fraction = rounded % 100;
  const [major, minor] = currency === "BTN" ? ["Ngultrum", "Chhertum"] : ["Rupees", "Paise"];
  return `${major} ${wholeInWords(whole)}${fraction ? ` and ${belowHundred(fraction)} ${minor}` : ""} Only`;
}
