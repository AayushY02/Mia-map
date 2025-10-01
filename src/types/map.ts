/** IDs of custom layers we add after the base "streets-v12" style loads */
export type CustomLayerId =
  | 'admin-fill'
  | 'admin-line'
  | 'chome'
  | 'mesh250';

export const CustomLayerId = {
  ADMIN_FILL: 'admin-fill' as CustomLayerId,
  ADMIN_LINE: 'admin-line' as CustomLayerId,
  CHOME: 'chome' as CustomLayerId,
  MESH: 'mesh250' as CustomLayerId
};
