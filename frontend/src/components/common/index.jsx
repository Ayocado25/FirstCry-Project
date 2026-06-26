import React from 'react';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { initials, avatarColor } from '../../utils';
import styles from './Common.module.css';

/* ── Button ─────────────────────────────────────────────────── */
export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, iconRight,
  className = '', ...props
}) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn-${variant}`]} ${styles[`btn-${size}`]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon && <span className={styles.btnIcon}>{icon}</span>}
      {children}
      {iconRight && !loading && <span className={styles.btnIconRight}>{iconRight}</span>}
    </button>
  );
}

/* ── Badge ──────────────────────────────────────────────────── */
export function Badge({ children, color, bg, style = {}, className = '' }) {
  return (
    <span
      className={`${styles.badge} ${className}`}
      style={{ color, backgroundColor: bg, ...style }}
    >
      {children}
    </span>
  );
}

/* ── Spinner ────────────────────────────────────────────────── */
export function Spinner({ size = 24, className = '' }) {
  return (
    <div className={`${styles.spinnerWrap} ${className}`}>
      <Loader2 size={size} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
    </div>
  );
}

/* ── Full-page loader ───────────────────────────────────────── */
export function PageLoader() {
  return (
    <div className={styles.pageLoader}>
      <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      <p>Loading…</p>
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────────── */
export function Avatar({ name, src, size = 36, className = '' }) {
  const bg = avatarColor(name);
  const style = { width: size, height: size, fontSize: Math.floor(size * 0.38), background: bg };
  if (src) {
    return <img src={src} alt={name} className={`${styles.avatar} ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <div className={`${styles.avatar} ${styles.avatarInitials} ${className}`} style={style} aria-label={name}>
      {initials(name)}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────── */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className={styles.emptyState}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description && <p className={styles.emptyDesc}>{description}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

/* ── Error state ─────────────────────────────────────────────── */
export function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorState}>
      <AlertCircle size={40} color="var(--color-danger)" />
      <p>{message || 'Something went wrong.'}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────── */
export function Skeleton({ width = '100%', height = 18, className = '', style = {} }) {
  return (
    <div
      className={`${styles.skeleton} animate-pulse ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

/* ── Card ────────────────────────────────────────────────────── */
export function Card({ children, className = '', padding = true }) {
  return (
    <div className={`card ${padding ? 'card-padded' : ''} ${className}`}>
      {children}
    </div>
  );
}

/* ── Section header ──────────────────────────────────────────── */
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, width = 520 }) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} animate-fade-in`}
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>{title}</h3>
            <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
          </div>
        )}
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────── */
export function StatCard({ label, value, subtitle, icon, color = 'var(--color-primary)', trend }) {
  return (
    <div className={`card card-padded ${styles.statCard}`}>
      <div className={styles.statHeader}>
        <span className={styles.statLabel}>{label}</span>
        {icon && (
          <div className={styles.statIcon} style={{ background: `${color}18`, color }}>
            {icon}
          </div>
        )}
      </div>
      <div className={styles.statValue} style={{ color }}>{value ?? '—'}</div>
      {subtitle && <div className={styles.statSubtitle}>{subtitle}</div>}
      {trend !== undefined && (
        <div className={styles.statTrend} style={{ color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

/* ── Info box ─────────────────────────────────────────────────── */
export function InfoBox({ children, variant = 'info' }) {
  const colors = {
    info:    { bg: 'var(--color-info-light)',    border: 'var(--color-info)',    icon: <Info size={16} /> },
    warning: { bg: 'var(--color-warning-light)', border: 'var(--color-warning)', icon: <AlertCircle size={16} /> },
    danger:  { bg: 'var(--color-danger-light)',  border: 'var(--color-danger)',  icon: <AlertCircle size={16} /> },
    success: { bg: 'var(--color-success-light)', border: 'var(--color-success)', icon: null },
  };
  const c = colors[variant] || colors.info;
  return (
    <div style={{ background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 'var(--font-size-sm)', display: 'flex', gap: 8, alignItems: 'flex-start', color: c.border }}>
      {c.icon}
      <span style={{ color: 'var(--color-text-primary)' }}>{children}</span>
    </div>
  );
}
