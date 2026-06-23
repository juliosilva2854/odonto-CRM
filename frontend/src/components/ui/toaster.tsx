import { useEffect, useState } from "react";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastVariant,
} from "@/components/ui/toast";

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type Listener = (toasts: ToastItem[]) => void;

// Tiny pub-sub store — no Zustand dependency for this micro-state.
const state: { toasts: ToastItem[] } = { toasts: [] };
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l([...state.toasts]);
}

function subscribe(l: Listener) {
  listeners.add(l);
  l([...state.toasts]);
  return () => listeners.delete(l);
}

function dismiss(id: string) {
  state.toasts = state.toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(payload: Omit<ToastItem, "id"> & { id?: string }) {
  const id = payload.id ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: ToastItem = { duration: 4500, ...payload, id };
  state.toasts = [...state.toasts.filter((t) => t.id !== id), item];
  emit();
  return id;
}

export function useToast() {
  return { toast, dismiss };
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>(state.toasts);

  useEffect(() => {
    const unsubscribe = subscribe(setToasts);
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          duration={t.duration}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
        >
          <div className="flex-1 space-y-0.5">
            {t.title && <ToastTitle>{t.title}</ToastTitle>}
            {t.description && (
              <ToastDescription>{t.description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
