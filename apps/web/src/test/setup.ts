import '@testing-library/jest-dom/vitest';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { afterEach, vi } from 'vitest';

type LinkMockProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

vi.mock('next/link', async () => {
  const React = await import('react');

  return {
    default: ({ href, children, ...props }: LinkMockProps) =>
      React.createElement(
        'a',
        {
          href,
          ...props,
        },
        children,
      ),
  };
});

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserverMock;
