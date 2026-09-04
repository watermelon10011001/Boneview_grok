import { create } from "zustand";
import type { BackgroundMode, DebugFlags, MatchedPack, SkeletonMeta, SpineMajor } from "./types";
import { DEFAULT_DEBUG } from "./types";

type StudioState = {
  pack: MatchedPack | null;
  draftFiles: File[];
  loadError: string | null;
  loading: boolean;
  runtimeMode: "auto" | SpineMajor;
  meta: SkeletonMeta | null;
  ready: boolean;
  currentAnimation: string | null;
  currentSkin: string | null;
  playing: boolean;
  looping: boolean;
  speed: number;
  mix: number;
  pma: boolean;
  bg: BackgroundMode;
  debug: DebugFlags;
  inspectorTab: "anims" | "skins" | "stage" | "debug";
  inspectorPeek: boolean;
  setPack: (pack: MatchedPack | null) => void;
  setDraftFiles: (files: File[]) => void;
  setLoadError: (msg: string | null) => void;
  setLoading: (v: boolean) => void;
  setRuntimeMode: (mode: "auto" | SpineMajor) => void;
  setMeta: (meta: SkeletonMeta | null) => void;
  patchMeta: (patch: Partial<SkeletonMeta>) => void;
  setReady: (v: boolean) => void;
  setCurrentAnimation: (name: string | null) => void;
  setCurrentSkin: (name: string | null) => void;
  setPlaying: (v: boolean) => void;
  setLooping: (v: boolean) => void;
  setSpeed: (v: number) => void;
  setMix: (v: number) => void;
  setPma: (v: boolean) => void;
  setBg: (v: BackgroundMode) => void;
  setDebug: (patch: Partial<DebugFlags>) => void;
  setInspectorTab: (tab: StudioState["inspectorTab"]) => void;
  setInspectorPeek: (v: boolean) => void;
  resetSession: () => void;
};

export const useStudio = create<StudioState>((set) => ({
  pack: null,
  draftFiles: [],
  loadError: null,
  loading: false,
  runtimeMode: "auto",
  meta: null,
  ready: false,
  currentAnimation: null,
  currentSkin: null,
  playing: true,
  looping: true,
  speed: 1,
  mix: 0.2,
  pma: true,
  bg: "checker",
  debug: { ...DEFAULT_DEBUG },
  inspectorTab: "anims",
  inspectorPeek: false,
  setPack: (pack) =>
    set({
      pack,
      ready: false,
      loadError: null,
      currentAnimation: null,
      currentSkin: null,
      playing: true,
      looping: true,
      ...(pack ? { draftFiles: [] as File[] } : {}),
    }),
  setDraftFiles: (draftFiles) => set({ draftFiles }),
  setLoadError: (loadError) => set({ loadError, loading: false }),
  setLoading: (loading) => set({ loading }),
  setRuntimeMode: (runtimeMode) => set({ runtimeMode }),
  setMeta: (meta) => set({ meta }),
  patchMeta: (patch) => set((s) => ({ meta: s.meta ? { ...s.meta, ...patch } : (patch as SkeletonMeta) })),
  setReady: (ready) => set({ ready }),
  setCurrentAnimation: (currentAnimation) => set({ currentAnimation }),
  setCurrentSkin: (currentSkin) => set({ currentSkin }),
  setPlaying: (playing) => set({ playing }),
  setLooping: (looping) => set({ looping }),
  setSpeed: (speed) => set({ speed }),
  setMix: (mix) => set({ mix }),
  setPma: (pma) => set({ pma }),
  setBg: (bg) => set({ bg }),
  setDebug: (patch) => set((s) => ({ debug: { ...s.debug, ...patch } })),
  setInspectorTab: (inspectorTab) => set({ inspectorTab, inspectorPeek: false }),
  setInspectorPeek: (inspectorPeek) => set({ inspectorPeek }),
  resetSession: () =>
    set({
      pack: null,
      draftFiles: [],
      loadError: null,
      loading: false,
      meta: null,
      ready: false,
      currentAnimation: null,
      currentSkin: null,
      playing: true,
      looping: true,
      inspectorTab: "anims",
      inspectorPeek: false,
    }),
}));
