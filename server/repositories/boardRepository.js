import { randomUUID } from "node:crypto";
import { createInitialBoard } from "../../src/data/initialBoard.js";
import { normalizeBoard } from "../../src/state/boardReducer.js";
import { getDatabase } from "../db/connection.js";

export const DEFAULT_USER_ID = "user-local";
export const DEFAULT_BOARD_ID = "board-default";

function now() {
  return Date.now();
}

function getBoardId(userId) {
  return userId === DEFAULT_USER_ID ? DEFAULT_BOARD_ID : `board-${userId}`;
}

function createSeedBoardForUser(userId) {
  const board = createInitialBoard();
  if (userId === DEFAULT_USER_ID) return board;

  const columnIdByOriginalId = new Map(board.columns.map((column) => [column.id, `${userId}-${column.id}`]));
  const projectIdByOriginalId = new Map(board.projects.map((project) => [project.id, `${userId}-${project.id}`]));

  return normalizeBoard({
    ...board,
    projects: board.projects.map((project) => ({
      ...project,
      id: projectIdByOriginalId.get(project.id)
    })),
    columns: board.columns.map((column) => ({
      ...column,
      id: columnIdByOriginalId.get(column.id)
    })),
    cards: board.cards.map((card) => ({
      ...card,
      id: `${userId}-${card.id}`,
      status: columnIdByOriginalId.get(card.status),
      projectId: projectIdByOriginalId.get(card.projectId) || ""
    })),
    archivedCards: []
  });
}

function ensureUserBoard(db, userId, boardTitle = "Still pond") {
  const timestamp = now();
  const boardId = getBoardId(userId);

  db.prepare(
    `
      INSERT INTO boards (id, owner_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
    `
  ).run(boardId, userId, boardTitle, null, timestamp, timestamp);

  return boardId;
}

function writeBoardRows(db, rawBoard, userId) {
  const board = normalizeBoard(rawBoard);
  const timestamp = now();
  const boardId = ensureUserBoard(db, userId, board.title);

  db.prepare("DELETE FROM cards WHERE board_id = ?").run(boardId);
  db.prepare("DELETE FROM projects WHERE board_id = ?").run(boardId);
  db.prepare("DELETE FROM board_columns WHERE board_id = ?").run(boardId);

  const insertProject = db.prepare(`
    INSERT INTO projects (id, board_id, name, color, position, archived_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  board.projects.forEach((project, index) => {
    insertProject.run(
      project.id,
      boardId,
      project.name,
      project.color || "#91aa86",
      index + 1,
      null,
      timestamp,
      timestamp
    );
  });

  const insertColumn = db.prepare(`
    INSERT INTO board_columns (id, board_id, name, accent, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  board.columns.forEach((column, index) => {
    insertColumn.run(column.id, boardId, column.title, column.accent || "#91aa86", index + 1, timestamp, timestamp);
  });

  const insertCard = db.prepare(`
    INSERT INTO cards (
      id,
      board_id,
      column_id,
      project_id,
      title,
      description,
      position,
      pomodoro_estimate,
      pomodoro_completed_count,
      status,
      archived_at,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [...board.cards, ...board.archivedCards].forEach((card) => {
    insertCard.run(
      card.id,
      boardId,
      card.status,
      card.projectId || null,
      card.title,
      card.description || "",
      Number(card.order) || 0,
      Number(card.pomodorosEstimated) || 0,
      Number(card.pomodorosCompleted) || 0,
      card.status,
      card.archivedAt || null,
      Number(card.createdAt) || timestamp,
      timestamp
    );
  });

  return board;
}

function mapCardRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    status: row.column_id,
    projectId: row.project_id || "",
    pomodorosEstimated: Number(row.pomodoro_estimate) || 0,
    pomodorosCompleted: Number(row.pomodoro_completed_count) || 0,
    createdAt: Number(row.created_at) || now(),
    order: Number(row.position) || 0,
    archivedAt: Number(row.archived_at) || 0
  };
}

export function ensureDefaultBoard() {
  const db = getDatabase();
  const board = db.prepare("SELECT id FROM boards WHERE id = ?").get(DEFAULT_BOARD_ID);
  if (board) return;

  const timestamp = now();
  db.prepare(
    `
      INSERT INTO users (id, username, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
    `
  ).run(DEFAULT_USER_ID, "local", "admin", timestamp, timestamp);

  const seedBoard = createSeedBoardForUser(DEFAULT_USER_ID);
  const seedTransaction = db.transaction(() => {
    writeBoardRows(db, seedBoard, DEFAULT_USER_ID);
    insertAuditEvent({
      action: "board/seeded",
      entityType: "board",
      entityId: DEFAULT_BOARD_ID,
      metadata: { source: "initialBoard" }
    });
  });
  seedTransaction();
}

export function ensureBoardForUser(userId) {
  const db = getDatabase();
  const boardId = getBoardId(userId);
  const board = db.prepare("SELECT id FROM boards WHERE id = ? AND owner_id = ?").get(boardId, userId);
  if (board) return;

  const seedBoard = createSeedBoardForUser(userId);
  const seedTransaction = db.transaction(() => {
    writeBoardRows(db, seedBoard, userId);
    insertAuditEvent({
      action: "board/seeded",
      entityType: "board",
      entityId: boardId,
      metadata: { source: "initialBoard" },
      userId
    });
  });
  seedTransaction();
}

export function readBoard(userId = DEFAULT_USER_ID) {
  ensureBoardForUser(userId);
  const db = getDatabase();
  const boardId = getBoardId(userId);
  const board = db.prepare("SELECT name FROM boards WHERE id = ? AND owner_id = ?").get(boardId, userId);

  const projects = db
    .prepare("SELECT id, name, color FROM projects WHERE board_id = ? AND archived_at IS NULL ORDER BY position, id")
    .all(boardId)
    .map((project) => ({
      id: project.id,
      name: project.name,
      color: project.color
    }));

  const columns = db
    .prepare("SELECT id, name, accent FROM board_columns WHERE board_id = ? ORDER BY position, id")
    .all(boardId)
    .map((column) => ({
      id: column.id,
      title: column.name,
      accent: column.accent
    }));

  const cardRows = db
    .prepare("SELECT * FROM cards WHERE board_id = ? ORDER BY archived_at DESC, position, created_at")
    .all(boardId);

  const cards = [];
  const archivedCards = [];

  for (const row of cardRows) {
    const card = mapCardRow(row);
    if (card.archivedAt) {
      archivedCards.push(card);
    } else {
      cards.push(card);
    }
  }

  return normalizeBoard({
    title: board?.name || "Still pond",
    projects,
    columns,
    cards,
    archivedCards
  });
}

export function replaceBoard(rawBoard, userId = DEFAULT_USER_ID) {
  const db = getDatabase();
  const transaction = db.transaction(() => writeBoardRows(db, rawBoard, userId));
  transaction();
  return readBoard(userId);
}

export function insertAuditEvent({ action, entityType, entityId = null, metadata = null, userId = DEFAULT_USER_ID }) {
  const db = getDatabase();
  db.prepare(
    `
      INSERT INTO audit_events (id, user_id, actor_type, action, entity_type, entity_id, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    `audit-${randomUUID()}`,
    userId,
    "user",
    action,
    entityType,
    entityId,
    metadata ? JSON.stringify(metadata) : null,
    now()
  );
}
