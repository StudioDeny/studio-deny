import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Every admin upload lands in this public bucket
// (supabase/migrations/20261102000001_media_storage_bucket.sql).
export const MEDIA_BUCKET = "media";

// Supabase's image resizer refuses originals over 25 MB, so a bigger photo
// would upload fine and then never show on the site.
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

// Used when the browser leaves File.type empty — the bucket only accepts
// image/* and video/*.
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", avif: "image/avif", svg: "image/svg+xml",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
};

export type UploadedMedia = {
  /** Public URL — what gets saved on products, sections and settings. */
  url: string;
  /** Path inside the bucket, e.g. images/2f9c….jpg */
  path: string;
  folder: string;
  bytes: number;
  format: string;
  width: number | null;
  height: number | null;
};

function extensionOf(file: File, kind: "image" | "video"): string {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  if (fromName && fromName !== file.name.toLowerCase() && fromName.length <= 5) return fromName;
  const fromMime = file.type.split("/")[1]?.replace("jpeg", "jpg").replace("quicktime", "mov").replace(/[^a-z0-9]/g, "");
  return fromMime || (kind === "video" ? "mp4" : "jpg");
}

async function imageSize(file: File): Promise<{ width: number | null; height: number | null }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

// fetch() can't report upload progress reliably across browsers — XHR's
// upload.onprogress is the only consistent way to get a real percentage.
function uploadViaXhr(
  path: string,
  file: File,
  contentType: string,
  accessToken: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Content-Type", contentType);
    // File names are random and never reused, so browsers and the CDN can keep them for a year.
    xhr.setRequestHeader("Cache-Control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let body: { message?: string; error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* leave as {} */ }
      const message = body.message ?? body.error ?? "Upload failed";
      reject(new Error(/row-level security/i.test(message) ? "Your account isn't allowed to upload media" : message));
    };

    xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
    xhr.send(file);
  });
}

async function uploadMedia(file: File, kind: "image" | "video", onProgress?: (pct: number) => void): Promise<UploadedMedia> {
  if (kind === "image" && file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is over 25 MB — export it smaller and upload again");
  }
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Session expired — sign in again to upload");

  const ext = extensionOf(file, kind);
  const folder = kind === "video" ? "videos" : "images";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const contentType = file.type || MIME_BY_EXT[ext] || (kind === "video" ? "video/mp4" : "image/jpeg");

  const [size] = await Promise.all([
    kind === "image" ? imageSize(file) : Promise.resolve({ width: null, height: null }),
    uploadViaXhr(path, file, contentType, accessToken, onProgress),
  ]);

  return {
    url: `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`,
    path,
    folder,
    bytes: file.size,
    format: ext,
    ...size,
  };
}

export function uploadImage(file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia> {
  return uploadMedia(file, "image", onProgress);
}

export function uploadVideo(file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia> {
  return uploadMedia(file, "video", onProgress);
}
