import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import userEvent from "@testing-library/user-event";

// Custom render function that includes providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { ...options });
}

/**
 * Creates a userEvent instance with delay disabled for faster tests.
 * This prevents timeouts in tests with many sequential user interactions.
 * @see https://testing-library.com/docs/user-event/options/#delay
 */
export function setupUser() {
  return userEvent.setup({ delay: null });
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { customRender as render };
