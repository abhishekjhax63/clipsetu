"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-ink-900 group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-ink-500",
          actionButton:
            "group-[.toast]:bg-ink-900 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-surface-muted group-[.toast]:text-ink-700",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
