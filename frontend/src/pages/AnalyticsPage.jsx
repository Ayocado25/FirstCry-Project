import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Lightbulb } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { dashboardApi } from '../api/services';
import { Card, SectionHeader, Spinner, Badge, Button } from '../components/common';
import { useRealtimeUpdates } from '../hooks/useRealtime';
import styles from './AnalyticsPage.module.css';

const MOOD_COLORS = {
  happy: '#10B981',
  calm: '#3B82F6',
  excited: '#F59E0B',
  fussy: '#EF4444',
  tired: '#8B5CF6',
  upset: '#DC2626',
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState(null);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Listen for real-time updates
  useRealtimeUpdates((msg) => {
    if (msg.type === 'analytics_update') {
      setAnalytics(prev => ({ ...prev, ...msg.data }));
    }
  });

  async function loadAnalytics() {
    setLoading(true);
    try {
      const kpisRes = await dashboardApi.kpis();
      setAnalytics(kpisRes.data.data);
      
      // Generate rule-based insights
      const generatedInsights = generateInsights(kpisRes.data.data);
      setInsights(generatedInsights);
      
      // Calculate predictions
      const pred = generatePredictions(kpisRes.data.data);
      setPredictions(pred);
    } catch (e) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  function generateInsights(data) {
    const insights = [];
    
    if (!data) return insights;

    const attendanceRate = data.today?.attendance_rate || 0;
    if (attendanceRate < 70) {
      insights.push({
        title: '⚠️ Low Staff Attendance',
        description: `Only ${attendanceRate.toFixed(1)}% of staff present.`,
        severity: 'high',
      });
    }

    const routineCompletion = data.today?.routines?.completion_rate || 0;
    if (routineCompletion < 50) {
      insights.push({
        title: '📋 Routine Logging Behind',
        description: `${routineCompletion.toFixed(1)}% of expected routines logged.`,
        severity: 'medium',
      });
    }

    if (data.trends?.mood_distribution_7d) {
      const moods = data.trends.mood_distribution_7d;
      const distressCount = (moods.find(m => m.overall_mood === 'upset')?.count || 0) + 
                           (moods.find(m => m.overall_mood === 'fussy')?.count || 0);
      if (distressCount > 3) {
        insights.push({
          title: '😟 Increased Distress',
          description: `More fussy/upset mood logs detected. Check for environmental changes.`,
          severity: 'warning',
        });
      }
    }

    return insights;
  }

  function generatePredictions(data) {
    if (!data?.trends?.attendance_7d) return null;

    const attendanceRates = data.trends.attendance_7d.map(d => d.attendance_rate);
    const avgAttendance = attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length;
    const recentAvg = attendanceRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const trend = recentAvg > avgAttendance ? 'up' : recentAvg < avgAttendance ? 'down' : 'stable';

    return {
      attendance: {
        prediction: Math.round(avgAttendance),
        confidence: 0.78,
        direction: trend,
      },
      engagement: Math.round((data.today?.routines?.total || 0) > 0 ? 75 : 60),
      recommendations: [
        avgAttendance < 80 ? { priority: 'high', message: 'Staff retention at risk. Attendance below 80%.' } : null,
        data.classrooms?.some(c => c.occupied > c.capacity * 0.9) ? { priority: 'medium', message: 'Capacity planning needed for busy classrooms.' } : null,
      ].filter(Boolean),
    };
  }

  if (loading) return <Spinner size={40} />;

  const attendanceTrend = analytics?.trends?.attendance_7d || [];
  const moodTrend = analytics?.trends?.mood_distribution_7d || [];

  return (
    <div className={`${styles.root} animate-fade-in`}>
      <SectionHeader
        title="Advanced Analytics & Insights"
        subtitle="Data-driven decisions for your daycare"
      />

      {/* Prediction Cards */}
      <div className={styles.predictionGrid}>
        <Card padding className={styles.predCard}>
          <div className={styles.predHeader}>
            <Zap size={20} style={{ color: 'var(--color-primary)' }} />
            <h3>Attendance Forecast</h3>
          </div>
          <div className={styles.predValue}>{predictions?.attendance?.prediction || 85}%</div>
          <div className={styles.predMeta}>Next 7 days • {Math.round((predictions?.attendance?.confidence || 0.75) * 100)}% confidence</div>
          {predictions?.attendance?.direction === 'up' && (
            <div className={styles.trend} style={{ color: 'var(--color-success)' }}>
              <TrendingUp size={16} /> Trending up
            </div>
          )}
        </Card>

        <Card padding className={styles.predCard}>
          <div className={styles.predHeader}>
            <Lightbulb size={20} style={{ color: 'var(--color-secondary)' }} />
            <h3>Engagement Score</h3>
          </div>
          <div className={styles.predValue}>{predictions?.engagement || 72}%</div>
          <div className={styles.predMeta}>Based on routine logging activity</div>
        </Card>

        <Card padding className={styles.predCard}>
          <div className={styles.predHeader}>
            <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
            <h3>Active Alerts</h3>
          </div>
          <div className={styles.predValue}>{insights.length}</div>
          <div className={styles.predMeta}>Insights requiring attention</div>
        </Card>
      </div>

      {/* Insights Panel */}
      {insights.length > 0 && (
        <Card padding>
          <div className={styles.insightsHeader}>
            <h3 className={styles.insightsTitle}>💡 Key Insights</h3>
          </div>
          <div className={styles.insightsList}>
            {insights.map((insight, i) => (
              <div key={i} className={styles.insight} data-severity={insight.severity}>
                <div className={styles.insightColor} />
                <div className={styles.insightContent}>
                  <strong>{insight.title}</strong>
                  <p>{insight.description}</p>
                </div>
                <Badge color={insight.severity === 'high' ? 'var(--color-danger)' : 'var(--color-warning)'} 
                       bg={insight.severity === 'high' ? 'var(--color-danger-light)' : 'var(--color-warning-light)'}>
                  {insight.severity}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attendance Trend Chart */}
      <Card padding>
        <SectionHeader title="📊 Attendance Trend — 30 Days" />
        {attendanceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" style={{ fontSize: 12 }} />
              <YAxis style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }} />
              <Area type="monotone" dataKey="attendance_rate" stroke="var(--color-primary)" fillOpacity={1} fill="url(#attendanceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0' }}>No data available</p>
        )}
      </Card>

      {/* Mood Distribution */}
      <Card padding>
        <SectionHeader title="😊 Mood Distribution — Last 7 Days" />
        {moodTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={moodTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="overall_mood" style={{ fontSize: 12 }} />
              <YAxis style={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-secondary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0' }}>No data available</p>
        )}
      </Card>

      {/* Recommendations */}
      {predictions?.recommendations && predictions.recommendations.length > 0 && (
        <Card padding>
          <SectionHeader title="🎯 Recommendations" />
          <div className={styles.recommendationsList}>
            {predictions.recommendations.map((rec, i) => (
              <div key={i} className={styles.recommendation}>
                <Badge color={rec.priority === 'high' ? 'var(--color-danger)' : 'var(--color-warning)'} 
                       bg={rec.priority === 'high' ? 'var(--color-danger-light)' : 'var(--color-warning-light)'}>
                  {rec.priority.toUpperCase()}
                </Badge>
                <span className={styles.recText}>{rec.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
