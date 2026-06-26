import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskApi, classroomApi, staffApi } from '../api/services';
import { Button, Card, SectionHeader, Spinner, EmptyState, Avatar, Badge, Modal } from '../components/common';
import { formatDate, getPriorityConfig, getStatusConfig, capitalize } from '../utils';
import useAuthStore from '../store/authStore';
import styles from './TaskBoardPage.module.css';

const COLUMNS = [
  { key: 'pending',     label: 'Pending',     color: '#6B7280' },
  { key: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { key: 'completed',   label: 'Completed',   color: '#10B981' },
  { key: 'cancelled',   label: 'Cancelled',   color: '#EF4444' },
];

export default function TaskBoardPage() {
  const { user, hasRole } = useAuthStore();
  const [tasks,      setTasks]      = useState([]);
  const [staff,      setStaff]      = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [filterPrio, setFilterPrio] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '', classroom_id: '',
    due_date: '', priority: 'medium', category: '',
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [tRes, sRes, cRes] = await Promise.all([
        taskApi.list({ limit: 200 }),
        staffApi.list({ limit: 100 }),
        classroomApi.list(),
      ]);
      setTasks(tRes.data.data || []);
      setStaff(sRes.data.data || []);
      setClassrooms(cRes.data.data || []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.assigned_to) { toast.error('Title and assignee are required'); return; }
    setSaving(true);
    try {
      await taskApi.create(form);
      toast.success('Task created');
      setShowCreate(false);
      setForm({ title: '', description: '', assigned_to: '', classroom_id: '', due_date: '', priority: 'medium', category: '' });
      loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function updateStatus(taskId, newStatus) {
    try {
      await taskApi.updateStatus(taskId, { status: newStatus });
      toast.success(`Task marked as ${newStatus.replace('_', ' ')}`);
      loadAll();
    } catch { toast.error('Failed to update status'); }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Delete this task?')) return;
    try { await taskApi.delete(taskId); toast.success('Task deleted'); loadAll(); }
    catch { toast.error('Failed'); }
  }

  // Group tasks by status
  const grouped = {};
  COLUMNS.forEach(c => { grouped[c.key] = []; });
  tasks
    .filter(t => !filterPrio || t.priority === filterPrio)
    .forEach(t => { if (grouped[t.status]) grouped[t.status].push(t); });

  const isAdmin = hasRole('admin', 'centre_head');
  const today   = new Date().toISOString().split('T')[0];

  return (
    <div className={`${styles.root} animate-fade-in`}>
      <SectionHeader
        title="Task Board"
        subtitle={`${tasks.length} total tasks`}
        action={
          isAdmin && <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>New Task</Button>
        }
      />

      {/* Filter */}
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Priority:</span>
        {['', 'urgent', 'high', 'medium', 'low'].map(p => (
          <button key={p}
            className={`${styles.filterChip} ${filterPrio === p ? styles.filterChipActive : ''}`}
            onClick={() => setFilterPrio(p)}>
            {p ? capitalize(p) : 'All'}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className={styles.kanban}>
          {COLUMNS.map(col => (
            <div key={col.key} className={styles.column}>
              <div className={styles.colHeader} style={{ borderTop: `3px solid ${col.color}` }}>
                <span className={styles.colTitle} style={{ color: col.color }}>{col.label}</span>
                <span className={styles.colCount}>{grouped[col.key].length}</span>
              </div>

              <div className={styles.colBody}>
                {grouped[col.key].length === 0 ? (
                  <div className={styles.colEmpty}>No tasks</div>
                ) : grouped[col.key].map(t => {
                  const prio    = getPriorityConfig(t.priority);
                  const isOver  = t.due_date && t.due_date < today && t.status !== 'completed';
                  return (
                    <div key={t.id} className={`${styles.taskCard} ${isOver ? styles.overdue : ''}`}>
                      {isOver && (
                        <div className={styles.overdueTag}>
                          <AlertTriangle size={12} /> Overdue
                        </div>
                      )}
                      <div className={styles.taskTitle}>{t.title}</div>
                      {t.description && <p className={styles.taskDesc}>{t.description}</p>}

                      <div className={styles.taskMeta}>
                        <Badge color={prio.color} bg={prio.bg}>{t.priority}</Badge>
                        {t.classroom_name && (
                          <span className={styles.metaChip}>🏫 {t.classroom_name}</span>
                        )}
                        {t.due_date && (
                          <span className={`${styles.metaChip} ${isOver ? styles.overdueDate : ''}`}>
                            📅 {formatDate(t.due_date)}
                          </span>
                        )}
                      </div>

                      <div className={styles.taskFooter}>
                        <div className={styles.assignee}>
                          <Avatar name={t.assigned_to_name} size={22} />
                          <span className={styles.assigneeName}>{t.assigned_to_name?.split(' ')[0]}</span>
                        </div>
                        <div className={styles.taskActions}>
                          {col.key === 'pending' && (
                            <button className={styles.statusBtn} style={{ color: '#3B82F6' }}
                              onClick={() => updateStatus(t.id, 'in_progress')}>Start</button>
                          )}
                          {col.key === 'in_progress' && (
                            <button className={styles.statusBtn} style={{ color: 'var(--color-success)' }}
                              onClick={() => updateStatus(t.id, 'completed')}>Done</button>
                          )}
                          {isAdmin && col.key !== 'cancelled' && col.key !== 'completed' && (
                            <button className={styles.statusBtn} style={{ color: 'var(--color-danger)' }}
                              onClick={() => deleteTask(t.id)}>Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Task"
        footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button loading={saving} onClick={handleCreate}>Create Task</Button></>}>
        <form className={styles.createForm} onSubmit={handleCreate}>
          <Field label="Title *">
            <input className={styles.inp} placeholder="Task title" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </Field>
          <Field label="Description">
            <textarea className={styles.ta} rows={3} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </Field>
          <Field label="Assign To *">
            <select className={styles.inp} value={form.assigned_to}
              onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
              <option value="">Select staff member</option>
              {staff.map(s => <option key={s.user_id} value={s.user_id}>{s.full_name} ({s.designation || 'Staff'})</option>)}
            </select>
          </Field>
          <div className={styles.twoField}>
            <Field label="Priority">
              <select className={styles.inp} value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
              </select>
            </Field>
            <Field label="Due Date">
              <input type="date" className={styles.inp} value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </Field>
          </div>
          <div className={styles.twoField}>
            <Field label="Classroom">
              <select className={styles.inp} value={form.classroom_id}
                onChange={e => setForm(p => ({ ...p, classroom_id: e.target.value }))}>
                <option value="">Any</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className={styles.inp} value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="">General</option>
                {['planning','admin','parent_comm','safety','other'].map(c =>
                  <option key={c} value={c}>{capitalize(c)}</option>)}
              </select>
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}
