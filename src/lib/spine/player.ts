import type { DebugFlags, MatchedPack, SpineMajor, SpinePlayerHandle } from "./types";
import { packToRawDataURIs } from "./pack";

type PlayerCtor = new (parent: HTMLElement | string, config: Record<string, unknown>) => SpinePlayerHandle;

const runtimeCache = new Map<SpineMajor, PlayerCtor>();

export async function loadPlayerCtor(major: SpineMajor): Promise<PlayerCtor> {
  const hit = runtimeCache.get(major);
  if (hit) return hit;
  let ctor: PlayerCtor;
  switch (major) {
    case "4.3":
      ctor = (await import("@esotericsoftware/spine-player")).SpinePlayer as unknown as PlayerCtor;
      break;
    case "4.2":
      ctor = (await import("spine-player-42")).SpinePlayer as unknown as PlayerCtor;
      break;
    case "4.1":
      ctor = (await import("spine-player-41")).SpinePlayer as unknown as PlayerCtor;
      break;
    case "4.0":
      ctor = (await import("spine-player-40")).SpinePlayer as unknown as PlayerCtor;
      break;
    default:
      throw new Error(`不支持的运行时 ${major as string}`);
  }
  runtimeCache.set(major, ctor);
  return ctor;
}

export type PlayerBootOptions = {
  pack: MatchedPack;
  major: SpineMajor;
  animation?: string;
  skin?: string;
  mix: number;
  pma: boolean;
  debug: DebugFlags;
  backgroundHex: string;
  alpha: boolean;
  success: (player: SpinePlayerHandle) => void;
  error: (message: string) => void;
  frame?: (player: SpinePlayerHandle, delta: number) => void;
};

export async function bootSpinePlayer(
  parent: HTMLElement,
  options: PlayerBootOptions,
): Promise<SpinePlayerHandle> {
  const { skeletonName, atlasName, rawDataURIs } = await packToRawDataURIs(options.pack, options.pma);
  const Ctor = await loadPlayerCtor(options.major);
  const isJson = options.pack.skeletonKind === "json";

  const config: Record<string, unknown> = {
    skeleton: skeletonName,
    skelUrl: isJson ? undefined : skeletonName,
    jsonUrl: isJson ? skeletonName : undefined,
    binaryUrl: isJson ? undefined : skeletonName,
    atlas: atlasName,
    atlasUrl: atlasName,
    rawDataURIs,
    showControls: false,
    showLoading: true,
    alpha: options.alpha,
    preserveDrawingBuffer: true,
    backgroundColor: options.alpha ? "00000000" : options.backgroundHex.replace("#", ""),
    premultipliedAlpha: options.pma,
    defaultMix: options.mix,
    mipmaps: true,
    interactive: false,
    controlBones: [],
    debug: options.debug,
    viewport: {
      padLeft: "10%",
      padRight: "10%",
      padTop: "8%",
      padBottom: "10%",
    },
    success: options.success,
    error: (_player: SpinePlayerHandle, msg: string) => options.error(msg),
    frame: options.frame,
  };

  if (options.animation) config.animation = options.animation;
  if (options.skin) config.skin = options.skin;

  return new Ctor(parent, config);
}

type SkelObj = {
  data?: {
    animations?: unknown;
    skins?: unknown;
    bones?: unknown;
    slots?: unknown;
    findSkin?: (name: string) => unknown;
  };
  setSkinByName?: (name: string) => void;
  setSkin?: (skin: unknown) => void;
  setToSetupPose?: () => void;
  setupPose?: () => void;
  setSlotsToSetupPose?: () => void;
  setupPoseSlots?: () => void;
};

type StateObj = {
  setAnimation?: (track: number, name: string, loop: boolean) => TrackObj | undefined;
  getCurrent?: (track: number) => TrackObj | null;
  apply?: (skeleton: unknown) => void;
  timeScale?: number;
  data?: { defaultMix?: number; skeletonData?: SkelObj["data"] };
};

type TrackObj = {
  trackTime: number;
  animationLast?: number;
  animation?: { name: string; duration: number };
  loop?: boolean;
};

function asRecordList(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
  if (typeof value === "object") {
    const rec = value as { length?: unknown; item?: unknown; toArray?: () => unknown };
    if (typeof rec.toArray === "function") return asRecordList(rec.toArray());
    if (typeof rec.length === "number") {
      try {
        return Array.from(value as ArrayLike<unknown>).filter((item) => item && typeof item === "object") as Record<
          string,
          unknown
        >[];
      } catch {
        /* fall through */
      }
    }
    return Object.values(value as Record<string, unknown>).filter((item) => item && typeof item === "object") as Record<
      string,
      unknown
    >[];
  }
  return [];
}

export function pickDefaultAnimation(anims: { name: string; duration: number }[]): string | null {
  if (!anims.length) return null;
  const prefer = ["idle", "walk", "run", "animation", "stand"];
  for (const name of prefer) {
    const hit = anims.find((a) => a.name.toLowerCase() === name);
    if (hit) return hit.name;
  }
  return anims.find((a) => a.duration > 0)?.name ?? anims[0]?.name ?? null;
}

export function pickDefaultSkin(skins: string[]): string | null {
  if (!skins.length) return null;
  const prefer = ["default", "normal"];
  for (const name of prefer) {
    const hit = skins.find((s) => s.toLowerCase() === name);
    if (hit) return hit;
  }
  return skins[0] ?? null;
}

export function readPlayerMeta(player: SpinePlayerHandle): {
  animations: { name: string; duration: number }[];
  skins: string[];
  boneCount: number;
  slotCount: number;
} {
  const skel = player.skeleton as SkelObj | null;
  const state = player.animationState as StateObj | null;
  const data = skel?.data ?? state?.data?.skeletonData;
  const animations = asRecordList(data?.animations)
    .map((a) => ({
      name: typeof a.name === "string" ? a.name : "",
      duration: typeof a.duration === "number" ? a.duration : 0,
    }))
    .filter((a) => a.name);
  const skins = asRecordList(data?.skins)
    .map((s) => (typeof s.name === "string" ? s.name : ""))
    .filter(Boolean);
  return {
    animations,
    skins,
    boneCount: asRecordList(data?.bones).length,
    slotCount: asRecordList(data?.slots).length,
  };
}

export function setPlayerSkin(player: SpinePlayerHandle, name: string) {
  const skel = player.skeleton as SkelObj | null;
  if (!skel) return;
  if (typeof skel.setSkinByName === "function") {
    skel.setSkinByName(name);
  } else if (typeof skel.setSkin === "function") {
    const skin = skel.data?.findSkin?.(name);
    if (skin) skel.setSkin(skin);
    else skel.setSkin(name);
  }
  skel.setToSetupPose?.();
  skel.setupPose?.();
  skel.setSlotsToSetupPose?.();
  skel.setupPoseSlots?.();
}

export function getTrack(player: SpinePlayerHandle): TrackObj | null {
  const state = player.animationState as StateObj | null;
  return state?.getCurrent?.(0) ?? null;
}

export function seekPlayer(player: SpinePlayerHandle, time: number) {
  const track = getTrack(player);
  if (!track) return;
  const duration = track.animation?.duration ?? 0;
  const next = duration > 0 ? Math.min(Math.max(time, 0), duration) : Math.max(time, 0);
  track.trackTime = next;
  track.animationLast = next;
  const state = player.animationState as StateObj | null;
  if (state?.apply && player.skeleton) state.apply(player.skeleton);
}

export function setPlayerLoop(player: SpinePlayerHandle, animation: string, loop: boolean) {
  const track = getTrack(player);
  const time = track?.trackTime ?? 0;
  player.setAnimation(animation, loop);
  const next = getTrack(player);
  if (next) {
    next.trackTime = time;
    next.loop = loop;
  }
}

export function setDefaultMix(player: SpinePlayerHandle, mix: number) {
  const state = player.animationState as StateObj | null;
  if (state?.data) state.data.defaultMix = mix;
}

export function captureFrame(player: SpinePlayerHandle): string | null {
  const canvas = player.canvas;
  if (!canvas) return null;
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
