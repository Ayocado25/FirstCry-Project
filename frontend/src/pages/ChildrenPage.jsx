import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { childrenApi, classroomApi, parentApi } from '../api/services';
import { Button, SectionHeader, Spinner, EmptyState, Avatar, Badge, Modal } from '../components/common';
import { formatDate, getAge, getAttendanceConfig } from '../utils';
import styles from './ChildrenPage.module.css';

const ADMISSION_COLORS = {
  enrolled:   { color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  enquiry:    { color: '#6B7280',               bg: '#F3F4F6' },
  applied:    { color: 'var(--color-info)',     bg: 'var(--color-info-light)' },
  waitlisted: { color: 'var(--color-warning)',  bg: 'var(--color-warning-light)' },
  withdrawn:  { color: 'var(--color-danger)',   bg: 'var(--color-danger-light)' },
};

export default function ChildrenPage() {
  const navigate = useNavigate();
  const [children,    setChildren]    = useState([]);
  const [classrooms,  setClassrooms]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState({ classroom_id: '', admission_status: '' });
  const [showCreate,  setShowCreate]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState({
    full_name: '', date_of_birth: '', gender: 'male',
    classroom_id: '', admission_status: 'enrolled', dietary_restrictions: '', medical_notes: '',
  });

  useEffect(() => {
    loadClassrooms();
    loadChildren();
  }, []);

  useEffect(() => {
    const t = setTimeout(loadChildren, 350);
    return () => clearTimeout(t);
  }, [search, filter]);

  async function loadClassrooms() {
    try { const r = await classroomApi.list(); setClassrooms(r.data.data || []); } catch {}
  }

  async function loadChildren() {
    setLoading(true);
    try {
      const params = { limit: 100, is_active: true };
      if (search) params.search = search;
      if (filter.classroom_id)    params.classroom_id    = filter.classroom_id;
      if (filter.admission_status) params.admission_status = filter.admission_status;
      const r = await childrenApi.list(params);
      setChildren(r.data.data || []);
    } catch { toast.error('Failed to load children'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.full_name || !form.date_of_birth) { toast.error('Name and DOB are required'); return; }
    setSaving(true);
    try {
      const res = await childrenApi.create(form);
      toast.success('Child added');
      setShowCreate(false);
      setForm({ full_name: '', date_of_birth: '', gender: 'male', classroom_id: '', admission_status: 'enrolled', dietary_restrictions: '', medical_notes: '' });
      navigate(`/children/${res.data.data.id}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className={`${styles.root} animate-fade-in`}>
      <SectionHeader
        title="Children"
        subtitle={`${children.length} children`}
        action={<Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Add Child</Button>}
      />

      {/* Search + filters */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Search by name…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={styles.sel} value={filter.classroom_id}
          onChange={e => setFilter(p => ({...p, classroom_id: e.target.value}))}>
          <option value="">All classrooms</option>
          {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={styles.sel} value={filter.admission_status}
          onChange={e => setFilter(p => ({...p, admission_status: e.target.value}))}>
          <option value="">All statuses</option>
          {['enrolled','enquiry','applied','waitlisted','withdrawn'].map(s =>
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          )}
        </select>
      </div>

      {loading ? <Spinner /> : children.length === 0 ? (
        <EmptyState icon={<span style={{fontSize:48}}>👶</span>} title="No children found"
          description="No children match your filters."
          action={<Button icon={<Plus size={16}/>} onClick={() => setShowCreate(true)}>Add Child</Button>} />
      ) : (
        <div className={styles.grid}>
          {children.map(c => {
            const st = ADMISSION_COLORS[c.admission_status] || ADMISSION_COLORS.enquiry;
            return (
              <div key={c.id} className={styles.card} onClick={() => navigate(`/children/${c.id}`)}>
                <Avatar name={c.full_name} src={c.profile_photo} size={48} />
                <div className={styles.cardInfo}>
                  <h3 className={styles.name}>{c.full_name}</h3>
                  <p className={styles.sub}>{c.classroom_name || 'No class'} · Age {getAge(c.date_of_birth)}</p>
                  {c.dietary_restrictions && <p className={styles.dietary}>⚠ {c.dietary_restrictions}</p>}
                </div>
                <Badge color={st.color} bg={st.bg}>{c.admission_status}</Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Child"
        footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button loading={saving} onClick={handleCreate}>Add Child</Button></>}>
        <form className={styles.createForm} onSubmit={handleCreate}>
          {[
            { label: 'Full Name *', name: 'full_name', type: 'text', placeholder: "Child's full name" },
            { label: 'Date of Birth *', name: 'date_of_birth', type: 'date' },
          ].map(f => (
            <div key={f.name} className={styles.field}>
              <label className={styles.label}>{f.label}</label>
              <input type={f.type} className={styles.inp} placeholder={f.placeholder}
                value={form[f.name]} onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))} />
            </div>
          ))}
          <div className={styles.field}>
            <label className={styles.label}>Gender</label>
            <select className={styles.inp} value={form.gender} onChange={e => setForm(p => ({...p, gender: e.target.value}))}>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Classroom</label>
            <select className={styles.inp} value={form.classroom_id} onChange={e => setForm(p => ({...p, classroom_id: e.target.value}))}>
              <option value="">Select classroom</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Admission Status</label>
            <select className={styles.inp} value={form.admission_status} onChange={e => setForm(p => ({...p, admission_status: e.target.value}))}>
              {['enrolled','enquiry','applied','waitlisted','withdrawn'].map(s =>
                <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Dietary Restrictions</label>
            <input className={styles.inp} placeholder="e.g. No nuts, lactose intolerant"
              value={form.dietary_restrictions} onChange={e => setForm(p => ({...p, dietary_restrictions: e.target.value}))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Medical Notes</label>
            <textarea className={styles.ta} rows={2} value={form.medical_notes}
              onChange={e => setForm(p => ({...p, medical_notes: e.target.value}))} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
