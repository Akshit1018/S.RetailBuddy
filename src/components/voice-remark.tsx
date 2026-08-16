import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-context";

export function VoiceRemark({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const { t } = useT();
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState("");

  const start = async () => {
    setErr("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr(t("staff.voiceNo"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => onChange(String(reader.result || ""));
        reader.readAsDataURL(blob);
      };
      recRef.current = rec;
      rec.start();
      setLive(true);
    } catch {
      setErr(t("staff.voiceNo"));
    }
  };

  const stop = () => {
    recRef.current?.stop();
    recRef.current = null;
    setLive(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {live ? (
          <Button type="button" variant="danger" className="h-11 flex-1" onClick={stop}>
            <Square className="size-4" />
            {t("staff.voiceStop")}
          </Button>
        ) : (
          <Button type="button" variant="secondary" className="h-11 flex-1" onClick={() => void start()}>
            <Mic className="size-4" />
            {t("staff.voiceStart")}
          </Button>
        )}
        {value ? (
          <Button type="button" variant="outline" className="h-11" onClick={() => onChange(null)}>
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
      {err ? <p className="text-[11px] text-danger">{err}</p> : null}
      {value ? <audio controls src={value} className="w-full" /> : null}
    </div>
  );
}
