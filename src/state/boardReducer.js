import { createInitialBoard } from "../data/initialBoard.js";

function nextOrder(cards, columnId) {
  return (
    cards
      .filter((card) => card.status === columnId)
      .reduce((max, card) => Math.max(max, Number(card.order) || 0), 0) + 1
  );
}

function normalizeColumns(columns, fallbackColumns) {
  const doneFallback = fallbackColumns[fallbackColumns.length - 1];
  const doneColumn =
    columns.find((column) => column.id === doneFallback.id) ||
    columns.find((column) => String(column.title || "").trim().toLowerCase() === "done") ||
    doneFallback;
  const withoutDone = columns.filter((column) => column.id !== doneFallback.id && column.id !== doneColumn.id);
  return [...withoutDone, { ...doneColumn, title: doneFallback.title }];
}

function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

function normalizeCard(card, index, knownColumns, knownProjects, firstColumnId) {
  return {
    id: card.id,
    title: card.title || "Untitled card",
    description: card.description || "",
    status: knownColumns.has(card.status) ? card.status : firstColumnId,
    projectId: knownProjects.has(card.projectId) ? card.projectId : "",
    pomodorosEstimated: Math.max(0, Number(card.pomodorosEstimated) || 0),
    pomodorosCompleted: Math.max(0, Number(card.pomodorosCompleted) || 0),
    createdAt: card.createdAt || Date.now(),
    order: Number(card.order) || index + 1,
    archivedAt: Number(card.archivedAt) || 0
  };
}

function normalizeCardList(cards, knownColumns, knownProjects, firstColumnId) {
  return Array.isArray(cards)
    ? cards.map((card, index) => normalizeCard(card, index, knownColumns, knownProjects, firstColumnId))
    : [];
}

export function normalizeBoard(board) {
  const fallback = createInitialBoard();
  const rawColumns = Array.isArray(board?.columns) && board.columns.length ? board.columns : fallback.columns;
  const columns = normalizeColumns(rawColumns, fallback.columns);
  const projects = Array.isArray(board?.projects) ? board.projects : fallback.projects;
  const knownColumns = new Set(columns.map((column) => column.id));
  const knownProjects = new Set(projects.map((project) => project.id));
  const firstColumnId = columns[0].id;

  return {
    title: typeof board?.title === "string" && board.title.trim() ? board.title : fallback.title,
    projects,
    columns,
    cards: normalizeCardList(board?.cards, knownColumns, knownProjects, firstColumnId),
    archivedCards: normalizeCardList(board?.archivedCards, knownColumns, knownProjects, firstColumnId).sort(
      (a, b) => (b.archivedAt || 0) - (a.archivedAt || 0) || (a.createdAt || 0) - (b.createdAt || 0)
    )
  };
}

export function boardReducer(board, action) {
  const state = normalizeBoard(board);

  switch (action.type) {
    case "board/rename":
      return { ...state, title: action.payload.title };

    case "board/reset":
      return createInitialBoard();

    case "column/add":
      return {
        ...state,
        columns: normalizeColumns([...state.columns, action.payload.column], createInitialBoard().columns)
      };

    case "column/rename":
      return {
        ...state,
        columns: state.columns.map((column) =>
          column.id === action.payload.columnId ? { ...column, title: action.payload.title } : column
        )
      };

    case "column/move": {
      const fromIndex = state.columns.findIndex((column) => column.id === action.payload.columnId);
      const toIndex = fromIndex + action.payload.direction;

      return {
        ...state,
        columns: normalizeColumns(moveItem(state.columns, fromIndex, toIndex), createInitialBoard().columns)
      };
    }

    case "column/moveToIndex": {
      const fromIndex = state.columns.findIndex((column) => column.id === action.payload.columnId);
      return {
        ...state,
        columns: normalizeColumns(moveItem(state.columns, fromIndex, action.payload.toIndex), createInitialBoard().columns)
      };
    }

    case "column/delete": {
      const doneColumnId = state.columns[state.columns.length - 1]?.id;
      if (action.payload.columnId === doneColumnId || state.columns.length <= 1) return state;

      const remaining = state.columns.filter((column) => column.id !== action.payload.columnId);
      const fallbackColumnId = remaining[0].id;

      return {
        ...state,
        columns: normalizeColumns(remaining, createInitialBoard().columns),
        cards: state.cards.map((card) =>
          card.status === action.payload.columnId ? { ...card, status: fallbackColumnId } : card
        )
      };
    }

    case "card/add":
      return {
        ...state,
        cards: [
          ...state.cards,
          {
            id: action.payload.id,
            title: action.payload.title,
            description: action.payload.description || "",
            status: action.payload.columnId,
            projectId: action.payload.projectId || "",
            pomodorosEstimated: Math.max(0, Number(action.payload.pomodorosEstimated) || 0),
            pomodorosCompleted: Math.max(0, Number(action.payload.pomodorosCompleted) || 0),
            createdAt: Date.now(),
            order: nextOrder(state.cards, action.payload.columnId)
          }
        ]
      };

    case "card/update":
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.payload.cardId ? { ...card, ...action.payload.patch } : card
        )
      };

    case "card/delete":
      return {
        ...state,
        cards: state.cards.filter((card) => card.id !== action.payload.cardId)
      };

    case "card/move":
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.payload.cardId
            ? {
                ...card,
                status: action.payload.columnId,
                order: nextOrder(
                  state.cards.filter((item) => item.id !== action.payload.cardId),
                  action.payload.columnId
                )
              }
            : card
        )
      };

    case "cards/clearDone": {
      const doneColumn = state.columns[state.columns.length - 1];
      return {
        ...state,
        cards: state.cards.filter((card) => card.status !== doneColumn.id)
      };
    }

    case "cards/clearAll":
      return {
        ...state,
        cards: []
      };

    case "cards/archiveAll":
      return {
        ...state,
        archivedCards: [
          ...state.cards.map((card) => ({
            ...card,
            archivedAt: Date.now()
          })),
          ...state.archivedCards
        ],
        cards: []
      };

    case "archive/restoreCard": {
      const card = state.archivedCards.find((item) => item.id === action.payload.cardId);
      if (!card) return state;

      const remainingArchived = state.archivedCards.filter((item) => item.id !== action.payload.cardId);
      const restoredStatus = state.columns.some((column) => column.id === card.status) ? card.status : state.columns[0].id;
      const restoredCard = {
        ...card,
        status: restoredStatus,
        order: nextOrder(state.cards, restoredStatus)
      };
      delete restoredCard.archivedAt;

      return {
        ...state,
        archivedCards: remainingArchived,
        cards: [...state.cards, restoredCard]
      };
    }

    case "project/add":
      return {
        ...state,
        projects: [...state.projects, action.payload.project]
      };

    case "project/delete":
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.payload.projectId),
        cards: state.cards.map((card) =>
          card.projectId === action.payload.projectId ? { ...card, projectId: "" } : card
        )
      };

    default:
      return state;
  }
}
