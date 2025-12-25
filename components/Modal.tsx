"use client";

import { useEffect, useRef, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Use setTimeout to ensure the initial render happens before animating
      const showTimer = setTimeout(() => {
        setIsShowing(true);
      }, 10);
      return () => clearTimeout(showTimer);
    } else {
      setIsShowing(false);
      const hideTimer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(hideTimer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: isShowing ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0)",
        transition: "background-color 200ms ease-out",
      }}
    >
      <div
        className="bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-800"
        style={{
          opacity: isShowing ? 1 : 0,
          transform: isShowing ? "translateY(0px) scale(1)" : "translateY(12px) scale(0.98)",
          transition: "opacity 200ms ease-out, transform 200ms ease-out",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-medium text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}
