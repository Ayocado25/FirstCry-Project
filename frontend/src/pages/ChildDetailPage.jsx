import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { childrenApi } from '../api/services';
import { Button, Card, SectionHeader, Spinner, ErrorState, Avatar, Badge, Modal } from '../components/common';
import { formatDate, getAge, getMoodConfig } from '../utils';
import styles from './ChildDetailPage.module.css';

const ADMISSION_COLORS = {
  enrolled:   { color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  enquiry:    { color: '#6B7280',               bg: '#F3F4F6' },
  applied:    { color: 'var(--color-info)',     bg: 'var(--color-info-light)' },
  waitlisted: { color: 'var(--color-warning)',  bg: 'var(--color-warning-light)' },
  withdrawn:  { color: 'var(--color-danger)',   bg: 'var(--color-danger-light)' },
};

export default function ChildDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child,   setChild]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [allergyForm, setAllergyForm] = useState({ allergen: '', severity: 'moderate', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await childrenApi.get(id);
      setChild(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load child');
    } finally { setLoading(false); }
  }

  async function addAllergy(e) {
    e.preventDefault();
    if (!allergyForm.allergen.trim()) { toast.error('Allergen is required'); return; }
    setSaving(true);
    try {
      await childrenApi.addAllergy(id, allergyForm);
      toast.success('Allergy added');
      setShowAllergyModal(false);
      setAllergyForm({ allergen: '', severity: 'moderate', notes: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function removeAllergy(allergyId) {
    if (!window.confirm('Remove this allergy record?')) return;
    try {
      await childrenApi.removeAllergy(id, allergyId);
      toast.success('Allergy removed');
      load();
    } catch { toast.error('Failed to remove'); }
  }

  if (loading) return <Spinner size={40} />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (!child)  return null;

  const admColor = ADMISSION_COLORS[child.admission_status] || ADMISSION_COLORS.enquiry;

  return (
    <div className={`${styles.root} animate-fade-in`}>
      <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/children')} className={styles.back}>
        Back to Children
      </Button>

      {/* Profile header */}
      <Card padding className={styles.profileCard}>
        <div className={styles.profileTop}>
          <Avatar name={child.full_name} size={72} />
          <div className={styles.profileInfo}>
            <h1 className={styles.childName}>{child.full_name}</h1>
            <div className={styles.profileMeta}>
              <span>{child.gender === 'male' ? '👦' : child.gender === 'female' ? '👧' : '🧒'} {child.gender}</span>
              <span>🎂 {formatDate(child.date_of_birth)} (Age {getAge(child.date_of_birth)})</span>
              <span>🏫 {child.classroom_name || 'No classroom assigned'}</span>
              {child.blood_group && <span>🩸 {child.blood_group}</span>}
            </div>
          </div>
          <Badge color={admColor.color} bg={admColor.bg} style={{ fontSize: 13, padding: '4px 14px' }}>
            {child.admission_status}
          </Badge>
        </div>

        <div className={styles.detailGrid}>
          {child.admission_date && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Admission Date</span>
              <span className={styles.detailValue}>{formatDate(child.admission_date)}</span>
            </div>
          )}
          {child.dietary_restrictions && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Dietary Restrictions</span>
              <span className={styles.detailValue} style={{ color: 'var(--color-warning)' }}>
                ⚠ {child.dietary_restrictions}
              </span>
            </div>
          )}
          {child.medical_notes && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Medical Notes</span>
              <span className={styles.detailValue}>{child.medical_notes}</span>
            </div>
          )}
          {child.parent_name && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Parent / Guardian</span>
              <span className={styles.detailValue}>{child.parent_name} · {child.parent_phone || '—'}</span>
            </div>
          )}
        </div>
      </Card>

      <div className={styles.twoCol}>
        {/* Allergies */}
        <Card padding>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>
              <AlertTriangle size={16} color="var(--color-danger)" /> Allergies
            </h3>
            <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => setShowAllergyModal(true)}>
              Add
            </Button>
          </div>
          {child.allergies?.length === 0 ? (
            <p className={styles.emptyText}>No allergies recorded.</p>
          ) : (
            <div className={styles.allergyList}>
              {child.allergies.map(a => {
                const colors = { severe: 'var(--color-danger)', moderate: 'var(--color-warning)', mild: 'var(--color-info)' };
                return (
                  <div key={a.id} className={styles.allergyItem}>
                    <div>
                      <strong>{a.allergen}</strong>
                      <Badge color={colors[a.severity] || '#6B7280'} bg={`${colors[a.severity] || '#6B7280'}18`} style={{ marginLeft: 8 }}>
                        {a.severity}
                      </Badge>
                      {a.notes && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{a.notes}</p>}
                    </div>
                    <button className={styles.delBtn} onClick={() => removeAllergy(a.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Parents / Guardians */}
        <Card padding>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-4)' }}>👨‍👩‍👧 Parents / Guardians</h3>
          {child.parents?.length === 0 ? (
            <p className={styles.emptyText}>No parent records linked.</p>
          ) : (
            <div className={styles.parentList}>
              {child.parents.map(p => (
                <div key={p.parent_id || p.id} className={styles.parentItem}>
                  <Avatar name={p.full_name} size={36} />
                  <div>
                    <div className={styles.parentName}>
                      {p.full_name}
                      {p.is_primary && <Badge color="var(--color-primary)" bg="var(--color-primary-light)" style={{ marginLeft: 8 }}>Primary</Badge>}
                    </div>
                    <div className={styles.parentContact}>
                      {p.relationship && <span>{p.relationship}</span>}
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.email && <span>✉ {p.email}</span>}
                      {p.can_pickup === false && <span style={{ color: 'var(--color-danger)' }}>Cannot pickup</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Routine history */}
      <Card padding>
        <SectionHeader
          title="Routine History"
          subtitle="Recent daily logs"
          action={
            <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/routine-log')}>
              New Log
            </Button>
          }
        />
        <RoutineHistory childId={id} navigate={navigate} />
      </Card>

      {/* Allergy modal */}
      <Modal open={showAllergyModal} onClose={() => setShowAllergyModal(false)} title="Add Allergy"
        footer={<>
          <Button variant="secondary" onClick={() => setShowAllergyModal(false)}>Cancel</Button>
          <Button loading={saving} onClick={addAllergy}>Add Allergy</Button>
        </>}>
        <form className={styles.allergyForm} onSubmit={addAllergy}>
          <div className={styles.field}>
            <label className={styles.label}>Allergen *</label>
            <input className={styles.inp} placeholder="e.g. Peanuts, Dairy, Eggs"
              value={allergyForm.allergen} onChange={e => setAllergyForm(p => ({ ...p, allergen: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Severity</label>
            <select className={styles.inp} value={allergyForm.severity}
              onChange={e => setAllergyForm(p => ({ ...p, severity: e.target.value }))}>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Notes</label>
            <input className={styles.inp} placeholder="Optional notes or instructions"
              value={allergyForm.notes} onChange={e => setAllergyForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RoutineHistory({ childId, navigate }) {
  const [routines, setRoutines] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    childrenApi.getRoutines(childId, { limit: 10 })
      .then(r => setRoutines(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [childId]);

  if (loading) return <Spinner size={28} />;
  if (!routines.length) return <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: '20px 0' }}>No routine history yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {routines.map(r => {
        const mood = getMoodConfig(r.overall_mood);
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--color-border)' }}
            onClick={() => navigate(`/routine-log/${r.id}`)}>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', minWidth: 100 }}>{formatDate(r.date)}</span>
            {r.overall_mood && <span title={mood.label}>{mood.emoji}</span>}
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              🍽 {r.meals} · 😴 {r.naps} · 🧷 {r.diapers} · 🎨 {r.activities}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {r.is_complete
                ? <Badge color="var(--color-success)" bg="var(--color-success-light)">Complete</Badge>
                : <Badge color="var(--color-warning)" bg="var(--color-warning-light)">Partial</Badge>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
