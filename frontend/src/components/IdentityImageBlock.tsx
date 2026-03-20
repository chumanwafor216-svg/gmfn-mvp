import React, { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  storageKey: string;
  fallbackSrc: string;
  size?: number;
};

function panel(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 12,
    boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
  };
}

function btn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 10px",
    borderRadius: 10,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 12,
    cursor: "pointer",
    minWidth: 88,
  };
}

export default function IdentityImageBlock({
  title,
  subtitle,
  storageKey,
  fallbackSrc,
  size = 72,
}: Props) {
  const [src, setSrc] = useState<string>(fallbackSrc);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved && saved.trim()) {
      setSrc(saved);
    } else {
      setSrc(fallbackSrc);
    }
  }, [storageKey, fallbackSrc]);

  function saveImage(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) return;
      window.localStorage.setItem(storageKey, result);
      setSrc(result);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    window.localStorage.removeItem(storageKey);
    setSrc(fallbackSrc);
  }

  return (
    <div style={panel()}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <img
          src={src}
          alt={title}
          style={{
            width: size,
            height: size,
            borderRadius: 16,
            objectFit: "cover",
            border: "1px solid rgba(11,31,51,0.08)",
            background: "#F8FAFC",
            flexShrink: 0,
          }}
        />

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 14 }}>
            {title}
          </div>
          <div
            style={{
              marginTop: 4,
              color: "#64748B",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {subtitle || "Identity image"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          style={btn(true)}
        >
          Upload
        </button>

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          style={btn(false)}
        >
          Take Picture
        </button>

        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          style={btn(false)}
        >
          Change
        </button>

        <button
          type="button"
          onClick={removeImage}
          style={btn(false)}
        >
          Remove
        </button>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => saveImage(e.target.files?.[0] || null)}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={(e) => saveImage(e.target.files?.[0] || null)}
      />
    </div>
  );
}