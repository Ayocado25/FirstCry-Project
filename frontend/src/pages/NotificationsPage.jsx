import React, { useState, useEffect } from 'react';
import { Send, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationApi, classroomApi } from '../api/services';
import { Button, Card, SectionHeader, Spinner, EmptyState, Badge } from '../components/common';
import { formatDate, formatDateTime } from '../utils';
import styles from './NotificationsPage.module.css';

const STATUS_COLORS = {
  sent:    { color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  failed:  { color: 'var(--color-danger)',  bg: 'var(--color-danger-light)' },
  pending: { color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
};

export default function NotificationsPage() {
  const [history,    setHistory]    = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [form,       setForm]       = useState({ date: new Date().toISOString().split('T')[0], classroom_id: '', channels: ['email'] });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [hRes, cRes] = await Promise.all([
        notificationApi.history({ limit: 50 }),
        classroomApi.list(),
      ]);
      setHistory(hRes.data.data || []);
      setClassrooms(cRes.data.data || []);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  }

  async function sendSummaries() {
    setSending(true);
    try {
      const payload = { date: form.date, channels: form.channels };
      if (form.classroom_id) payload.classroom_id = form.classroom_id;
      const res = await notificationApi.sendDaily(payload);
      const d = res.data.data;
      toast.success(`Sent: ${d.sent}, Failed: ${d.failed}, Skipped: ${d.skipped}`);
      loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  }

  function toggleChannel(ch) {
    setForm(p => ({
      ...p, channels: p.channels.includes(ch) ? p.channels.filter(c => c !== ch) : [...p.channels, ch],
    }));
  }

  return (
    <div className={`${styles.root} animate-fade-in`}>
      <SectionHeader title="Notifications" subtitle="Send daily summaries to parents" />

      <Card padding className={styles.sendCard}>
        <h3 className={styles.sendTitle}>Send Daily Summaries</h3>
        <div className={styles.sendRow}>
          <div className={styles.sendField}>
            <label className={styles.sendLabel}>Date</label>
            <input type="date" className={styles.inp} value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className={styles.sendField}>
            <label className={styles.sendLabel}>Classroom (optional)</label>
            <select className={styles.inp} value={form.classroom_id}
              onChange={e => setForm(p => ({ ...p, classroom_id: e.target.value }))}>
              <option value="">All classrooms</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.sendField}>
            <label className={styles.sendLabel}>Channels</label>
            <div className={styles.channelRow}>
              {['email', 'whatsapp'].map(ch => (
                <label key={ch} className={styles.channelLabel}>
                  <input type="checkbox" checked={form.channels.includes(ch)} onChange={() => toggleChannel(ch)} />
                  {ch.charAt(0).toUpperCase() + ch.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <Button icon={<Send size={16} />} loading={sending} onClick={sendSummaries}
            disabled={form.channels.length === 0}>
            Send Summaries
          </Button>
        </div>
        <p className={styles.sendNote}>
          Only routines marked <strong>Complete</strong> with a registered parent contact will receive summaries.
        </p>
      </Card>

      <SectionHeader title="Notification History" subtitle={`${history.length} records`} />
      {loading ? <Spinner /> : history.length === 0 ? (
        <EmptyState icon={<Bell size={40} />} title="No notifications sent yet"
          description="Send your first daily summary using the form above." />
      ) : (
        <div className={styles.historyList}>
          {history.map(n => {
            const sc = STATUS_COLORS[n.status] || STATUS_COLORS.pending;
            return (
              <div key={n.id} className={styles.historyItem}>
                <div className={styles.historyLeft}>
                  <span className={styles.channelIcon}>{n.channel === 'email' ? '✉' : '💬'}</span>
                  <div>
                    <p className={styles.historyChild}>{n.child_name || 'Unknown child'}</p>
                    <p className={styles.historyRecipient}>{n.recipient}</p>
                    {n.subject && <p className={styles.historySubject}>{n.subject}</p>}
                  </div>
                </div>
                <div className={styles.historyRight}>
                  <Badge color={sc.color} bg={sc.bg}>{n.status}</Badge>
                  <span className={styles.historyTime}>{formatDateTime(n.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
