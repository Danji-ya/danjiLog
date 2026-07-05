import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const ANIMATION_MS = 220;
// 이 이상 끌어내리거나, 이보다 느슨해도 빠르게 튕기면(velocity) 닫힘으로 처리합니다.
const DISMISS_DISTANCE_PX = 120;
const DISMISS_VELOCITY_PX_MS = 0.5;

/**
 * Radix Dialog 위에 만든 iOS 스타일 바텀시트.
 * Radix가 포커스 트랩/ESC/배경 스크롤 잠금/외부 클릭 닫힘을 담당하고,
 * 우리는 슬라이드 애니메이션과 손잡이를 끌어서 닫는 제스처만 직접 구현합니다.
 */
export default function Sheet({ open, onClose, title, children }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<{ y: number; time: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    setDragY(0);
    setIsDragging(false);
    const timeout = setTimeout(() => setMounted(false), ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [open]);

  if (!mounted) return null;

  const handleDragStart = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { y: e.clientY, time: performance.now() };
    setIsDragging(true);
  };

  const handleDragMove = (e: ReactPointerEvent) => {
    if (!dragStartRef.current) return;
    setDragY(Math.max(0, e.clientY - dragStartRef.current.y));
  };

  const handleDragEnd = (e: ReactPointerEvent) => {
    if (!dragStartRef.current) return;
    const distance = e.clientY - dragStartRef.current.y;
    const elapsed = performance.now() - dragStartRef.current.time;
    const velocity = distance / Math.max(elapsed, 1);
    dragStartRef.current = null;
    setIsDragging(false);

    if (distance > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_MS) {
      setVisible(false);
      onClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal forceMount>
        <Dialog.Overlay
          forceMount
          className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        />
        <Dialog.Content
          forceMount
          ref={contentRef}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            contentRef.current?.focus();
          }}
          className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-ios-lg bg-white pb-safe-bottom shadow-sheet outline-none dark:bg-ios-gray-900 ${
            isDragging ? "" : "transition-transform duration-200 ease-out"
          } ${visible ? "translate-y-0" : "translate-y-full"}`}
          style={isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
        >
          <div
            className="touch-none px-5 pb-1 pt-2.5"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-ios-gray-300 dark:bg-ios-gray-700" />
            {title ? (
              <Dialog.Title className="mt-3 text-center text-base font-semibold text-ios-gray-900 dark:text-white">
                {title}
              </Dialog.Title>
            ) : (
              <Dialog.Title className="sr-only">메뉴</Dialog.Title>
            )}
          </div>
          <div className="px-5 pb-6 pt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
