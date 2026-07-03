import { useEffect, useState, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const ANIMATION_MS = 220;

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // 다음 프레임에 visible을 켜서 transition이 재생되도록 함
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-t-ios-lg bg-white pb-safe-bottom shadow-sheet transition-transform duration-200 ease-out dark:bg-ios-gray-900 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-ios-gray-300 dark:bg-ios-gray-700" />
        {title && (
          <h2 className="mt-3 text-center text-base font-semibold text-ios-gray-900 dark:text-white">
            {title}
          </h2>
        )}
        <div className="px-5 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}
