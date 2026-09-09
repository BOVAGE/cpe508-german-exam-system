export const pad = (n: number) => n.toString().padStart(2, '0');

// Converts a Date -> "yyyy-MM-ddTHH:mm" 
export const toLocalInputString = (date: Date | null): string => {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Converts "yyyy-MM-ddTHH:mm" (or any ISO string) -> Date | null
export const fromLocalInputString = (value: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};
