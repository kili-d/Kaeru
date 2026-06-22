import { useMemo, useState } from "react";
import { clampCompletedPomodoros, getRemainingPomodoros, toPomodoroCount } from "../utils/pomodoro";
import { KanbanColumn } from "./KanbanColumn";
import { PomodoroPanel } from "./PomodoroPanel";

export function KanbanBoard({
  columns,
  cards,
  projects,
  defaultProjectId,
  activePomodoroCard,
  activePomodoroCardId,
  activePomodoroRemaining,
  isPomodoroAlertPlaying,
  isPomodoroMode,
  isPomodoroRunning,
  pomodoroSecondsRemaining,
  totalRemainingPomodoros,
  onCardOpen,
  onCardCompleted,
  onPomodoroCardSelect,
  onPomodoroComplete,
  onPomodoroPause,
  onPomodoroReset,
  onPomodoroStart,
  onPomodoroStopAlert,
  onPomodoroToggle,
  dispatch
}) {
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [draggedColumnId, setDraggedColumnId] = useState(null);
  const [overColumnId, setOverColumnId] = useState(null);
  const doneColumnId = columns[columns.length - 1]?.id;

  const cardsByColumn = useMemo(() => {
    return columns.reduce((groups, column) => {
      groups[column.id] = cards
        .filter((card) => card.status === column.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt - b.createdAt);
      return groups;
    }, {});
  }, [cards, columns]);

  const projectById = useMemo(() => {
    return projects.reduce((map, project) => {
      map[project.id] = project;
      return map;
    }, {});
  }, [projects]);

  const columnPomodoroTotals = useMemo(() => {
    return columns.reduce((totals, column) => {
      totals[column.id] =
        column.id === doneColumnId
          ? 0
          : cards
              .filter((card) => card.status === column.id)
              .reduce((total, card) => total + getRemainingPomodoros(card), 0);
      return totals;
    }, {});
  }, [cards, columns, doneColumnId]);

  function updateCardPomodoros(cardId, estimatedPomodoros) {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;

    const pomodorosEstimated = toPomodoroCount(estimatedPomodoros);
    const pomodorosCompleted = clampCompletedPomodoros(card.pomodorosCompleted, pomodorosEstimated);

    dispatch({
      type: "card/update",
      payload: {
        cardId,
        patch: {
          pomodorosCompleted,
          pomodorosEstimated
        }
      }
    });
  }

  function moveDraggedCard(columnId) {
    if (!draggedCardId) return;
    const draggedCard = cards.find((card) => card.id === draggedCardId);
    const isDoneDrop = columnId === doneColumnId && draggedCard?.status !== doneColumnId;

    dispatch({
      type: "card/move",
      payload: { cardId: draggedCardId, columnId }
    });
    if (isDoneDrop) {
      onCardCompleted?.(draggedCard);
    }
    setDraggedCardId(null);
    setOverColumnId(null);
  }

  function moveDraggedColumn(columnId) {
    if (!draggedColumnId || draggedColumnId === columnId) return;

    const fromIndex = columns.findIndex((column) => column.id === draggedColumnId);
    const toIndex = columns.findIndex((column) => column.id === columnId);

    if (fromIndex < 0 || toIndex < 0) return;

    dispatch({
      type: "column/moveToIndex",
      payload: { columnId: draggedColumnId, toIndex }
    });
    setDraggedColumnId(null);
    setOverColumnId(null);
  }

  return (
    <>
      <PomodoroPanel
        activeCard={activePomodoroCard}
        activeRemaining={activePomodoroRemaining}
        isAlertPlaying={isPomodoroAlertPlaying}
        isEnabled={isPomodoroMode}
        isRunning={isPomodoroRunning}
        secondsRemaining={pomodoroSecondsRemaining}
        totalRemaining={totalRemainingPomodoros}
        onComplete={onPomodoroComplete}
        onPause={onPomodoroPause}
        onReset={onPomodoroReset}
        onStart={onPomodoroStart}
        onStopAlert={onPomodoroStopAlert}
        onToggle={onPomodoroToggle}
      />

      <section className="board-shell" aria-label="Kanban board">
        <div className="board">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cardsByColumn[column.id] || []}
              projects={projects}
              projectById={projectById}
              defaultProjectId={defaultProjectId}
              activePomodoroCardId={activePomodoroCardId}
              columnRemainingPomodoros={columnPomodoroTotals[column.id] || 0}
              isPomodoroMode={isPomodoroMode}
              isDoneColumn={column.id === doneColumnId}
              doneColumnId={doneColumnId}
              isDragTarget={overColumnId === column.id}
              draggedCardId={draggedCardId}
              draggedColumnId={draggedColumnId}
              canDeleteColumn={columns.length > 1 && column.id !== doneColumnId}
              onCardOpen={onCardOpen}
              onCardDragStart={setDraggedCardId}
              onCardDragEnd={() => {
                setDraggedCardId(null);
                setOverColumnId(null);
              }}
              onPomodoroCardSelect={onPomodoroCardSelect}
              onPomodoroEstimateChange={updateCardPomodoros}
              onColumnDragStart={setDraggedColumnId}
              onColumnDragEnd={() => {
                setDraggedColumnId(null);
                setOverColumnId(null);
              }}
              onColumnDragOver={() => setOverColumnId(column.id)}
              onColumnDragLeave={() => setOverColumnId(null)}
              onColumnDrop={() => moveDraggedCard(column.id)}
              onMoveColumn={(targetColumnId) => moveDraggedColumn(targetColumnId)}
              dispatch={dispatch}
            />
          ))}
        </div>
      </section>
    </>
  );
}
