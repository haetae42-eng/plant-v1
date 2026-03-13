const KST_TIME_ZONE = "Asia/Seoul";

function getDateParts(date: Date): { year: string; month: string; day: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Failed to build KST date key");
  }

  return { year, month, day };
}

export function toKstDateKey(date = new Date()): string {
  const { year, month, day } = getDateParts(date);
  return `${year}-${month}-${day}`;
}

export function previousKstDateKey(date = new Date()): string {
  const kstCurrent = toKstDateKey(date);
  const [year, month, day] = kstCurrent.split("-").map((value) => Number(value));
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - 1);
  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, "0")}-${String(
    utcDate.getUTCDate()
  ).padStart(2, "0")}`;
}
