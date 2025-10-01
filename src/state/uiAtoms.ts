import { atom } from "recoil";

/** Controls visibility of the UserLayersPanel */
export const userLayersPanelOpenAtom = atom<boolean>({
  key: "userLayersPanelOpen",
  default: false,
});
