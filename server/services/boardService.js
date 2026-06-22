import { boardReducer, normalizeBoard } from "../../src/state/boardReducer.js";
import { insertAuditEvent, readBoard, replaceBoard } from "../repositories/boardRepository.js";

const ALLOWED_ACTIONS = new Set([
  "board/rename",
  "board/reset",
  "column/add",
  "column/rename",
  "column/move",
  "column/moveToIndex",
  "column/delete",
  "card/add",
  "card/update",
  "card/delete",
  "card/move",
  "cards/clearDone",
  "cards/clearAll",
  "cards/archiveAll",
  "archive/restoreCard",
  "project/add",
  "project/delete"
]);

function getEntityType(actionType) {
  if (actionType.startsWith("card")) return "card";
  if (actionType.startsWith("cards")) return "card";
  if (actionType.startsWith("column")) return "column";
  if (actionType.startsWith("project")) return "project";
  if (actionType.startsWith("archive")) return "archive";
  return "board";
}

function validateAction(action) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    const error = new Error("Action must be an object.");
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_ACTIONS.has(action.type)) {
    const error = new Error("Unsupported board action.");
    error.statusCode = 400;
    throw error;
  }

  return {
    type: action.type,
    payload: action.payload || {}
  };
}

export function getBoard(userId) {
  return readBoard(userId);
}

export function importBoard(rawBoard, userId) {
  if (!rawBoard || typeof rawBoard !== "object" || Array.isArray(rawBoard)) {
    const error = new Error("Board import must include a board object.");
    error.statusCode = 400;
    throw error;
  }

  const board = replaceBoard(normalizeBoard(rawBoard), userId);
  insertAuditEvent({
    action: "board/imported",
    entityType: "board",
    metadata: { source: "client-local-storage" },
    userId
  });
  return board;
}

export function applyBoardAction(rawAction, userId) {
  const action = validateAction(rawAction);
  const currentBoard = readBoard(userId);
  const nextBoard = boardReducer(currentBoard, action);
  const board = replaceBoard(nextBoard, userId);

  insertAuditEvent({
    action: action.type,
    entityType: getEntityType(action.type),
    entityId: action.payload.cardId || action.payload.columnId || action.payload.projectId || null,
    metadata: { payload: action.payload },
    userId
  });

  return board;
}
