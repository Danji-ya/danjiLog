import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

export default function MobileLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-ios-gray-100 pt-safe-top dark:bg-black">
      <Outlet />
      <BottomNav />
    </div>
  );
}
