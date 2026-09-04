import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlayerApi } from "@/components/player-stage";
import { formatBytes } from "@/lib/spine/pack";
import { useStudio } from "@/lib/spine/store";
import type { BackgroundMode, DebugFlags } from "@/lib/spine/types";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "anims", label: "动画" },
  { id: "skins", label: "皮肤" },
  { id: "stage", label: "舞台" },
  { id: "debug", label: "调试" },
] as const;

const BACKGROUNDS: { id: BackgroundMode; label: string }[] = [
  { id: "checker", label: "棋盘" },
  { id: "black", label: "黑" },
  { id: "gray", label: "灰" },
  { id: "white", label: "白" },
];

const DEBUG_ITEMS: { key: keyof DebugFlags; label: string }[] = [
  { key: "bones", label: "骨骼" },
  { key: "regions", label: "区域" },
  { key: "meshes", label: "网格" },
  { key: "hulls", label: "轮廓" },
  { key: "bounds", label: "包围盒" },
  { key: "paths", label: "路径" },
  { key: "clipping", label: "裁剪" },
  { key: "points", label: "点" },
];

export function Inspector() {
  const tab = useStudio((s) => s.inspectorTab);
  const peek = useStudio((s) => s.inspectorPeek);
  const meta = useStudio((s) => s.meta);
  const pack = useStudio((s) => s.pack);
  const currentAnimation = useStudio((s) => s.currentAnimation);
  const currentSkin = useStudio((s) => s.currentSkin);
  const looping = useStudio((s) => s.looping);
  const mix = useStudio((s) => s.mix);
  const pma = useStudio((s) => s.pma);
  const bg = useStudio((s) => s.bg);
  const debug = useStudio((s) => s.debug);
  const [query, setQuery] = useState("");

  const animations = (meta?.animations ?? []).filter((a) =>
    a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const skins = (meta?.skins ?? []).filter((s) => s.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <aside className="flex h-full min-h-0 flex-col bg-raised">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-2 pt-1 md:pt-2">
        <button
          type="button"
          className="flex h-11 min-w-11 items-center justify-center rounded-sm text-mute md:hidden"
          aria-label={peek ? "展开面板" : "收起面板"}
          onClick={() => useStudio.getState().setInspectorPeek(!peek)}
        >
          {peek ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => useStudio.getState().setInspectorTab(item.id)}
            className={cn(
              "h-11 min-w-11 rounded-sm px-3 text-sm transition-colors duration-200 md:h-9",
              tab === item.id ? "bg-panel text-ink" : "text-mute hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto p-3", peek && "hidden md:block")}>
        {tab === "anims" || tab === "skins" ? (
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === "anims" ? "筛选动画" : "筛选皮肤"}
            className="mb-3 h-11 w-full rounded-sm bg-canvas px-3 text-sm text-ink outline-none placeholder:text-faint md:h-10"
          />
        ) : null}

        {tab === "anims" ? (
          <ul className="flex flex-col gap-1">
            {animations.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-mute">没有动画</li>
            ) : (
              animations.map((anim) => (
                <li key={anim.name}>
                  <button
                    type="button"
                    onClick={() => {
                      useStudio.getState().setCurrentAnimation(anim.name);
                      useStudio.getState().setPlaying(true);
                      getPlayerApi()?.setAnimation(anim.name, looping);
                      getPlayerApi()?.play();
                    }}
                    className={cn(
                      "flex h-11 w-full items-center justify-between rounded-sm px-3 text-left text-sm",
                      currentAnimation === anim.name
                        ? "bg-panel text-ink"
                        : "text-mute hover:bg-panel/70 hover:text-ink",
                    )}
                  >
                    <span className="truncate">{anim.name}</span>
                    <span className="ml-2 font-mono text-xs text-faint tabular-nums">
                      {anim.duration > 0 ? `${anim.duration.toFixed(2)}s` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}

        {tab === "skins" ? (
          <ul className="flex flex-col gap-1">
            {skins.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-mute">没有皮肤</li>
            ) : (
              skins.map((skin) => (
                <li key={skin}>
                  <button
                    type="button"
                    onClick={() => {
                      useStudio.getState().setCurrentSkin(skin);
                      getPlayerApi()?.setSkin(skin);
                    }}
                    className={cn(
                      "flex h-11 w-full items-center rounded-sm px-3 text-left text-sm",
                      currentSkin === skin ? "bg-panel text-ink" : "text-mute hover:bg-panel/70 hover:text-ink",
                    )}
                  >
                    {skin}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}

        {tab === "stage" ? (
          <div className="flex flex-col gap-5">
            <section>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-faint uppercase">背景</h3>
              <div className="grid grid-cols-4 gap-1">
                {BACKGROUNDS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => useStudio.getState().setBg(item.id)}
                    className={cn(
                      "h-11 rounded-sm text-xs",
                      bg === item.id ? "bg-panel text-ink" : "text-mute hover:bg-panel/70 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-faint uppercase">混合 {mix.toFixed(2)}s</h3>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={mix}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  useStudio.getState().setMix(value);
                  getPlayerApi()?.setMix(value);
                }}
                className="scrub"
                aria-label="动画混合时间"
              />
            </section>
            <section className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm text-ink">预乘 Alpha</h3>
                <p className="text-xs text-mute">贴图发黑或发白时切换</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={pma ? "primary" : "secondary"}
                onClick={() => useStudio.getState().setPma(!pma)}
              >
                {pma ? "PMA 开" : "PMA 关"}
              </Button>
            </section>
            {pack ? (
              <section className="rounded-md bg-panel p-3">
                <h3 className="mb-2 text-xs font-medium tracking-wide text-faint uppercase">文件</h3>
                <ul className="space-y-1 font-mono text-xs text-mute">
                  <li>
                    骨骼 {pack.skeleton.name} · {formatBytes(pack.skeleton.file.size)}
                  </li>
                  <li>
                    图集 {pack.atlas.name} · {formatBytes(pack.atlas.file.size)}
                  </li>
                  {pack.textures.map((tex) => (
                    <li key={tex.name}>
                      贴图 {tex.name} · {formatBytes(tex.file.size)}
                    </li>
                  ))}
                </ul>
                {meta ? (
                  <p className="mt-3 font-mono text-xs text-faint">
                    {meta.versionRaw ?? "未知版本"} · {meta.boneCount} bones · {meta.slotCount} slots
                  </p>
                ) : null}
                {pack.missingTextures.length ? (
                  <p className="mt-2 text-xs text-danger">缺少贴图：{pack.missingTextures.join("、")}</p>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "debug" ? (
          <ul className="grid grid-cols-2 gap-1">
            {DEBUG_ITEMS.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => useStudio.getState().setDebug({ [item.key]: !debug[item.key] })}
                  className={cn(
                    "flex h-11 w-full items-center justify-center rounded-sm text-sm",
                    debug[item.key] ? "bg-panel text-ink" : "text-mute hover:bg-panel/70 hover:text-ink",
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
