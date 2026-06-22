import { Check, Pause, Play, RotateCcw, VolumeX } from "lucide-react";
import { TomatoIcon } from "./TomatoIcon";

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function PomodoroPanel({
  activeCard,
  activeRemaining,
  isAlertPlaying,
  isEnabled,
  isRunning,
  secondsRemaining,
  totalRemaining,
  onComplete,
  onPause,
  onReset,
  onStart,
  onStopAlert,
  onToggle
}) {
  const canStart = Boolean(activeCard && activeRemaining > 0);

  return (
    <section className={`pomodoro-panel ${isEnabled ? "is-open" : ""}`} aria-label="Pomodoro Mode">
      <button
        className={`pomodoro-toggle ${isEnabled ? "is-active" : ""}`}
        type="button"
        aria-pressed={isEnabled}
        onClick={onToggle}
      >
        <TomatoIcon size={15} />
        <span>Pomodoro Mode</span>
      </button>

      {isEnabled && (
        <div className="pomodoro-controls" role="region" aria-label="Pomodoro timer">
          <div className="pomodoro-time">
            <span className="pomodoro-clock" aria-label={`${formatTime(secondsRemaining)} remaining`}>
              {formatTime(secondsRemaining)}
            </span>
            <span className="pomodoro-task">
              {activeCard ? activeCard.title : "Select a card"}
              {activeCard && activeRemaining <= 0 ? " is complete" : ""}
            </span>
          </div>

          <div className="pomodoro-total" title="Remaining Pomodoros across open cards">
            <TomatoIcon size={14} />
            <span>{totalRemaining} remaining</span>
          </div>

          <div className="pomodoro-actions">
            <button
              className="icon-button subtle"
              type="button"
              title="Start"
              onClick={onStart}
              disabled={!canStart || isRunning}
            >
              <Play size={15} />
            </button>
            <button className="icon-button subtle" type="button" title="Pause" onClick={onPause} disabled={!isRunning}>
              <Pause size={15} />
            </button>
            <button className="icon-button subtle" type="button" title="Reset" onClick={onReset}>
              <RotateCcw size={15} />
            </button>
            {isAlertPlaying && (
              <button
                className="text-button pomodoro-stop-alert"
                type="button"
                title="Stop timer sound"
                onClick={onStopAlert}
              >
                <VolumeX size={15} />
                <span>Stop sound</span>
              </button>
            )}
            <button
              className="text-button pomodoro-complete"
              type="button"
              onClick={onComplete}
              disabled={!canStart}
            >
              <Check size={15} />
              <span>Complete Pomodoro</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
