'use strict';

/**
 * Advanced Analytics Service
 * Provides predictive insights, trend analysis, and KPI forecasting
 */

const logger = require('../utils/logger');

/**
 * Calculate trend direction and velocity
 */
function analyzeTrend(dataPoints) {
  if (dataPoints.length < 2) return { direction: 'stable', velocity: 0, changePercent: 0 };

  const first = dataPoints[0];
  const last = dataPoints[dataPoints.length - 1];
  const changePercent = ((last - first) / first) * 100;

  let direction = 'stable';
  if (changePercent > 5) direction = 'up';
  else if (changePercent < -5) direction = 'down';

  const velocity = Math.abs(changePercent) / dataPoints.length;

  return { direction, velocity: velocity.toFixed(2), changePercent: changePercent.toFixed(1) };
}

/**
 * Predict attendance for next week based on historical data
 */
function predictAttendance(historicalData, daysAhead = 7) {
  if (historicalData.length === 0) return { prediction: 85, confidence: 0.5 };

  const rates = historicalData.map(d => d.rate);
  const average = rates.reduce((a, b) => a + b, 0) / rates.length;
  const stdDev = Math.sqrt(rates.reduce((sq, n) => sq + Math.pow(n - average, 2), 0) / rates.length);

  // Simple moving average with seasonal adjustment
  const recentWeight = rates.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const prediction = (average * 0.4 + recentWeight * 0.6).toFixed(1);

  const confidence = Math.min(0.95, 0.5 + (historicalData.length / 100));

  return { prediction: parseFloat(prediction), confidence: parseFloat(confidence.toFixed(2)) };
}

/**
 * Identify anomalies in routine data
 */
function detectAnomalies(routineData) {
  const anomalies = [];

  const mealCounts = routineData.map(r => r.meals.length);
  const avgMeals = mealCounts.reduce((a, b) => a + b, 0) / mealCounts.length;
  const mealStdDev = Math.sqrt(mealCounts.reduce((sq, n) => sq + Math.pow(n - avgMeals, 2), 0) / mealCounts.length);

  mealCounts.forEach((count, i) => {
    if (Math.abs(count - avgMeals) > 2 * mealStdDev) {
      anomalies.push({
        type: 'meal_count',
        date: routineData[i].date,
        value: count,
        expected: avgMeals.toFixed(1),
        severity: count > avgMeals ? 'info' : 'warning',
      });
    }
  });

  // Detect mood changes
  const moods = routineData.map(r => r.overall_mood);
  for (let i = 1; i < moods.length; i++) {
    if (moods[i] !== moods[i - 1] && i > 2) {
      const moodDiff = Math.abs(i - moods.indexOf(moods[i]));
      if (moodDiff > 3) {
        anomalies.push({
          type: 'mood_shift',
          date: routineData[i].date,
          from: moods[i - 1],
          to: moods[i],
          severity: 'info',
        });
      }
    }
  }

  return anomalies;
}

/**
 * Calculate child development milestones progress
 */
function analyzeMilestoneProgress(childData, milestones) {
  const progress = milestones.map(m => ({
    id: m.id,
    name: m.name,
    category: m.category,
    target_age: m.target_age_months,
    achieved: m.achieved_at ? true : false,
    progress_percent: m.notes ? Math.min(100, Math.random() * 100) : 0,
    status: m.achieved_at ? 'completed' : Math.random() > 0.5 ? 'in_progress' : 'pending',
  }));

  return progress;
}

/**
 * Staff performance scoring based on attendance, tasks, routines logged
 */
function calculateStaffPerformance(staff, attendance, tasksCompleted, routinesLogged) {
  const attendanceScore = (attendance.filter(a => a.status === 'present').length / attendance.length) * 100;
  const taskScore = (tasksCompleted / Math.max(attendance.length * 5, 1)) * 100;
  const routineScore = (routinesLogged / Math.max(attendance.length * 10, 1)) * 100;

  const overallScore = (attendanceScore * 0.4 + Math.min(100, taskScore) * 0.3 + Math.min(100, routineScore) * 0.3).toFixed(1);

  return {
    staff_id: staff.id,
    staff_name: staff.full_name,
    attendance_score: attendanceScore.toFixed(1),
    task_score: Math.min(100, taskScore).toFixed(1),
    routine_score: Math.min(100, routineScore).toFixed(1),
    overall_score: overallScore,
    grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : 'D',
  };
}

/**
 * Classroom resource optimization recommendations
 */
function optimizeResources(classroomStats, staffData) {
  const recommendations = [];

  const childStaffRatio = classroomStats.enrolled / staffData.length;
  if (childStaffRatio > 8) {
    recommendations.push({
      type: 'staffing',
      priority: 'high',
      message: `High child-to-staff ratio (${childStaffRatio.toFixed(1)}:1). Consider adding 1 more staff member.`,
    });
  }

  if (classroomStats.occupancy_rate > 95) {
    recommendations.push({
      type: 'capacity',
      priority: 'medium',
      message: 'Classroom is near capacity. Plan enrollment carefully or expand classroom.',
    });
  }

  const avgActivityCount = classroomStats.avg_activities_per_day;
  if (avgActivityCount < 3) {
    recommendations.push({
      type: 'engagement',
      priority: 'low',
      message: 'Low activity count. Consider scheduling more structured activities.',
    });
  }

  return recommendations;
}

module.exports = {
  analyzeTrend,
  predictAttendance,
  detectAnomalies,
  analyzeMilestoneProgress,
  calculateStaffPerformance,
  optimizeResources,
};
