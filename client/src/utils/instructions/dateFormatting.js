// UNCLEAR — timezone behaviour depends on runtime locale. new Date(dateString) parsing
// varies by environment. Verify before widening usage beyond these two callers.

export function formatDateForDB(dateString) {
  if (!dateString) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    if (dateString.includes("/")) {
      const [month, day, year] = dateString.split("/");
      if (year && month && day) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function formatDateForInput(dateString) {
  if (!dateString) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  if (dateString.includes("/")) {
    const [month, day, year] = dateString.split("/");
    if (year && month && day) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
  } catch (e) {
    // fall through
  }
  return dateString;
}
