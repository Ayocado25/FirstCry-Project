'use strict';
const { generateDailySummary, generateStatusLine } = require('../../src/services/summary.service');

const baseChild = { full_name: 'Aryan Gupta', date_of_birth: '2023-03-15' };
const baseRoutine = { overall_mood: 'happy', general_notes: '', date: '2026-06-10' };

describe('Summary Service — generateDailySummary', () => {
  test('returns a non-empty string', () => {
    const result = generateDailySummary({ child: baseChild, routine: baseRoutine });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(20);
  });

  test('includes child first name', () => {
    const result = generateDailySummary({ child: baseChild, routine: baseRoutine });
    expect(result).toContain('Aryan');
  });

  test('includes meal description when meals provided', () => {
    const meals = [{ meal_type: 'breakfast', food_items: 'Idli', amount_eaten: 'all', time_served: new Date() }];
    const result = generateDailySummary({ child: baseChild, routine: baseRoutine, meals });
    expect(result.toLowerCase()).toMatch(/breakfast|meal/);
  });

  test('includes nap description when naps provided', () => {
    const naps = [{
      start_time: new Date(),
      end_time: new Date(Date.now() + 3600000),
      duration_mins: 60,
      sleep_quality: 'good',
    }];
    const result = generateDailySummary({ child: baseChild, routine: baseRoutine, naps });
    expect(result.toLowerCase()).toMatch(/nap|sleep|restful/);
  });

  test('includes activity description', () => {
    const activities = [{ activity_type: 'art', activity_name: 'Finger Painting', start_time: null, end_time: null }];
    const result = generateDailySummary({ child: baseChild, routine: baseRoutine, activities });
    expect(result.toLowerCase()).toMatch(/art|creativity/);
  });

  test('handles all mood types without throwing', () => {
    ['happy', 'calm', 'excited', 'fussy', 'tired', 'upset'].forEach((mood) => {
      expect(() => generateDailySummary({
        child: baseChild,
        routine: { ...baseRoutine, overall_mood: mood },
      })).not.toThrow();
    });
  });

  test('handles missing optional data gracefully', () => {
    expect(() => generateDailySummary({ child: baseChild, routine: baseRoutine })).not.toThrow();
  });

  test('appends general_notes when provided', () => {
    const routine = { ...baseRoutine, general_notes: 'Brought in a toy car today.' };
    const result = generateDailySummary({ child: baseChild, routine });
    expect(result).toContain('toy car');
  });

  test('handles multiple meals', () => {
    const meals = [
      { meal_type: 'breakfast', food_items: 'Idli', amount_eaten: 'all', time_served: new Date() },
      { meal_type: 'lunch', food_items: 'Rice and dal', amount_eaten: 'most', time_served: new Date() },
    ];
    const result = generateDailySummary({ child: baseChild, routine: baseRoutine, meals });
    expect(result.toLowerCase()).toMatch(/breakfast|lunch/);
  });

  test('handles multiple activities', () => {
    const activities = [
      { activity_type: 'play', activity_name: 'Blocks' },
      { activity_type: 'outdoor', activity_name: 'Garden' },
    ];
    const result = generateDailySummary({ child: baseChild, routine: baseRoutine, activities });
    expect(result.toLowerCase()).toMatch(/play|outdoor/);
  });
});

describe('Summary Service — generateStatusLine', () => {
  test('returns string with child name', () => {
    const result = generateStatusLine({ child: baseChild, routine: baseRoutine });
    expect(result).toContain('Aryan');
  });

  test('includes meal count', () => {
    const meals = [
      { meal_type: 'breakfast', amount_eaten: 'all' },
      { meal_type: 'lunch', amount_eaten: 'half' },
    ];
    const result = generateStatusLine({ child: baseChild, routine: baseRoutine, meals });
    expect(result).toMatch(/2 meals/);
  });

  test('includes mood', () => {
    const result = generateStatusLine({ child: baseChild, routine: baseRoutine });
    expect(result.toLowerCase()).toContain('happy');
  });
});
