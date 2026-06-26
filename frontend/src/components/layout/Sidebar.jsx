import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Baby, ClipboardList, Calendar,
  CheckSquare, Bell, LogOut, ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { Avatar } from '../common';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/',               icon: <LayoutDashboard size={20} />, label: 'Dashboard',      roles: ['admin','centre_head','teacher'] },
  { to: '/routine-log',    icon: <ClipboardList size={20} />,   label: 'Routine Log',    roles: ['admin','centre_head','teacher'] },
  { to: '/children',       icon: <Baby size={20} />,            label: 'Children',       roles: ['admin','centre_head','teacher'] },
  { to: '/attendance',     icon: <Users size={20} />,           label: 'Attendance',     roles: ['admin','centre_head','teacher'] },
  { to: '/roster',         icon: <Calendar size={20} />,        label: 'Duty Roster',    roles: ['admin','centre_head'] },
  { to: '/tasks',          icon: <CheckSquare size={20} />,     label: 'Task Board',     roles: ['admin','centre_head','teacher'] },
  { to: '/notifications',  icon: <Bell size={20} />,            label: 'Notifications',  roles: ['admin','centre_head'] },
];

export default function Sidebar() {
  const { user, logout, hasRole } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileVisible : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          {!collapsed && (
            <div className={styles.brand}>
              <div className={styles.brandIcon}>🌟</div>
              <div>
                <div className={styles.brandName}>Intellitots</div>
                <div className={styles.brandSub}>Daycare Tracker</div>
              </div>
            </div>
          )}
          <button
            className={styles.collapseBtn}
            onClick={() => { setCollapsed((c) => !c); setMobileOpen(false); }}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          {mobileOpen && (
            <button className={styles.mobileClose} onClick={() => setMobileOpen(false)}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <Avatar name={user?.full_name} size={36} />
            {!collapsed && (
              <div className={styles.userText}>
                <div className={styles.userName}>{user?.full_name}</div>
                <div className={styles.userRole}>{user?.role?.replace('_', ' ')}</div>
              </div>
            )}
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
