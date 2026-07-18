import { useState } from "react";
import pkg from "../../package.json";
import { useDarkMode } from "@/hooks/useDarkMode";
import { signOut } from "@/services/auth";
import MealReminderSection from "@/components/MealReminderSection";

export default function SettingsPage() {
  const { isDark, toggle } = useDarkMode();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-4 pb-28 pt-4">
      <header>
        <h1 className="text-2xl font-bold text-ios-gray-900 dark:text-white">설정</h1>
      </header>

      <section className="overflow-hidden rounded-ios-lg bg-white shadow-card dark:bg-ios-gray-900">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[15px] text-ios-gray-900 dark:text-white">다크 모드</span>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggle}
            className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${
              isDark ? "bg-ios-green" : "bg-ios-gray-300 dark:bg-ios-gray-700"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
                isDark ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="h-px bg-ios-gray-100 dark:bg-ios-gray-800" />
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-[15px] text-ios-gray-900 dark:text-white">앱 버전</span>
          <span className="text-[15px] text-ios-gray-400">{pkg.version}</span>
        </div>
      </section>

      <MealReminderSection />

      <section className="overflow-hidden rounded-ios-lg bg-white shadow-card dark:bg-ios-gray-900">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full px-4 py-3.5 text-center text-[15px] font-medium text-ios-red transition active:bg-ios-gray-100 disabled:opacity-50 dark:active:bg-ios-gray-800"
        >
          {signingOut ? "로그아웃 중..." : "로그아웃"}
        </button>
      </section>
    </div>
  );
}
