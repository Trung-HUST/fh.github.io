import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MatrixDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export const MatrixDatePicker: React.FC<MatrixDatePickerProps> = ({ value, onChange, className, required }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      return new Date(Number(y), Number(m) - 1, 1); // Set to 1st of month to avoid overflow
    }
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const handleSelectDay = (day: number) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const dayNames = [
    t("calendar.su", "CN"), t("calendar.mo", "T2"), t("calendar.tu", "T3"), 
    t("calendar.we", "T4"), t("calendar.th", "T5"), t("calendar.fr", "T6"), t("calendar.sa", "T7")
  ];

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div 
        className="w-full bg-black border border-matrix-ghost/50 text-matrix-primary p-2 focus-within:border-matrix-primary cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-mono text-sm">{value || "____-__-__"}</span>
        <Calendar className="w-4 h-4 text-matrix-dim" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full sm:w-[280px] p-4 bg-[#0D0D0D] border border-matrix-primary/50 shadow-[0_0_15px_rgba(0,255,65,0.2)] mt-1 left-0 sm:left-auto">
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={handlePrevMonth} className="text-matrix-primary hover:text-white p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="font-mono font-bold text-matrix-primary uppercase text-sm">
              {currentMonth.getFullYear()}/{String(currentMonth.getMonth() + 1).padStart(2, '0')}
            </div>
            <button type="button" onClick={handleNextMonth} className="text-matrix-primary hover:text-white p-1">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {dayNames.map((day, i) => (
              <div key={i} className="text-matrix-dim text-xs font-mono uppercase">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-8 invisible"></div>;
              }

              const y = currentMonth.getFullYear();
              const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
              const d = String(day).padStart(2, '0');
              const dateStr = `${y}-${m}-${d}`;

              const isSelected = value === dateStr;
              
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              
              return (
                <div 
                  key={idx}
                  className={cn(
                    "h-8 flex items-center justify-center text-sm font-mono cursor-pointer transition-colors",
                    !isSelected && "hover:bg-matrix-primary/20 text-matrix-dim",
                    isSelected && "bg-matrix-primary text-black font-bold",
                    isToday && !isSelected && "border border-matrix-primary/50 text-matrix-primary"
                  )}
                  onClick={() => handleSelectDay(day)}
                >
                  {day}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 flex justify-between border-t border-matrix-ghost/30 pt-3">
             <button 
                type="button"
                className="text-xs text-matrix-dim hover:text-matrix-primary uppercase font-mono"
                onClick={() => {
                   onChange("");
                   setIsOpen(false);
                }}
             >
                {t("calendar.clear", "XÓA")}
             </button>
             <button 
                type="button"
                className="text-xs text-matrix-primary font-bold uppercase font-mono"
                onClick={() => {
                   const today = new Date();
                   const y = today.getFullYear();
                   const m = String(today.getMonth() + 1).padStart(2, '0');
                   const d = String(today.getDate()).padStart(2, '0');
                   onChange(`${y}-${m}-${d}`);
                   setIsOpen(false);
                }}
             >
                {t("calendar.today", "HÔM NAY")}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
