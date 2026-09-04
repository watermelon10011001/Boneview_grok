import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  onFiles: (files: File[]) => void;
  directory?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  accept?: string;
  children: ReactNode;
  className?: string;
  label?: string;
  multiple?: boolean;
};

const ACCEPT_ALL =
  ".json,.skel,.atlas,.png,.jpg,.jpeg,.webp,.txt,.bytes,.zip,image/png,image/jpeg,application/json,application/zip,application/octet-stream";

export function FilePicker({
  onFiles,
  directory = false,
  variant = "secondary",
  size = "md",
  accept = ACCEPT_ALL,
  children,
  className,
  label,
  multiple = true,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        className="sr-only"
        multiple={directory ? false : multiple}
        accept={directory ? undefined : accept}
        aria-label={label}
        {...(directory ? ({ webkitdirectory: "" } as Record<string, string>) : {})}
        onChange={(event) => {
          const list = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (list.length) onFiles(list);
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => ref.current?.click()}
      >
        {children}
      </Button>
    </>
  );
}
