import { previewAdapter } from "./adapter";
const localMedia = new Map<
  string,
  { url: string; name: string; type: string; size: number }
>();
export const galleryEvidence = {
  attach(file: File) {
    const state = previewAdapter.read(),
      key = `evidence:${state.academyId}:${state.playerId}`,
      old = localMedia.get(key);
    if (old) URL.revokeObjectURL(old.url);
    localMedia.set(key, {
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
    });
    previewAdapter.save({
      fields: {
        ...state.fields,
        [key]: {
          note: "",
          name: file.name,
          type: file.type,
          size: String(file.size),
          review: "Not reviewed",
        },
      },
      notice: "Local file selected for this preview. Nothing was uploaded.",
    });
  },
  read() {
    const state = previewAdapter.read();
    const key = `evidence:${state.academyId}:${state.playerId}`;
    const media = localMedia.get(key);
    return state.fields[key]?.name === media?.name ? media : undefined;
  },
};
