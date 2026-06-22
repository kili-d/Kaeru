import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { authRouter } from "./auth.js";
import { applyBoardAction, getBoard, importBoard } from "../services/boardService.js";

export const apiRouter = Router();

apiRouter.get("/health", (_request, response) => {
  response.json({ ok: true });
});

apiRouter.use("/auth", authRouter);

apiRouter.get("/board", requireAuth, (request, response, next) => {
  try {
    response.json({ board: getBoard(request.user.id) });
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/board", requireAuth, (request, response, next) => {
  try {
    response.json({ board: importBoard(request.body?.board, request.user.id) });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/board/actions", requireAuth, (request, response, next) => {
  try {
    response.json({ board: applyBoardAction(request.body?.action, request.user.id) });
  } catch (error) {
    next(error);
  }
});
