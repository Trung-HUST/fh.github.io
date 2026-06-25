import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { MatrixButton } from "@/components/ui/MatrixButton";
import { TrendMonitor, TrendChart } from "@/components/ui/DataVizComponents";
import { Sparkline, MatrixInput, MatrixSelect, MatrixTimePicker } from "@/components/ui/MatrixExtras";
import { RunHeatmap } from "@/components/ui/RunnerComponents";
import { useLifeAiViewModel } from "@/viewmodels/useLifeAiViewModel";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function LifeAiPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("add") === "true") {
      setTimeout(() => {
        const form = document.getElementById("add-event-form");
        if (form) {
          form.scrollIntoView({ behavior: "smooth", block: "center" });
          const inputs = form.querySelectorAll("input");
          if (inputs.length > 0) inputs[0].focus();
        }
      }, 100);
      navigate("/life-signal", { replace: true });
    }
  }, [location.search, navigate]);

  const EVENT_COLORS = [
    { value: "bg-matrix-primary", label: t("lifeAi.colorGreen") },
    { value: "bg-red-500", label: t("lifeAi.colorRed") },
    { value: "bg-blue-500", label: t("lifeAi.colorBlue") },
    { value: "bg-yellow-500", label: t("lifeAi.colorYellow") },
    { value: "bg-purple-500", label: t("lifeAi.colorPurple") },
    { value: "bg-matrix-dim", label: t("lifeAi.colorDim") }
  ];
  const {
    selectedDate,
    stats,
    timeline,
    heatmapData,
    weeklySteps,
    monthlySleep,
    activityBreakdown,
    activeEventCount,
    totalCalories,
    appUsageSlots,
    goToPrevDay,
    goToNextDay,
    goToToday,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    toggleEventCompletion,
  } = useLifeAiViewModel();

  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [newEvent, setNewEvent] = useState({ time: "", title: "", subtitle: "", color: "" });

  const handleEdit = (event: any) => {
    setEditId(event.id);
    setEditData(event);
  };

  const handleSaveEdit = () => {
    if (editId) {
      updateTimelineEvent(editId, editData);
      setEditId(null);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.time || !newEvent.title) return;
    addTimelineEvent(newEvent);
    setNewEvent({ time: "", title: "", subtitle: "", color: "" });
  };

  const toggleEventColor = (event: any) => {
    toggleEventCompletion(event.id);
  };

  const dateStr = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MatrixButton size="small" onClick={goToPrevDay}>[&lt;]</MatrixButton>
          <span className="font-mono text-sm text-matrix-primary">{dateStr}</span>
          <MatrixButton size="small" onClick={goToNextDay}>[&gt;]</MatrixButton>
        </div>
        <MatrixButton size="small" onClick={goToToday}>
          {t("lifeAi.today")}
        </MatrixButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <AsciiBox key={stat.title} title={stat.title.toUpperCase()}>
            <div className="text-center space-y-1">
              <p className="font-mono text-xl text-matrix-primary">{stat.value}</p>
              {stat.subtitle && (
                <p className="font-mono text-[10px] text-matrix-dim">{stat.subtitle}</p>
              )}
              {stat.trend && (
                <p className={cn(
                  "font-mono text-xs",
                  stat.trend.value > 0 ? "text-matrix-primary" :
                  stat.trend.value < 0 ? "text-red-400" : "text-matrix-muted"
                )}>
                  {stat.trend.value > 0 ? "+" : ""}{stat.trend.value}% {stat.trend.label}
                </p>
              )}
            </div>
          </AsciiBox>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <AsciiBox title={t("lifeAi.activeEvents")}>
          <p className="font-mono text-lg text-matrix-primary text-center">
            {activeEventCount}
          </p>
        </AsciiBox>
        <AsciiBox title={t("lifeAi.totalCalories")}>
          <p className="font-mono text-lg text-matrix-primary text-center">
            {totalCalories} {t("lifeAi.kcal")}
          </p>
        </AsciiBox>
      </div>

      {/* Timeline */}
      <AsciiBox title={t("lifeAi.dailyTimeline")}>
        <div className="space-y-2">
          {timeline.map((event) => (
            <div key={event.id} className="font-mono text-xs py-1 border-b border-matrix-primary/10 last:border-0">
              {editId === event.id ? (
                <div className="space-y-2 py-2">
                  <div className="grid grid-cols-2 gap-2">
                    <MatrixTimePicker label={t("lifeAi.time")} value={editData.time} onChange={(val) => setEditData({...editData, time: val})} />
                    <MatrixInput label={t("lifeAi.title")} value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MatrixInput label={t("lifeAi.subtitle")} value={editData.subtitle || ""} onChange={(e) => setEditData({...editData, subtitle: e.target.value})} />
                    <MatrixSelect label={t("lifeAi.color")} options={EVENT_COLORS} value={editData.color || "bg-matrix-dim"} onChange={(val) => setEditData({...editData, color: val})} />
                  </div>
                  <div className="flex gap-2">
                    <MatrixButton onClick={handleSaveEdit}>{t("lifeAi.saveBtn")}</MatrixButton>
                    <MatrixButton onClick={() => setEditId(null)}>{t("lifeAi.cancelBtn")}</MatrixButton>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between group">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-matrix-dim w-12 shrink-0">{event.time}</span>
                    <button 
                      onClick={() => toggleEventColor(event)}
                      title="Chạm để đổi màu trạng thái"
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1 shrink-0 transition-colors cursor-pointer hover:scale-150",
                        event.color || "bg-matrix-dim"
                      )} 
                    />
                    <div className="min-w-0">
                      <span className="text-matrix-muted">{event.title}</span>
                      {event.subtitle && (
                        <span className="text-matrix-dim ml-2">{event.subtitle}</span>
                      )}
                    </div>
                  </div>
                  <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex gap-2 transition-opacity">
                    <button className="text-matrix-primary hover:text-white" onClick={() => handleEdit(event)}>[E]</button>
                    <button className="text-red-400 hover:text-red-300" onClick={() => deleteTimelineEvent(event.id)}>[X]</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <form id="add-event-form" onSubmit={handleAdd} className="mt-4 pt-4 border-t border-matrix-primary/30 space-y-2">
            <div className="text-matrix-primary font-bold text-xs uppercase mb-2">{t("lifeAi.addNewEvent")}</div>
            <div className="grid grid-cols-2 gap-2">
              <MatrixTimePicker label={t("lifeAi.time")} value={newEvent.time} onChange={(val) => setNewEvent({...newEvent, time: val})} />
              <MatrixInput label={t("lifeAi.title")} placeholder={t("lifeAi.title")} value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MatrixInput label={t("lifeAi.subtitle")} placeholder={t("lifeAi.optional")} value={newEvent.subtitle} onChange={(e) => setNewEvent({...newEvent, subtitle: e.target.value})} />
              <MatrixSelect label={t("lifeAi.color")} options={EVENT_COLORS} value={newEvent.color || "bg-matrix-primary"} onChange={(val) => setNewEvent({...newEvent, color: val})} />
            </div>
            <MatrixButton type="submit" className="w-full justify-center">{t("lifeAi.addEventBtn")}</MatrixButton>
          </form>
        </div>
      </AsciiBox>

      {/* Activity heatmap */}
      <RunHeatmap data={heatmapData} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AsciiBox title={t("lifeAi.weeklySteps")}>
          <TrendMonitor
            data={weeklySteps.map((d) => d.value)}
            label={weeklySteps.map((d) => d.label).join(", ")}
            color="var(--matrix-ink)"
          />
        </AsciiBox>

        <AsciiBox title={t("lifeAi.monthlySleep")}>
          <TrendChart
            data={monthlySleep.map((d) => d.value)}
            unitLabel={t("lifeAi.hrs")}
            leftLabel="JAN"
            rightLabel="DEC"
          />
        </AsciiBox>
      </div>

      {/* Activity breakdown */}
      <AsciiBox title={t("lifeAi.activityBreakdown")}>
        <div className="space-y-2">
          {activityBreakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-3 font-mono text-xs">
              <span className="w-16 text-matrix-muted">{item.label}</span>
              <div className="flex-1 h-3 bg-matrix-primary/10 overflow-hidden">
                <div
                  className="h-full bg-matrix-primary"
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className="text-matrix-dim w-8 text-right">{item.value}%</span>
              <Sparkline
                data={Array.from({ length: 7 }, () => Math.random() * item.value)}
                width={60}
                height={16}
                color="var(--matrix-ink)"
              />
            </div>
          ))}
        </div>
      </AsciiBox>

      {/* App Usage (formerly Heart rate) */}
      <AsciiBox title={t("lifeAi.appUsage", "APP USAGE FREQUENCY (24H)")}>
        <div className="flex items-end h-[60px] gap-[2px]">
          {appUsageSlots.map((slot, i) => {
             const maxCount = Math.max(...appUsageSlots.map(s => s.value), 10);
             const heightPct = Math.min(100, Math.max(5, (slot.value / maxCount) * 100));
             return (
               <div key={i} className={cn("flex-1 rounded-sm transition-all duration-500", slot.color)} style={{ height: `${heightPct}%` }} title={slot.label} />
             );
          })}
        </div>
      </AsciiBox>

      {/* Sync Instructions */}
      <AsciiBox title={t("lifeAi.syncStatus", "BIOMETRIC SYNC STATUS")}>
        <div className="space-y-2 font-mono text-xs">
          <p className="text-matrix-muted">
            {'>'} {t("lifeAi.syncDesc", "Data is automatically synchronized from your connected Google Drive / Google Sheet.")}
          </p>
          <p className="text-matrix-primary bg-black/50 p-2 rounded inline-block">
            {t("lifeAi.syncCommand", "Auto-sync: ENABLED (Google Sheet)")}
          </p>
          <p className="text-matrix-dim pt-2 border-t border-matrix-primary/20">
            * {t("lifeAi.syncNote", "Update the 'Biometrics' sheet to see the latest metrics.")}
          </p>
        </div>
      </AsciiBox>
    </div>
  );
}
