/**
 * @file assets/js/utils/geometry.js
 * @description Functions for creating and managing geometries, including room meshes.
 * @module utils/geometry
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { THREE, RoundedBoxGeometry } from '../vendor/three.js';
import { rooms } from '../core/store.js';
import { LEVEL_OFFSET, MAX_LEVELS, areaNames } from '../constants/index.js';

// Mapping of sector IDs to default colors for the top face
export const sectorColorMap = {
  0: '#cccccc', // inside
  1: '#888888', // city
  2: '#ffff88', // field
  3: '#00ff00', // forest
  4: '#aaaa55', // hills
  5: '#888855', // mountain
  6: '#0000ff', // water_swim
  7: '#000088', // water_noswim
  8: '#444444', // unused
  9: '#ffffff', // air
  10: '#ffcc33', // desert
  11: '#ff8888', // city_tundra
  12: '#ffffff', // tundra
  13: '#005500', // swamp
  14: '#ffaa00', // savannah
  15: '#006688', // underwater
  16: '#ffff88', // beach
};

/**
 * Creates and exports 3D geometry helpers, starting with room meshes.
 * @param {Object} options
 * @param {string} options.color
 * @param {number} options.level
 * @param {number|null} options.id
 * @param {string} options.name
 * @param {string} options.desc
 * @returns {THREE.Mesh}
 */
export function createRoomMesh({ color = '#cccccc', level = 0, id = null, name = '', desc = '', sector = 0 } = {}) {
  // Build geometry
  const geometry = new RoundedBoxGeometry(
    1,    // width
    1,    // height
    1,    // depth
    7,    // segments
    0.05  // radius
  );
  // Material for sides and bottom (manual color override)
  const sideMat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: 0x000000,
    transparent: true,
    opacity: 1
  });
  // Material for top face (sector color)
  const topMat = new THREE.MeshStandardMaterial({
    color: sectorColorMap[sector] || '#cccccc',
    emissive: 0x000000,
    transparent: true,
    opacity: 1
  });
  // Assign materials to faces: [right, left, top, bottom, front, back]
  const mesh = new THREE.Mesh(geometry, [
    sideMat, // right
    sideMat, // left
    topMat,  // top
    sideMat, // bottom
    sideMat, // front
    sideMat  // back
  ]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    id,
    exits: {},
    exitLinks: [],
    color,
    level,
    name,
    desc,
    sector,
  };
  return mesh;
}

export function getRoomCenter(mesh) {
    const levelIndex = rooms.findIndex(r => r.includes(mesh));
    const offsetY = (levelIndex - LEVEL_OFFSET) * 2;
    const pos = mesh.position.clone();
    pos.y += offsetY;
    return pos;
  }