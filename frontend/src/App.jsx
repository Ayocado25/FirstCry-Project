import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { PageLoader } from './components/common';

// Lazy-loaded pages
const LoginPage         = lazy(() => import('./pages/LoginPage'));
const DashboardPage     = lazy(() => import('./pages/DashboardPage'));
const RoutineLogPage    = lazy(() => import('./pages/RoutineLogPage'));
const RoutineDetailPage = lazy(() => import('./pages/RoutineDetailPage'));
const ChildrenPage      = lazy(() => import('./pages/ChildrenPage'));
const ChildDetailPage   = lazy(() => import('./pages/ChildDetailPage'));
const AttendancePage    = lazy(() => import('./pages/AttendancePage'));
const RosterPage        = lazy(() => import('./pages/RosterPage'));
const TaskBoardPage     = lazy(() => import('./pages/TaskBoardPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));

/* ── Protected route wrapper ── */
function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, hasRole } = useAuthStore();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* ── Authenticated app shell ── */
function AppShell({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <Header />
        <main className="page-body">
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* Protected — all staff roles */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppShell><DashboardPage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/routine-log" element={
          <ProtectedRoute roles={['admin','centre_head','teacher']}>
            <AppShell><RoutineLogPage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/routine-log/:id" element={
          <ProtectedRoute roles={['admin','centre_head','teacher']}>
            <AppShell><RoutineDetailPage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/children" element={
          <ProtectedRoute>
            <AppShell><ChildrenPage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/children/:id" element={
          <ProtectedRoute>
            <AppShell><ChildDetailPage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/attendance" element={
          <ProtectedRoute roles={['admin','centre_head','teacher']}>
            <AppShell><AttendancePage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/roster" element={
          <ProtectedRoute roles={['admin','centre_head']}>
            <AppShell><RosterPage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/tasks" element={
          <ProtectedRoute roles={['admin','centre_head','teacher']}>
            <AppShell><TaskBoardPage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute roles={['admin','centre_head']}>
            <AppShell><NotificationsPage /></AppShell>
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
