import { Plus } from "lucide-react";

export function EmptyState({ title = "No cards match this view", onAddCard }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <button className="text-button primary" type="button" onClick={onAddCard}>
        <Plus size={16} />
        <span>Add a card</span>
      </button>
    </div>
  );
}
