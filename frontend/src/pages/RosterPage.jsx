import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { format, addDays, subDays, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import { rosterApi, staffApi, classroomApi } from '../api/services';
import { Button, Card, SectionHeader, Spinner, Avatar, Badge, Modal } from '../components/common';
import { formatDate, capitalize } from '../utils';
import styles from './RosterPage.module.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHIFTS = ['morning', 'afternoon', 'full_day'];

export default function RosterPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [roster,     setRoster]     = useState({ assignments: {}, week_dates: [] });
  const [staff,      setStaff]      = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({
    staff_id: '', classroom_id: '', date: '',
    shift: 'full_day', start_time: '08:00', end_time: '16:00', is_lead: false,
  });

  useEffect(() => { loadAll(); }, [weekStart]);

  async function loadAll() {
    setLoading(true);
    try {
      const ws = format(weekStart, 'yyyy-MM-dd');
      const [rosterRes, staffRes, clRes] = await Promise.all([
        rosterApi.get({ week_start: ws }),
        staffApi.list({ limit: 100 }),
        classroomApi.list(),
      ]);
      setRoster(rosterRes.data.data || { assignments: {}, week_dates: [] });
      setStaff(staffRes.data.data || []);
      setClassrooms(clRes.data.data || []);
    } catch { toast.error('Failed to load roster'); }
    finally { setLoading(false); }
  }

  function prevWeek() { setWeekStart(d => subDays(d, 7)); }
  function nextWeek() { setWeekStart(d => addDays(d, 7)); }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.staff_id || !form.classroom_id || !form.date) {
      toast.error('Staff, classroom, and date are required');
      return;
    }
    setSaving(true);
    try {
      await rosterApi.create(form);
      toast.success('Assignment added');
      setShowAdd(false);
      loadAll();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await rosterApi.delete(id);
      toast.success('Assignment removed');
      loadAll();
    } catch { toast.error('Failed to remove'); }
  }

  const weekDates = roster.week_dates || [];

  return (
    <div className={`${styles.root} animate-fade-in`}>
      <SectionHeader
        title="Duty Roster"
        subtitle="Weekly classroom assignments"
        action={<Button icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add Assignment</Button>}
      />

      {/* Week navigation */}
      <div className={styles.weekNav}>
        <Button variant="secondary" size="sm" icon={<ChevronLeft size={16} />} onClick={prevWeek}>Prev</Button>
        <span className={styles.weekLabel}>
          {weekDates.length > 0 ? `${formatDate(weekDates[0])} — ${formatDate(weekDates[6])}` : ''}
        </span>
        <Button variant="secondary" size="sm" iconRight={<ChevronRight size={16} />} onClick={nextWeek}>Next</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card padding={false} className={styles.calCard}>
          <div className={styles.calGrid} style={{ gridTemplateColumns: `140px repeat(${weekDates.length}, 1fr)` }}>
            {/* Header row */}
            <div className={styles.calCorner} />
            {weekDates.map((d, i) => (
              <div key={d} className={`${styles.calDayHead} ${d === format(new Date(), 'yyyy-MM-dd') ? styles.today : ''}`}>
                <span className={styles.dayName}>{DAYS[i]}</span>
                <span className={styles.dayDate}>{formatDate(d, 'dd MMM')}</span>
              </div>
            ))}

            {/* Classroom rows */}
            {classrooms.map(cl => (
              <React.Fragment key={cl.id}>
                <div className={styles.calRowLabel}>
                  <span className={styles.clName}>{cl.name}</span>
                  <span className={styles.clAge}>{cl.age_group}</span>
                </div>
                {weekDates.map(d => {
                  const dayAssigns = (roster.assignments[d] || []).filter(a => a.classroom_id === cl.id);
                  return (
                    <div key={d} className={`${styles.calCell} ${d === format(new Date(), 'yyyy-MM-dd') ? styles.todayCell : ''}`}>
                      {dayAssigns.map(a => (
                        <div key={a.id} className={styles.assignChip}>
                          <Avatar name={a.staff_name} size={22} />
                          <div className={styles.assignInfo}>
                            <span className={styles.assignName}>{a.staff_name?.split(' ')[0]}</span>
                            <span className={styles.assignShift}>{a.shift}</span>
                          </div>
                          {a.is_lead && <span className={styles.leadDot} title="Lead teacher" />}
                          <button className={styles.removeChip} onClick={() => handleDelete(a.id)} title="Remove">✕</button>
                        </div>
                      ))}
                      {dayAssigns.length === 0 && (
                        <button className={styles.addSlot}
                          onClick={() => { setForm(p => ({ ...p, classroom_id: cl.id, date: d })); setShowAdd(true); }}>
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Roster Assignment"
        footer={<><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button loading={saving} onClick={handleAdd}>Add Assignment</Button></>}>
        <form className={styles.addForm} onSubmit={handleAdd}>
          {[
            { label: 'Staff Member *', name: 'staff_id', type: 'select',
              options: staff.map(s => ({ value: s.id, label: `${s.full_name} (${s.designation || 'Staff'})` })) },
            { label: 'Classroom *', name: 'classroom_id', type: 'select',
              options: classrooms.map(c => ({ value: c.id, label: c.name })) },
            { label: 'Date *', name: 'date', type: 'date' },
            { label: 'Shift', name: 'shift', type: 'select',
              options: SHIFTS.map(s => ({ value: s, label: capitalize(s) })) },
            { label: 'Start Time', name: 'start_time', type: 'time' },
            { label: 'End Time',   name: 'end_time',   type: 'time' },
          ].map(f => (
            <div key={f.name} className={styles.field}>
              <label className={styles.label}>{f.label}</label>
              {f.type === 'select' ? (
                <select className={styles.inp} value={form[f.name]}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}>
                  <option value="">Select…</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type} className={styles.inp} value={form[f.name]}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} />
              )}
            </div>
          ))}
          <label className={styles.checkRow}>
            <input type="checkbox" checked={form.is_lead}
              onChange={e => setForm(p => ({ ...p, is_lead: e.target.checked }))} />
            Lead teacher for this slot
          </label>
        </form>
      </Modal>
    </div>
  );
}
