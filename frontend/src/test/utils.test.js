import { describe, test, expect } from 'vitest';
import {
  formatDate, formatTime, getAge, getMoodConfig, getPriorityConfig,
  getStatusConfig, getAttendanceConfig, capitalize, initials,
  pluralize, avatarColor, formatDuration, extractError,
} from '../utils';

describe('formatDate', () => {
  test('formats ISO date string', () => {
    expect(formatDate('2026-06-15')).toBe('15 Jun 2026');
  });

  test('returns — for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  test('returns — for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  test('accepts custom format', () => {
    expect(formatDate('2026-06-15', 'dd/MM/yyyy')).toBe('15/06/2026');
  });
});

describe('getAge', () => {
  test('returns months for child under 1 year', () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const result = getAge(sixMonthsAgo.toISOString().split('T')[0]);
    expect(result).toMatch(/m$/);
  });

  test('returns years for child over 1 year', () => {
    const result = getAge('2023-01-01');
    expect(result).toMatch(/y/);
  });

  test('returns — for null', () => {
    expect(getAge(null)).toBe('—');
  });
});

describe('getMoodConfig', () => {
  const moods = ['happy', 'calm', 'excited', 'fussy', 'tired', 'upset'];
  moods.forEach(mood => {
    test(`returns config for ${mood}`, () => {
      const cfg = getMoodConfig(mood);
      expect(cfg.label).toBeTruthy();
      expect(cfg.emoji).toBeTruthy();
      expect(cfg.color).toBeTruthy();
    });
  });

  test('returns fallback for unknown mood', () => {
    const cfg = getMoodConfig('unknown');
    expect(cfg.label).toBe('unknown');
  });
});

describe('getPriorityConfig', () => {
  ['low', 'medium', 'high', 'urgent'].forEach(p => {
    test(`returns config for ${p}`, () => {
      const cfg = getPriorityConfig(p);
      expect(cfg.label).toBeTruthy();
      expect(cfg.color).toBeTruthy();
    });
  });
});

describe('getStatusConfig', () => {
  ['pending', 'in_progress', 'completed', 'cancelled'].forEach(s => {
    test(`returns config for ${s}`, () => {
      const cfg = getStatusConfig(s);
      expect(cfg.label).toBeTruthy();
    });
  });
});

describe('getAttendanceConfig', () => {
  ['present', 'absent', 'half_day', 'late'].forEach(s => {
    test(`returns config for ${s}`, () => {
      const cfg = getAttendanceConfig(s);
      expect(cfg.label).toBeTruthy();
      expect(cfg.color).toBeTruthy();
    });
  });
});

describe('capitalize', () => {
  test('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('replaces underscores with spaces', () => {
    expect(capitalize('in_progress')).toBe('In progress');
  });

  test('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  test('handles null', () => {
    expect(capitalize(null)).toBe('');
  });
});

describe('initials', () => {
  test('extracts two initials from full name', () => {
    expect(initials('Arjun Dev')).toBe('AD');
  });

  test('extracts single initial for one word name', () => {
    expect(initials('Priya')).toBe('P');
  });

  test('returns ? for empty name', () => {
    expect(initials('')).toBe('?');
  });

  test('handles extra whitespace', () => {
    expect(initials('  Anjali  Mehta  ')).toBe('AM');
  });
});

describe('pluralize', () => {
  test('uses singular for count 1', () => {
    expect(pluralize(1, 'child')).toBe('1 child');
  });

  test('uses plural for count > 1', () => {
    expect(pluralize(3, 'child', 'children')).toBe('3 children');
  });

  test('auto-appends s when plural not provided', () => {
    expect(pluralize(2, 'task')).toBe('2 tasks');
  });

  test('handles count 0', () => {
    expect(pluralize(0, 'task')).toBe('0 tasks');
  });
});

describe('avatarColor', () => {
  test('returns a CSS color string', () => {
    const color = avatarColor('Arjun');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('returns consistent color for same name', () => {
    expect(avatarColor('Priya')).toBe(avatarColor('Priya'));
  });

  test('handles empty name', () => {
    expect(avatarColor('')).toBeTruthy();
  });
});

describe('formatDuration', () => {
  test('formats minutes only', () => {
    expect(formatDuration(45)).toBe('45m');
  });

  test('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });

  test('formats exact hours', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  test('returns — for 0 or null', () => {
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(null)).toBe('—');
  });
});

describe('extractError', () => {
  test('extracts axios response message', () => {
    const err = { response: { data: { message: 'Not found' } } };
    expect(extractError(err)).toBe('Not found');
  });

  test('extracts first validation error', () => {
    const err = { response: { data: { errors: [{ message: 'Email invalid' }] } } };
    expect(extractError(err)).toBe('Email invalid');
  });

  test('falls back to err.message', () => {
    expect(extractError(new Error('Network error'))).toBe('Network error');
  });

  test('returns default for null', () => {
    expect(extractError(null)).toBe('An unknown error occurred.');
  });
});
