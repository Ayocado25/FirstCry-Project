import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { Button } from '../components/common';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [tab, setTab] = useState('login'); // 'login' or 'signup'

  // Login form
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [formErr,  setFormErr]  = useState({});

  // Sign-up form
  const [signupForm, setSignupForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '', role: 'teacher',
  });
  const [signupErr, setSignupErr] = useState({});
  const [signupLoading, setSignupLoading] = useState(false);

  // ── LOGIN ──────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!email)    e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setFormErr(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    clearError();
    if (!validate()) return;
    const result = await login(email.toLowerCase().trim(), password);
    if (result.success) navigate('/');
  }

  // ── SIGN UP ────────────────────────────────────────────────────
  function validateSignup() {
    const e = {};
    if (!signupForm.full_name.trim()) e.full_name = 'Name is required';
    if (!signupForm.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(signupForm.email)) e.email = 'Enter a valid email';
    if (!signupForm.password) e.password = 'Password is required';
    else if (signupForm.password.length < 8) e.password = 'Min 8 characters';
    if (!signupForm.confirm_password) e.confirm_password = 'Confirm password is required';
    else if (signupForm.password !== signupForm.confirm_password) e.confirm_password = 'Passwords do not match';
    setSignupErr(e);
    return !Object.keys(e).length;
  }

  async function handleSignup(ev) {
    ev.preventDefault();
    if (!validateSignup()) return;
    setSignupLoading(true);
    try {
      // For now, we'll just prompt them to contact an admin to create a staff account
      // A full implementation would have an API endpoint to self-register as staff
      toast.error('Self-signup is disabled. Contact your centre head to create a staff account.');
      // Uncomment below if you add a /auth/signup endpoint later:
      // const res = await api.post('/auth/signup', { ...signupForm, password: signupForm.password });
      // toast.success('Account created! You can now log in.');
      // setTab('login');
      // setSignupForm({ full_name: '', email: '', password: '', confirm_password: '', role: 'teacher' });
    } catch (e) {
      const msg = e.response?.data?.message || 'Signup failed';
      toast.error(msg);
    } finally {
      setSignupLoading(false);
    }
  }

  const DEMO = [
    { label: 'Admin',        email: 'admin@intellitots.com',   pw: 'Admin@123' },
    { label: 'Centre Head',  email: 'head@intellitots.com',    pw: 'Head@123' },
    { label: 'Teacher',      email: 'teacher@intellitots.com', pw: 'Teacher@123' },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <div className={styles.branding}>
          <div className={styles.logo}>🌟</div>
          <h1 className={styles.appName}>FirstCry Intellitots</h1>
          <p className={styles.appTagline}>Daycare Routine Tracker</p>
        </div>
        <ul className={styles.featureList}>
          {['Daily routine logs for every child','Staff attendance & duty roster','KPI dashboard for centre heads','Automated parent summaries'].map(f => (
            <li key={f} className={styles.featureItem}><span className={styles.featureDot} />  {f}</li>
          ))}
        </ul>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
              onClick={() => { setTab('login'); clearError(); setFormErr({}); }}
            >
              <LogIn size={16} /> Sign In
            </button>
            <button
              className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`}
              onClick={() => { setTab('signup'); setSignupErr({}); }}
            >
              <UserPlus size={16} /> Create Account
            </button>
          </div>

          {/* LOGIN TAB */}
          {tab === 'login' && (
            <>
              <h2 className={styles.heading}>Welcome back</h2>
              <p className={styles.sub}>Sign in to your account</p>

              {error && <div className={styles.serverErr}>{error}</div>}

              <form onSubmit={handleSubmit} noValidate className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">Email address</label>
                  <input
                    id="email" type="email" autoComplete="email"
                    className={`${styles.input} ${formErr.email ? styles.inputErr : ''}`}
                    value={email} onChange={e => { setEmail(e.target.value); setFormErr(p => ({...p,email:null})); }}
                    placeholder="you@intellitots.com"
                  />
                  {formErr.email && <span className={styles.errMsg}>{formErr.email}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">Password</label>
                  <div className={styles.pwdWrap}>
                    <input
                      id="password" type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                      className={`${styles.input} ${formErr.password ? styles.inputErr : ''}`}
                      value={password} onChange={e => { setPassword(e.target.value); setFormErr(p => ({...p,password:null})); }}
                      placeholder="Enter password"
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPwd(s => !s)} tabIndex={-1}>
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formErr.password && <span className={styles.errMsg}>{formErr.password}</span>}
                </div>

                <Button type="submit" size="lg" loading={isLoading} className={styles.submitBtn} icon={<LogIn size={18}/>}>
                  Sign in
                </Button>
              </form>

              <div className={styles.demoSection}>
                <p className={styles.demoTitle}>Demo accounts</p>
                <div className={styles.demoGrid}>
                  {DEMO.map(d => (
                    <button key={d.label} className={styles.demoBtn}
                      onClick={() => { setEmail(d.email); setPassword(d.pw); clearError(); setFormErr({}); }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* SIGNUP TAB */}
          {tab === 'signup' && (
            <>
              <h2 className={styles.heading}>Create Account</h2>
              <p className={styles.sub}>Join as a staff member</p>
              <p className={styles.note}>⚠️ New staff accounts require approval from your centre head.</p>

              <form onSubmit={handleSignup} noValidate className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    className={`${styles.input} ${signupErr.full_name ? styles.inputErr : ''}`}
                    value={signupForm.full_name}
                    onChange={e => { setSignupForm(p => ({...p, full_name: e.target.value})); setSignupErr(p => ({...p, full_name: null})); }}
                    placeholder="Your full name"
                  />
                  {signupErr.full_name && <span className={styles.errMsg}>{signupErr.full_name}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Email address</label>
                  <input
                    type="email"
                    className={`${styles.input} ${signupErr.email ? styles.inputErr : ''}`}
                    value={signupForm.email}
                    onChange={e => { setSignupForm(p => ({...p, email: e.target.value})); setSignupErr(p => ({...p, email: null})); }}
                    placeholder="you@intellitots.com"
                  />
                  {signupErr.email && <span className={styles.errMsg}>{signupErr.email}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Password</label>
                  <input
                    type="password"
                    className={`${styles.input} ${signupErr.password ? styles.inputErr : ''}`}
                    value={signupForm.password}
                    onChange={e => { setSignupForm(p => ({...p, password: e.target.value})); setSignupErr(p => ({...p, password: null})); }}
                    placeholder="Min 8 characters"
                  />
                  {signupErr.password && <span className={styles.errMsg}>{signupErr.password}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Confirm Password</label>
                  <input
                    type="password"
                    className={`${styles.input} ${signupErr.confirm_password ? styles.inputErr : ''}`}
                    value={signupForm.confirm_password}
                    onChange={e => { setSignupForm(p => ({...p, confirm_password: e.target.value})); setSignupErr(p => ({...p, confirm_password: null})); }}
                    placeholder="Re-enter password"
                  />
                  {signupErr.confirm_password && <span className={styles.errMsg}>{signupErr.confirm_password}</span>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Role</label>
                  <select
                    className={styles.input}
                    value={signupForm.role}
                    onChange={e => setSignupForm(p => ({...p, role: e.target.value}))}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="centre_head">Centre Head</option>
                  </select>
                </div>

                <Button type="submit" size="lg" loading={signupLoading} className={styles.submitBtn} icon={<UserPlus size={18}/>}>
                  Create Account
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
