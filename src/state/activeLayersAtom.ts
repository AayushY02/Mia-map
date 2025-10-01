import { atom } from "recoil";

export const globalVisibleLayersState = atom<string[]>({
  key: "globalVisibleLayersState",
  default: [],
});
