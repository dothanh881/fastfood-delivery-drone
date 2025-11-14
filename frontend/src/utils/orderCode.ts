export function formatOrderCodeSuggestion(orderId?: number | string, dateString?: string) {
  const date = dateString ? new Date(dateString) : new Date();
  if (Number.isNaN(date.getTime())) {
    // Fallback to today if invalid date string
    const today = new Date();
    return buildCode(today, orderId);
  }
  return buildCode(date, orderId);
}

function buildCode(date: Date, orderId?: number | string) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const base = `ORD-${yyyy}${mm}${dd}`;
  if (orderId !== undefined && orderId !== null) {
    const idStr = String(orderId);
    return `${base}-${idStr.padStart(3, "0")}`;
  }
  return base;
}