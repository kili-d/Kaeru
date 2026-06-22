import { Router } from "express";
import { config } from "../config.js";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "../middleware/auth.js";
import {
  confirmEmail,
  createSession,
  deleteSession,
  getAuthState,
  getAuthStatus,
  loginUser,
  registerUser,
  setupFirstAdmin
} from "../services/authService.js";
import { insertAuditEvent } from "../repositories/boardRepository.js";

export const authRouter = Router();

function sendSession(response, user) {
  const session = createSession(user.id);
  setSessionCookie(response, session);
  response.json(getAuthState(user, null));
}

authRouter.get("/status", (request, response) => {
  response.json(getAuthState(request.user, null));
});

authRouter.post("/setup", async (request, response, next) => {
  try {
    const result = await setupFirstAdmin(request.body || {});
    response.json({
      auth: getAuthStatus(null),
      verification: {
        confirmUrl: result.verification.confirmUrl,
        email: result.user.email,
        expiresAt: result.verification.expiresAt,
        pending: true
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const user = await loginUser({
      ...(request.body || {}),
      attemptKey: request.ip || request.socket.remoteAddress || "unknown"
    });
    sendSession(response, user);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/register", async (request, response, next) => {
  try {
    if (!config.allowRegistration) {
      const error = new Error("Registration is not enabled.");
      error.statusCode = 403;
      throw error;
    }

    const result = await registerUser(request.body || {});
    response.json({
      auth: getAuthStatus(null),
      verification: {
        confirmUrl: result.verification.confirmUrl,
        email: result.user.email,
        expiresAt: result.verification.expiresAt,
        pending: true
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/confirm-email", async (request, response, next) => {
  try {
    const user = confirmEmail(request.body?.token);
    sendSession(response, user);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (request, response) => {
  if (request.user) {
    insertAuditEvent({
      action: "user/logout",
      entityType: "user",
      entityId: request.user.id,
      userId: request.user.id
    });
  }

  deleteSession(getSessionToken(request));
  clearSessionCookie(response);
  response.json(getAuthState(null, null));
});
