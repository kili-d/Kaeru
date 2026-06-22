import { Archive, LogOut, MoreHorizontal, Plus, Trash2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function AppHeader({
  doneReaction,
  archivedCards,
  projects = [],
  onLogout,
  onAddColumn,
  onArchiveCards,
  onClearAllCards,
  onRestoreArchivedCard,
  onResetBoard,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const projectNameById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  useEffect(() => {
    function handleClickAway(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="app-header">
      <div className={`title-block ${doneReaction ? "is-celebrating" : ""}`}>
        <div className={`brand-emblem ${doneReaction ? "is-happy" : ""}`} aria-hidden="true">
          <img src={doneReaction ? "/assets/kaeru-happy-face-v4.png" : "/assets/kaeru-head-transparent.png"} alt="" />
        </div>
        {doneReaction && (
          <div className="done-reaction" role="status" aria-live="polite" aria-label="Done celebration">
            <span className="done-spark done-spark-a" />
            <span className="done-spark done-spark-b" />
            <span className="done-spark done-spark-c" />
            <span className="done-spark done-spark-d" />
            <span className="done-spark done-spark-e" />
            <span className="done-spark done-spark-f" />
          </div>
        )}
      </div>

      <div className="header-actions">
        <details className="header-menu" ref={menuRef} open={menuOpen}>
          <summary
            className="icon-button subtle"
            aria-label="Board actions"
            title="Board actions"
            onClick={(event) => {
              event.preventDefault();
              setMenuOpen((current) => !current);
            }}
          >
            <MoreHorizontal size={17} />
          </summary>
          <div className="header-menu-panel" role="menu" aria-label="Board actions menu">
            <button
              className="menu-item"
              type="button"
              onClick={() => {
                onAddColumn();
                setMenuOpen(false);
              }}
            >
              <Plus size={15} />
              <span>Add column</span>
            </button>
            <button
              className="menu-item"
              type="button"
              onClick={() => {
                onArchiveCards();
                setMenuOpen(false);
              }}
            >
              <Archive size={15} />
              <span>Archive cards</span>
            </button>
            <button
              className="menu-item danger"
              type="button"
              onClick={() => {
                onClearAllCards();
                setMenuOpen(false);
              }}
            >
              <Trash2 size={15} />
              <span>Clear all cards</span>
            </button>
            <button
              className="menu-item danger"
              type="button"
              onClick={() => {
                onResetBoard();
                setMenuOpen(false);
              }}
            >
              <RotateCcw size={15} />
              <span>Reset board</span>
            </button>
            <button
              className="menu-item"
              type="button"
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
            >
              <LogOut size={15} />
              <span>Log out</span>
            </button>

            <div className="menu-section" role="presentation">
              <div className="menu-section-title">Archive</div>
              {archivedCards.length ? (
                <div className="archive-list">
                  {archivedCards.map((card) => (
                    <button
                      key={card.id}
                      className="archive-item"
                      type="button"
                      onClick={() => {
                        onRestoreArchivedCard(card.id);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="archive-item-title">{card.title}</span>
                      <span className="archive-item-meta">
                        {projectNameById.get(card.projectId) || "No project"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="menu-empty">No archived cards</p>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
