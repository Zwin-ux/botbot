import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Make vi available globally as jest for compatibility
global.jest = vi;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();