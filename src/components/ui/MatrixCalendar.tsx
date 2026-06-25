import { useState, useEffect } from "react";
import { AsciiBox } from "@/components/ui/AsciiBox";
import { useTranslation } from "react-i18next";

export function MatrixCalendar() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update date occasionally so it stays current if the app is left open
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000 * 60 * 60);
    return () => clearInterval(timer);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = currentDate.getDate();

  // Get the first day of the month (0 = Sunday, 1 = Monday...)
  const firstDay = new Date(year, month, 1).getDay();
  
  // Get number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Generate days array
  const blanks = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allSlots = [...blanks, ...days];
  
  // Split into weeks
  const weeks = [];
  for (let i = 0; i < allSlots.length; i += 7) {
    weeks.push(allSlots.slice(i, i + 7));
  }

  return (
    <AsciiBox title={t("dashboard.calendar", "CALENDAR")} subtitle="[TIME]" className="h-full">
      <div className="flex flex-col items-center justify-center p-2 font-mono h-full min-h-[140px]">
        <div className="text-matrix-primary text-lg font-black tracking-widest drop-shadow-[0_0_8px_rgba(0,255,65,0.8)] mb-2">
          {monthNames[month]}
        </div>
        
        <table className="w-full max-w-[200px] text-center table-fixed border-collapse">
          <thead>
            <tr className="border-b border-matrix-primary/30">
              {dayNames.map(day => (
                <th key={day} className="text-[10px] font-normal text-[#90EE90] pb-1 w-[14.2%] drop-shadow-[0_0_2px_rgba(144,238,144,0.8)]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wIdx) => (
              <tr key={wIdx}>
                {week.map((day, dIdx) => {
                  const isToday = day === today;
                  return (
                    <td 
                      key={dIdx} 
                      className={`py-1 text-xs md:text-sm ${
                        isToday 
                          ? "text-matrix-bright bg-matrix-primary/20 font-bold drop-shadow-[0_0_5px_rgba(0,255,65,1)] rounded-sm" 
                          : day ? "text-matrix-primary font-bold opacity-90 drop-shadow-[0_0_4px_rgba(0,255,65,0.6)]" : ""
                      }`}
                    >
                      {day || ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AsciiBox>
  );
}
