import { useState } from "react";

export function AuthScreen({
  allowRegistration = false,
  error,
  isLoading,
  mode,
  onLogin,
  onRegister,
  onSetup,
  onToggleMode,
  setupTokenRequired = false
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [formError, setFormError] = useState("");
  const isSetup = mode === "setup";
  const isRegister = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setFormError("");

    try {
      if (isSetup) {
        await onSetup({ username, email, password, setupToken });
      } else if (isRegister) {
        await onRegister({ username, email, password });
      } else {
        await onLogin({ identifier: username, password });
      }
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <aside className="auth-visual" aria-hidden="true">
          <img className="auth-illustration" src="/assets/kaeru-auth-illustration.png" alt="" />
        </aside>

        <form className="auth-panel" onSubmit={submit}>
          <div className="auth-copy">
            <h1>{isSetup ? "Set up Kaeru" : isRegister ? "Create your account" : "Welcome back"}</h1>
            <p>
              {isSetup
                ? "Create the first admin account for this self-hosted instance."
                : isRegister
                  ? "Create a calm little place to work."
                  : "Sign in to your board."}
            </p>
          </div>

          <label>
            <span>{isSetup || isRegister ? "Username" : "Username or email"}</span>
            <input
              className="form-field"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          {(isSetup || isRegister) && (
            <label>
              <span>Email</span>
              <input
                className="form-field"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="name@example.com"
                required
              />
            </label>
          )}

          <label>
            <span>Password</span>
            <input
              className="form-field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSetup ? "new-password" : "current-password"}
              minLength={10}
              required
            />
          </label>

          {isSetup && setupTokenRequired && (
            <label>
              <span>Setup token</span>
              <input
                className="form-field"
                type="password"
                value={setupToken}
                onChange={(event) => setSetupToken(event.target.value)}
                autoComplete="one-time-code"
                required
              />
            </label>
          )}

          {(formError || error) && <p className="auth-error">{formError || error}</p>}

          <button className="text-button primary auth-submit" type="submit" disabled={isLoading}>
            {isSetup || isRegister ? "Create account" : "Log in"}
          </button>

          {!isSetup && allowRegistration && (
            <p className="auth-switch">
              {isRegister ? "Already have an account?" : "Need an account?"}{" "}
              <button
                className="auth-switch-button"
                type="button"
                onClick={onToggleMode}
              >
                {isRegister ? "Log in" : "Create one"}
              </button>
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
