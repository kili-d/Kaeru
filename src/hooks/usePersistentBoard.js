import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialBoard } from "../data/initialBoard.js";
import { boardReducer, normalizeBoard } from "../state/boardReducer.js";
import { useLocalStorageState } from "./useLocalStorageState.js";

const STORAGE_KEY = "kaeru-kanban-state-v3";
const SERVER_IMPORT_KEY = "kaeru-kanban-server-imported-v1";

async function requestBoard(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.method && options.method !== "GET" ? { "X-Kaeru-Request": "same-origin" } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = new Error(`Board request failed with ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  return normalizeBoard(data.board);
}

function hasStoredBoard() {
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function wasLocalBoardImported() {
  try {
    return window.localStorage.getItem(SERVER_IMPORT_KEY) === "true";
  } catch {
    return true;
  }
}

function markLocalBoardImported() {
  try {
    window.localStorage.setItem(SERVER_IMPORT_KEY, "true");
  } catch {
    // The server remains the source of truth even if this marker cannot be written.
  }
}

export function usePersistentBoard({ onUnauthorized } = {}) {
  const [localBoard, setLocalBoard] = useLocalStorageState(STORAGE_KEY, createInitialBoard);
  const [persistenceStatus, setPersistenceStatus] = useState("loading");
  const boardRef = useRef(normalizeBoard(localBoard));
  const statusRef = useRef(persistenceStatus);

  useEffect(() => {
    boardRef.current = normalizeBoard(localBoard);
  }, [localBoard]);

  useEffect(() => {
    statusRef.current = persistenceStatus;
  }, [persistenceStatus]);

  useEffect(() => {
    let isCancelled = false;

    async function loadBoard() {
      try {
        const serverBoard = await requestBoard("/api/board");
        const shouldImportLocalBoard = hasStoredBoard() && !wasLocalBoardImported();

        if (shouldImportLocalBoard) {
          const importedBoard = await requestBoard("/api/board", {
            method: "PUT",
            body: JSON.stringify({ board: boardRef.current })
          });
          if (isCancelled) return;
          markLocalBoardImported();
          boardRef.current = importedBoard;
          setLocalBoard(importedBoard);
          setPersistenceStatus("server");
          return;
        }

        if (isCancelled) return;
        boardRef.current = serverBoard;
        setLocalBoard(serverBoard);
        setPersistenceStatus("server");
      } catch (error) {
        if (isCancelled) return;
        if (error.statusCode === 401) {
          setPersistenceStatus("unauthorized");
          onUnauthorized?.();
          return;
        }
        setPersistenceStatus("local");
      }
    }

    loadBoard();

    return () => {
      isCancelled = true;
    };
  }, [setLocalBoard]);

  const dispatch = useCallback(
    (action) => {
      const optimisticBoard = boardReducer(boardRef.current, action);
      boardRef.current = optimisticBoard;
      setLocalBoard(optimisticBoard);

      if (statusRef.current !== "server") return;

      requestBoard("/api/board/actions", {
        method: "POST",
        body: JSON.stringify({ action })
      })
        .then((serverBoard) => {
          boardRef.current = serverBoard;
          setLocalBoard(serverBoard);
        })
        .catch((error) => {
          if (error.statusCode === 401) {
            setPersistenceStatus("unauthorized");
            onUnauthorized?.();
            return;
          }
          setPersistenceStatus("local");
        });
    },
    [onUnauthorized, setLocalBoard]
  );

  return {
    board: normalizeBoard(localBoard),
    dispatch,
    persistenceStatus
  };
}
