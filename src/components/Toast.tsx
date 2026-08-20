"use client";

import { useEffect, useRef, useState } from "react";
import { onToast } from "@/lib/toast";

export default function Toast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return onToast((m) => {
      setMsg(m);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMsg(null), 2600);
    });
  }, []);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] max-w-[88vw] rounded-full bg-gray-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-2xl transition-all duration-200 ${
        msg ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3"
      }`}
    >
      {msg}
    </div>
  );
}
