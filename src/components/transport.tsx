import { Camera, Pause, Play, Repeat, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bindTimelineEls, getPlayerApi } from "@/components/player-stage";
import { useStudio } from "@/lib/spine/store";
import { cn } from "@/lib/cn";

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

export function Transport() {
  const playing = useStudio((s) => s.playing);
  const looping = useStudio((s) => s.looping);
  const speed = useStudio((s) => s.speed);
  const ready = useStudio((s) => s.ready);
  const currentAnimation = useStudio((s) => s.currentAnimation);
  const pack = useStudio((s) => s.pack);

  function togglePlay() {
    const api = getPlayerApi();
    if (!api) return;
    if (playing) {
      api.pause();
      useStudio.getState().setPlaying(false);
    } else {
      api.play();
      useStudio.getState().setPlaying(true);
    }
  }

  function restart() {
    const api = getPlayerApi();
    if (!api || !currentAnimation) return;
    api.setAnimation(currentAnimation, looping);
    api.play();
    useStudio.getState().setPlaying(true);
  }

  function toggleLoop() {
    const next = !looping;
    useStudio.getState().setLooping(next);
    getPlayerApi()?.setLoop(next);
  }

  async function snapshot() {
    const dataUrl = getPlayerApi()?.capture();
    if (!dataUrl) return;
    const name = `${pack?.skeleton.name.replace(/\.(json|skel|bytes)$/i, "") ?? "spine"}-${currentAnimation ?? "frame"}.png`;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], name, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: name });
        return;
      }
    } catch {
      /* fall through to download */
    }
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = name;
    link.click();
  }

  return (
    <div className="safe-transport flex flex-col gap-2 bg-raised px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" onClick={togglePlay} disabled={!ready} aria-label={playing ? "暂停" : "播放"}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-px" />}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={restart} disabled={!ready} aria-label="重播">
          <RotateCcw className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleLoop}
          disabled={!ready}
          aria-label="循环"
          className={cn(looping && "bg-panel text-ink")}
        >
          <Repeat className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => void snapshot()} disabled={!ready} aria-label="截图">
          <Camera className="size-4" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="w-14 shrink-0 font-mono text-xs text-mute tabular-nums"
          ref={(node) => bindTimelineEls({ elapsed: node })}
        >
          00:00.00
        </span>
        <input
          type="range"
          className="scrub min-w-0 flex-1"
          min={0}
          max={1}
          step={0.001}
          defaultValue={0}
          disabled={!ready}
          aria-label="时间轴"
          ref={(node) => bindTimelineEls({ slider: node })}
          onPointerDown={() => getPlayerApi()?.pause()}
          onChange={(event) => {
            const t = Number(event.currentTarget.value);
            getPlayerApi()?.seek(t);
            useStudio.getState().setPlaying(false);
          }}
        />
        <span
          className="w-14 shrink-0 text-right font-mono text-xs text-mute tabular-nums"
          ref={(node) => bindTimelineEls({ duration: node })}
        >
          00:00.00
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            disabled={!ready}
            onClick={() => {
              useStudio.getState().setSpeed(value);
              getPlayerApi()?.setSpeed(value);
            }}
            className={cn(
              "h-8 rounded-sm px-2 font-mono text-xs text-mute transition-colors duration-200",
              value === speed ? "bg-panel text-ink" : "hover:text-ink",
            )}
          >
            {value}x
          </button>
        ))}
      </div>
    </div>
  );
}
