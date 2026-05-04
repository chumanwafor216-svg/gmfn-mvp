function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function canvasToImageBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Video cover could not be prepared."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.82
    );
  });
}

function fileWithExtension(filename: string, extension: string): string {
  const raw = safeStr(filename) || "shop-gallery-video";
  const dot = raw.lastIndexOf(".");
  const base = dot > 0 ? raw.slice(0, dot) : raw;
  return `${base}${extension}`;
}

function waitForVideoMetadata(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Video could not be read."));
    video.src = src;
  });
}

function waitForVideoSeek(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.onseeked = null;
      video.onerror = null;
    };

    video.onseeked = () => {
      cleanup();
      resolve();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Video cover frame could not be selected."));
    };

    try {
      video.currentTime = seconds;
    } catch {
      cleanup();
      reject(new Error("Video cover frame could not be selected."));
    }
  });
}

function waitForVideoData(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.onloadeddata = null;
      video.onerror = null;
    };

    video.onloadeddata = () => {
      cleanup();
      resolve();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Video cover frame could not be loaded."));
    };
  });
}

export async function createShopGalleryCoverFromVideo(file: File): Promise<{
  file: File;
  message: string;
}> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = await waitForVideoMetadata(objectUrl);
    const duration = Math.max(0, Number(video.duration || 0));
    const seekTime = duration > 1 ? Math.min(1, duration * 0.15) : 0;

    if (seekTime > 0) {
      await waitForVideoSeek(video, seekTime);
    }
    await waitForVideoData(video);

    const width = Math.max(1, Number(video.videoWidth || 1080));
    const height = Math.max(1, Number(video.videoHeight || 1080));
    const longestSide = Math.max(width, height);
    const maxSide = 1280;
    const scale = longestSide > maxSide ? maxSide / longestSide : 1;
    const outputWidth = Math.max(1, Math.round(width * scale));
    const outputHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Video cover preparation is not available in this browser.");
    }

    ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
    const blob = await canvasToImageBlob(canvas);

    return {
      file: new File([blob], fileWithExtension(file.name, "-cover.jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
      message: "GSN used a frame from your video as the gallery cover.",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
