"use client";

import { useEffect, useState } from "react";

export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  const [clock, setClock] = useState("9:41");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-[360px] max-w-[92vw] flex-none rounded-[46px] bg-[#0b0e18] p-3 shadow-[0_30px_60px_rgba(10,20,60,0.28),0_2px_0_rgba(255,255,255,0.4)_inset]">
      <div className="pointer-events-none absolute left-1/2 top-0 z-50 h-[22px] w-[120px] -translate-x-1/2 rounded-b-2xl bg-[#0b0e18]" />
      <div className="flex h-[760px] max-h-[80vh] flex-col overflow-hidden rounded-[34px] bg-[#f4f5f9]">
        <div className="flex flex-none items-center justify-between px-6 pt-2.5 pb-1 text-[13px] font-semibold text-gray-900">
          <span>{clock}</span>
          <div className="flex items-center gap-1 text-xs">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export function AppHeader({
  title,
  sub,
  onBack,
  right,
}: {
  title: string;
  sub: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-none items-center gap-3 bg-gradient-to-br from-[#16296b] to-[#1c3f91] px-4.5 py-3.5 text-white">
      {onBack ? (
        <button
          onClick={onBack}
          className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-[10px] bg-white/10 text-base hover:bg-white/20"
        >
          ‹
        </button>
      ) : null}
      <div className="flex-1">
        <h2 className="m-0 text-[17px] font-bold">{title}</h2>
        <div className="mt-0.5 text-[11.5px] opacity-80">{sub}</div>
      </div>
      {right}
    </div>
  );
}

export function ContentScroll({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-4 pb-20 pt-4">{children}</div>;
}
