import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common';
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:16, fontFamily:'var(--font-family)', background:'var(--color-bg)' }}>
      <div style={{ fontSize: 72 }}>🔍</div>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>Page not found</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
    </div>
  );
}
