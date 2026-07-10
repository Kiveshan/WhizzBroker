// Request-body validation middleware built on zod. Usage:
//   router.post("/api/invoice/create", verifyToken, validate(invoiceCreateSchema), handler)
// On failure responds 400 with a readable list of issues; on success replaces
// req.body with the parsed value (schemas use .passthrough() so unknown fields
// are preserved for the models).
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.join(".") || "body"}: ${i.message}`
    );
    return res.status(400).json({
      error: "Validation failed",
      message: issues.join("; "),
      issues,
      code: "VALIDATION_ERROR",
    });
  }
  req.body = result.data;
  return next();
};

export { validate };
