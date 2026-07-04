import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * react-router는 pushState 네비게이션 시 스크롤 위치를 초기화하지 않습니다.
 * 스크롤이 있는 페이지(예: 홈)에서 스크롤이 짧은 페이지(예: 설정)로 이동하면
 * 이전 스크롤 위치가 그대로 남아 화면이 밀려 보이는 문제가 있어, 경로가
 * 바뀔 때마다 페인트 전에 스크롤을 최상단으로 되돌립니다.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
