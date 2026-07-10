// Zod schemas for the financially material write endpoints that previously
// had little or no input validation. Schemas use .passthrough() so fields the
// models read but we don't explicitly validate still flow through unchanged —
// validation here is a safety net, not a whitelist.
import { z } from "zod";

// Frontend number fields often arrive as strings (or "" for untouched inputs).
// Treat ""/null/undefined as absent; anything else must coerce to a number.
const optionalNumber = (constraint = z.number()) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    constraint.optional()
  );

const requiredId = z.coerce.number().int().positive();

// POST /api/payments/:clientId/upload
export const paymentCreateSchema = z
  .object({
    fileupload: z.string().optional().nullable(),
    reference: z.string().max(255).optional().nullable(),
    line_items: z
      .array(
        z
          .object({
            type: z.enum(["Invoice", "Add-on"]),
            id: requiredId,
            amount_to_pay: z.coerce.number().positive(),
            line_date: z.string().optional().nullable(),
          })
          .passthrough()
      )
      .min(1, "At least one payment line item is required"),
  })
  .passthrough();

// POST /api/invoice/create
export const invoiceCreateSchema = z
  .object({
    m1key: requiredId,
    clientId: requiredId,
  })
  .passthrough();

// POST /api/credit-notes
export const creditNoteCreateSchema = z
  .object({
    client_id: requiredId,
    amount: z.coerce.number().positive("Credit note amount must be positive"),
    m1key: optionalNumber(z.number().int().positive()),
    doc_no: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    creditnote_date: z.string().optional().nullable(),
    account_no: z.string().max(100).optional().nullable(),
  })
  .passthrough();

// POST /save-instruction — only the pricing-relevant fields are constrained;
// the (large) remainder of the instruction payload passes through.
export const instructionSaveSchema = z
  .object({
    controllerData: z
      .object({
        num_six_meters: optionalNumber(z.number().int().nonnegative()),
        num_twelve_meters: optionalNumber(z.number().int().nonnegative()),
        num_abnormal: optionalNumber(z.number().int().nonnegative()),
        num_breakbulk: optionalNumber(z.number().int().nonnegative()),
        rateper_6: optionalNumber(z.number().nonnegative()),
        rateper_12: optionalNumber(z.number().nonnegative()),
        rateper_abnormal: optionalNumber(z.number().nonnegative()),
        rateper_breakbulk: optionalNumber(z.number().nonnegative()),
        unitrate: optionalNumber(z.number().nonnegative()),
        weight: optionalNumber(z.number().nonnegative()),
        total_cost: optionalNumber(z.number().nonnegative()),
      })
      .passthrough(),
    containerData: z.array(z.object({}).passthrough()).optional().nullable(),
    weightData: z.array(z.object({}).passthrough()).optional().nullable(),
  })
  .passthrough();
