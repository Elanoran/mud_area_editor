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
import { normalizeDirectionVector, DIRECTIONS } from '../utils/vectors.js';

export function createExitLine(from, to, fromRoom, toRoom, animate = true) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const line = new THREE.Line(geometry, material);
    line.userData = { fromRoom, toRoom };
    levelContainers[LEVEL_OFFSET].add(line);
    if (animate)
      animateStreak(from, to, LEVEL_OFFSET, levelContainers);
    return line;
  }

  // TODO: Move recalculateExits to scene/exits.js
export function registerRecalculateExits() {
    if (typeof window.recalculateExits !== "function") {
      window.recalculateExits = function recalculateExits() {
        // Build flat map of all rooms by id and positions
        const allRooms = [];
        for (let level of rooms) {
          for (let r of level) {
            // Ensure .x, .z, .level are present
            r.x = r.position.x;
            r.z = r.position.z;
            r.level = r.userData.level || 0;
            allRooms.push(r);
          }
        }
        // Clear both temporary and persistent exits mappings
        for (const r of allRooms) {
          r.userData.exits = {};
        }
        for (const roomA of allRooms) {
          for (const roomB of allRooms) {
            if (roomA === roomB) continue;
            // Only assign exits if there is a visual link (exitLine) between roomA and roomB
            const hasLink = roomA.userData.exitLinks?.some(line =>
              (line.userData.fromRoom === roomA && line.userData.toRoom === roomB) ||
              (line.userData.fromRoom === roomB && line.userData.toRoom === roomA)
            );
            if (!hasLink) continue;
            // Use normalized direction vector as key and only store if it's a valid direction vector
            const dx = Math.round(roomB.x - roomA.x);
            const dy = Math.round((roomB.level || 0) - (roomA.level || 0));
            const dz = Math.round(roomB.z - roomA.z);
            let normalizedKey;
            if (dy !== 0) {
              // Any up/down is just up or down, ignore x/z difference
              normalizedKey = [0, dy > 0 ? 1 : -1, 0].join(',');
            } else {
              // Only use X/Z if on same level
              const [nx, , nz] = normalizeDirectionVector(dx, dy, dz);
              normalizedKey = [nx, 0, nz].join(',');
            }
            if (DIRECTIONS.some(d => d.vector === normalizedKey)) {
              roomA.userData.exits[normalizedKey] = { room: roomB };
            }
          }
        }
      }
    }
  }