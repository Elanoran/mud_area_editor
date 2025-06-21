/**
 * @file assets/js/core/store.js
 * @module core/store
 * @description Shopping time.
 * @author Elanoran
 */

import { MAX_LEVELS } from '../constants/index.js';
import { THREE } from '../vendor/three.js';

// Always use an array, never rely on window.
export let rooms = Array.from({ length: MAX_LEVELS }, () => []);

// Shared array for all level containers
export const levelContainers = Array.from({ length: MAX_LEVELS }, () => new THREE.Group());

// --- Track floor meshes per level ---
export let floorMeshes = {};

export let groundFloorColor = 0x484444;

// If you want to reset or re-initialize:
export function resetRooms() {
  rooms = Array.from({ length: MAX_LEVELS }, () => []);
  return rooms;
}