import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, HeartPulse, Plus, ArrowLeftRight, Settings, PlusCircle, CalendarPlus, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function MobileNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const navItems = [
    { name: t("nav.dashboard", "Dashboard"), path: "/", icon: LayoutDashboard },
    { name: t("nav.lifeAi", "Life Signal"), path: "/life-signal", icon: HeartPulse },
    { name: t("nav.add", "Add"), action: () => setShowAddMenu(!showAddMenu), icon: Plus, isAction: true },
    { name: t("nav.records", "Record"), path: "/records", icon: ArrowLeftRight },
    { name: t("nav.settings", "Setting"), path: "/settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-30">
      {/* Add Menu Popup */}
      {showAddMenu && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#0D0D0D] border border-matrix-primary/30 rounded-xl p-2 flex flex-col gap-2 shadow-[0_0_15px_rgba(0,255,65,0.2)] w-48 mb-2">
          <button
            onClick={() => {
              setShowAddMenu(false);
              navigate("/records?add=true");
            }}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-matrix-primary hover:bg-matrix-primary/20 transition-colors"
          >
            <ReceiptText className="w-4 h-4" />
            <span className="font-mono text-xs uppercase">{t("records.createNew", "Add New Record")}</span>
          </button>
          <button
            onClick={() => {
              setShowAddMenu(false);
              navigate("/life-signal?add=true");
            }}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-matrix-primary hover:bg-matrix-primary/20 transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            <span className="font-mono text-xs uppercase">{t("lifeAi.addNewEvent", "Add New Event")}</span>
          </button>
        </div>
      )}

      {/* Navbar Overlay to close menu when clicking outside */}
      {showAddMenu && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => setShowAddMenu(false)}
        />
      )}

      <div className="bg-[#0D0D0D] border border-matrix-primary/30 rounded-full px-2 py-2 flex items-center justify-between shadow-[0_0_15px_rgba(0,255,65,0.15)] relative">
        {navItems.map((item) => {
          // If Add menu is open, ONLY the Add button is selected
          const isSelected = item.isAction 
            ? showAddMenu 
            : showAddMenu 
              ? false 
              : (item.path 
                  ? item.path === '/' 
                    ? location.pathname === '/' 
                    : location.pathname.startsWith(item.path)
                  : false);

          return (
            <button
              key={item.name}
              onClick={() => {
                if (item.isAction && item.action) {
                  item.action();
                } else if (item.path) {
                  setShowAddMenu(false);
                  navigate(item.path);
                }
              }}
              className={cn(
                "flex items-center justify-center transition-all duration-300 ease-in-out py-2 rounded-full",
                isSelected 
                  ? "bg-matrix-primary text-black px-4" 
                  : "text-matrix-dim hover:text-matrix-primary px-3",
                item.isAction && isSelected ? "px-3" : "" // Keep it more circular if it's just the icon
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSelected && !item.isAction && (
                <span className="ml-2 text-[10px] sm:text-[11px] font-bold font-mono uppercase tracking-wider overflow-hidden whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
