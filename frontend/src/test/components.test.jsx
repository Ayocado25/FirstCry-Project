import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Badge, Avatar, EmptyState, StatCard } from '../components/common';

// ── Button ───────────────────────────────────────────────────
describe('Button', () => {
  test('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  test('calls onClick when clicked', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled').closest('button')).toBeDisabled();
  });

  test('is disabled when loading is true', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByText('Loading').closest('button')).toBeDisabled();
  });

  test('renders different variants without crashing', () => {
    const variants = ['primary', 'secondary', 'outline', 'danger', 'ghost', 'success'];
    variants.forEach(v => {
      const { unmount } = render(<Button variant={v}>{v}</Button>);
      expect(screen.getByText(v)).toBeTruthy();
      unmount();
    });
  });
});

// ── Badge ────────────────────────────────────────────────────
describe('Badge', () => {
  test('renders text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  test('applies color and bg styles', () => {
    render(<Badge color="red" bg="pink">Test</Badge>);
    const badge = screen.getByText('Test');
    expect(badge.style.color).toBe('red');
    expect(badge.style.backgroundColor).toBe('pink');
  });
});

// ── Avatar ───────────────────────────────────────────────────
describe('Avatar', () => {
  test('renders initials when no src', () => {
    render(<Avatar name="Arjun Dev" size={36} />);
    // Initials should be "AD"
    expect(screen.getByText('AD')).toBeTruthy();
  });

  test('renders img when src provided', () => {
    render(<Avatar name="Test User" src="https://example.com/photo.jpg" size={36} />);
    const img = screen.getByAltText('Test User');
    expect(img).toBeTruthy();
    expect(img.src).toBe('https://example.com/photo.jpg');
  });

  test('renders ? for missing name', () => {
    render(<Avatar name="" size={36} />);
    expect(screen.getByText('?')).toBeTruthy();
  });
});

// ── EmptyState ───────────────────────────────────────────────
describe('EmptyState', () => {
  test('renders title and description', () => {
    render(<EmptyState title="No data" description="Nothing here yet." />);
    expect(screen.getByText('No data')).toBeTruthy();
    expect(screen.getByText('Nothing here yet.')).toBeTruthy();
  });

  test('renders action when provided', () => {
    render(
      <EmptyState title="Empty" action={<button>Add Item</button>} />
    );
    expect(screen.getByText('Add Item')).toBeTruthy();
  });

  test('renders icon when provided', () => {
    render(<EmptyState icon={<span data-testid="icon">📋</span>} title="Empty" />);
    expect(screen.getByTestId('icon')).toBeTruthy();
  });
});

// ── StatCard ─────────────────────────────────────────────────
describe('StatCard', () => {
  test('renders label and value', () => {
    render(<StatCard label="Children Today" value="12/15" />);
    expect(screen.getByText('Children Today')).toBeTruthy();
    expect(screen.getByText('12/15')).toBeTruthy();
  });

  test('renders subtitle when provided', () => {
    render(<StatCard label="Test" value={42} subtitle="80% rate" />);
    expect(screen.getByText('80% rate')).toBeTruthy();
  });

  test('renders — when value is undefined', () => {
    render(<StatCard label="Test" />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
