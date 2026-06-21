export function parseDateLocal(dateStr) {
  if (!dateStr) return new Date(new Date().setHours(0, 0, 0, 0));
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  const parts = dateStr.split("-");
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function getDayOffset(startDateStr, dateStr) {
  if (!startDateStr || !dateStr) return parseFloat(dateStr) || 0;
  const startDate = parseDateLocal(startDateStr);
  const targetDate = parseDateLocal(dateStr);
  if (isNaN(startDate.getTime()) || isNaN(targetDate.getTime()))
    return parseFloat(dateStr) || 0;
  return Math.max(0, (targetDate - startDate) / (1000 * 60 * 60 * 24));
}

export function getDateFromOffset(startDateStr, offsetDays) {
  if (!startDateStr) return Math.round(offsetDays);
  const date = parseDateLocal(startDateStr);
  date.setDate(date.getDate() + offsetDays);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}
