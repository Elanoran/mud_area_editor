/**
 * @file assets/js/utils/vectors.js
 * @description Utilities for vector calculations, normalization, and direction key mapping.
 * @module utils/vectors
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

// --- Normalize direction vector utility ---
export function normalizeDirectionVector(dx, dy, dz) {
  // For cardinal and diagonal: reduce to ±1, 0 for nonzero
  return [
    dx === 0 ? 0 : dx / Math.abs(dx),
    dy === 0 ? 0 : dy / Math.abs(dy),
    dz === 0 ? 0 : dz / Math.abs(dz)
  ];
}

// --- Unified direction definitions ---
export const DIRECTIONS = [
  { key: 'n',  name: 'North',     vector: '0,0,-1', index: 0 },
  { key: 'e',  name: 'East',      vector: '1,0,0',  index: 1 },
  { key: 's',  name: 'South',     vector: '0,0,1',  index: 2 },
  { key: 'w',  name: 'West',      vector: '-1,0,0', index: 3 },
  { key: 'u',  name: 'Up',        vector: '0,1,0',  index: 4 },
  { key: 'd',  name: 'Down',      vector: '0,-1,0', index: 5 },
  { key: 'ne', name: 'Northeast', vector: '1,0,-1', index: 6 },
  { key: 'nw', name: 'Northwest', vector: '-1,0,-1', index: 7 },
  { key: 'se', name: 'Southeast', vector: '1,0,1',  index: 8 },
  { key: 'sw', name: 'Southwest', vector: '-1,0,1', index: 9 }
];

export const dirKeyToIndex    = {};
export const dirKeyToName     = {};
export const dirVectorToIndex = {};
export const dirIndexToName   = {};
export const dirIndexToVector = {};
DIRECTIONS.forEach(d => {
  dirKeyToIndex[d.key]       = d.index;
  dirKeyToName[d.key]        = d.name;
  dirVectorToIndex[d.vector] = d.index;
  dirIndexToName[d.index]    = d.name;
  dirIndexToVector[d.index]  = d.vector;
});

export function getDirectionName(dir) {
  if (dirVectorToIndex[dir] !== undefined) return dirIndexToName[dirVectorToIndex[dir]];
  if (dirKeyToIndex[dir]    !== undefined) return dirKeyToName[dir];
  const idx = parseInt(dir);
  if (!isNaN(idx) && dirIndexToName[idx]) return dirIndexToName[idx];
  return dir;
}

export function getDirectionVectorKey(from, to) {
  const dx = Math.round((to.x !== undefined ? to.x : to.position.x) - (from.x !== undefined ? from.x : from.position.x));
  const dy = Math.round(((to.level !== undefined ? to.level : (to.userData?.level ?? 0)) - (from.level !== undefined ? from.level : (from.userData?.level ?? 0))));
  const dz = Math.round((to.z !== undefined ? to.z : to.position.z) - (from.z !== undefined ? from.z : from.position.z));
  return [dx, dy, dz].join(',');
}