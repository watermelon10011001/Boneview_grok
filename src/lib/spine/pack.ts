import JSZip from "jszip";
import type { MatchedPack, NamedFile, SpineMajor } from "./types";
import { SPINE_MAJORS } from "./types";

const TEXTURE_RE = /\.(png|jpe?g|webp|avif)$/i;
const ATLAS_RE = /(\.atlas(\.txt)?$)|(\.txt$)/i;
const JSON_RE = /\.json$/i;
const SKEL_RE = /\.(skel|bytes)$/i;
const ZIP_RE = /\.zip$/i;
const IGNORE_RE = /\.(meta|DS_Store|md|txt)$/i;

export function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

function lower(name: string): string {
  return basename(name).toLowerCase();
}

export async function expandIncomingFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const file of files) {
    if (ZIP_RE.test(file.name)) {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files);
      for (const entry of entries) {
        if (entry.dir) continue;
        const name = basename(entry.name);
        if (!name || name.startsWith(".")) continue;
        if (IGNORE_RE.test(name) && !ATLAS_RE.test(name)) continue;
        const blob = await entry.async("blob");
        out.push(new File([blob], name, { type: blob.type }));
      }
    } else {
      out.push(file);
    }
  }
  return out;
}

function looksLikeAtlas(text: string): boolean {
  return /^\s*pma\s*:/im.test(text) || /^\s*size\s*:/im.test(text) || /^\s*filter\s*:/im.test(text);
}

function looksLikeSpineJson(text: string): boolean {
  try {
    const data = JSON.parse(text) as { skeleton?: unknown; bones?: unknown };
    return Boolean(data && (data.skeleton || data.bones));
  } catch {
    return false;
  }
}

type AtlasPage = { raw: string; base: string };

function parseAtlasPageEntries(atlasText: string): AtlasPage[] {
  const pages: AtlasPage[] = [];
  const seen = new Set<string>();
  for (const raw of atlasText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.includes(":")) continue;
    if (!TEXTURE_RE.test(line)) continue;
    const base = basename(line);
    const key = base.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pages.push({ raw: line, base });
  }
  return pages;
}

export function parseAtlasPages(atlasText: string): string[] {
  return parseAtlasPageEntries(atlasText).map((page) => page.base);
}

export function atlasHasPma(atlasText: string): boolean | null {
  const m = atlasText.match(/^\s*pma\s*:\s*(true|false)/im);
  if (m) return m[1].toLowerCase() === "true";
  if (/-pma\b/i.test(atlasText)) return true;
  return null;
}

export function applyAtlasPma(atlasText: string, pma: boolean): string {
  if (/^\s*pma\s*:/im.test(atlasText)) {
    return atlasText.replace(/^\s*pma\s*:\s*(true|false)/gim, (line) => line.replace(/true|false/i, String(pma)));
  }
  const lines = atlasText.split(/\r?\n/);
  const idx = lines.findIndex((line) => {
    const t = line.trim();
    return Boolean(t) && !t.includes(":") && TEXTURE_RE.test(t);
  });
  if (idx >= 0) {
    lines.splice(idx + 1, 0, `\tpma: ${pma}`);
    return lines.join("\n");
  }
  return `pma: ${pma}\n${atlasText}`;
}

function flattenAtlasPages(atlasText: string): string {
  return atlasText
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t || t.includes(":")) return line;
      if (TEXTURE_RE.test(t)) return basename(t);
      return line;
    })
    .join("\n");
}

export async function sniffSkeletonKind(file: File): Promise<"json" | "binary"> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (head[0] === 0x7b || head[0] === 0xef) return "json";
  if (JSON_RE.test(file.name)) return "json";
  return "binary";
}

export async function detectSpineVersion(file: File, kind: "json" | "binary"): Promise<string | null> {
  if (kind === "json") {
    try {
      const data = JSON.parse(await file.text()) as { skeleton?: { spine?: string }; spine?: string };
      return data.skeleton?.spine ?? data.spine ?? null;
    } catch {
      return null;
    }
  }
  const bytes = new Uint8Array(await file.slice(0, 192).arrayBuffer());
  const ascii = new TextDecoder("latin1").decode(bytes);
  const match = ascii.match(/(3\.[6-8]|4\.[0-3])\.\d+/);
  return match ? match[0] : null;
}

export function majorFromVersion(raw: string | null): SpineMajor | null {
  if (!raw) return null;
  const m = raw.match(/^(\d+)\.(\d+)/);
  if (!m) return null;
  const major = `${m[1]}.${m[2]}` as SpineMajor;
  if ((SPINE_MAJORS as string[]).includes(major)) return major;
  return null;
}

export type PeekedMeta = {
  versionRaw: string | null;
  animations: { name: string; duration: number }[];
  skins: string[];
  boneCount: number;
  slotCount: number;
};

export async function peekSkeletonMeta(file: File, kind: "json" | "binary"): Promise<PeekedMeta> {
  const versionRaw = await detectSpineVersion(file, kind);
  if (kind !== "json") {
    return { versionRaw, animations: [], skins: [], boneCount: 0, slotCount: 0 };
  }
  try {
    const data = JSON.parse(await file.text()) as {
      skeleton?: { spine?: string };
      animations?: Record<string, unknown>;
      skins?: { name?: string }[] | Record<string, unknown>;
      bones?: unknown[];
      slots?: unknown[];
    };
    const animations = data.animations
      ? Object.keys(data.animations).map((name) => ({ name, duration: 0 }))
      : [];
    const skins = Array.isArray(data.skins)
      ? data.skins.map((s) => s.name).filter((name): name is string => Boolean(name))
      : data.skins
        ? Object.keys(data.skins)
        : [];
    return {
      versionRaw,
      animations,
      skins,
      boneCount: Array.isArray(data.bones) ? data.bones.length : 0,
      slotCount: Array.isArray(data.slots) ? data.slots.length : 0,
    };
  } catch {
    return { versionRaw, animations: [], skins: [], boneCount: 0, slotCount: 0 };
  }
}

export function virtualSkeletonName(original: string, kind: "json" | "binary"): string {
  const base = basename(original).replace(/\.(json|skel|bytes)$/i, "");
  return kind === "json" ? `${base}.json` : `${base}.skel`;
}

export function virtualAtlasName(original: string): string {
  const name = basename(original);
  if (/\.atlas(\.txt)?$/i.test(name)) return name.replace(/\.txt$/i, "");
  return `${name.replace(/\.(txt|atlas)$/i, "")}.atlas`;
}

export type KitPieces = {
  skeleton?: NamedFile;
  atlas?: NamedFile;
  textures: NamedFile[];
  missingTextures: string[];
  skeletonKind?: "json" | "binary";
  extraFiles: string[];
};

export async function collectPieces(files: File[]): Promise<KitPieces> {
  const unique = new Map<string, File>();
  for (const file of files) {
    unique.set(basename(file.name), file);
  }
  const list = [...unique.values()];

  const jsonCandidates: File[] = [];
  const skelCandidates: File[] = [];
  const atlasCandidates: File[] = [];
  const textureCandidates: File[] = [];
  const extra: string[] = [];

  for (const file of list) {
    const name = file.name;
    if (TEXTURE_RE.test(name)) {
      textureCandidates.push(file);
      continue;
    }
    if (JSON_RE.test(name)) {
      jsonCandidates.push(file);
      continue;
    }
    if (SKEL_RE.test(name)) {
      skelCandidates.push(file);
      continue;
    }
    if (/\.atlas(\.txt)?$/i.test(name)) {
      atlasCandidates.push(file);
      continue;
    }
    extra.push(name);
  }

  if (!atlasCandidates.length) {
    for (const file of list) {
      if (!/\.txt$/i.test(file.name)) continue;
      const text = await file.text();
      if (looksLikeAtlas(text)) atlasCandidates.push(file);
    }
  }

  let skeletonFile: File | undefined;
  let skeletonKind: "json" | "binary" | undefined;

  for (const file of jsonCandidates) {
    const text = await file.text();
    if (looksLikeSpineJson(text)) {
      skeletonFile = file;
      skeletonKind = "json";
      break;
    }
  }

  if (!skeletonFile && skelCandidates.length) {
    skeletonFile = skelCandidates[0];
    skeletonKind = await sniffSkeletonKind(skeletonFile);
  }

  const atlasFile = atlasCandidates[0];
  let missingTextures: string[] = [];
  const textures: NamedFile[] = [];

  if (atlasFile) {
    const atlasText = await atlasFile.text();
    const wantedPages = looksLikeAtlas(atlasText) ? parseAtlasPages(atlasText) : [];
    const textureMap = new Map(textureCandidates.map((f) => [lower(f.name), f]));
    const pages = wantedPages.length ? wantedPages : textureCandidates.map((f) => basename(f.name));
    for (const page of pages) {
      const hit = textureMap.get(page.toLowerCase());
      if (hit) textures.push({ name: page, file: hit });
      else missingTextures.push(page);
    }
    if (!pages.length) missingTextures = ["png"];
  } else if (textureCandidates.length) {
    for (const file of textureCandidates) {
      textures.push({ name: basename(file.name), file });
    }
  }

  return {
    skeleton: skeletonFile ? { name: basename(skeletonFile.name), file: skeletonFile } : undefined,
    atlas: atlasFile ? { name: basename(atlasFile.name), file: atlasFile } : undefined,
    textures,
    missingTextures,
    skeletonKind,
    extraFiles: extra,
  };
}

export function kitMissing(pieces: KitPieces): string[] {
  const missing: string[] = [];
  if (!pieces.skeleton) missing.push("骨骼 .skel / .json");
  if (!pieces.atlas) missing.push("图集 .atlas");
  if (!pieces.textures.length || pieces.missingTextures.length) {
    missing.push(
      pieces.missingTextures.length ? `贴图 ${pieces.missingTextures.join("、")}` : "贴图 .png",
    );
  }
  return missing;
}

export async function matchSpinePack(files: File[]): Promise<MatchedPack> {
  if (!files.length) {
    throw new Error("没有读到文件。请选择 .skel/.json、.atlas 和 .png。");
  }

  const pieces = await collectPieces(files);
  const missing = kitMissing(pieces);
  if (missing.length) {
    throw new Error(`还差：${missing.join("，")}。可以分三次选，也可以一次多选或导入 zip。`);
  }

  const atlasFile = pieces.atlas!.file;
  const atlasText = await atlasFile.text();
  if (!looksLikeAtlas(atlasText)) {
    throw new Error(`无法解析图集：${basename(atlasFile.name)}。请确认这是 Spine 导出的 .atlas。`);
  }

  return {
    skeleton: pieces.skeleton!,
    atlas: pieces.atlas!,
    textures: pieces.textures,
    missingTextures: pieces.missingTextures,
    skeletonKind: pieces.skeletonKind ?? "json",
    extraFiles: pieces.extraFiles,
  };
}

export function fileToDataURI(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

export async function packToRawDataURIs(
  pack: MatchedPack,
  pma?: boolean,
): Promise<{
  skeletonName: string;
  atlasName: string;
  rawDataURIs: Record<string, string>;
}> {
  const skeletonName = virtualSkeletonName(pack.skeleton.name, pack.skeletonKind);
  const atlasName = virtualAtlasName(pack.atlas.name);
  let atlasText = await pack.atlas.file.text();
  atlasText = flattenAtlasPages(atlasText);
  if (typeof pma === "boolean") atlasText = applyAtlasPma(atlasText, pma);
  const atlasBlob = new Blob([atlasText], { type: "text/plain" });

  const rawDataURIs: Record<string, string> = {
    [skeletonName]: await fileToDataURI(pack.skeleton.file),
    [atlasName]: await fileToDataURI(atlasBlob),
    [pack.skeleton.name]: await fileToDataURI(pack.skeleton.file),
    [pack.atlas.name]: await fileToDataURI(atlasBlob),
  };
  for (const tex of pack.textures) {
    const uri = await fileToDataURI(tex.file);
    rawDataURIs[tex.name] = uri;
    rawDataURIs[basename(tex.file.name)] = uri;
  }
  return { skeletonName, atlasName, rawDataURIs };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function mergeFiles(existing: File[], incoming: File[]): File[] {
  const map = new Map<string, File>();
  for (const file of existing) map.set(basename(file.name), file);
  for (const file of incoming) map.set(basename(file.name), file);
  return [...map.values()];
}
