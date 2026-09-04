import { useEffect, useRef } from "react";
import {
  bootSpinePlayer,
  getTrack,
  pickDefaultAnimation,
  pickDefaultSkin,
  readPlayerMeta,
  seekPlayer,
  setDefaultMix,
  setPlayerLoop,
  setPlayerSkin,
  captureFrame,
} from "@/lib/spine/player";
import { useStudio } from "@/lib/spine/store";
import type { BackgroundMode, SpineMajor, SpinePlayerHandle } from "@/lib/spine/types";
import { cn } from "@/lib/cn";

const BG_HEX: Record<BackgroundMode, string> = {
  checker: "00000000",
  black: "0c0c0e",
  gray: "3f3f46",
  white: "f4f4f5",
};

type Props = {
  major: SpineMajor;
};

export type PlayerApi = {
  play: () => void;
  pause: () => void;
  setAnimation: (name: string, loop: boolean) => void;
  setSkin: (name: string) => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
  seek: (time: number) => void;
  setMix: (mix: number) => void;
  capture: () => string | null;
};

const playerApiRef: { current: PlayerApi | null } = { current: null };
const timelineRef: {
  slider: HTMLInputElement | null;
  elapsed: HTMLElement | null;
  duration: HTMLElement | null;
  fps: HTMLElement | null;
} = { slider: null, elapsed: null, duration: null, fps: null };

export function bindTimelineEls(els: Partial<typeof timelineRef>) {
  Object.assign(timelineRef, els);
}

export function getPlayerApi() {
  return playerApiRef.current;
}

export function PlayerStage({ major }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<SpinePlayerHandle | null>(null);
  const debugRef = useRef(useStudio.getState().debug);
  const xfRef = useRef({ x: 0, y: 0, s: 1 });
  const pack = useStudio((s) => s.pack);
  const pma = useStudio((s) => s.pma);
  const mix = useStudio((s) => s.mix);
  const bg = useStudio((s) => s.bg);
  const debug = useStudio((s) => s.debug);
  const speed = useStudio((s) => s.speed);

  useEffect(() => {
    Object.assign(debugRef.current, debug);
  }, [debug]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.speed = speed;
  }, [speed]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    setDefaultMix(player, mix);
  }, [mix]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const hex = bg === "checker" ? "00000000" : BG_HEX[bg];
    player.bg.setFromString(hex);
  }, [bg]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const xf = xfRef.current;
    const pointers = new Map<number, { x: number; y: number }>();
    let lastTap = 0;
    let pinch: { dist: number; s: number; x: number; y: number } | null = null;

    const apply = () => {
      layer.style.transform = `translate(${xf.x}px, ${xf.y}px) scale(${xf.s})`;
    };

    const reset = () => {
      xf.x = 0;
      xf.y = 0;
      xf.s = 1;
      apply();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      layer.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const first = pts[0];
        const second = pts[1];
        if (!first || !second) return;
        pinch = {
          dist: Math.hypot(second.x - first.x, second.y - first.y),
          s: xf.s,
          x: xf.x,
          y: xf.y,
        };
      }
      const now = Date.now();
      if (pointers.size === 1 && now - lastTap < 280) {
        reset();
        lastTap = 0;
      } else if (pointers.size === 1) {
        lastTap = now;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const prev = pointers.get(event.pointerId);
      if (!prev) return;
      const next = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, next);
      if (pointers.size === 2 && pinch) {
        const pts = [...pointers.values()];
        const first = pts[0];
        const second = pts[1];
        if (!first || !second) return;
        const dist = Math.hypot(second.x - first.x, second.y - first.y);
        if (pinch.dist > 0) {
          xf.s = Math.min(5, Math.max(0.4, pinch.s * (dist / pinch.dist)));
          apply();
        }
        return;
      }
      if (pointers.size === 1 && xf.s > 1.02) {
        xf.x += next.x - prev.x;
        xf.y += next.y - prev.y;
        apply();
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.92 : 1.08;
      xf.s = Math.min(5, Math.max(0.4, xf.s * delta));
      if (xf.s <= 1.02) {
        xf.s = 1;
        xf.x = 0;
        xf.y = 0;
      }
      apply();
    };

    layer.addEventListener("pointerdown", onPointerDown);
    layer.addEventListener("pointermove", onPointerMove);
    layer.addEventListener("pointerup", onPointerUp);
    layer.addEventListener("pointercancel", onPointerUp);
    layer.addEventListener("wheel", onWheel, { passive: false });
    reset();
    return () => {
      layer.removeEventListener("pointerdown", onPointerDown);
      layer.removeEventListener("pointermove", onPointerMove);
      layer.removeEventListener("pointerup", onPointerUp);
      layer.removeEventListener("pointercancel", onPointerUp);
      layer.removeEventListener("wheel", onWheel);
    };
  }, [pack]);

  useEffect(() => {
    if (!pack || !hostRef.current) return;
    const host = hostRef.current;
    host.innerHTML = "";
    let cancelled = false;
    const store = useStudio.getState();
    store.setReady(false);
    store.setLoadError(null);

    const debugState = { ...store.debug };
    debugRef.current = debugState;

    bootSpinePlayer(host, {
      pack,
      major,
      mix: store.mix,
      pma: store.pma,
      debug: debugState,
      backgroundHex: BG_HEX[store.bg],
      alpha: store.bg === "checker",
      animation: store.currentAnimation ?? undefined,
      skin: store.currentSkin ?? undefined,
      error: (message) => {
        if (!cancelled) useStudio.getState().setLoadError(message);
      },
      frame: (player) => {
        const track = getTrack(player);
        const duration = track?.animation?.duration ?? 0;
        const time = track?.trackTime ?? 0;
        const wrapped = duration > 0 ? time % duration : time;
        if (timelineRef.slider && document.activeElement !== timelineRef.slider) {
          timelineRef.slider.max = String(duration || 0);
          timelineRef.slider.value = String(wrapped);
        }
        if (timelineRef.elapsed) timelineRef.elapsed.textContent = formatClock(wrapped);
        if (timelineRef.duration) timelineRef.duration.textContent = formatClock(duration);
        if (timelineRef.fps && player.time?.delta) {
          const fps = player.time.delta > 0 ? Math.round(1 / player.time.delta) : 0;
          timelineRef.fps.textContent = `${fps} fps`;
        }
      },
      success: (player) => {
        if (cancelled) {
          player.dispose();
          return;
        }
        playerRef.current = player;
        const runtime = readPlayerMeta(player);
        const prev = useStudio.getState().meta;
        const animations = runtime.animations.length ? runtime.animations : (prev?.animations ?? []);
        const skins = runtime.skins.length ? runtime.skins : (prev?.skins ?? []);
        const firstAnim = pickDefaultAnimation(animations);
        const firstSkin = pickDefaultSkin(skins);
        const current = useStudio.getState();
        const anim =
          current.currentAnimation && animations.some((a) => a.name === current.currentAnimation)
            ? current.currentAnimation
            : firstAnim;
        const skin =
          current.currentSkin && skins.includes(current.currentSkin) ? current.currentSkin : firstSkin;

        if (anim) player.setAnimation(anim, current.looping);
        if (skin) setPlayerSkin(player, skin);
        player.speed = current.speed;
        if (current.playing) player.play();
        else player.pause();

        playerApiRef.current = {
          play: () => player.play(),
          pause: () => player.pause(),
          setAnimation: (name, loop) => {
            player.setAnimation(name, loop);
          },
          setSkin: (name) => setPlayerSkin(player, name),
          setSpeed: (value) => {
            player.speed = value;
          },
          setLoop: (loop) => {
            const name = useStudio.getState().currentAnimation;
            if (name) setPlayerLoop(player, name, loop);
          },
          seek: (time) => seekPlayer(player, time),
          setMix: (value) => setDefaultMix(player, value),
          capture: () => captureFrame(player),
        };

        useStudio.getState().patchMeta({
          animations,
          skins,
          boneCount: runtime.boneCount || prev?.boneCount || 0,
          slotCount: runtime.slotCount || prev?.slotCount || 0,
        });
        useStudio.getState().setCurrentAnimation(anim);
        useStudio.getState().setCurrentSkin(skin);
        useStudio.getState().setReady(true);
      },
    })
      .then((player) => {
        if (cancelled) {
          player.dispose();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          useStudio.getState().setLoadError(err instanceof Error ? err.message : "播放器启动失败");
        }
      });

    return () => {
      cancelled = true;
      playerApiRef.current = null;
      try {
        playerRef.current?.dispose();
      } catch {
        /* player may already be gone */
      }
      playerRef.current = null;
      host.innerHTML = "";
    };
  }, [pack, major, pma]);

  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden touch-none",
        bg === "checker" && "stage-checker",
        bg === "black" && "bg-canvas",
        bg === "gray" && "bg-ash",
        bg === "white" && "bg-paper",
      )}
    >
      <div ref={layerRef} className="absolute inset-0 origin-center will-change-transform">
        <div ref={hostRef} className="absolute inset-0" />
      </div>
      <div className="pointer-events-none absolute top-3 left-3">
        <span
          className="rounded-sm bg-canvas/70 px-2 py-1 font-mono text-xs text-mute tabular-nums"
          ref={(node) => {
            timelineRef.fps = node;
          }}
        >
          fps
        </span>
      </div>
    </div>
  );
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}
