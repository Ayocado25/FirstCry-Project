import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { routineApi, childrenApi, classroomApi } from '../api/services';
import { Button, Card, SectionHeader, Spinner, EmptyState, Badge, Avatar, Modal } from '../components/common';
import { formatDate, getMoodConfig, getAge } from '../utils';
import styles from './RoutineLogPage.module.css';

export default function RoutineLogPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [routines,    setRoutines]    = useState([]);
  const [children,    setChildren]    = useState([]);
  const [classrooms,  setClassrooms]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [filters,     setFilters]     = useState({
    date: new Date().toISOString().split('T')[0],
    classroom_id: searchParams.get('classroom_id') || '',
    is_complete: '',
  });

  // New routine form state
  const [form, setForm]         = useState({ child_id: '', date: new Date().toISOString().split('T')[0], overall_mood: '', general_notes: '' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadRoutines(); }, [filters]);

  async function loadData() {
    try {
      const [clRes] = await Promise.all([classroomApi.list(), loadRoutines(), loadChildren()]);
      setClassrooms(clRes.data.data || []);
    } catch {}
  }

  async function loadRoutines() {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await routineApi.list({ ...params, limit: 50 });
      setRoutines(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load routines');
    } finally { setLoading(false); }
  }

  async function loadChildren() {
    try {
      const res = await childrenApi.list({ limit: 200, is_active: true });
      setChildren(res.data.data || []);
    } catch {}
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.child_id) { toast.error('Select a child'); return; }
    setSaving(true);
    try {
      const res = await routineApi.create(form);
      toast.success('Routine entry created');
      setShowCreate(false);
      setForm({ child_id: '', date: new Date().toISOString().split('T')[0], overall_mood: '', general_notes: '' });
      navigate(`/routine-log/${res.data.data.id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create routine');
    } finally { setSaving(false); }
  }

  const MOODS = ['happy', 'calm', 'excited', 'fussy', 'tired', 'upset'];

  return (
    <div className={`${styles.root} animate-fade-in`}>
      <SectionHeader
        title="Routine Log"
        subtitle={`${routines.length} entries for ${formatDate(filters.date)}`}
        action={
          <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            New Entry
          </Button>
        }
      />

      {/* Filters */}
      <Card padding className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Date</label>
            <input
              type="date" className={styles.filterInput}
              value={filters.date}
              onChange={e => setFilters(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Classroom</label>
            <select className={styles.filterInput} value={filters.classroom_id}
              onChange={e => setFilters(p => ({ ...p, classroom_id: e.target.value }))}>
              <option value="">All classrooms</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Status</label>
            <select className={styles.filterInput} value={filters.is_complete}
              onChange={e => setFilters(p => ({ ...p, is_complete: e.target.value }))}>
              <option value="">All</option>
              <option value="false">Incomplete</option>
              <option value="true">Complete</option>
            </select>
          </div>
          <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={loadRoutines}>Refresh</Button>
        </div>
      </Card>

      {/* Routine cards */}
      {loading ? <Spinner /> : routines.length === 0 ? (
        <EmptyState
          icon={<span style={{ fontSize: 48 }}>📋</span>}
          title="No routine entries"
          description="No entries found for the selected date and filters."
          action={<Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create First Entry</Button>}
        />
      ) : (
        <div className={styles.grid}>
          {routines.map(r => {
            const mood = getMoodConfig(r.overall_mood);
            return (
              <div key={r.id} className={styles.routineCard} onClick={() => navigate(`/routine-log/${r.id}`)}>
                <div className={styles.cardTop}>
                  <Avatar name={r.child_name} size={40} />
                  <div className={styles.childInfo}>
                    <h3 className={styles.childName}>{r.child_name}</h3>
                    <span className={styles.classroom}>{r.classroom_name || '—'}</span>
                  </div>
                  <div className={styles.statusBadge}>
                    {r.is_complete
                      ? <Badge color="var(--color-success)" bg="var(--color-success-light)">✓ Complete</Badge>
                      : <Badge color="var(--color-warning)" bg="var(--color-warning-light)">In Progress</Badge>}
                  </div>
                </div>

                {r.overall_mood && (
                  <div className={styles.moodRow}>
                    <span>{mood.emoji}</span>
                    <span style={{ color: mood.color, fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{mood.label}</span>
                  </div>
                )}

                <div className={styles.logCounts}>
                  <span title="Meals">🍽 {r.meal_count}</span>
                  <span title="Naps">😴 {r.nap_count}</span>
                  <span title="Diapers">🧷 {r.diaper_count}</span>
                  <span title="Activities">🎨 {r.activity_count}</span>
                  {r.summary_sent_at && <span title="Summary sent" style={{ color: 'var(--color-success)' }}>📩 Sent</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Routine Entry"
        footer={<>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button loading={saving} onClick={handleCreate}>Create & Open</Button>
        </>}
      >
        <form className={styles.createForm} onSubmit={handleCreate}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Child *</label>
            <select className={styles.formInput} value={form.child_id}
              onChange={e => setForm(p => ({ ...p, child_id: e.target.value }))} required>
              <option value="">Select a child</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.classroom_name || 'No class'}</option>)}
            </select>
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Date *</label>
            <input type="date" className={styles.formInput} value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Overall Mood</label>
            <div className={styles.moodGrid}>
              {MOODS.map(m => {
                const cfg = getMoodConfig(m);
                return (
                  <button key={m} type="button"
                    className={`${styles.moodBtn} ${form.overall_mood === m ? styles.moodBtnActive : ''}`}
                    style={form.overall_mood === m ? { borderColor: cfg.color, background: `${cfg.color}18` } : {}}
                    onClick={() => setForm(p => ({ ...p, overall_mood: p.overall_mood === m ? '' : m }))}>
                    <span>{cfg.emoji}</span>
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>General Notes</label>
            <textarea className={styles.formTextarea} rows={3}
              placeholder="Optional notes about the day…"
              value={form.general_notes}
              onChange={e => setForm(p => ({ ...p, general_notes: e.target.value }))} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
