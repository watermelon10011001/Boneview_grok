import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { Bone, Upload, X } from "lucide-react";
import { DropZone } from "@/components/drop-zone";
import { FilePicker } from "@/components/file-picker";
import { Inspector } from "@/components/inspector";
import { PlayerStage } from "@/components/player-stage";
import { Transport } from "@/components/transport";
import { Button } from "@/components/ui/button";
import { DEMOS, fetchDemoFiles } from "@/lib/spine/demos";
import {
  atlasHasPma,
  collectPieces,
  expandIncomingFiles,
  kitMissing,
  majorFromVersion,
  matchSpinePack,
  mergeFiles,
  peekSkeletonMeta,
} from "@/lib/spine/pack";
import { pickDefaultAnimation, pickDefaultSkin } from "@/lib/spine/player";
import { loadLastPack, saveLastPack } from "@/lib/spine/persist";
import { useStudio } from "@/lib/spine/store";
import { SPINE_MAJORS, type MatchedPack, type SpineMajor } from "@/lib/spine/types";
import { cn } from "@/lib/cn";

export function Studio() {
  const pack = useStudio((s) => s.pack);
  const draftFiles = useStudio((s) => s.draftFiles);
  const loading = useStudio((s) => s.loading);
  const loadError = useStudio((s) => s.loadError);
  const runtimeMode = useStudio((s) => s.runtimeMode);
  const meta = useStudio((s) => s.meta);
  const ready = useStudio((s) => s.ready);
  const inspectorPeek = useStudio((s) => s.inspectorPeek);
  const [dragging, setDragging] = useState(false);
  const [hasLastPack, setHasLastPack] = useState(false);
  const [pieces, setPieces] = useState<Awaited<ReturnType<typeof collectPieces>> | null>(null);

  const resolvedMajor = useMemo<SpineMajor | null>(() => {
    if (runtimeMode !== "auto") return runtimeMode;
    return meta?.major ?? null;
  }, [runtimeMode, meta?.major]);

  useEffect(() => {
    let cancelled = false;
    void loadLastPack().then((files) => {
      if (!cancelled) setHasLastPack(Boolean(files?.length));
    });
    return () => {
      cancelled = true;
    };
  }, [pack]);

  useEffect(() => {
    let cancelled = false;
    if (!draftFiles.length) {
      setPieces(null);
      return;
    }
    void collectPieces(draftFiles).then((next) => {
      if (!cancelled) setPieces(next);
    });
    return () => {
      cancelled = true;
    };
  }, [draftFiles]);

  const commitPack = useCallback(async (next: MatchedPack) => {
    const store = useStudio.getState();
    const versionRaw = await peekSkeletonMeta(next.skeleton.file, next.skeletonKind);
    const major = majorFromVersion(versionRaw.versionRaw);
    const atlasText = await next.atlas.file.text();
    const pma = atlasHasPma(atlasText);
    const firstAnim = pickDefaultAnimation(versionRaw.animations);
    const firstSkin = pickDefaultSkin(versionRaw.skins);
    store.setPack(next);
    store.setPma(pma ?? true);
    store.setMeta({
      versionRaw: versionRaw.versionRaw,
      major,
      animations: versionRaw.animations,
      skins: versionRaw.skins,
      boneCount: versionRaw.boneCount,
      slotCount: versionRaw.slotCount,
      pma: pma ?? true,
    });
    store.setCurrentAnimation(firstAnim);
    store.setCurrentSkin(firstSkin);
    store.setInspectorPeek(false);
    void saveLastPack([next.skeleton.file, next.atlas.file, ...next.textures.map((t) => t.file)]);
    setHasLastPack(true);
    if (!major && store.runtimeMode === "auto") {
      if (versionRaw.versionRaw && versionRaw.versionRaw.startsWith("3.")) {
        store.setLoadError(
          `这份导出是 Spine ${versionRaw.versionRaw}。当前支持 4.0–4.3，请用 4.x 重新导出，或在顶栏手动选择运行时试播。`,
        );
      }
    }
  }, []);

  const ingest = useCallback(
    async (incoming: File[], replace = false) => {
      const store = useStudio.getState();
      store.setLoading(true);
      store.setLoadError(null);
      try {
        const expanded = await expandIncomingFiles(incoming);
        const combined =
          replace || store.pack ? expanded : mergeFiles(store.draftFiles, expanded);
        const nextPieces = await collectPieces(combined);
        const missing = kitMissing(nextPieces);
        if (missing.length) {
          store.setDraftFiles(combined);
          store.setLoadError(null);
          return;
        }
        const next = await matchSpinePack(combined);
        await commitPack(next);
      } catch (err) {
        store.setLoadError(err instanceof Error ? err.message : "导入失败");
      } finally {
        store.setLoading(false);
      }
    },
    [commitPack],
  );

  const loadDemo = useCallback(
    async (id: string) => {
      const demo = DEMOS.find((item) => item.id === id);
      if (!demo) return;
      useStudio.getState().setLoading(true);
      try {
        const files = await fetchDemoFiles(demo);
        await ingest(files, true);
      } catch (err) {
        useStudio.getState().setLoadError(err instanceof Error ? err.message : "演示加载失败");
      }
    },
    [ingest],
  );

  const restoreLast = useCallback(async () => {
    const files = await loadLastPack();
    if (!files?.length) {
      setHasLastPack(false);
      return;
    }
    await ingest(files, true);
  }, [ingest]);

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function onDragLeave(event: DragEvent) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDragging(false);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) void ingest(files);
  }

  const unsupported = Boolean(pack && runtimeMode === "auto" && !meta?.major);
  const playMajor: SpineMajor = resolvedMajor ?? "4.2";

  return (
    <div
      className="relative flex h-dvh flex-col bg-canvas text-ink"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="safe-header flex shrink-0 items-center gap-3 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-sm bg-panel">
            <Bone className="size-4 text-steel" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Boneview</p>
            <p className="truncate text-xs text-mute">
              {pack ? pack.skeleton.name : "Spine 三件套预览"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="sr-only sm:not-sr-only sm:text-xs sm:text-faint">运行时</span>
            <select
              value={runtimeMode}
              onChange={(event) => {
                const value = event.currentTarget.value as "auto" | SpineMajor;
                useStudio.getState().setRuntimeMode(value);
              }}
              className="h-9 max-w-28 rounded-sm bg-panel px-2 font-mono text-xs text-ink outline-none sm:max-w-none"
            >
              <option value="auto">自动{meta?.versionRaw ? ` (${meta.versionRaw})` : ""}</option>
              {SPINE_MAJORS.map((major) => (
                <option key={major} value={major}>
                  {major}
                </option>
              ))}
            </select>
          </label>
          <FilePicker onFiles={(files) => void ingest(files, true)} variant="secondary" size="sm" label="导入文件">
            <Upload className="size-4" />
            <span className="hidden sm:inline">导入</span>
          </FilePicker>
          {pack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="关闭预览"
              onClick={() => useStudio.getState().resetSession()}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </header>

      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-canvas/70">
          <p className="rounded-lg bg-raised px-5 py-3 text-sm text-ink shadow-border">松开以导入三件套</p>
        </div>
      ) : null}

      <div className={cn("flex min-h-0 flex-1 flex-col", pack && "md:flex-row")}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main className="relative min-h-0 flex-1">
            {!pack ? (
              <DropZone
                onFiles={(files) => void ingest(files)}
                onDemo={(id) => void loadDemo(id)}
                onRestore={() => void restoreLast()}
                onClearDraft={() => {
                  useStudio.getState().setDraftFiles([]);
                  useStudio.getState().setLoadError(null);
                }}
                loading={loading}
                error={loadError}
                dragging={dragging}
                pieces={pieces}
                hasLastPack={hasLastPack}
              />
            ) : unsupported && !ready && runtimeMode === "auto" && meta?.versionRaw?.startsWith("3.") ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="max-w-sm text-sm leading-normal text-mute">{loadError}</p>
              </div>
            ) : (
              <PlayerStage major={playMajor} />
            )}
            {pack && loadError && ready === false && resolvedMajor ? (
              <div className="absolute inset-x-4 bottom-4 rounded-md bg-canvas/90 px-3 py-2 text-sm text-danger">
                {loadError}
              </div>
            ) : null}
          </main>
          {pack ? <Transport /> : null}
        </div>
        {pack ? (
          <div className={cn("inspector-dock", inspectorPeek && "is-peek")}>
            <Inspector />
          </div>
        ) : null}
      </div>
    </div>
  );
}
