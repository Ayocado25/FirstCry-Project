import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { staffApi } from '../api/services';
import { Button, Card, SectionHeader, Spinner, EmptyState, Avatar, Badge } from '../components/common';
import { formatDate, formatTime, getAttendanceConfig, capitalize } from '../utils';
import styles from './AttendancePage.module.css';

export default function AttendancePage() {
  const [staffList,  setStaffList]  = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [acting,     setActing]     = useState(null); // staff_id being acted on

  useEffect(() => { loadData(); }, [date]);

  async function loadData() {
    setLoading(true);
    try {
      const [staffRes, attRes] = await Promise.all([
        staffApi.list({ limit: 100 }),
        staffApi.listAttendance({ date, limit: 100 }),
      ]);
      setStaffList(staffRes.data.data || []);
      setAttendance(attRes.data.data || []);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  }

  // Build a map: staff_id → attendance record for easy lookup
  const attMap = {};
  attendance.forEach(a => { attMap[a.staff_id] = a; });

  async function handleClockIn(staffId) {
    setActing(staffId);
    try {
      await staffApi.clockIn({ staff_id: staffId, shift: 'full_day' });
      toast.success('Clocked in');
      loadData();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  }

  async function handleClockOut(staffId) {
    setActing(staffId);
    try {
      await staffApi.clockOut({ staff_id: staffId });
      toast.success('Clocked out');
      loadData();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  }

  async function markAbsent(staffId) {
    setActing(staffId);
    try {
      await staffApi.logAttendance({ staff_id: staffId, date, status: 'absent' });
      toast.success('Marked absent');
      loadData();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setActing(null); }
  }

  const presentCount = Object.values(attMap).filter(a => a.status === 'present').length;
  const absentCount  = Object.values(attMap).filter(a => a.status === 'absent').length;

  return (
    <div className={`${styles.root} animate-fade-in`}>
      <SectionHeader
        title="Staff Attendance"
        subtitle={`${presentCount} present · ${absentCount} absent · ${staffList.length - Object.keys(attMap).length} not recorded`}
      />

      {/* Date + summary */}
      <div className={styles.topRow}>
        <div className={styles.datePicker}>
          <label className={styles.dateLabel}>Date</label>
          <input type="date" className={styles.dateInput} value={date}
            onChange={e => setDate(e.target.value)} />
        </div>
        <div className={styles.summaryChips}>
          <div className={styles.chip} style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            ✓ {presentCount} Present
          </div>
          <div className={styles.chip} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            ✗ {absentCount} Absent
          </div>
          <div className={styles.chip} style={{ background: '#F3F4F6', color: '#6B7280' }}>
            — {staffList.length - Object.keys(attMap).length} Pending
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : staffList.length === 0 ? (
        <EmptyState icon={<span style={{ fontSize: 48 }}>👥</span>} title="No staff found" description="No staff members have been added yet." />
      ) : (
        <div className={styles.grid}>
          {staffList.map(s => {
            const att     = attMap[s.id];
            const isBusy  = acting === s.id;
            const attCfg  = att ? getAttendanceConfig(att.status) : null;
            const clockedIn  = att?.clock_in;
            const clockedOut = att?.clock_out;

            return (
              <Card padding key={s.id} className={styles.staffCard}>
                <div className={styles.staffTop}>
                  <Avatar name={s.full_name} size={44} />
                  <div className={styles.staffInfo}>
                    <h3 className={styles.staffName}>{s.full_name}</h3>
                    <span className={styles.designation}>{s.designation || 'Staff'} · {s.employee_id || '—'}</span>
                  </div>
                  {attCfg && (
                    <Badge color={attCfg.color} bg={attCfg.bg}>{attCfg.label}</Badge>
                  )}
                </div>

                {att && (
                  <div className={styles.timeRow}>
                    {clockedIn  && <span className={styles.timeTag}>🟢 In:  {formatTime(clockedIn)}</span>}
                    {clockedOut && <span className={styles.timeTag}>🔴 Out: {formatTime(clockedOut)}</span>}
                    {att.hours_worked && <span className={styles.timeTag}>⏱ {att.hours_worked}h worked</span>}
                  </div>
                )}

                <div className={styles.cardActions}>
                  {!att && (
                    <>
                      <Button size="sm" variant="success" icon={<LogIn size={14} />}
                        loading={isBusy} onClick={() => handleClockIn(s.id)}>Clock In</Button>
                      <Button size="sm" variant="danger" loading={isBusy}
                        onClick={() => markAbsent(s.id)}>Mark Absent</Button>
                    </>
                  )}
                  {att?.status === 'present' && !clockedOut && (
                    <Button size="sm" variant="secondary" icon={<LogOut size={14} />}
                      loading={isBusy} onClick={() => handleClockOut(s.id)}>Clock Out</Button>
                  )}
                  {att?.status === 'present' && clockedOut && (
                    <span className={styles.done}><CheckCircle size={14} /> Shift complete</span>
                  )}
                  {att?.status === 'absent' && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>Marked absent</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
