interface DailyActionLike {
  date: string;
  executedActionIds: string[];
}

export function calculateStreak(entries: DailyActionLike[]) {
  const sorted = [...entries]
    .filter((entry) => entry.executedActionIds.length > 0)
    .sort((left, right) => right.date.localeCompare(left.date));

  if (sorted.length === 0) {
    return 0;
  }

  let streak = 1;

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = new Date(`${sorted[index].date}T12:00:00.000Z`);
    const next = new Date(`${sorted[index + 1].date}T12:00:00.000Z`);
    const diffDays = Math.round((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}
