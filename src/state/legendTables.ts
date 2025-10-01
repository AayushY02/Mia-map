// src/state/legendTables.ts
import { atom } from "recoil";

export const facilityLegendTableOpenState = atom<boolean>({
  key: "facilityLegendTableOpenState",
  default: false,
});

export const shopLegendTableOpenState = atom<boolean>({
  key: "shopLegendTableOpenState",
  default: false,
});
