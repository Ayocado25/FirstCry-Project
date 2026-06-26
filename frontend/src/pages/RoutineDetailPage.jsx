import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { routineApi, notificationApi } from '../api/services';
import { Button, Card, SectionHeader, Spinner, ErrorState, Badge, Modal } from '../components/common';
import { formatDate, formatTime, formatDuration, getMoodConfig, getMealAmountLabel, capitalize } from '../utils';
import styles from './RoutineDetailPage.module.css';

const MOODS = ['happy', 'calm', 'excited', 'fussy', 'tired', 'upset'];
const MEAL_TYPES = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'];
const MEAL_AMOUNTS = ['none', 'little', 'half', 'most', 'all'];
const ACTIVITY_TYPES = ['play', 'outdoor', 'art', 'music', 'reading', 'learning', 'other'];
const SLEEP_QUALITIES = ['good', 'restless', 'short', 'long'];
const DIAPER_TYPES = ['wet', 'soiled', 'dry', 'not_checked'];

export default function RoutineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [saving,  setSaving]  = useState(false);

  // Modal states
  const [addModal, setAddModal] = useState(null); // 'meal'|'nap'|'diaper'|'activity'|'mood'

  // Sub-form states
  const [mealForm,     setMealForm]     = useState({ meal_type: 'breakfast', food_items: '', amount_eaten: 'most', notes: '' });
  const [napForm,      setNapForm]      = useState({ start_time: '', end_time: '', sleep_quality: 'good', notes: '' });
  const [diaperForm,   setDiaperForm]   = useState({ change_time: new Date().toISOString().slice(0,16), diaper_type: 'wet', notes: '' });
  const [actForm,      setActForm]      = useState({ activity_type: 'play', activity_name: '', description: '', notes: '' });
  const [moodForm,     setMoodForm]     = useState({ mood: 'happy', notes: '' });
  const [moodEdit,     setMoodEdit]     = useState('');
  const [notesEdit,    setNotesEdit]    = useState('');

  useEffect(() => { loadRoutine(); }, [id]);

  async function loadRoutine() {
    setLoading(true); setError(null);
    try {
      const res = await routineApi.get(id);
      setRoutine(res.data.data);
      setMoodEdit(res.data.data.overall_mood || '');
      setNotesEdit(res.data.data.general_notes || '');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load routine');
    } finally { setLoading(false); }
  }

  async function updateRoutineMeta() {
    try {
      await routineApi.update(id, { overall_mood: moodEdit, general_notes: notesEdit });
      toast.success('Routine updated');
      loadRoutine();
    } catch { toast.error('Update failed'); }
  }

  async function markComplete() {
    setSaving(true);
    try {
      await routineApi.update(id, { is_complete: true });
      toast.success('Routine marked complete');
      loadRoutine();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  }

  async function sendSummary() {
    setSaving(true);
    try {
      await notificationApi.sendDaily({ date: routine.date, child_ids: [routine.child_id], channels: ['email'] });
      toast.success('Summary sent to parent');
      loadRoutine();
    } catch { toast.error('Failed to send summary'); } finally { setSaving(false); }
  }

  async function submitSubLog(type) {
    setSaving(true);
    try {
      const routineId = id;
      switch (type) {
        case 'meal':
          await routineApi.addMeal({ routine_id: routineId, ...mealForm });
          break;
        case 'nap':
          await routineApi.addNap({ routine_id: routineId, ...napForm,
            start_time: napForm.start_time || null, end_time: napForm.end_time || null });
          break;
        case 'diaper':
          await routineApi.addDiaper({ routine_id: routineId, ...diaperForm });
          break;
        case 'activity':
          await routineApi.addActivity({ routine_id: routineId, ...actForm });
          break;
        case 'mood':
          await routineApi.addMood({ routine_id: routineId, ...moodForm });
          break;
        default: break;
      }
      toast.success(`${capitalize(type)} logged`);
      setAddModal(null);
      loadRoutine();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  async function deleteSubLog(type, subId) {
    if (!window.confirm('Delete this entry?')) return;
    try {
      if (type === 'meal')     await routineApi.deleteMeal(subId);
      if (type === 'nap')      await routineApi.deleteNap(subId);
      if (type === 'diaper')   await routineApi.deleteDiaper(subId);
      if (type === 'activity') await routineApi.deleteActivity(subId);
      toast.success('Entry deleted');
      loadRoutine();
    } catch { toast.error('Delete failed'); }
  }

  if (loading) return <Spinner size={40} />;
  if (error)   return <ErrorState message={error} onRetry={loadRoutine} />;
  if (!routine) return null;

  const mood = getMoodConfig(routine.overall_mood);

  return (
    <div className={`${styles.root} animate-fade-in`}>
      {/* Back + header */}
      <div className={styles.topBar}>
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/routine-log')}>
          Back
        </Button>
        <div className={styles.actions}>
          {!routine.is_complete && (
            <Button variant="success" icon={<CheckCircle size={16} />} onClick={markComplete} loading={saving}>
              Mark Complete
            </Button>
          )}
          {routine.is_complete && !routine.summary_sent_at && (
            <Button variant="secondary" icon={<Send size={16} />} onClick={sendSummary} loading={saving}>
              Send Summary
            </Button>
          )}
        </div>
      </div>

      {/* Child header */}
      <Card padding className={styles.childCard}>
        <div className={styles.childRow}>
          <div className={styles.childMeta}>
            <h2 className={styles.childName}>{routine.child_name}</h2>
            <span className={styles.classroom}>{routine.classroom_name || '—'}</span>
          </div>
          <div className={styles.dateBadge}>{formatDate(routine.date, 'EEEE, dd MMMM yyyy')}</div>
          <div className={styles.badges}>
            {routine.is_complete
              ? <Badge color="var(--color-success)" bg="var(--color-success-light)">✓ Complete</Badge>
              : <Badge color="var(--color-warning)" bg="var(--color-warning-light)">In Progress</Badge>}
            {routine.summary_sent_at && <Badge color="var(--color-info)" bg="var(--color-info-light)">📩 Summary Sent</Badge>}
          </div>
        </div>

        {/* Mood + notes editing */}
        <div className={styles.moodEditor}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Overall Mood</label>
            <div className={styles.moodPills}>
              {MOODS.map(m => {
                const cfg = getMoodConfig(m);
                return (
                  <button key={m} type="button"
                    className={`${styles.moodPill} ${moodEdit === m ? styles.moodPillActive : ''}`}
                    style={moodEdit === m ? { borderColor: cfg.color, background: `${cfg.color}18`, color: cfg.color } : {}}
                    onClick={() => setMoodEdit(p => p === m ? '' : m)}>
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>General Notes</label>
            <textarea className={styles.textarea} rows={2}
              value={notesEdit} onChange={e => setNotesEdit(e.target.value)}
              placeholder="Overall observations for the day…" />
          </div>
          <Button variant="secondary" size="sm" onClick={updateRoutineMeta}>Save Changes</Button>
        </div>
      </Card>

      <div className={styles.sectionsGrid}>
        {/* Meals */}
        <Section title="🍽 Meals" count={routine.meals?.length}
          onAdd={() => setAddModal('meal')}>
          {routine.meals?.length === 0 ? <Empty text="No meals logged" /> : routine.meals?.map(m => (
            <LogItem key={m.id} onDelete={() => deleteSubLog('meal', m.id)}>
              <strong>{capitalize(m.meal_type)}</strong>
              <span>{getMealAmountLabel(m.amount_eaten)}</span>
              {m.food_items && <span className={styles.subNote}>{m.food_items}</span>}
              {m.time_served && <span className={styles.time}>{formatTime(m.time_served)}</span>}
            </LogItem>
          ))}
        </Section>

        {/* Naps */}
        <Section title="😴 Naps" count={routine.naps?.length}
          onAdd={() => setAddModal('nap')}>
          {routine.naps?.length === 0 ? <Empty text="No naps logged" /> : routine.naps?.map(n => (
            <LogItem key={n.id} onDelete={() => deleteSubLog('nap', n.id)}>
              <strong>{n.sleep_quality ? capitalize(n.sleep_quality) : 'Nap'}</strong>
              {n.duration_mins && <span>{formatDuration(n.duration_mins)}</span>}
              <span className={styles.time}>{formatTime(n.start_time)} – {formatTime(n.end_time)}</span>
            </LogItem>
          ))}
        </Section>

        {/* Diapers */}
        <Section title="🧷 Diaper Changes" count={routine.diapers?.length}
          onAdd={() => setAddModal('diaper')}>
          {routine.diapers?.length === 0 ? <Empty text="No changes logged" /> : routine.diapers?.map(d => (
            <LogItem key={d.id} onDelete={() => deleteSubLog('diaper', d.id)}>
              <strong>{capitalize(d.diaper_type)}</strong>
              <span className={styles.time}>{formatTime(d.change_time)}</span>
              {d.notes && <span className={styles.subNote}>{d.notes}</span>}
            </LogItem>
          ))}
        </Section>

        {/* Activities */}
        <Section title="🎨 Activities" count={routine.activities?.length}
          onAdd={() => setAddModal('activity')}>
          {routine.activities?.length === 0 ? <Empty text="No activities logged" /> : routine.activities?.map(a => (
            <LogItem key={a.id} onDelete={() => deleteSubLog('activity', a.id)}>
              <strong>{a.activity_name || capitalize(a.activity_type)}</strong>
              <span className={styles.actType}>{capitalize(a.activity_type)}</span>
              {a.description && <span className={styles.subNote}>{a.description}</span>}
              {a.start_time && <span className={styles.time}>{formatTime(a.start_time)} – {formatTime(a.end_time)}</span>}
            </LogItem>
          ))}
        </Section>
      </div>

      {/* AI Summary */}
      {routine.summary_text && (
        <Card padding>
          <h3 className={styles.summaryTitle}>📝 Daily Summary (sent to parent)</h3>
          <p className={styles.summaryText}>{routine.summary_text}</p>
          {routine.summary_sent_at && <p className={styles.sentAt}>Sent: {formatDate(routine.summary_sent_at, 'dd MMM yyyy, hh:mm a')}</p>}
        </Card>
      )}

      {/* Add Meal Modal */}
      <Modal open={addModal === 'meal'} onClose={() => setAddModal(null)} title="Log Meal"
        footer={<><Button variant="secondary" onClick={() => setAddModal(null)}>Cancel</Button><Button loading={saving} onClick={() => submitSubLog('meal')}>Save</Button></>}>
        <div className={styles.subForm}>
          <Field label="Meal Type">
            <select className={styles.inp} value={mealForm.meal_type} onChange={e => setMealForm(p => ({...p, meal_type: e.target.value}))}>
              {MEAL_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
            </select>
          </Field>
          <Field label="Food Items">
            <input className={styles.inp} placeholder="e.g. Idli, sambar, juice" value={mealForm.food_items} onChange={e => setMealForm(p => ({...p, food_items: e.target.value}))} />
          </Field>
          <Field label="Amount Eaten">
            <select className={styles.inp} value={mealForm.amount_eaten} onChange={e => setMealForm(p => ({...p, amount_eaten: e.target.value}))}>
              {MEAL_AMOUNTS.map(a => <option key={a} value={a}>{getMealAmountLabel(a)}</option>)}
            </select>
          </Field>
          <Field label="Notes"><input className={styles.inp} value={mealForm.notes} onChange={e => setMealForm(p => ({...p, notes: e.target.value}))} /></Field>
        </div>
      </Modal>

      {/* Add Nap Modal */}
      <Modal open={addModal === 'nap'} onClose={() => setAddModal(null)} title="Log Nap"
        footer={<><Button variant="secondary" onClick={() => setAddModal(null)}>Cancel</Button><Button loading={saving} onClick={() => submitSubLog('nap')}>Save</Button></>}>
        <div className={styles.subForm}>
          <Field label="Start Time"><input type="datetime-local" className={styles.inp} value={napForm.start_time} onChange={e => setNapForm(p => ({...p, start_time: e.target.value}))} /></Field>
          <Field label="End Time"><input type="datetime-local" className={styles.inp} value={napForm.end_time} onChange={e => setNapForm(p => ({...p, end_time: e.target.value}))} /></Field>
          <Field label="Sleep Quality">
            <select className={styles.inp} value={napForm.sleep_quality} onChange={e => setNapForm(p => ({...p, sleep_quality: e.target.value}))}>
              {SLEEP_QUALITIES.map(q => <option key={q} value={q}>{capitalize(q)}</option>)}
            </select>
          </Field>
          <Field label="Notes"><input className={styles.inp} value={napForm.notes} onChange={e => setNapForm(p => ({...p, notes: e.target.value}))} /></Field>
        </div>
      </Modal>

      {/* Add Diaper Modal */}
      <Modal open={addModal === 'diaper'} onClose={() => setAddModal(null)} title="Log Diaper Change"
        footer={<><Button variant="secondary" onClick={() => setAddModal(null)}>Cancel</Button><Button loading={saving} onClick={() => submitSubLog('diaper')}>Save</Button></>}>
        <div className={styles.subForm}>
          <Field label="Time"><input type="datetime-local" className={styles.inp} value={diaperForm.change_time} onChange={e => setDiaperForm(p => ({...p, change_time: e.target.value}))} /></Field>
          <Field label="Type">
            <select className={styles.inp} value={diaperForm.diaper_type} onChange={e => setDiaperForm(p => ({...p, diaper_type: e.target.value}))}>
              {DIAPER_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
            </select>
          </Field>
          <Field label="Notes"><input className={styles.inp} value={diaperForm.notes} onChange={e => setDiaperForm(p => ({...p, notes: e.target.value}))} /></Field>
        </div>
      </Modal>

      {/* Add Activity Modal */}
      <Modal open={addModal === 'activity'} onClose={() => setAddModal(null)} title="Log Activity"
        footer={<><Button variant="secondary" onClick={() => setAddModal(null)}>Cancel</Button><Button loading={saving} onClick={() => submitSubLog('activity')}>Save</Button></>}>
        <div className={styles.subForm}>
          <Field label="Type">
            <select className={styles.inp} value={actForm.activity_type} onChange={e => setActForm(p => ({...p, activity_type: e.target.value}))}>
              {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
            </select>
          </Field>
          <Field label="Name"><input className={styles.inp} placeholder="e.g. Finger Painting" value={actForm.activity_name} onChange={e => setActForm(p => ({...p, activity_name: e.target.value}))} /></Field>
          <Field label="Description"><input className={styles.inp} value={actForm.description} onChange={e => setActForm(p => ({...p, description: e.target.value}))} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, count, onAdd, children }) {
  return (
    <Card className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title} <span className={styles.sectionCount}>{count}</span></h3>
        <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={onAdd}>Add</Button>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </Card>
  );
}

function LogItem({ children, onDelete }) {
  return (
    <div className={styles.logItem}>
      <div className={styles.logItemContent}>{children}</div>
      <button className={styles.deleteBtn} onClick={onDelete} title="Delete"><Trash2 size={14} /></button>
    </div>
  );
}

function Empty({ text }) {
  return <p className={styles.emptyText}>{text}</p>;
}

function Field({ label, children }) {
  return (
    <div className={styles.subField}>
      <label className={styles.subLabel}>{label}</label>
      {children}
    </div>
  );
}
