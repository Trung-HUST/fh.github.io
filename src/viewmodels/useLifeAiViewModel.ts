// ViewModel for the Life.ai demo page.
// Composes model logic with data source — View consumes this hook only.

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  lifeAiStats,
  lifeAiTimeline,
  lifeAiHeatmapData,
  lifeAiWeeklySteps,
  lifeAiMonthlySleep,
  lifeAiActivityBreakdown,
  lifeAiSleepSlots,
  lifeAiHeartRateSlots,
} from "@/data/mock";
import { countActiveEvents, computeTotalCalories, shiftDate } from "@/models/life-ai";
import { getCachedBiometrics, getCachedTimeline, syncTimeline, getCachedHeatmapData, syncHeatmapData, getCachedActivities, syncActivities, getCachedUsage24h, syncUsage24h } from "@/lib/googleSheetDb";
import type { HeatmapCell } from "@/models/types";

export function useLifeAiViewModel() {
  const [selectedDate, setSelectedDate] = useState(() => new Date()); // Default to today

  const biometrics = useMemo(() => getCachedBiometrics(), []);
  
  const currentBiometric = useMemo(() => {
    // Standardize to local date string YYYY-MM-DD safely
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    return biometrics.find(b => b && b.date === iso);
  }, [biometrics, selectedDate]);

  const stats = useMemo(() => {
    if (!currentBiometric) return lifeAiStats;
    return [
      { title: "Sleep Score", value: currentBiometric.sleepScore?.toString() || "--", subtitle: "Last night" },
      { title: "Sleep Duration", value: `${currentBiometric.sleepDuration?.toFixed(1) || "--"}h`, subtitle: "Total time asleep" },
      { title: "Steps", value: currentBiometric.steps?.toLocaleString() || "--", subtitle: "Daily activity" },
      { title: "Calories", value: `${currentBiometric.calories?.toLocaleString() || "--"} kcal`, subtitle: "Active + Resting" }
    ];
  }, [currentBiometric]);

  const [timeline, setTimeline] = useState(() => {
    const cached = getCachedTimeline();
    return cached && cached.length > 0 ? cached : lifeAiTimeline;
  });

  const [activities, setActivities] = useState(() => getCachedActivities());
  useEffect(() => {
    syncActivities(activities);
  }, [activities]);

  const [usage24h, setUsage24h] = useState(() => {
    const usage = getCachedUsage24h();
    const hour = new Date().getHours();
    usage[hour] = (usage[hour] || 0) + 1;
    return usage;
  });
  useEffect(() => {
    syncUsage24h(usage24h);
  }, [usage24h]);

  const logAppUsage = useCallback(() => {
    setUsage24h(prev => {
      const updated = [...prev];
      const hour = new Date().getHours();
      updated[hour] = (updated[hour] || 0) + 1;
      return updated;
    });
  }, []);

  useEffect(() => {
    // Sync to Google Sheet every time timeline changes
    syncTimeline(timeline);
  }, [timeline]);

  const addTimelineEvent = useCallback((event: Omit<typeof lifeAiTimeline[0], 'id'>) => {
    setTimeline((prev) => {
      const newEvent = { ...event, id: Date.now().toString() };
      return [...prev, newEvent].sort((a, b) => a.time.localeCompare(b.time));
    });
    
    // Activities are only counted when toggled completed

    logAppUsage();
  }, [logAppUsage]);

  const updateTimelineEvent = useCallback((id: string, updatedEvent: Partial<typeof lifeAiTimeline[0]>) => {
    setTimeline((prev) => 
      prev.map(evt => evt.id === id ? { ...evt, ...updatedEvent } : evt).sort((a, b) => a.time.localeCompare(b.time))
    );
  }, []);

  const [heatmapRecords, setHeatmapRecords] = useState(() => getCachedHeatmapData());

  useEffect(() => {
    syncHeatmapData(heatmapRecords);
  }, [heatmapRecords]);

  const deleteTimelineEvent = useCallback((id: string) => {
    setTimeline((prev) => prev.filter(evt => evt.id !== id));
  }, []);

  const toggleEventCompletion = useCallback((id: string) => {
    setTimeline((prev) => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      
      const evt = prev[idx];
      const isCompleted = evt.color === "bg-matrix-primary" || evt.color === "bg-green-500";
      const newColor = isCompleted ? "bg-red-500" : "bg-matrix-primary";
      
      const updated = [...prev];
      updated[idx] = { ...evt, color: newColor };
      
      const text = `${evt.title} ${evt.subtitle || ""}`.toLowerCase();
      const categories = ["Full Body", "Upper", "Lower", "Walking", "Running"];
      
      setActivities(actPrev => {
        const actUpdated = { ...actPrev };
        let changed = false;
        categories.forEach(cat => {
          if (text.includes(cat.toLowerCase())) {
            actUpdated[cat] = Math.max(0, (actUpdated[cat] || 0) + (isCompleted ? -1 : 1));
            changed = true;
          }
        });
        return changed ? actUpdated : actPrev;
      });
      
      // Calculate spans
      const startHour = parseInt(evt.time.split(":")[0], 10);
      
      let endHour = startHour + 2; 
      if (idx < prev.length - 1) {
        endHour = parseInt(prev[idx + 1].time.split(":")[0], 10);
      }
      
      // Standardize date
      const isoDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      
      setHeatmapRecords((records) => {
        const newRecords = JSON.parse(JSON.stringify(records));
        if (!newRecords[isoDate]) newRecords[isoDate] = {};
        
        const TIME_SLOTS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
        const spanStart = startHour % 2 !== 0 ? startHour - 1 : startHour;
        
        for (const slot of TIME_SLOTS) {
           if (slot >= spanStart && slot < endHour) {
              const currentCount = newRecords[isoDate][slot] || 0;
              newRecords[isoDate][slot] = isCompleted 
                  ? Math.max(0, currentCount - 1) 
                  : currentCount + 1;
           }
        }
        return newRecords;
      });

      return updated;
    });
    logAppUsage();
  }, [selectedDate, logAppUsage]);

  const heatmapData = useMemo(() => {
    const data: HeatmapCell[] = [];
    const TIME_SLOTS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    const today = new Date();
    
    // We go back 29 days up to today
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const dayRecords = heatmapRecords[isoDate] || {};
      
      for (const slot of TIME_SLOTS) {
        data.push({
          date: `${isoDate}T${String(slot).padStart(2, '0')}:00:00`,
          time: `${String(slot).padStart(2, '0')}:00:00`,
          count: dayRecords[slot] || 0,
          success: dayRecords[slot] || 0,
          failed: 0,
        });
      }
    }
    return data;
  }, [heatmapRecords]);

  const weeklySteps = lifeAiWeeklySteps;
  const monthlySleep = useMemo(() => {
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
      sum: 0,
      count: 0
    }));
    
    biometrics.forEach(b => {
      if (b.sleepDuration && b.date) {
        const parts = b.date.split("-");
        if (parts.length >= 2) {
          const monthIndex = parseInt(parts[1], 10) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            monthsData[monthIndex].sum += b.sleepDuration;
            monthsData[monthIndex].count += 1;
          }
        }
      }
    });
    
    return monthsData.map(m => ({
      label: m.label,
      value: m.count > 0 ? parseFloat((m.sum / m.count).toFixed(1)) : 0
    }));
  }, [biometrics]);
  const activityBreakdown = useMemo(() => {
    const FIXED_CATEGORIES = ["Full Body", "Upper", "Lower", "Walking", "Running"];
    const total = FIXED_CATEGORIES.reduce((sum, cat) => sum + (activities[cat] || 0), 0);
    
    return FIXED_CATEGORIES.map(cat => {
      const count = activities[cat] || 0;
      return {
        label: cat,
        value: total > 0 ? Math.round((count / total) * 100) : 0
      };
    });
  }, [activities]);
  
  const sleepSlots = lifeAiSleepSlots;
  
  const appUsageSlots = useMemo(() => {
    return usage24h.map((count, i) => {
      let color = "bg-green-600";
      if (count > 20) color = "bg-red-600";
      else if (count > 10) color = "bg-orange-600";
      else if (count > 5) color = "bg-yellow-600";
      else if (count === 0) color = "bg-matrix-dim"; 
      
      return {
        color,
        label: `${String(i).padStart(2, '0')}:00 - ${count} actions`,
        value: count
      };
    });
  }, [usage24h]);

  const activeEventCount = useMemo(() => countActiveEvents(timeline), [timeline]);
  const totalCalories = useMemo(() => computeTotalCalories(timeline), [timeline]);

  const goToPrevDay = useCallback(
    () => setSelectedDate((d) => shiftDate(d, -1)),
    [],
  );
  const goToNextDay = useCallback(
    () => setSelectedDate((d) => shiftDate(d, 1)),
    [],
  );
  const goToToday = useCallback(
    () => setSelectedDate(new Date()),
    [],
  );

  return {
    selectedDate,
    stats,
    timeline,
    heatmapData,
    weeklySteps,
    monthlySleep,
    activityBreakdown,
    sleepSlots,
    appUsageSlots,
    activeEventCount,
    totalCalories,
    goToPrevDay,
    goToNextDay,
    goToToday,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    toggleEventCompletion,
  };
}
