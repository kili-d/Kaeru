import { GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { getRemainingPomodoros, POMODORO_ESTIMATE_OPTIONS, toPomodoroCount } from "../utils/pomodoro";
import { TomatoIcon } from "./TomatoIcon";

export function KanbanCard({
  card,
  accent,
  project,
  isDone,
  isDragging,
  isPomodoroActive,
  isPomodoroMode,
  onOpen,
  onDragStart,
  onDragEnd,
  onPomodoroEstimateChange,
  onPomodoroSelect
}) {
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [customEstimate, setCustomEstimate] = useState(card.pomodorosEstimated || "");
  const pomodorosEstimated = toPomodoroCount(card.pomodorosEstimated);
  const pomodorosRemaining = getRemainingPomodoros(card);
  const hasPomodoroWork = pomodorosRemaining > 0 && !isDone;
  const hasPomodoroEstimate = pomodorosEstimated > 0;
  const pomodorosAreComplete = hasPomodoroEstimate && pomodorosRemaining === 0;
  const canSelectForTimer = hasPomodoroWork && isPomodoroMode;
  const canOpenEstimateFromCard = isPomodoroMode && !isDone && !hasPomodoroWork;
  const cardActionLabel = canSelectForTimer
    ? ", select for Pomodoro timer"
    : canOpenEstimateFromCard
      ? ", set Pomodoro estimate"
      : "";

  useEffect(() => {
    setCustomEstimate(card.pomodorosEstimated || "");
  }, [card.pomodorosEstimated]);

  function activateCard() {
    if (canSelectForTimer) {
      onPomodoroSelect();
      return;
    }

    if (canOpenEstimateFromCard) {
      setIsPomodoroOpen(true);
      return;
    }

    onOpen();
  }

  function handleCardClick(event) {
    if (event.target.closest("button, input, form")) return;
    activateCard();
  }

  function handleCardKeyDown(event) {
    if (event.target.closest("button, input, form")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activateCard();
  }

  function updateEstimate(estimate) {
    onPomodoroEstimateChange(estimate);
    if (isPomodoroMode && !isDone && Number(estimate) > 0) {
      onPomodoroSelect();
    }
    setIsPomodoroOpen(false);
  }

  function applyCustomEstimate(event) {
    event.preventDefault();
    const parsedEstimate = toPomodoroCount(customEstimate);
    updateEstimate(parsedEstimate);
  }

  return (
    <article
      className={`kanban-card ${isDone ? "is-done" : ""} ${isDragging ? "is-dragging" : ""} ${
        isPomodoroMode && hasPomodoroWork ? "has-pomodoro-work" : ""
      } ${isPomodoroMode && !hasPomodoroWork && !isDone ? "is-pomodoro-muted" : ""} ${
        isPomodoroActive ? "is-pomodoro-active" : ""
      } ${pomodorosAreComplete ? "is-pomodoro-complete" : ""} ${canSelectForTimer ? "is-pomodoro-selectable" : ""}`}
      draggable
      role="button"
      tabIndex={0}
      aria-label={`${card.title}${cardActionLabel}`}
      aria-pressed={canSelectForTimer ? isPomodoroActive : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ "--card-accent": accent }}
    >
      <span className="card-copy">
        <span className="card-title">{card.title}</span>
        <span className="card-meta">
          {project && (
            <span className="project-pill" style={{ "--project-color": project.color }}>
              {project.name}
            </span>
          )}
          <button
            className={`card-pomodoro-button ${hasPomodoroEstimate ? "has-estimate" : ""}`}
            type="button"
            aria-label="Set Pomodoro estimate"
            aria-expanded={isPomodoroOpen}
            onClick={(event) => {
              event.stopPropagation();
              setIsPomodoroOpen((current) => !current);
            }}
          >
            <TomatoIcon size={13} />
            {hasPomodoroEstimate && (
              <span>
                {pomodorosRemaining}/{pomodorosEstimated}
              </span>
            )}
          </button>
        </span>
      </span>

      <span className="card-drag-handle" aria-hidden="true">
        <GripVertical size={15} />
      </span>

      {isPomodoroOpen && (
        <div
          className="pomodoro-popover"
          role="dialog"
          aria-label="Pomodoro estimate"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="pomodoro-options">
            {POMODORO_ESTIMATE_OPTIONS.map((option) => (
              <button
                key={option}
                className={option === pomodorosEstimated ? "is-selected" : ""}
                type="button"
                onClick={() => updateEstimate(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <form className="pomodoro-custom" onSubmit={applyCustomEstimate}>
            <input
              value={customEstimate}
              inputMode="numeric"
              min="0"
              type="number"
              aria-label="Custom Pomodoro estimate"
              placeholder="Custom"
              onChange={(event) => setCustomEstimate(event.target.value)}
            />
            <button type="submit">Set</button>
          </form>
        </div>
      )}
    </article>
  );
}
