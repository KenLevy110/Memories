import type { User } from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider } from "@tanstack/react-router";
import { createAppRouter } from "./router";

const mocks = vi.hoisted(() => ({
  signInWithGooglePopup: vi.fn(),
  isFirebaseClientConfigured: vi.fn(),
}));

vi.mock("../lib/firebase", () => ({
  initFirebaseClient: vi.fn(),
  isFirebaseClientConfigured: mocks.isFirebaseClientConfigured,
  getFirebaseAuthOrNull: () => null,
  subscribeFirebaseUser: (callback: (user: User | null) => void) => {
    callback(null);
    return () => {};
  },
  signInWithGooglePopup: mocks.signInWithGooglePopup,
  signOutFirebase: vi.fn(),
  readMemoriesClaims: vi.fn().mockResolvedValue({}),
}));

describe("LoginPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders unavailable message when Firebase env is not configured", async () => {
    mocks.isFirebaseClientConfigured.mockReturnValue(false);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = createAppRouter();
    window.history.pushState({}, "", "/login");
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/Firebase client keys are missing/i)).toBeInTheDocument();
  });

  it("invokes Google sign-in when the primary button is used", async () => {
    mocks.isFirebaseClientConfigured.mockReturnValue(true);
    mocks.signInWithGooglePopup.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = createAppRouter();
    window.history.pushState({}, "", "/login");
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const continueButton = await screen.findByRole("button", { name: /Continue with Google/i });
    await userEvent.click(continueButton);

    await waitFor(() => {
      expect(mocks.signInWithGooglePopup).toHaveBeenCalledTimes(1);
    });

    // LoginPage navigates to "/" after sign-in; wait until the router applies it so async work finishes before jsdom teardown.
    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });
});
