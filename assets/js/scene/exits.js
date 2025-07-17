/**
 * @file assets/js/scene/exits.js
 * @description Lets make an exit strategy.
 * @module scene/exits
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { THREE } from '../vendor/three.js';
import { levelContainers, rooms } from '../core/store.js';
import { animateStreak } from '../animations/animations.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { normalizeDirectionVector, getDirectionName, getDirectionVectorKey, DIRECTIONS } from '../utils/vectors.js';


export function createExitLine(from, to, fromRoom, toRoom, animate = true) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const line = new THREE.Line(geometry, material);
    line.userData = { fromRoom, toRoom };
    // Ensure exitLinks arrays exist on both rooms
    fromRoom.userData.exitLinks = fromRoom.userData.exitLinks || [];
    toRoom.userData.exitLinks = toRoom.userData.exitLinks || [];
    // Register this line for live updates
    fromRoom.userData.exitLinks.push(line);
    toRoom.userData.exitLinks.push(line);
    // Add flag so lines are distinguishable from indicators
    line.userData.isExitLine = true;
    levelContainers[LEVEL_OFFSET].add(line);
    if (animate)
      animateStreak(from, to, LEVEL_OFFSET, levelContainers);
    return line;
  }

/**
 * Recalculate all exit mappings based on current room positions and visible links.
 */
export function recalculateExits() {
  const allRooms = [];
  for (let level of rooms) {
    for (let r of level) {
      r.x     = r.position.x;
      r.z     = r.position.z;
      r.level = r.userData.level || 0;
      allRooms.push(r);
    }
  }
  // Clear existing exit maps
  for (const r of allRooms) {
    r.userData.exits = {};
  }
  // Rebuild them wherever there’s a link
  for (const A of allRooms) {
    for (const B of allRooms) {
      if (A === B) continue;
      const hasLink = A.userData.exitLinks?.some(line =>
        (line.userData.fromRoom === A && line.userData.toRoom === B) ||
        (line.userData.fromRoom === B && line.userData.toRoom === A)
      );
      if (!hasLink) continue;
      const dx = Math.round(B.x - A.x);
      const dy = Math.round((B.level || 0) - (A.level || 0));
      const dz = Math.round(B.z - A.z);
      let key;
      if (dy !== 0) {
        key = [0, dy > 0 ? 1 : -1, 0].join(',');
      } else {
        const [nx, , nz] = normalizeDirectionVector(dx, dy, dz);
        key = [nx, 0, nz].join(',');
      }
      if (DIRECTIONS.some(d => d.vector === key)) {
        A.userData.exits[key] = { room: B };
      }
    }
  }
}

// Then modify your existing registerRecalculateExits:
export function registerRecalculateExits() {
  if (typeof window.recalculateExits !== 'function') {
    // Instead of defining inline, just point at our named export:
    window.recalculateExits = recalculateExits;
  }
}