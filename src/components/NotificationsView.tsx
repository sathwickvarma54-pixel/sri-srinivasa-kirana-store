import React from "react";
import { 
  Bell, 
  Trash, 
  CheckCheck, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Check, 
  Maximize2 
} from "lucide-react";
import { Notification } from "../types";

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkRead: (notifId: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onClearAll: () => Promise<void>;
}

export function NotificationsView({ 
  notifications, 
  onMarkRead, 
  onMarkAllRead,
  onClearAll
}: NotificationsViewProps) {

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-xs font-semibold text-gray-500">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">System Notifications Center</h1>
          <p className="text-xs text-gray-500">Track expirations, critically low item alerts, and system boot logs</p>
        </div>
        
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={onMarkAllRead}
                className="px-4 py-2 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4 shrink-0" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClearAll}
              className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <Trash className="w-4 h-4 shrink-0" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            🎉 Clean slate! No notification logs found.
          </div>
        ) : (
          notifications.map(n => {
            const IsUnread = !n.isRead;
            return (
              <div 
                key={n.id} 
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${IsUnread ? "bg-[#166534]/5" : "hover:bg-gray-50"}`}
              >
                <div className="flex gap-3">
                  {/* Icon mapped by severity */}
                  <div className={`p-2 rounded-xl shrink-0 ${
                    n.severity === "critical" ? "bg-red-50 text-[#E63946]" :
                    n.severity === "warning" ? "bg-amber-50 text-[#F59E0B]" : "bg-emerald-50 text-[#166534]"
                  }`}>
                    {n.severity === "critical" && <AlertOctagon className="w-5 h-5 shrink-0" />}
                    {n.severity === "warning" && <AlertTriangle className="w-5 h-5 shrink-0" />}
                    {n.severity === "info" && <Info className="w-5 h-5 shrink-0" />}
                  </div>

                  <div>
                    <h4 className={`text-slate-900 text-xs leading-relaxed ${IsUnread ? "font-extrabold" : "font-semibold"}`}>
                      {n.message}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                      {new Date(n.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })} • {new Date(n.timestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {IsUnread ? (
                    <button
                      onClick={() => onMarkRead(n.id)}
                      className="p-1 px-3 bg-[#166534] hover:bg-[#14532D] text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm uppercase tracking-wider"
                      title="Dismiss Alert"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Resolved</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
