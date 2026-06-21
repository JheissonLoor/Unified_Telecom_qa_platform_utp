import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api, session } from "./api";

vi.mock("./components/Dashboard", () => ({
  Dashboard: ({ user, onLogout }: { user: { display_name: string }; onLogout: () => void }) => (
    <div><span>Dashboard {user.display_name}</span><button onClick={onLogout}>Salir</button></div>
  ),
}));

vi.mock("./api", () => ({
  api: { login: vi.fn() },
  session: { token: null as string | null },
}));

describe("App", () => {
  beforeEach(() => {
    vi.mocked(api.login).mockReset();
    session.token = null;
  });

  it("inicia y cierra sesion", async () => {
    vi.mocked(api.login).mockResolvedValue({
      access_token: "jwt", token_type: "bearer", expires_in: 900,
      user: { username: "agente1", display_name: "Agente Uno", role: "AgenteCallCenter", active: true, extension: "2001" },
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "agente1" } });
    fireEvent.change(screen.getByLabelText("Contrasena"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Dashboard Agente Uno")).toBeVisible();
    expect(session.token).toBe("jwt");
    fireEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(await screen.findByRole("heading", { name: "Iniciar sesion" })).toBeVisible();
    expect(session.token).toBeNull();
  });

  it("muestra un error de autenticacion", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("Credenciales invalidas"));
    render(<App />);
    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "bad" } });
    fireEvent.change(screen.getByLabelText("Contrasena"), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Credenciales invalidas"));
  });
});
