import { FormEvent, useState } from "react";
import { Headphones, LockKeyhole } from "lucide-react";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="brand-mark"><Headphones size={30} /></div>
        <h1>Unified Telecom QA</h1>
        <p>Comunicaciones, identidad y calidad en una sola operacion.</p>
        <div className="brand-lines" aria-hidden="true"><span /><span /><span /></div>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div>
          <LockKeyhole size={26} />
          <h2 id="login-title">Iniciar sesion</h2>
          <p>Accede con tu identidad asignada por la plataforma.</p>
        </div>
        <form onSubmit={submit}>
          <label>Usuario<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label>
          <label>Contrasena<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={loading}>{loading ? "Validando..." : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
}
