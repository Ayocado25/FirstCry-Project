import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Baby, Users, ClipboardList, CheckSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { dashboardApi } from '../api/services';
import { StatCard, Card, SectionHeader, Spinner, ErrorState, Badge } from '../components/common';
import { formatDate, getMoodConfig, getStatusConfig, capitalize } from '../utils';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await dashboardApi.kpis();
      setData(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dashboard');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner size={40} />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (!data)   return null;

  const { today, trends, tasks_summary, classrooms } = data;

  const attendanceRate = today.children.attendance_rate;
  const routineRate    = today.routines.completion_rate;

  return (
    <div className={`${styles.root} animate-fade-in`}>
      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        <StatCard
          label="Children Today"
          value={`${today.children.present}/${today.children.total}`}
          subtitle={`${attendanceRate}% attendance`}
          icon={<Baby size={20} />}
          color="var(--color-primary)"
        />
        <StatCard
          label="Staff Present"
          value={`${today.staff.present}/${today.staff.total}`}
          subtitle="Clocked in today"
          icon={<Users size={20} />}
          color="var(--color-secondary)"
        />
        <StatCard
          label="Routines Complete"
          value={`${today.routines.completed}/${today.routines.total}`}
          subtitle={`${routineRate}% completion rate`}
          icon={<ClipboardList size={20} />}
          color="var(--color-success)"
        />
        <StatCard
          label="Tasks Pending"
          value={tasks_summary.pending + tasks_summary.in_progress}
          subtitle={`${tasks_summary.completed} completed overall`}
          icon={<CheckSquare size={20} />}
          color="var(--color-warning)"
        />
      </div>

      <div className={styles.twoCol}>
        {/* Attendance trend */}
        <Card padding>
          <SectionHeader title="Attendance — Last 7 Days" />
          <div className={styles.trendChart}>
            {trends.attendance_7d.map((d) => {
              const pct = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
              return (
                <div key={d.date} className={styles.barGroup}>
                  <div className={styles.barWrap}>
                    <div
                      className={styles.bar}
                      style={{ height: `${pct}%`, background: pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)' }}
                      title={`${pct}%`}
                    />
                  </div>
                  <span className={styles.barLabel}>{formatDate(d.date, 'dd/MM')}</span>
                  <span className={styles.barPct}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Mood distribution */}
        <Card padding>
          <SectionHeader title="Mood Distribution — Last 7 Days" />
          {trends.mood_distribution_7d.length === 0 ? (
            <p className={styles.noData}>No mood data recorded yet.</p>
          ) : (
            <div className={styles.moodList}>
              {trends.mood_distribution_7d.map((m) => {
                const cfg = getMoodConfig(m.overall_mood);
                return (
                  <div key={m.overall_mood} className={styles.moodRow}>
                    <span className={styles.moodEmoji}>{cfg.emoji}</span>
                    <span className={styles.moodLabel}>{cfg.label}</span>
                    <div className={styles.moodBar}>
                      <div
                        className={styles.moodFill}
                        style={{ width: `${Math.min(100, parseInt(m.count) * 10)}%`, background: cfg.color }}
                      />
                    </div>
                    <span className={styles.moodCount}>{m.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Classrooms */}
      <Card padding>
        <SectionHeader
          title="Classrooms"
          subtitle="Today's occupancy per room"
        />
        <div className={styles.classroomGrid}>
          {classrooms.map((cl) => (
            <div
              key={cl.id}
              className={styles.classroomCard}
              onClick={() => navigate(`/routine-log?classroom_id=${cl.id}`)}
            >
              <div className={styles.classroomHeader}>
                <h4 className={styles.classroomName}>{cl.name}</h4>
                <span className={styles.ageGroup}>{cl.age_group}</span>
              </div>
              <div className={styles.occupancyWrap}>
                <div className={styles.occupancyBar}>
                  <div
                    className={styles.occupancyFill}
                    style={{
                      width: `${cl.occupancy_rate}%`,
                      background: cl.occupancy_rate >= 90 ? 'var(--color-danger)' : cl.occupancy_rate >= 70 ? 'var(--color-warning)' : 'var(--color-success)',
                    }}
                  />
                </div>
                <span className={styles.occupancyPct}>{cl.occupancy_rate}%</span>
              </div>
              <div className={styles.classroomStats}>
                <span><strong>{cl.present_today}</strong> present</span>
                <span><strong>{cl.enrolled}</strong>/{cl.capacity} enrolled</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Task summary */}
      <Card padding>
        <SectionHeader
          title="Task Overview"
          action={<button className={styles.viewAll} onClick={() => navigate('/tasks')}>View all →</button>}
        />
        <div className={styles.taskSummaryGrid}>
          {[
            { key: 'pending',     label: 'Pending',     color: '#6B7280' },
            { key: 'in_progress', label: 'In Progress', color: '#3B82F6' },
            { key: 'completed',   label: 'Completed',   color: '#10B981' },
            { key: 'cancelled',   label: 'Cancelled',   color: '#EF4444' },
          ].map((s) => (
            <div key={s.key} className={styles.taskSumItem} style={{ borderLeft: `3px solid ${s.color}` }}>
              <span className={styles.taskSumCount} style={{ color: s.color }}>{tasks_summary[s.key]}</span>
              <span className={styles.taskSumLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
