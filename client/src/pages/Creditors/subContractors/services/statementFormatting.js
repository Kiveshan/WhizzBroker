// Shared display formatting for subcontractor statements.
//
// One place for money and dates so the screen, the PDF and the spreadsheet
// cannot disagree — they previously formatted dates as en-US on screen and in
// Excel while filenames used en-GB, so the same statement showed "Mar 5, 2026"
// and "05/03/2026" depending on where you looked.

// Dates are day-first throughout, matching South African convention.
const DATE_LOCALE = "en-ZA";

// Money keeps comma grouping with a period decimal ("R245,377.81"), which is
// what the rest of this app renders. Note this is NOT what Intl produces for
// en-ZA — that gives "R245 377,81" — so the locale is pinned separately from
// the date locale rather than sharing one constant. Change it here if the whole
// app ever moves to true en-ZA money formatting.
const MONEY_LOCALE = "en-US";

/** Rand, always with cents. */
export const formatRand = (value) =>
  `R${Number(value || 0).toLocaleString(MONEY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Long form for the statement header, e.g. "01 August 2026". */
export const formatStatementDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(DATE_LOCALE, {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
};

/** Compact form for leg rows, e.g. "05 Mar 2026". */
export const formatLegDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(DATE_LOCALE, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};
