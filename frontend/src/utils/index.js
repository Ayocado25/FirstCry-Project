import { format, formatDistanceToNow, parseISO, isValid, differenceInMonths, differenceInYears } from 'date-fns';

// ── Date formatting ───────────────────────────────────────────
export function formatDate(date, fmt = 'dd MMM yyyy') {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return isValid(d) ? format(d, fmt) : '—';
}

export function formatDateTime(date) {
  return formatDate(date, 'dd MMM yyyy, hh:mm a');
}

export function formatTime(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return isValid(d) ? format(d, 'hh:mm a') : '—';
}

export function timeAgo(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
}

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

// ── Age ───────────────────────────────────────────────────────
export function getAge(dob) {
  if (!dob) return '—';
  const d = typeof dob === 'string' ? parseISO(dob) : new Date(dob);
  const years = differenceInYears(new Date(), d);
  const months = differenceInMonths(new Date(), d);
  if (years < 1) return `${months}m`;
  const remainingMonths = months - years * 12;
  return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
}

// ── Mood ──────────────────────────────────────────────────────
const MOOD_CONFIG = {
  happy:   { label: 'Happy',   emoji: '😊', color: 'var(--mood-happy)' },
  calm:    { label: 'Calm',    emoji: '😌', color: 'var(--mood-calm)' },
  excited: { label: 'Excited', emoji: '🤩', color: 'var(--mood-excited)' },
  fussy:   { label: 'Fussy',   emoji: '😣', color: 'var(--mood-fussy)' },
  tired:   { label: 'Tired',   emoji: '😴', color: 'var(--mood-tired)' },
  upset:   { label: 'Upset',   emoji: '😢', color: 'var(--mood-upset)' },
};
export function getMoodConfig(mood) {
  return MOOD_CONFIG[mood] || { label: mood || 'Unknown', emoji: '❓', color: 'var(--color-text-muted)' };
}

// ── Priority ──────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: 'var(--priority-low)',    bg: '#F3F4F6' },
  medium: { label: 'Medium', color: 'var(--priority-medium)', bg: '#EFF6FF' },
  high:   { label: 'High',   color: 'var(--priority-high)',   bg: '#FFFBEB' },
  urgent: { label: 'Urgent', color: 'var(--priority-urgent)', bg: '#FEF2F2' },
};
export function getPriorityConfig(priority) {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
}

// ── Task status ───────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6' },
  in_progress: { label: 'In Progress', color: '#3B82F6', bg: '#EFF6FF' },
  completed:   { label: 'Completed',   color: '#10B981', bg: '#D1FAE5' },
  cancelled:   { label: 'Cancelled',   color: '#EF4444', bg: '#FEE2E2' },
};
export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

// ── Attendance ────────────────────────────────────────────────
const ATTENDANCE_CONFIG = {
  present:  { label: 'Present',  color: '#10B981', bg: '#D1FAE5' },
  absent:   { label: 'Absent',   color: '#EF4444', bg: '#FEE2E2' },
  half_day: { label: 'Half Day', color: '#F59E0B', bg: '#FEF3C7' },
  late:     { label: 'Late',     color: '#8B5CF6', bg: '#EDE9FE' },
};
export function getAttendanceConfig(status) {
  return ATTENDANCE_CONFIG[status] || { label: status, color: '#6B7280', bg: '#F3F4F6' };
}

// ── Meal amount ───────────────────────────────────────────────
export const MEAL_AMOUNT_LABELS = {
  all: 'All eaten', most: 'Most eaten', half: 'Half eaten',
  little: 'A little', none: 'None eaten',
};
export function getMealAmountLabel(amt) {
  return MEAL_AMOUNT_LABELS[amt] || amt;
}

// ── Strings ───────────────────────────────────────────────────
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length >= 2
    ? parts[0][0].toUpperCase() + parts[1][0].toUpperCase()
    : parts[0]?.[0]?.toUpperCase() ?? '?';
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : (plural ?? singular + 's')}`;
}

// ── Error extraction ──────────────────────────────────────────
export function extractError(err) {
  if (!err) return 'An unknown error occurred.';
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.errors?.[0]?.message) return err.response.data.errors[0].message;
  return err.message || 'Something went wrong.';
}

// ── Colour for avatar ─────────────────────────────────────────
const AVATAR_COLORS = [
  '#6C63FF','#4ECDC4','#FF6B6B','#10B981','#F59E0B','#3B82F6','#8B5CF6','#EC4899',
];
export function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ── Duration ──────────────────────────────────────────────────
export function formatDuration(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
