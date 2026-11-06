// Adds matchers like toBeInTheDocument() to Vitest's expect().
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount whatever the previous test rendered, so tests don't affect each other.
afterEach(() => cleanup());
