import { type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { usePullToRefresh } from "use-pull-to-refresh";

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  /** 바텀시트 등 모달이 열려 있는 동안 window 터치 제스처와 충돌하지 않도록 끕니다. */
  isDisabled?: boolean;
}

const REFRESH_THRESHOLD = 64;
const MAX_PULL_LENGTH = 100;

/**
 * 화면 최상단에서 아래로 당기면 새로고침되는 iOS 스타일 인디케이터.
 * 이 앱은 body/window가 그대로 스크롤되는 구조라 별도 스크롤 컨테이너 없이
 * window 스크롤을 기준으로 동작하는 usePullToRefresh를 그대로 사용합니다.
 */
export default function PullToRefresh({ onRefresh, children, isDisabled }: PullToRefreshProps) {
  const { isRefreshing, pullPosition } = usePullToRefresh({
    onRefresh,
    refreshThreshold: REFRESH_THRESHOLD,
    maximumPullLength: MAX_PULL_LENGTH,
    enableResistance: true,
    isDisabled,
  });

  const progress = Math.min(pullPosition / REFRESH_THRESHOLD, 1);
  const active = isRefreshing || pullPosition > 0;
  const indicatorY = isRefreshing ? REFRESH_THRESHOLD : pullPosition;

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
        style={{
          transform: `translateY(${indicatorY * 0.6 - 20}px)`,
          opacity: active ? 1 : 0,
          transition: active ? "none" : "opacity 0.15s ease-out, transform 0.15s ease-out",
        }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-card dark:bg-ios-gray-800">
          <RefreshCw
            className={`h-4 w-4 text-ios-blue ${isRefreshing ? "animate-spin" : ""}`}
            style={isRefreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
