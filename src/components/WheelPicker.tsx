import { useEffect, useLayoutEffect, useRef } from "react";
import { useHaptic } from "@/hooks/useHaptic";

export interface WheelPickerOption {
  value: number;
  label: string;
}

interface WheelPickerProps {
  options: WheelPickerOption[];
  value: number;
  onChange: (value: number) => void;
  itemHeight?: number;
  visibleCount?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * iOS 스타일 롤러(Wheel) 피커.
 * CSS scroll-snap으로 구현해 네이티브 스크롤 관성/플릭을 그대로 활용합니다.
 */
export default function WheelPicker({
  options,
  value,
  onChange,
  itemHeight = 44,
  visibleCount = 5,
  className = "",
  "aria-label": ariaLabel,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { tap } = useHaptic();
  const lastIndexRef = useRef<number>(-1);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isProgrammaticScroll = useRef(false);

  const padding = (itemHeight * (visibleCount - 1)) / 2;

  const indexOfValue = (v: number) => {
    const idx = options.findIndex((o) => o.value === v);
    return idx === -1 ? 0 : idx;
  };

  // value prop이 외부에서 바뀌면 해당 위치로 스크롤
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = indexOfValue(value);
    const targetTop = idx * itemHeight;
    if (Math.abs(el.scrollTop - targetTop) > 1) {
      isProgrammaticScroll.current = true;
      el.scrollTop = targetTop;
    }
    lastIndexRef.current = idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options, itemHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      const rawIndex = Math.round(el.scrollTop / itemHeight);
      const clamped = Math.min(Math.max(rawIndex, 0), options.length - 1);

      if (clamped !== lastIndexRef.current && !isProgrammaticScroll.current) {
        lastIndexRef.current = clamped;
        tap();
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
        const finalIndex = Math.min(
          Math.max(Math.round(el.scrollTop / itemHeight), 0),
          options.length - 1
        );
        const option = options[finalIndex];
        if (option && option.value !== value) {
          onChange(option.value);
        }
      }, 120);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, itemHeight, value, onChange]);

  const handleItemClick = (idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });
  };

  return (
    <div
      className={`relative ${className}`}
      style={{ height: itemHeight * visibleCount }}
      aria-label={ariaLabel}
      role="listbox"
    >
      {/* 선택 영역 표시 (중앙 가로줄) */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 border-y border-ios-gray-300 dark:border-ios-gray-700"
        style={{ top: padding, height: itemHeight }}
      />
      {/* 상/하단 페이드 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/3 bg-gradient-to-b from-white to-transparent dark:from-ios-gray-900" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-white to-transparent dark:from-ios-gray-900" />

      <div
        ref={containerRef}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll"
        style={{ paddingTop: padding, paddingBottom: padding }}
      >
        {options.map((option, idx) => {
          const selected = option.value === value;
          return (
            <div
              key={option.value}
              role="option"
              aria-selected={selected}
              onClick={() => handleItemClick(idx)}
              className="flex snap-center items-center justify-center"
              style={{ height: itemHeight }}
            >
              <span
                className={`tabular-nums transition-all ${
                  selected
                    ? "text-[22px] font-semibold text-ios-gray-900 dark:text-white"
                    : "text-[17px] text-ios-gray-400 dark:text-ios-gray-600"
                }`}
              >
                {option.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
