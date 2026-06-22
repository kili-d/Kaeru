export const DEFAULT_POMODORO_SECONDS = 25 * 60;
export const POMODORO_ESTIMATE_OPTIONS = [0, 1, 2, 3, 4, 6];

export function toPomodoroCount(value) {
  return Math.max(0, Number(value) || 0);
}

export function getRemainingPomodoros(card) {
  return Math.max(0, toPomodoroCount(card?.pomodorosEstimated) - toPomodoroCount(card?.pomodorosCompleted));
}

export function clampCompletedPomodoros(completed, estimated) {
  const estimate = toPomodoroCount(estimated);
  if (estimate === 0) return 0;
  return Math.min(toPomodoroCount(completed), estimate);
}
