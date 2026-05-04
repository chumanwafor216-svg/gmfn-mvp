export type PreparedSpotlightMedia = {
  file: File;
  message: string | null;
  durationSeconds?: number | null;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function formatFileSize(bytes: number): string {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function renameWithExtension(filename: string, extension: string): string {
  const raw = safeStr(filename) || "spotlight-media";
  const dot = raw.lastIndexOf(".");
  const base = dot > 0 ? raw.slice(0, dot) : raw;
  return `${base}${extension}`;
}

function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, {
    type: blob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
}

function waitForImageLoad(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Image could not be prepared right now."));
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image preparation failed."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

export async function prepareSpotlightImageFile(
  file: File,
  options?: {
    maxBytes?: number;
    maxDimension?: number;
  }
): Promise<PreparedSpotlightMedia> {
  const maxBytes = Number(options?.maxBytes || 10 * 1024 * 1024);
  const maxDimension = Number(options?.maxDimension || 1920);

  if (Number(file.size || 0) <= maxBytes) {
    return { file, message: null };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await waitForImageLoad(objectUrl);
    const originalWidth = Math.max(1, Number(image.naturalWidth || image.width || 1));
    const originalHeight = Math.max(
      1,
      Number(image.naturalHeight || image.height || 1)
    );

    let width = originalWidth;
    let height = originalHeight;
    const longestSide = Math.max(width, height);
    if (longestSide > maxDimension) {
      const scale = maxDimension / longestSide;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Image preparation is not available in this browser.");
    }

    let blob: Blob | null = null;
    let attemptWidth = width;
    let attemptHeight = height;

    for (let sizeStep = 0; sizeStep < 5; sizeStep += 1) {
      canvas.width = attemptWidth;
      canvas.height = attemptHeight;
      ctx.clearRect(0, 0, attemptWidth, attemptHeight);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, attemptWidth, attemptHeight);
      ctx.drawImage(image, 0, 0, attemptWidth, attemptHeight);

      for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56, 0.48]) {
        const candidate = await canvasToBlob(canvas, "image/jpeg", quality);
        if (candidate.size <= maxBytes) {
          blob = candidate;
          break;
        }
        blob = candidate;
      }

      if (blob && blob.size <= maxBytes) {
        break;
      }

      attemptWidth = Math.max(360, Math.round(attemptWidth * 0.82));
      attemptHeight = Math.max(360, Math.round(attemptHeight * 0.82));
    }

    if (!blob || blob.size > maxBytes) {
      throw new Error(
        `This image is too large to prepare automatically. Please try another photo or a screenshot under ${formatFileSize(
          maxBytes
        )}.`
      );
    }

    const preparedFile = blobToFile(blob, renameWithExtension(file.name, ".jpg"));
    return {
      file: preparedFile,
      message: `We prepared a lighter picture automatically (${formatFileSize(
        file.size
      )} to ${formatFileSize(preparedFile.size)}).`,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function waitForVideoMetadata(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () =>
      reject(new Error("Video could not be prepared right now."));
    video.src = src;
  });
}

function chooseRecorderMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];

  for (const mimeType of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      typeof MediaRecorder.isTypeSupported === "function" &&
      MediaRecorder.isTypeSupported(mimeType)
    ) {
      return mimeType;
    }
  }

  return "";
}

function getVideoCaptureStream(video: HTMLVideoElement): MediaStream | null {
  const anyVideo = video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };

  if (typeof anyVideo.captureStream === "function") {
    return anyVideo.captureStream();
  }

  if (typeof anyVideo.mozCaptureStream === "function") {
    return anyVideo.mozCaptureStream();
  }

  return null;
}

async function createSpotlightReadyClip(
  file: File,
  options: {
    maxBytes: number;
    maxDurationSeconds: number;
  }
): Promise<PreparedSpotlightMedia> {
  if (
    typeof window === "undefined" ||
    typeof MediaRecorder === "undefined"
  ) {
    throw new Error(
      "This browser cannot automatically prepare spotlight videos yet."
    );
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const video = await waitForVideoMetadata(objectUrl);
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    const stream = getVideoCaptureStream(video);

    if (!stream) {
      throw new Error(
        "This browser cannot automatically prepare spotlight videos yet."
      );
    }

    const originalDuration = Math.max(
      0,
      Number(video.duration || options.maxDurationSeconds || 0)
    );
    const targetDuration = Math.max(
      1,
      Math.min(originalDuration || options.maxDurationSeconds, options.maxDurationSeconds)
    );
    const mimeType = chooseRecorderMimeType();
    const extension = mimeType.includes("mp4") ? ".mp4" : ".webm";
    const bitsPerSecond = Math.max(
      800_000,
      Math.min(
        2_500_000,
        Math.floor((options.maxBytes * 8 * 0.72) / Math.max(targetDuration, 1))
      )
    );

    const recordedBlob = await new Promise<Blob>((resolve, reject) => {
      const chunks: BlobPart[] = [];
      let stopTimer = 0;

      const cleanup = () => {
        window.clearTimeout(stopTimer);
        video.pause();
        stream.getTracks().forEach((track) => track.stop());
      };

      let recorder: MediaRecorder;

      try {
        recorder = mimeType
          ? new MediaRecorder(stream, {
              mimeType,
              bitsPerSecond,
              videoBitsPerSecond: bitsPerSecond,
            })
          : new MediaRecorder(stream, {
              bitsPerSecond,
              videoBitsPerSecond: bitsPerSecond,
            });
      } catch (error) {
        cleanup();
        reject(
          error instanceof Error
            ? error
            : new Error("Video preparation could not start.")
        );
        return;
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        cleanup();
        reject(new Error("Video preparation failed during recording."));
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: mimeType || "video/webm",
        });
        cleanup();
        resolve(blob);
      };

      video.currentTime = 0;
      recorder.start(250);
      stopTimer = window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, Math.ceil(targetDuration * 1000) + 220);

      video
        .play()
        .catch(() => {
          if (recorder.state !== "inactive") recorder.stop();
        });
    });

    if (recordedBlob.size > options.maxBytes) {
      throw new Error(
        `This video is still too large after preparation. Please try a shorter clip or one under ${formatFileSize(
          options.maxBytes
        )}.`
      );
    }

    const preparedFile = blobToFile(
      recordedBlob,
      renameWithExtension(file.name, extension)
    );
    const keptSeconds = Math.min(
      options.maxDurationSeconds,
      Math.max(1, Math.round(targetDuration))
    );

    return {
      file: preparedFile,
      durationSeconds: Number(targetDuration.toFixed(2)),
      message:
        originalDuration > options.maxDurationSeconds || file.size > options.maxBytes
          ? `We prepared a spotlight-ready clip automatically and kept the opening ${keptSeconds} second${
              keptSeconds === 1 ? "" : "s"
            } (${formatFileSize(file.size)} to ${formatFileSize(
              preparedFile.size
            )}).`
          : null,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareSpotlightVideoFile(
  file: File,
  options?: {
    maxBytes?: number;
    maxDurationSeconds?: number;
  }
): Promise<PreparedSpotlightMedia> {
  const maxBytes = Number(options?.maxBytes || 15 * 1024 * 1024);
  const maxDurationSeconds = Number(options?.maxDurationSeconds || 10);

  const objectUrl = URL.createObjectURL(file);

  try {
    const video = await waitForVideoMetadata(objectUrl);
    const durationSeconds = Number(
      Math.max(0, Number(video.duration || 0)).toFixed(2)
    );

    if (Number(file.size || 0) <= maxBytes && durationSeconds > 0) {
      return {
        file,
        message:
          durationSeconds > maxDurationSeconds
            ? `We kept your original video so the sound stays intact. GSN will play it as a ${maxDurationSeconds}-second public clip.`
            : null,
        durationSeconds: Math.min(durationSeconds, maxDurationSeconds),
      };
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return createSpotlightReadyClip(file, {
    maxBytes,
    maxDurationSeconds,
  });
}
