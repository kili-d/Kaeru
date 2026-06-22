import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function CardEditor({ card, projects, onClose, dispatch }) {
  const [draft, setDraft] = useState(card);
  const selectedProject = projects.find((project) => project.id === draft.projectId);

  useEffect(() => {
    setDraft(card);
  }, [card]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function saveCard(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;

    dispatch({
      type: "card/update",
      payload: {
        cardId: card.id,
        patch: {
          title,
          description: draft.description,
          projectId: draft.projectId || ""
        }
      }
    });
    onClose();
  }

  function removeProject() {
    if (!draft.projectId) return;

    dispatch({
      type: "project/delete",
      payload: { projectId: draft.projectId }
    });
    setDraft((current) => ({ ...current, projectId: "" }));
  }

  function deleteCard() {
    dispatch({
      type: "card/delete",
      payload: { cardId: card.id }
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="card-editor" onSubmit={saveCard} onMouseDown={(event) => event.stopPropagation()}>
        <div className="editor-topbar">
          <span>Edit card</span>
          <button className="icon-button subtle" type="button" title="Close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <label>
          <span>Title</span>
          <input
            className="form-field"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            autoFocus
          />
        </label>

        <label>
          <span>Description</span>
          <textarea
            className="form-field form-field-textarea"
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            rows={5}
          />
        </label>

        <section className="project-section" aria-label="Project assignment">
          <label>
            <span>Project</span>
            <select
              className="form-field"
              value={draft.projectId || ""}
              onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          {selectedProject && (
            <button className="text-button danger project-remove" type="button" onClick={removeProject}>
              Remove project
            </button>
          )}
        </section>

        <div className="editor-actions">
          <button className="text-button danger" type="button" onClick={deleteCard}>
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
          <button className="text-button primary" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
