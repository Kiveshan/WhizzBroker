/**
 * The place an instruction's containers / weight must end up.
 *
 * Normally the instruction's dropoff. Since rates are picked by title
 * (migration 015) a rate's route is optional, so a newer instruction can have
 * no dropoff at all — then the last leg's destination is the final destination.
 * Returns the dropoff unchanged (possibly empty) when there are no legs with a
 * destination either.
 */
export function finalDestination(dropoff, legs) {
  if (dropoff && String(dropoff).trim()) return dropoff;

  const withDestination = (legs || []).filter(
    (leg) => leg?.destination && String(leg.destination).trim()
  );
  if (withDestination.length === 0) return dropoff;

  return withDestination.reduce((last, leg) =>
    Number(leg.legnumber ?? 0) >= Number(last.legnumber ?? 0) ? leg : last
  ).destination;
}
