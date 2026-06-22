import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createId } from "../utils/createId";
import { CardComposer } from "./CardComposer";
import { KanbanCard } from "./KanbanCard";
import { TomatoIcon } from "./TomatoIcon";

export function KanbanColumn({
  column,
  cards,
  projects,
  projectById,
  defaultProjectId,
  activePomodoroCardId,
  columnRemainingPomodoros,
  isPomodoroMode,
  isDoneColumn,
  doneColumnId,
  isDragTarget,
  draggedCardId,
  draggedColumnId,
  canDeleteColumn,
  onCardOpen,
  onCardDragStart,
  onCardDragEnd,
  onPomodoroCardSelect,
  onPomodoroEstimateChange,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  onMoveColumn,
  dispatch
}) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  function addCard(title) {
    dispatch({
      type: "card/add",
      payload: {
        id: createId("card"),
        title,
        columnId: column.id,
        projectId: defaultProjectId
      }
    });
    setIsAddingCard(false);
  }

  function renameColumn() {
    const title = draftTitle.trim();
    if (!title) {
      setDraftTitle(column.title);
      setIsRenaming(false);
      return;
    }

    dispatch({
      type: "column/rename",
      payload: { columnId: column.id, title }
    });
    setIsRenaming(false);
  }

  useEffect(() => {
    function handleClickAway(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <article
      className={`kanban-column ${isDragTarget ? "is-drag-target" : ""} ${
        draggedColumnId === column.id ? "is-dragging-column" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        onColumnDragOver();
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onColumnDragLeave();
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        onColumnDrop(event);
        if (draggedColumnId) onMoveColumn(column.id);
      }}
    >
      <div
        className="column-header"
        draggable={!isRenaming && !isDoneColumn}
        onDragStart={(event) => {
          if (isDoneColumn) return;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", column.id);
          onColumnDragStart(column.id);
        }}
        onDragEnd={onColumnDragEnd}
      >
        {isRenaming ? (
          <input
            className="column-title-input"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={renameColumn}
            onKeyDown={(event) => {
              if (event.key === "Enter") renameColumn();
              if (event.key === "Escape") {
                setDraftTitle(column.title);
                setIsRenaming(false);
              }
            }}
            autoFocus
          />
        ) : (
          <span className="column-title">
            <span className="column-title-main">{column.title}</span>
            <span className="column-title-meta">
              <span>
                {cards.length} {cards.length === 1 ? "task" : "tasks"}
              </span>
              {!isDoneColumn && columnRemainingPomodoros > 0 && (
                <span className="column-pomodoro-total">
                  <TomatoIcon size={12} />
                  <span>{columnRemainingPomodoros}</span>
                </span>
              )}
            </span>
          </span>
        )}
        <div className="column-tools" ref={menuRef}>
          <details className={`column-menu ${isMenuOpen ? "is-open" : ""}`} open={isMenuOpen}>
            <summary
              className="icon-button subtle"
              aria-label="Column actions"
              title="Column actions"
              onClick={(event) => {
                event.preventDefault();
                setIsMenuOpen((current) => !current);
              }}
            >
              <MoreHorizontal size={16} />
            </summary>
            <div className="column-menu-panel" role="menu" aria-label="Column actions menu">
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  setIsRenaming(true);
                  setIsMenuOpen(false);
                }}
              >
                <span>Rename</span>
              </button>
              {canDeleteColumn && (
                <button
                  className="menu-item danger"
                  type="button"
                  onClick={() => {
                    dispatch({
                      type: "column/delete",
                      payload: { columnId: column.id }
                    });
                    setIsMenuOpen(false);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </details>
        </div>
      </div>

      <div className="card-stack">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            accent={column.accent}
            project={projectById[card.projectId]}
            isDone={card.status === doneColumnId}
            isDragging={draggedCardId === card.id}
            isPomodoroActive={activePomodoroCardId === card.id}
            isPomodoroMode={isPomodoroMode}
            onOpen={() => onCardOpen(card.id)}
            onDragStart={() => onCardDragStart(card.id)}
            onDragEnd={onCardDragEnd}
            onPomodoroEstimateChange={(estimate) => onPomodoroEstimateChange(card.id, estimate)}
            onPomodoroSelect={() => onPomodoroCardSelect(card.id)}
          />
        ))}
      </div>

      {isAddingCard ? (
        <CardComposer onSubmit={addCard} onCancel={() => setIsAddingCard(false)} />
      ) : (
        <button className="add-card-button" type="button" onClick={() => setIsAddingCard(true)}>
          <Plus size={16} />
          <span>Add card</span>
        </button>
      )}
    </article>
  );
}
