/**
 * 「显示前几天」(calendar.show.previous.days). The agenda lists one section per day, and this grows
 * it backwards from the selected day by a fixed step, so each press reveals a few more days rather
 * than jumping a whole month.
 */
export const PREVIOUS_DAYS_STEP = 3;

export function revealPreviousDays(shown: number): number {
  return shown + PREVIOUS_DAYS_STEP;
}

/** The days to list, oldest first, ending on the selected day. */
export function agendaDays(selected: Date, shown: number): Date[] {
  const days: Date[] = [];
  for (let offset = shown; offset >= 0; offset--) {
    const day = new Date(selected);
    day.setDate(day.getDate() - offset);
    days.push(day);
  }
  return days;
}
