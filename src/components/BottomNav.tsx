import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "홈", icon: "🏠", end: true },
  { to: "/stats", label: "통계", icon: "📊", end: false },
  { to: "/calendar", label: "캘린더", icon: "📅", end: false },
  { to: "/settings", label: "설정", icon: "⚙️", end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ios-gray-200 bg-white/90 pb-safe-bottom backdrop-blur-lg dark:border-ios-gray-800 dark:bg-ios-gray-900/90">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                isActive
                  ? "text-ios-blue"
                  : "text-ios-gray-400 dark:text-ios-gray-500"
              }`
            }
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
