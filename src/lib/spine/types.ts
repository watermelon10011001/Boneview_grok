export type SpineMajor = "4.0" | "4.1" | "4.2" | "4.3";

export const SPINE_MAJORS: SpineMajor[] = ["4.3", "4.2", "4.1", "4.0"];

export type NamedFile = {
  name: string;
  file: File;
};

export type MatchedPack = {
  skeleton: NamedFile;
  atlas: NamedFile;
  textures: NamedFile[];
  missingTextures: string[];
  skeletonKind: "json" | "binary";
  extraFiles: string[];
};

export type DebugFlags = {
  bones: boolean;
  regions: boolean;
  meshes: boolean;
  bounds: boolean;
  paths: boolean;
  clipping: boolean;
  points: boolean;
  hulls: boolean;
};

export const DEFAULT_DEBUG: DebugFlags = {
  bones: false,
  regions: false,
  meshes: false,
  bounds: false,
  paths: false,
  clipping: false,
  points: false,
  hulls: false,
};

export type BackgroundMode = "checker" | "black" | "gray" | "white";

export type SkeletonMeta = {
  versionRaw: string | null;
  major: SpineMajor | null;
  animations: { name: string; duration: number }[];
  skins: string[];
  boneCount: number;
  slotCount: number;
  pma: boolean;
};

export type SpinePlayerHandle = {
  dispose: () => void;
  play: () => void;
  pause: () => void;
  setAnimation: (name: string, loop?: boolean) => unknown;
  paused: boolean;
  speed: number;
  skeleton: unknown;
  animationState: unknown;
  canvas: HTMLCanvasElement | null;
  bg: { setFromString: (hex: string) => void };
  time?: { delta: number };
};
