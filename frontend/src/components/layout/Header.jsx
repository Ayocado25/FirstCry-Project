import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { format } from 'date-fns';
import useAuthStore from '../../store/authStore';
import styles from './Header.module.css';

const PAGE_TITLES = {
  '/':             { title: 'Dashboard', subtitle: 'Centre overview and KPIs' },
  '/routine-log':  { title: 'Routine Log', subtitle: 'Log daily child activities' },
  '/children':     { title: 'Children', subtitle: 'Child profiles and history' },
  '/attendance':   { title: 'Staff Attendance', subtitle: 'Track staff clock-in and status' },
  '/roster':       { title: 'Duty Roster', subtitle: 'Weekly classroom assignments' },
  '/tasks':        { title: 'Task Board', subtitle: 'Teacher tasks and follow-ups' },
  '/notifications':{ title: 'Notifications', subtitle: 'Parent communication history' },
};

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();

  // Match nested routes too
  const key = Object.keys(PAGE_TITLES).find((k) => {
    if (k === '/') return pathname === '/';
    return pathname.startsWith(k);
  });
  const page = PAGE_TITLES[key] || { title: 'Daycare Tracker', subtitle: '' };

  const today = format(new Date(), 'EEEE, dd MMMM yyyy');

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div>
          <h1 className={styles.pageTitle}>{page.title}</h1>
          <p className={styles.pageSubtitle}>{today}</p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.greeting}>
          <span className={styles.greetText}>
            Hello, <strong>{user?.full_name?.split(' ')[0]}</strong> 👋
          </span>
          <span className={styles.roleChip}>{user?.role?.replace('_', ' ')}</span>
        </div>
      </div>
    </header>
  );
}
