import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup the DOM after each test to avoid test pollution
afterEach(() => {
  cleanup();
});
