import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  it("renders the semantic placeholder when the frontend starts", () => {
    // Given: feature pages are not part of this scaffold.

    // When
    render(<App />);

    // Then
    expect(screen.getByRole("main")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Frontend scaffold" })).toBeVisible();
    expect(
      screen.getByText("Feature pages are intentionally deferred to their planned milestones."),
    ).toBeVisible();
  });
});
