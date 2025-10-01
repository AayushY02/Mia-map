import { atom } from 'recoil';

export type MeshFeature = {
  MESH_ID: string;
  PTN_2020?: number;
  PTA_2020?: number;
  PTC_2020?: number;
  [key: string]: string | number | undefined;
};


export const selectedMeshesState = atom<MeshFeature[]>({
  key: 'selectedMeshesState',
  default: [],
});

export const chatVisibleState = atom<boolean>({
  key: 'chatVisibleState',
  default: false,
});


export const selectedMeshIdState = atom<string | null>({
  key: 'selectedMeshId',
  default: null,
});
