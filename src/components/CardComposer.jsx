import { X } from "lucide-react";
import { useState } from "react";

export function CardComposer({ onSubmit, onCancel }) {
  const [title, setTitle] = useState("");

  function submit(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    onSubmit(cleanTitle);
    setTitle("");
  }

  return (
    <form className="card-composer" onSubmit={submit}>
      <input
        className="form-field"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Card title"
        autoFocus
      />
      <div className="composer-actions">
        <button className="text-button primary" type="submit">
          Add
        </button>
        <button className="icon-button subtle" type="button" title="Cancel" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
    </form>
  );
}
