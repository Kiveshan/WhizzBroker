// Before/after change lists for the audit trail.
//
// A raw request body says what the page *sent*, not what actually changed —
// and the audit viewer needs the latter in plain words: "Pickup: A → B",
// "6m rate: R1,958.00 → R0.00". These helpers compare two snapshots of a
// record and return a list of changes that auditTrail.js stores on the row
// (metadata.changes) and the viewer renders as-is.
//
// Change item shape:
//   { field, label, from, to, zeroed? }
//   from/to are display strings (already formatted); zeroed marks a money value
//   that dropped from something to R0, which the viewer highlights.

// Formatted by hand rather than toLocaleString: the stored text must read the
// same whatever locale data the server's Node build ships with.
const formatMoney = (value) => {
  const [whole, fraction] = Math.abs(Number(value || 0)).toFixed(2).split(".");
  const sign = Number(value) < 0 ? "-" : "";
  return `${sign}R${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
};

const cents = (value) => Math.round(Number(value || 0) * 100);

const text = (value) =>
  value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);

// Instruction fields worth reporting, in display order. `kind` decides how a
// value is compared and formatted.
const INSTRUCTION_FIELDS = [
  { field: "client", label: "Client", kind: "lookup", lookup: "clients" },
  { field: "shipment_type", label: "Shipment type", kind: "lookup", lookup: "shipmentTypes" },
  { field: "pickup", label: "Pickup", kind: "text" },
  { field: "dropoff", label: "Drop-off", kind: "text" },
  { field: "status", label: "Status", kind: "text" },
  { field: "rate_title", label: "Rate", kind: "text" },
  { field: "rateweight", label: "Rate unit", kind: "text" },
  { field: "num_six_meters", label: "6m containers", kind: "count" },
  { field: "num_twelve_meters", label: "12m containers", kind: "count" },
  { field: "num_abnormal", label: "Abnormal containers", kind: "count" },
  { field: "rateper_6", label: "6m rate", kind: "money" },
  { field: "rateper_12", label: "12m rate", kind: "money" },
  { field: "rateper_abnormal", label: "Abnormal rate", kind: "money" },
  { field: "unitrate", label: "Unit rate", kind: "money" },
  { field: "is_set_rate", label: "Set rate", kind: "bool" },
  { field: "historical_set_rate", label: "Set rate amount", kind: "money" },
  { field: "vat", label: "VAT %", kind: "count" },
  { field: "total_cost", label: "Total cost", kind: "money" },
  { field: "clientFileRef", label: "Client file ref", kind: "text" },
  { field: "ksmFileRef", label: "File ref", kind: "text" },
  { field: "booking_ref", label: "Booking ref", kind: "text" },
  { field: "vessel_name", label: "Vessel", kind: "text" },
];

const compareField = ({ field, label, kind, lookup }, before, after, lookups) => {
  const a = before?.[field];
  const b = after?.[field];

  switch (kind) {
    case "money":
      if (cents(a) === cents(b)) return null;
      return {
        field,
        label,
        from: formatMoney(a),
        to: formatMoney(b),
        ...(cents(a) > 0 && cents(b) === 0 ? { zeroed: true } : {}),
      };
    case "count":
      if (Number(a || 0) === Number(b || 0)) return null;
      return { field, label, from: String(Number(a || 0)), to: String(Number(b || 0)) };
    case "bool":
      if (Boolean(a) === Boolean(b)) return null;
      return { field, label, from: a ? "Yes" : "No", to: b ? "Yes" : "No" };
    case "lookup": {
      if (String(a ?? "") === String(b ?? "")) return null;
      const names = lookups?.[lookup] || {};
      return { field, label, from: text(names[a] ?? a), to: text(names[b] ?? b) };
    }
    default:
      // Text is compared exactly: a stray space in a route name is a real
      // difference (it breaks the exact-match rate lookup), so it is reported.
      if ((a ?? "") === (b ?? "")) return null;
      return { field, label, from: text(a), to: text(b) };
  }
};

// Container rows are matched on containerkey, so a renumbered container reads
// as "number changed" rather than one removed plus one added.
const CONTAINER_AMOUNTS = [
  { field: "Surcharge Amount", label: "surcharge" },
  { field: "surcharge_12m_amount", label: "12m surcharge" },
  { field: "Hazardous Amount", label: "hazardous" },
  { field: "vgm amount", label: "VGM" },
];

const containerLabel = (c) =>
  text(c?.containernum) + (c?.container_type ? ` (${c.container_type})` : "");

const diffContainers = (beforeRows = [], afterRows = []) => {
  const changes = [];
  const beforeByKey = new Map(beforeRows.map((c) => [c.containerkey, c]));
  const afterByKey = new Map(afterRows.map((c) => [c.containerkey, c]));

  for (const [key, before] of beforeByKey) {
    if (!afterByKey.has(key)) {
      changes.push({ field: "container", label: "Container removed", from: containerLabel(before), to: "—" });
    }
  }
  for (const [key, after] of afterByKey) {
    const before = beforeByKey.get(key);
    if (!before) {
      changes.push({ field: "container", label: "Container added", from: "—", to: containerLabel(after) });
      continue;
    }
    const name = text(after.containernum || before.containernum);
    if ((before.containernum ?? "") !== (after.containernum ?? "")) {
      changes.push({ field: "container", label: "Container number", from: text(before.containernum), to: text(after.containernum) });
    }
    if ((before.container_type ?? "") !== (after.container_type ?? "")) {
      changes.push({ field: "container", label: `${name} type`, from: text(before.container_type), to: text(after.container_type) });
    }
    for (const { field, label } of CONTAINER_AMOUNTS) {
      if (cents(before[field]) !== cents(after[field])) {
        changes.push({
          field: "container",
          label: `${name} ${label}`,
          from: formatMoney(before[field]),
          to: formatMoney(after[field]),
          ...(cents(before[field]) > 0 && cents(after[field]) === 0 ? { zeroed: true } : {}),
        });
      }
    }
  }
  return changes;
};

/**
 * Compare two snapshots of an instruction (m1_controller rows plus their
 * container rows). `lookups` maps ids to display names for lookup fields:
 * { clients: { 7: "AGL" }, shipmentTypes: { 2: "Export" } }.
 */
export const diffInstruction = ({ before, after, beforeContainers, afterContainers, lookups }) => [
  ...INSTRUCTION_FIELDS.map((f) => compareField(f, before, after, lookups)).filter(Boolean),
  ...diffContainers(beforeContainers, afterContainers),
];

/**
 * One line for the log table: the most important changes first (anything that
 * dropped to R0), then the rest, capped so the row stays readable.
 */
export const summariseChanges = (changes, max = 3) => {
  if (!changes?.length) return "No changes";
  const ordered = [...changes.filter((c) => c.zeroed), ...changes.filter((c) => !c.zeroed)];
  const shown = ordered.slice(0, max).map((c) => `${c.label}: ${c.from} → ${c.to}`);
  const extra = ordered.length - shown.length;
  return shown.join("; ") + (extra > 0 ? `; +${extra} more` : "");
};
