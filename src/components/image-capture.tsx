import { useRef } from "react";
import { Camera, Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fileToDataUrl } from "@/lib/ocr";
import { compressCapture } from "@/lib/image-prep";

export function ImageCapture({
  value,
  onChange,
  label = "Capture or upload bill",
  hint = "Shop lamps and a phone torch are fine. Hold the paper flat.",
  cameraLabel = "Click photo",
  galleryLabel = "Upload image",
  capture = "environment",
  className,
}: {
  value?: string | null;
  onChange: (dataUrl: string) => void;
  label?: string;
  hint?: string;
  cameraLabel?: string;
  galleryLabel?: string;
  capture?: "environment" | "user" | undefined;
  className?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handle = async (
    file: File | null | undefined,
    input: HTMLInputElement,
  ) => {
    if (!file) return;
    try {
      const url = await compressCapture(await fileToDataUrl(file));
      onChange(url);
    } finally {
      input.value = "";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0], e.currentTarget)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0], e.currentTarget)}
      />

      {value ? (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-elevated">
          <img
            src={value}
            alt="Captured bill"
            className="max-h-48 w-full object-contain bg-bg sm:max-h-56"
            crossOrigin="anonymous"
          />
          <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-4" />
              {cameraLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => galleryRef.current?.click()}
            >
              <Upload className="size-4" />
              {galleryLabel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-elevated/40 p-4 text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImageIcon className="size-5" />
          </div>
          <p className="text-sm font-medium text-fg">{label}</p>
          <p className="mt-1 text-xs text-muted">{hint}</p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-4 shrink-0" />
              <span>{cameraLabel}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => galleryRef.current?.click()}
            >
              <Upload className="size-4 shrink-0" />
              <span>{galleryLabel}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
