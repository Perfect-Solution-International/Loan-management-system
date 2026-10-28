"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  children,
  title,
  onClose,
  className = "",
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        closeRef.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}

export function LoadingState({
  label = "Loading workspace...",
}: {
  label?: string;
}) {
  return (
    <div className="page-container" role="status" aria-label={label}>
      <p className="text-sm text-slate-600 mb-6">{label}</p>
      <div aria-hidden="true" className="skeleton h-8 w-56 mb-6" />
      <div className="grid sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton h-72 mt-6" />
    </div>
  );
}
