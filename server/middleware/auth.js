import { config } from "../config.js";
import { getUserBySessionToken } from "../services/authService.js";

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, pair) => {
    const [rawName, ...rawValue] = pair.trim().split("=");
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

export function getSessionToken(request) {
  return parseCookies(request.headers.cookie || "")[config.sessionCookieName] || "";
}

export function attachAuth(request, _response, next) {
  request.sessionToken = getSessionToken(request);
  request.user = getUserBySessionToken(request.sessionToken);
  next();
}

export function requireAuth(request, _response, next) {
  if (request.user) {
    next();
    return;
  }

  const error = new Error("Authentication required.");
  error.statusCode = 401;
  next(error);
}

export function setSessionCookie(response, session) {
  response.cookie(config.sessionCookieName, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction && config.appUrl.startsWith("https://"),
    maxAge: session.expiresAt - Date.now(),
    path: "/"
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction && config.appUrl.startsWith("https://"),
    path: "/"
  });
}
