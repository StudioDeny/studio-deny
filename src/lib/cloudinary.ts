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

export async function uploadToCloudinary(file: File): Promise<CloudinaryResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? "Upload failed");
  }

  return res.json() as Promise<CloudinaryResult>;
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
