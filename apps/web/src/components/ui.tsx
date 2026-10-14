import { ReactNode } from "react";

export function StatusBadge({ status }: { status: string }) {
  const tone = { delivered: "green", success: "green", pending: "amber", processing: "amber", partial_failure: "orange", failed: "red", compensated: "orange" }[status] ?? "gray";
  return <span className={`badge ${tone}`}>{status.replace("_", " ")}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="ghost" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  return message ? <div className="error">{message}</div> : null;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");
