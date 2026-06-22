export function VerifyEmailScreen({ email, error, isLoading, onConfirm, onReset, verification }) {
  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <aside className="auth-visual" aria-hidden="true">
          <img className="auth-illustration" src="/assets/kaeru-auth-illustration.png" alt="" />
        </aside>

        <div className="auth-panel">
          <div className="auth-copy">
            <h1>Confirm your email</h1>
            <p>
              {email
                ? `Open the confirmation link for ${email} before entering Kaeru.`
                : "Open the confirmation link before entering Kaeru."}
            </p>
          </div>

          <div className="auth-note">
            <span>Confirmation link</span>
            {verification?.confirmUrl ? (
              <a
                className="auth-link"
                href={verification.confirmUrl}
                onClick={(event) => {
                  event.preventDefault();
                  onConfirm();
                }}
              >
                {verification.confirmUrl}
              </a>
            ) : (
              <p className="auth-link-fallback">Use the confirmation link from the setup or registration response.</p>
            )}
          </div>

          {(error || "") && <p className="auth-error">{error}</p>}

          <div className="auth-actions">
            <button
              className="text-button primary auth-submit"
              type="button"
              disabled={isLoading || !verification?.confirmUrl}
              onClick={onConfirm}
            >
              Confirm email
            </button>
            <button className="text-button" type="button" disabled={isLoading} onClick={onReset}>
              Start over
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
