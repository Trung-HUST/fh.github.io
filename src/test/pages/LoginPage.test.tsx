import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

vi.mock("@/components/ui/MatrixExtras", async () => {
  const actual = await vi.importActual<typeof import("@/components/ui/MatrixExtras")>(
    "@/components/ui/MatrixExtras",
  );

  return {
    ...actual,
    MatrixRain: () => <div data-testid="matrix-rain" />,
    ScrambleText: ({ text }: { text: string }) => <span>{text}</span>,
    DecodingText: ({ text }: { text: string }) => <span>{text}</span>,
    TypewriterText: ({ text }: { text: string }) => <span>{text}</span>,
    ConnectionStatus: () => <span data-testid="connection-status" />,
    Sparkline: () => <svg data-testid="sparkline" />,
    LiveSniffer: () => <div data-testid="live-sniffer" />,
  };
});

import LoginPage from "@/pages/LoginPage";

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div data-testid="dashboard-home">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("accepts the demo account and navigates to the dashboard", async () => {
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/operator id/i), {
      target: { value: "demo@email.com" },
    });
    fireEvent.change(screen.getByLabelText(/passphrase/i), {
      target: { value: "demo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /authenticate/i }));

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-home")).toBeInTheDocument();
    });

    expect(JSON.parse(window.localStorage.getItem("matrix-auth-user") ?? "null")).toEqual({
      email: "demo@email.com",
      displayName: "Demo User",
      initials: "DU",
    });
  });

  it("shows an error for invalid credentials", () => {
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/operator id/i), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/passphrase/i), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /authenticate/i }));

    return waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      expect(screen.queryByTestId("dashboard-home")).not.toBeInTheDocument();
    });
  });
});