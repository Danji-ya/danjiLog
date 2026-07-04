import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
  /** true면 마지막 항목 다음에 첫 항목으로 자연스럽게 이어지는 무한 순환 스크롤이 됩니다. */
  loop?: boolean;
  className?: string;
  "aria-label"?: string;
}

// loop 모드에서 옵션 배열을 반복할 횟수(홀수, 가운데 블록을 기준 위치로 사용)
const LOOP_REPEAT = 7;

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
  loop = false,
  className = "",
  "aria-label": ariaLabel,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { tap } = useHaptic();
  const lastIndexRef = useRef<number>(-1);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isProgrammaticScroll = useRef(false);

  const padding = (itemHeight * (visibleCount - 1)) / 2;
  const middleBlock = Math.floor(LOOP_REPEAT / 2);

  // loop 모드에서는 원본 옵션을 여러 벌 이어붙여 렌더링합니다.
  // 각 블록은 원본을 그대로 반복한 것이라 인덱스 i의 값은 options[i % options.length]와 동일합니다.
  const displayOptions = useMemo(
    () => (loop ? Array.from({ length: LOOP_REPEAT }, () => options).flat() : options),
    [loop, options]
  );

  const indexOfValue = (v: number) => {
    const idx = options.findIndex((o) => o.value === v);
    return idx === -1 ? 0 : idx;
  };

  const targetIndex = (v: number) => (loop ? middleBlock * options.length : 0) + indexOfValue(v);

  // value prop이 외부에서 바뀌면 해당 위치로 스크롤 (loop 모드에서는 항상 가운데 블록 기준)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = targetIndex(value);
    const targetTop = idx * itemHeight;
    if (Math.abs(el.scrollTop - targetTop) > 1) {
      isProgrammaticScroll.current = true;
      el.scrollTop = targetTop;
    }
    lastIndexRef.current = idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options, itemHeight, loop]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      const rawIndex = Math.round(el.scrollTop / itemHeight);
      const clamped = Math.min(Math.max(rawIndex, 0), displayOptions.length - 1);

      if (clamped !== lastIndexRef.current && !isProgrammaticScroll.current) {
        lastIndexRef.current = clamped;
        tap();
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
        let finalIndex = Math.min(
          Math.max(Math.round(el.scrollTop / itemHeight), 0),
          displayOptions.length - 1
        );

        // 가운데 블록에서 너무 멀어졌으면, 같은 패턴이 반복되는 블록이라 티 나지 않게
        // 가운데 블록의 대응 위치로 즉시(비-스무스) 되돌려 앞뒤로 순환할 여유를 계속 확보합니다.
        if (loop) {
          const block = Math.floor(finalIndex / options.length);
          if (block !== middleBlock) {
            finalIndex = middleBlock * options.length + (finalIndex % options.length);
            isProgrammaticScroll.current = true;
            el.scrollTop = finalIndex * itemHeight;
          }
        }

        const option = displayOptions[finalIndex];
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
  }, [displayOptions, itemHeight, value, onChange, loop, options.length]);

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
        {displayOptions.map((option, idx) => {
          const selected = option.value === value;
          return (
            <div
              key={loop ? idx : option.value}
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
