import { atom } from 'recoil';

export interface LayerVisibility {
  roads: boolean;
  admin: boolean;
  terrain: boolean;
  chome: boolean;
  mesh: boolean;
}

/** Visibility flags for each layer */
export const layerVisibilityAtom = atom<LayerVisibility>({
  key: 'layerVisibility',
  default: {
    roads: true,
    admin: true,
    terrain: true,
    chome: false,
    mesh: false
  }
});

export const masuoCourseDropLayerVisibleState = atom<boolean>({
  key: 'masuoCourseDropLayerVisibleState',
  default: false,
});
