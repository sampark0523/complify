declare namespace google {
  namespace picker {
    const Action: {
      PICKED: string;
      CANCEL: string;
    };

    class PickerBuilder {
      addView(view: DocsView | ViewGroup): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setDeveloperKey(key: string): PickerBuilder;
      setCallback(callback: (data: PickerResponse) => void): PickerBuilder;
      setOrigin(origin: string): PickerBuilder;
      enableFeature(feature: string): PickerBuilder;
      build(): Picker;
    }

    class DocsView {
      setIncludeFolders(include: boolean): DocsView;
      setMimeTypes(mimeTypes: string): DocsView;
      setMode(mode: string): DocsView;
    }

    class ViewGroup {
      addView(view: DocsView): ViewGroup;
    }

    class Picker {
      setVisible(visible: boolean): void;
      dispose(): void;
    }

    interface PickerResponse {
      action: string;
      docs: PickedFile[];
    }

    interface PickedFile {
      id: string;
      name: string;
      mimeType: string;
      url: string;
      iconUrl: string;
      description: string;
      sizeBytes: number;
      resourceKey?: string;
    }
  }
}

interface Window {
  gapi: {
    load: (module: string, callback: () => void) => void;
  };
  google: typeof google;
}
