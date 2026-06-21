import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Login } from "./Login";

describe("Login", () => {
  it("envia las credenciales ingresadas", async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "agente1" } });
    fireEvent.change(screen.getByLabelText("Contrasena"), { target: { value: "Password123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(onLogin).toHaveBeenCalledWith("agente1", "Password123!");
  });

  it("muestra errores no tipados y restaura el boton", async () => {
    const onLogin = vi.fn().mockRejectedValue("failure");
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "agente1" } });
    fireEvent.change(screen.getByLabelText("Contrasena"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo iniciar sesion");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
});
