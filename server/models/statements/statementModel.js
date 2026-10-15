import {
  listStatementPeriods,
  parseStatementKey,
  deriveStatement,
} from "./statementDerivation.js";

/**
 * Client statements are DERIVED from live data, not stored — see
 * models/statements/statementDerivation.js for the definition. These two
 * functions keep their old names and return shapes so the controllers and pages
 * are unchanged, but nothing reads the `statements` / `aging_analysis` tables
 * any more and there is no generation step.
 *
 * `year`/`month` select the month the statement COVERS. The old query filtered
 * on generation_date minus a day to undo the fact that rows were dated to the
 * following month; that correction is gone with the rows.
 */
const getClientStatements = async (clientId, { year, month } = {}) => {
  const rows = await listStatementPeriods(clientId, { year, month });
  return { success: true, data: rows };
};

/** `statementKey` is the derived "<clientId>-YYYY-MM" identifier. */
const getStatementDetails = async (statementKey) => {
  const { clientId, period } = parseStatementKey(statementKey);
  return deriveStatement(clientId, period);
};

export { getClientStatements, getStatementDetails };
