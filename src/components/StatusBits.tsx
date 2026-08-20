import { STATUS_LABEL, STATUS_ORDER, type Severity, type VoiceStatus } from "@/lib/types";
import type { VoiceEvent } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const STATUS_TAG_CLS: Record<VoiceStatus, string> = {
  open: "bg-[#fde7e9] text-[#e0263d]",
  verification: "bg-[#fff6e0] text-[#c98a00]",
  progress: "bg-[#eef2fd] text-[#2b57c9]",
  closed: "bg-[#e8f8ef] text-[#1f9d55]",
};

export function StatusTag({ status }: { status: VoiceStatus }) {
  return (
    <div
      className={`inline-flex flex-none items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap ${STATUS_TAG_CLS[status]}`}
    >
      {STATUS_LABEL[status]}
    </div>
  );
}

const SEVERITY_CLS: Record<Severity, string> = {
  Low: "bg-[#e8f8ef] text-[#1f9d55]",
  Medium: "bg-[#fff6e0] text-[#c98a00]",
  High: "bg-[#fff2e3] text-[#f5821f]",
  Critical: "bg-[#fbe4ea] text-[#8f1230]",
};

export function SeverityPill({ severity }: { severity: Severity }) {
  return (
    <div className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${SEVERITY_CLS[severity]}`}>
      Severity: {severity}
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full bg-gray-100 px-2.5 py-1 text-[10.5px] font-bold text-gray-600">
      {children}
    </div>
  );
}

export function ReopenTag() {
  return (
    <span className="ml-1.5 rounded-full bg-[#fff2e3] px-1.5 py-0.5 text-[9.5px] font-extrabold text-[#f5821f]">
      Reopened
    </span>
  );
}

const DOT_FILL: Record<string, string> = {
  fill: "bg-[#2b57c9] shadow-[0_0_0_1px_#2b57c9]",
  "fill-closed": "bg-[#1f9d55] shadow-[0_0_0_1px_#1f9d55]",
  "": "bg-gray-200 shadow-[0_0_0_1px_#e4e7ee]",
};
const LINE_FILL: Record<string, string> = {
  fill: "bg-[#2b57c9]",
  "fill-closed": "bg-[#1f9d55]",
  "": "bg-gray-200",
};

export function StatusTrack({ status }: { status: VoiceStatus }) {
  const idx = STATUS_ORDER.indexOf(status);
  return (
    <div>
      <div className="mb-1.5 mt-2 flex items-center">
        {STATUS_ORDER.map((key, i) => {
          const filled = i <= idx;
          const isClosed = key === "closed";
          const dotState = filled ? (isClosed ? "fill-closed" : "fill") : "";
          return (
            <div key={key} className="flex flex-1 items-center last:flex-none">
              <div
                className={`h-[13px] w-[13px] flex-none rounded-full border-2 border-white ${DOT_FILL[dotState]}`}
              />
              {i < STATUS_ORDER.length - 1 ? (
                <div
                  className={`h-[3px] flex-1 ${
                    i < idx
                      ? LINE_FILL[
                          i + 1 === STATUS_ORDER.length - 1 && idx === STATUS_ORDER.length - 1
                            ? "fill-closed"
                            : "fill"
                        ]
                      : LINE_FILL[""]
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mb-3.5 flex justify-between text-[9.5px] font-bold text-gray-400">
        {STATUS_ORDER.map((key, i) => (
          <span key={key} className={i <= idx ? "text-[#16296b]" : ""}>
            {STATUS_LABEL[key]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Timeline({ events }: { events: VoiceEvent[] }) {
  return (
    <div className="relative pl-5.5">
      {events.map((t, i) => {
        const isLast = i === events.length - 1;
        return (
          <div key={t.id} className="relative pb-5 last:pb-0">
            <div
              className={`absolute -left-[17px] top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white shadow-[0_0_0_2px_#e4e7ee] ${
                isLast ? "bg-[#2b57c9] shadow-[0_0_0_2px_#eef2fd]" : "bg-[#1f9d55] shadow-[0_0_0_2px_#bfe8cf]"
              }`}
            />
            {!isLast ? (
              <div className="absolute -left-[13px] top-3 bottom-0 w-[1.5px] bg-gray-200" />
            ) : null}
            <div className="text-[12.5px] font-bold">{t.title}</div>
            <div className="my-0.5 text-[10.5px] text-gray-400">
              {fmtDate(t.created_at)} &middot; {t.who}
            </div>
            {t.note ? (
              <div className="mt-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11.5px] text-gray-600">
                {t.note}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
