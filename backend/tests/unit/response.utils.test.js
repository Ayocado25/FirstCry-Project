'use strict';
const { paginate, getOffset, formatDate, getWeekStart, getWeekDates } = require('../../src/utils/response');

describe('Pagination utils', () => {
  test('paginate returns correct structure', () => {
    const result = paginate([1, 2, 3], 30, 2, 10);
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.pagination.total).toBe(30);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.total_pages).toBe(3);
    expect(result.pagination.has_next).toBe(true);
    expect(result.pagination.has_prev).toBe(true);
  });

  test('has_next is false on last page', () => {
    const result = paginate([], 10, 2, 10);
    expect(result.pagination.has_next).toBe(false);
  });

  test('has_prev is false on first page', () => {
    const result = paginate([], 50, 1, 20);
    expect(result.pagination.has_prev).toBe(false);
  });

  test('total_pages rounds up correctly', () => {
    expect(paginate([], 21, 1, 10).pagination.total_pages).toBe(3);
    expect(paginate([], 20, 1, 10).pagination.total_pages).toBe(2);
    expect(paginate([], 1, 1, 10).pagination.total_pages).toBe(1);
    expect(paginate([], 0, 1, 10).pagination.total_pages).toBe(0);
  });

  test('getOffset page 1 returns 0', () => {
    expect(getOffset(1, 20)).toBe(0);
  });

  test('getOffset page 2 returns limit', () => {
    expect(getOffset(2, 20)).toBe(20);
  });

  test('getOffset page 3 with limit 10 returns 20', () => {
    expect(getOffset(3, 10)).toBe(20);
  });
});

describe('Date utils', () => {
  test('formatDate returns YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-06-15T10:00:00Z'))).toBe('2026-06-15');
  });

  test('formatDate returns null for null input', () => {
    expect(formatDate(null)).toBeNull();
  });

  test('getWeekDates returns exactly 7 dates', () => {
    const dates = getWeekDates(new Date('2026-06-08'));
    expect(dates).toHaveLength(7);
  });

  test('getWeekDates starts on the given date', () => {
    const dates = getWeekDates(new Date('2026-06-08'));
    expect(dates[0]).toBe('2026-06-08');
  });

  test('getWeekDates ends 6 days after start', () => {
    const dates = getWeekDates(new Date('2026-06-08'));
    expect(dates[6]).toBe('2026-06-14');
  });

  test('getWeekStart returns Monday for a Wednesday', () => {
    const monday = getWeekStart(new Date('2026-06-10')); // Wednesday
    expect(monday.getDay()).toBe(1);
  });

  test('getWeekStart returns same Monday for a Monday', () => {
    const monday = getWeekStart(new Date('2026-06-08')); // Monday
    expect(monday.getDay()).toBe(1);
    expect(formatDate(monday)).toBe('2026-06-08');
  });
});
