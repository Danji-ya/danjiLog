import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useLatest } from "@/hooks/useLatest";

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
  loop?: boolean;
  className?: string;
  "aria-label"?: string;
}

const LOOP_REPEAT = 7;
const MIDDLE_BLOCK = Math.floor(LOOP_REPEAT / 2);
const SNAP_TOLERANCE_PX = 1;
const SCROLL_SETTLE_MS = 120;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const sameValueInMiddleBlock = (index: number, size: number) => MIDDLE_BLOCK * size + (index % size);

function useScrollSettle(ref: RefObject<HTMLElement>, onSettle: () => void) {
  const onSettleRef = useLatest(onSettle);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onSettleRef.current(), SCROLL_SETTLE_MS);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [ref, onSettleRef]);
}

export default function WheelPicker({
  options,
  value,
  onChange,
  itemHeight = 44,
  visibleCount = 5,
  loop = false,
  className = "",
  "aria-label": ariaLabel,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const centerOffset = (itemHeight * (visibleCount - 1)) / 2;

  const displayOptions = useMemo(
    () => (loop ? Array.from({ length: LOOP_REPEAT }, () => options).flat() : options),
    [loop, options]
  );

  const scrollIndexOf = useCallback(
    (v: number) => {
      const found = options.findIndex((o) => o.value === v);
      const index = found === -1 ? 0 : found;
      return loop ? sameValueInMiddleBlock(index, options.length) : index;
    },
    [options, loop]
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const targetTop = scrollIndexOf(value) * itemHeight;
    if (Math.abs(el.scrollTop - targetTop) > SNAP_TOLERANCE_PX) {
      el.scrollTop = targetTop;
    }
  }, [value, itemHeight, scrollIndexOf]);

  useScrollSettle(containerRef, () => {
    const el = containerRef.current;
    if (!el) return;

    let index = clamp(Math.round(el.scrollTop / itemHeight), 0, displayOptions.length - 1);

    if (loop) {
      const recentered = sameValueInMiddleBlock(index, options.length);
      if (recentered !== index) {
        index = recentered;
        el.scrollTop = index * itemHeight;
      }
    }

    const option = displayOptions[index];
    if (option && option.value !== value) {
      onChange(option.value);
    }
  });

  const scrollToItem = (index: number) => {
    containerRef.current?.scrollTo({ top: index * itemHeight, behavior: "smooth" });
  };

  return (
    <div
      className={`relative ${className}`}
      style={{ height: itemHeight * visibleCount }}
      aria-label={ariaLabel}
      role="listbox"
    >
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 border-y border-ios-gray-300 dark:border-ios-gray-700"
        style={{ top: centerOffset, height: itemHeight }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/3 bg-gradient-to-b from-white to-transparent dark:from-ios-gray-900" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-white to-transparent dark:from-ios-gray-900" />

      <div
        ref={containerRef}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll"
        style={{ paddingTop: centerOffset, paddingBottom: centerOffset }}
      >
        {displayOptions.map((option, index) => {
          const selected = option.value === value;
          return (
            <div
              key={loop ? index : option.value}
              role="option"
              aria-selected={selected}
              onClick={() => scrollToItem(index)}
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
