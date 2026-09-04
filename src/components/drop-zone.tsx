import { FileJson, Image, Layers } from "lucide-react";
import { FilePicker } from "@/components/file-picker";
import { Button } from "@/components/ui/button";
import { DEMOS } from "@/lib/spine/demos";
import { cn } from "@/lib/cn";
import type { KitPieces } from "@/lib/spine/pack";

type Props = {
  onFiles: (files: File[]) => void;
  onDemo: (id: string) => void;
  onRestore?: () => void;
  onClearDraft?: () => void;
  loading: boolean;
  error: string | null;
  dragging: boolean;
  pieces: KitPieces | null;
  hasLastPack: boolean;
};

const PIECES = [
  { key: "skeleton" as const, icon: FileJson, label: "骨骼", hint: ".skel / .json", accept: ".json,.skel,.bytes,application/json,application/octet-stream" },
  { key: "atlas" as const, icon: Layers, label: "图集", hint: ".atlas", accept: ".atlas,.txt,text/plain" },
  { key: "texture" as const, icon: Image, label: "贴图", hint: ".png", accept: "image/png,image/jpeg,.png,.jpg,.jpeg,.webp" },
];

export function DropZone({
  onFiles,
  onDemo,
  onRestore,
  onClearDraft,
  loading,
  error,
  dragging,
  pieces,
  hasLastPack,
}: Props) {
  const skeletonName = pieces?.skeleton?.name;
  const atlasName = pieces?.atlas?.name;
  const textureName = pieces?.textures[0]?.name;
  const filled = {
    skeleton: Boolean(skeletonName),
    atlas: Boolean(atlasName),
    texture: Boolean(textureName),
  };
  const labels = {
    skeleton: skeletonName ?? "点此选择",
    atlas: atlasName ?? "点此选择",
    texture: textureName ?? (pieces?.missingTextures[0] ? `缺 ${pieces.missingTextures[0]}` : "点此选择"),
  };

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto px-5 py-8">
      <div
        className={cn(
          "w-full max-w-lg rounded-xl bg-raised p-5 shadow-border sm:p-7",
          dragging && "bg-panel",
        )}
      >
        <p className="text-xs font-medium tracking-wide text-faint uppercase">三件套</p>
        <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          导入 Spine 导出文件
        </h1>
        <p className="mt-2 max-w-md text-pretty text-sm leading-normal text-mute">
          手机上可以点格子分三次选齐骨骼、图集和贴图；也能一次多选，或导入 zip。
        </p>

        <ul className="mt-6 grid grid-cols-3 gap-2">
          {PIECES.map((piece) => (
            <li key={piece.label}>
              <FilePicker
                onFiles={onFiles}
                accept={piece.accept}
                variant="ghost"
                multiple={false}
                label={`选择${piece.label}`}
                className={cn(
                  "h-auto w-full flex-col rounded-lg bg-panel px-2 py-4 text-center hover:bg-canvas",
                  filled[piece.key] && "text-ink",
                )}
              >
                <piece.icon className="size-5 text-steel" strokeWidth={1.75} />
                <span className="text-sm font-medium text-ink">{piece.label}</span>
                <span className="w-full truncate font-mono text-xs text-faint">{labels[piece.key]}</span>
              </FilePicker>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <FilePicker onFiles={onFiles} variant="primary" className="flex-1" label="一次多选文件">
            一次多选
          </FilePicker>
          <FilePicker
            onFiles={onFiles}
            accept=".zip,application/zip"
            variant="secondary"
            className="flex-1"
            multiple={false}
            label="导入 zip"
          >
            导入 zip
          </FilePicker>
          <FilePicker
            onFiles={onFiles}
            directory
            variant="secondary"
            className="hidden flex-1 md:inline-flex"
            label="选择文件夹"
          >
            选择文件夹
          </FilePicker>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-danger/12 px-3 py-2 text-sm leading-normal text-danger">{error}</p>
        ) : null}

        {loading ? <p className="mt-4 text-sm text-mute">正在读取文件…</p> : null}

        {hasLastPack && onRestore ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            onClick={onRestore}
            disabled={loading}
          >
            打开上次导入
          </Button>
        ) : null}

        {pieces && onClearDraft ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-1 w-full text-mute"
            onClick={onClearDraft}
            disabled={loading}
          >
            清除已选文件
          </Button>
        ) : null}
      </div>

      <div className="mt-6 w-full max-w-lg">
        <p className="mb-2 text-xs font-medium tracking-wide text-faint uppercase">演示</p>
        {DEMOS.map((demo) => (
          <Button
            key={demo.id}
            type="button"
            variant="secondary"
            className="h-auto w-full justify-between py-3"
            onClick={() => onDemo(demo.id)}
            disabled={loading}
          >
            <span className="flex flex-col items-start gap-0.5">
              <span>{demo.title}</span>
              <span className="text-xs font-normal text-mute">{demo.blurb}</span>
            </span>
            <span className="font-mono text-xs text-faint">{demo.version}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
