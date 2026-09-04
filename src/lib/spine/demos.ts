export type DemoDef = {
  id: string;
  title: string;
  blurb: string;
  version: string;
  files: { name: string; url: string }[];
};

export const DEMOS: DemoDef[] = [
  {
    id: "spineboy",
    title: "Spineboy",
    blurb: "官方 4.2 示例，含 walk / run / jump / shoot",
    version: "4.2",
    files: [
      { name: "spineboy-pro.json", url: "/demos/spineboy/spineboy-pro.json" },
      { name: "spineboy-pma.atlas", url: "/demos/spineboy/spineboy-pma.atlas" },
      { name: "spineboy-pma.png", url: "/demos/spineboy/spineboy-pma.png" },
    ],
  },
];

export async function fetchDemoFiles(demo: DemoDef): Promise<File[]> {
  const files: File[] = [];
  for (const item of demo.files) {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`演示资源加载失败：${item.name}`);
    const blob = await res.blob();
    files.push(new File([blob], item.name, { type: blob.type || guessType(item.name) }));
  }
  return files;
}

function guessType(name: string): string {
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".atlas") || name.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}
