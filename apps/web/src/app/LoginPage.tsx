import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { getFirebaseAuthErrorMessage, isFirebaseClientConfigured, signInWithGooglePopup } from "../lib/firebase";

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!isFirebaseClientConfigured()) {
    return (
      <section className="panel">
        <h2>Sign in</h2>
        <p>
          Firebase client keys are missing from this build. For local development, paste a dev bearer token in the
          header instead, or add <code>VITE_FIREBASE_*</code> values to the repo root <code>.env</code>.
        </p>
        <Link className="button-link" to="/">
          Back home
        </Link>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Sign in</h2>
      <p>Continue with Google to access your Legacy workspace.</p>
      {error ? <p role="alert">{error}</p> : null}
      <div className="row wrap">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setPending(true);
            void signInWithGooglePopup()
              .then(() => navigate({ to: "/" }))
              .catch((err: unknown) => {
                setError(getFirebaseAuthErrorMessage(err));
              })
              .finally(() => {
                setPending(false);
              });
          }}
        >
          {pending ? "Signing in…" : "Continue with Google"}
        </button>
        <Link className="button-link" to="/">
          Cancel
        </Link>
      </div>
    </section>
  );
}
