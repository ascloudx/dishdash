export function calculateDailyScore(params: {
  bookingsCompleted: number;
  actionsCompleted: number;
  missedOpportunities: number;
}) {
  const bookingPoints = Math.min(45, params.bookingsCompleted * 18);
  const actionPoints = Math.min(35, params.actionsCompleted * 12);
  const penalty = Math.min(30, params.missedOpportunities * 8);

  return Math.max(0, Math.min(100, bookingPoints + actionPoints - penalty));
}
