const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

export type CloudinaryResult = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  folder: string;
};

// fetch() can't report upload progress reliably across browsers — XHR's
// upload.onprogress is the only consistent way to get a real percentage.
function uploadViaXhr(
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void
): Promise<CloudinaryResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* leave as {} */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(body as CloudinaryResult);
      } else {
        const message = (body as { error?: { message?: string } })?.error?.message ?? "Upload failed";
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
    xhr.send(form);
  });
}

export async function uploadToCloudinary(file: File, onProgress?: (pct: number) => void): Promise<CloudinaryResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  return uploadViaXhr(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, form, onProgress);
}

export async function uploadVideoToCloudinary(file: File, onProgress?: (pct: number) => void): Promise<CloudinaryResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  return uploadViaXhr(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, form, onProgress);
}

export function cloudinaryUrl(publicId: string, opts: { w?: number; h?: number; q?: number } = {}) {
  const transforms = [
    opts.w && `w_${opts.w}`,
    opts.h && `h_${opts.h}`,
    opts.q ? `q_${opts.q}` : "q_auto",
    "f_auto",
  ]
    .filter(Boolean)
    .join(",");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
}
