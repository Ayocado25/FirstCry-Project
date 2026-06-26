'use strict';

/**
 * Rule-based daily summary generator.
 * Produces a natural-language paragraph for parent notifications.
 * No external API required — pure deterministic logic.
 */

const MOOD_PHRASES = {
  happy:   ['had a wonderful', 'enjoyed a cheerful', 'had a joyful'],
  calm:    ['had a peaceful', 'enjoyed a relaxed', 'had a settled'],
  excited: ['had an energetic', 'had a lively', 'was full of energy for'],
  fussy:   ['had a slightly fussy', 'had a challenging', 'had a mixed'],
  tired:   ['had a sleepy', 'seemed tired during', 'had a quiet'],
  upset:   ['had a difficult', 'had a tough', 'needed extra comfort during'],
};

const MEAL_AMOUNT_PHRASES = {
  all:    'ate everything on the plate',
  most:   'ate most of the meal',
  half:   'ate about half the meal',
  little: 'only ate a little',
  none:   'did not eat',
};

const ACTIVITY_PHRASES = {
  play:     'enjoyed playtime',
  outdoor:  'spent time outdoors',
  art:      'explored art and creativity',
  music:    'participated in music activities',
  reading:  'enjoyed story time',
  learning: 'engaged in learning activities',
  other:    'participated in group activities',
};

const MOOD_CLOSING = {
  happy:   'Overall it was a great day!',
  calm:    'It was a calm and comfortable day.',
  excited: 'The energy and enthusiasm were wonderful to see!',
  fussy:   'We gave lots of comfort and care throughout the day.',
  tired:   'We made sure there was plenty of rest time.',
  upset:   'The team gave extra attention and support all day.',
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getAgeInMonths(dob) {
  const birth = new Date(dob);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

function firstName(fullName) {
  return fullName?.split(' ')[0] || fullName || 'Your child';
}

/**
 * Main export — generates a 3–5 sentence daily summary paragraph.
 */
function generateDailySummary({ child, routine, meals = [], naps = [], activities = [] }) {
  const name = firstName(child.full_name);
  const mood = routine.overall_mood || 'calm';
  const date = new Date(routine.date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const sentences = [];

  // Opening sentence — mood
  const moodPhrases = MOOD_PHRASES[mood] || MOOD_PHRASES.calm;
  sentences.push(`${name} ${pick(moodPhrases)} day at Intellitots on ${date}.`);

  // Meals section
  if (meals.length > 0) {
    const mealParts = meals.map((m) => {
      const typeLabel = m.meal_type.replace('_', ' ');
      const amountPhrase = MEAL_AMOUNT_PHRASES[m.amount_eaten] || 'had a meal';
      const food = m.food_items ? ` (${m.food_items})` : '';
      return `${amountPhrase} at ${typeLabel}${food}`;
    });

    if (mealParts.length === 1) {
      sentences.push(`For meals, ${name} ${mealParts[0]}.`);
    } else {
      const last = mealParts.pop();
      sentences.push(`For meals, ${name} ${mealParts.join(', ')} and ${last}.`);
    }
  } else {
    sentences.push(`Meal details were not recorded today.`);
  }

  // Nap section
  if (naps.length > 0) {
    const totalMins = naps.reduce((sum, n) => sum + (n.duration_mins || 0), 0);
    if (totalMins > 0) {
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} minutes`;
      const quality = naps[0].sleep_quality;
      const qualityAdj = quality === 'good' ? 'a restful' : quality === 'restless' ? 'a slightly restless' : 'a';
      sentences.push(`${name} had ${qualityAdj} nap totalling ${duration}.`);
    } else {
      sentences.push(`${name} had a nap during the day.`);
    }
  } else {
    const ageMonths = child.date_of_birth ? getAgeInMonths(child.date_of_birth) : 30;
    if (ageMonths < 36) {
      sentences.push(`No nap was recorded today.`);
    }
  }

  // Activities section
  if (activities.length > 0) {
    const actParts = activities.map((a) => {
      const base = ACTIVITY_PHRASES[a.activity_type] || 'participated in activities';
      const specific = a.activity_name ? ` (${a.activity_name})` : '';
      return base + specific;
    });

    if (actParts.length === 1) {
      sentences.push(`During the day, ${name} ${actParts[0]}.`);
    } else {
      const last = actParts.pop();
      sentences.push(`During the day, ${name} ${actParts.join(', ')} and ${last}.`);
    }
  }

  // Teacher notes (if any)
  if (routine.general_notes?.trim()) {
    sentences.push(`Teacher's note: ${routine.general_notes.trim()}`);
  }

  // Closing sentence
  sentences.push(MOOD_CLOSING[mood] || 'We look forward to seeing you tomorrow.');

  return sentences.join(' ');
}

/**
 * Generate a short one-line status for dashboard cards.
 */
function generateStatusLine({ child, routine, meals = [], naps = [] }) {
  const name = firstName(child.full_name);
  const mood = routine.overall_mood || 'calm';
  const mealCount = meals.length;
  const napCount = naps.length;

  const parts = [];
  if (mood) parts.push(`Mood: ${mood}`);
  if (mealCount) parts.push(`${mealCount} meal${mealCount > 1 ? 's' : ''} logged`);
  if (napCount) parts.push(`nap recorded`);

  return `${name} — ${parts.join(' · ')}`;
}

/**
 * Generate teacher task completion note.
 */
function generateTaskNote(task) {
  const priority = task.priority;
  if (priority === 'urgent') return `⚠️ Urgent: This task requires immediate attention.`;
  if (priority === 'high') return `This is a high-priority task. Please complete it as soon as possible.`;
  return `Please complete this task by the due date.`;
}

module.exports = { generateDailySummary, generateStatusLine, generateTaskNote };
