/**
 * @file assets/js/utils/geometry.js
 * @description Functions for creating and managing geometries, including room meshes.
 * @module utils/geometry
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { THREE, RoundedBoxGeometry } from '../vendor/three.js';
import { rooms } from '../core/store.js';
import { LEVEL_OFFSET } from '../constants/index.js';

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
export function createRoomMesh({ color = '#cccccc', level = 0, id = null, name = '', desc = '' } = {}) {
  const mesh = new THREE.Mesh(
    // width, height, depth, segments (smoothness), radius (how round)
    new RoundedBoxGeometry(
      1,    // width of the box (x-axis)
      1,    // height of the box (y-axis)
      1,    // depth of the box (z-axis)
      7,    // number of rounded corner segments (higher = smoother)
      0.05  // radius of the rounded corners (0 = sharp, 0.5 = max round)
    ),
    new THREE.MeshStandardMaterial({ color, emissive: 0x000000 })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    id,
    exits: {},
    exitLinks: [],
    color,
    level,
    name,
    desc
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