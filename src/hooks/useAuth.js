import { useCallback, useEffect, useState } from "react";

const VERIFICATION_STORAGE_KEY = "kaeru-pending-verification-v1";

async function requestAuth(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.method && options.method !== "GET" ? { "X-Kaeru-Request": "same-origin" } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "Authentication request failed.");
  }

  if (!data.auth || typeof data.auth !== "object") {
    throw new Error("Authentication service is unavailable.");
  }

  return data;
}

function readStoredVerification() {
  try {
    const value = window.localStorage.getItem(VERIFICATION_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeStoredVerification(verification) {
  try {
    if (!verification) {
      window.localStorage.removeItem(VERIFICATION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(verification));
  } catch {
    // If storage fails, the in-memory state still carries the link for this session.
  }
}

export function useAuth() {
  const [auth, setAuth] = useState({
    allowRegistration: false,
    setupRequired: false,
    verificationRequired: false,
    user: null
  });
  const [verification, setVerification] = useState(() => readStoredVerification());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await requestAuth("/api/auth/status");
      setAuth(data.auth);
      if (data.auth.user) {
        setVerification(null);
        writeStoredVerification(null);
      } else if (data.verification) {
        setVerification(data.verification);
        writeStoredVerification(data.verification);
      } else if (!data.auth.verificationRequired) {
        setVerification(null);
        writeStoredVerification(null);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const setup = useCallback(async (payload) => {
    setError("");
    const data = await requestAuth("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setAuth(data.auth);
    setVerification(data.verification || null);
    writeStoredVerification(data.verification || null);
  }, []);

  const login = useCallback(async (payload) => {
    setError("");
    const data = await requestAuth("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setAuth(data.auth);
    setVerification(null);
    writeStoredVerification(null);
  }, []);

  const register = useCallback(async (payload) => {
    setError("");
    const data = await requestAuth("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setAuth(data.auth);
    setVerification(data.verification || null);
    writeStoredVerification(data.verification || null);
  }, []);

  const logout = useCallback(async () => {
    setError("");
    const data = await requestAuth("/api/auth/logout", {
      method: "POST"
    });
    setAuth(data.auth);
  }, []);

  const confirmEmail = useCallback(async (token) => {
    setError("");
    const verificationToken = token || verification?.confirmUrl?.split("confirm_email=")[1];
    if (!verificationToken) {
      throw new Error("No confirmation token is available.");
    }

    const data = await requestAuth("/api/auth/confirm-email", {
      method: "POST",
      body: JSON.stringify({ token: decodeURIComponent(verificationToken) })
    });
    setAuth(data.auth);
    setVerification(null);
    writeStoredVerification(null);
  }, [verification]);

  const resetVerification = useCallback(() => {
    setVerification(null);
    writeStoredVerification(null);
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("confirm_email");
    if (!token) return;

    confirmEmail(token).finally(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("confirm_email");
      window.history.replaceState({}, "", url.toString());
    });
  }, [confirmEmail]);

  return {
    auth,
    error,
    isLoading,
    verification,
    confirmEmail,
    login,
    logout,
    register,
    refreshAuth,
    resetVerification,
    setup,
    setAuth
  };
}
