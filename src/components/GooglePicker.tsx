"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  resourceKey?: string;
}

interface Props {
  onFilesPicked: (files: PickedFile[]) => void;
  disabled?: boolean;
}

export function GooglePicker({ onFilesPicked, disabled }: Props) {
  const { data: session } = useSession();
  const [pickerReady, setPickerReady] = useState(false);
  const pickerRef = useRef<google.picker.Picker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = document.getElementById("gapi-script");
    if (existing) {
      window.gapi?.load("picker", () => setPickerReady(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "gapi-script";
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("picker", () => setPickerReady(true));
    };
    document.body.appendChild(script);
  }, []);

  const openPicker = () => {
    if (!pickerReady || !session?.accessToken) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    const view = new window.google.picker.DocsView();

    const builder = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(session.accessToken)
      .setOrigin(window.location.protocol + "//" + window.location.host)
      .setCallback((data: google.picker.PickerResponse) => {
        if (data.action === "picked") {
          const files: PickedFile[] = data.docs.map((doc) => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            url: doc.url,
            resourceKey: doc.resourceKey,
          }));
          onFilesPicked(files);
          pickerRef.current?.dispose();
        } else if (data.action === "cancel") {
          pickerRef.current?.dispose();
        }
      });

    if (apiKey) {
      builder.setDeveloperKey(apiKey);
    }

    pickerRef.current = builder.build();
    pickerRef.current.setVisible(true);
  };

  return (
    <button
      onClick={openPicker}
      disabled={disabled || !pickerReady || !session?.accessToken}
      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
    >
      <DriveIcon />
      Import from Google Drive
    </button>
  );
}

function DriveIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 87.3 78" fill="none">
      <path
        d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066DA"
      />
      <path
        d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5C.4 49.9 0 51.45 0 53h27.5z"
        fill="#00AC47"
      />
      <path
        d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z"
        fill="#EA4335"
      />
      <path
        d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"
        fill="#00832D"
      />
      <path
        d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2H69.05c1.6 0 3.15-.45 4.5-1.2z"
        fill="#2684FC"
      />
      <path
        d="M73.4 26.5l-12.6-21.8C59.95 3.3 58.8 2.2 57.4 1.4L43.65 25l16.15 28H87.3c0-1.55-.4-3.1-1.2-4.5z"
        fill="#FFBA00"
      />
    </svg>
  );
}
