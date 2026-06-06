import { format, subDays, differenceInCalendarDays } from 'date-fns';

export function getCurrentStreak(log) {
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = format(d, 'yyyy-MM-dd');
    if (log[key] === 'complete') {
      streak++;
      d = subDays(d, 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getMonthDays(year, month) {
  // Returns array of {date, status} for the month
  const days = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const key = format(dt, 'yyyy-MM-dd');
    days.push({ date: dt, key, day: d });
  }
  return days;
}

export const STREAK_BADGES = [
  { days: 3, label: '3 DAY SPRINT', icon: '🥉', color: '#CD7F32' },
  { days: 5, label: '5 DAY STREAK', icon: '🥈', color: '#C0C0C0' },
  { days: 10, label: '10 DAY ELITE', icon: '🥇', color: '#FFD700' },
  { days: 15, label: '15 DAY LEGEND', icon: '💎', color: '#00CFFF' },
  { days: 20, label: '20 DAY TITAN', icon: '🔥', color: '#FF6D00' },
  { days: 25, label: '25 DAY ULTRA', icon: '⚡', color: '#9B5DE5' },
  { days: 30, label: '30 DAY MASTER', icon: '🌟', color: '#00FF88' },
  { days: 365, label: '1 YEAR PILOT', icon: '✈️', color: '#FFB800' },
  { days: 365 * 2, label: '2 YEAR CAPTAIN', icon: '🛩️', color: '#FF3B5C' },
];

export function getAchievedBadges(streak) {
  return STREAK_BADGES.filter((b) => streak >= b.days);
}
