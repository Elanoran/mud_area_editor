/**
 * @file assets/js/core/state.js
 * @module core/state
 * @description State.
 * @author Elanoran
 */

import { updateRoomInfo } from '../ui/roomInfo.js';
import { minVnum, maxVnum } from '../core/settings.js';
import { updateFloorToLowestLevel } from '../core/level.js';
import { getCurrentFloorSize } from '../core/level.js';
import { rooms } from '../core/store.js'; // or wherever rooms are stored

 
export let selectedFace = null;
export let selectedRoom = null;
export let isDragging = false;

export const usedVnums = new Set();
export const availableVnums = new Set();
export let lastAssignedVnum = minVnum - 1;

// assets/js/core/uiState.js
export let areaNameInput = null;
export let filenameInput = null;

// Setters
export function setSelectedFace(val) {
  selectedFace = val;
}
export function setSelectedRoom(val) {
  selectedRoom = val;
  updateRoomInfo(val);
}
export function setIsDragging(val) {
  isDragging = val;
}

export function setLastAssignedVnum(val) {
  lastAssignedVnum = val;
}

/**
 * Returns the current lastAssignedVnum.
 * @returns {number}
 */
export function getLastAssignedVnum() {
  return lastAssignedVnum;
}

export function clearUsedVnums() {
  usedVnums.clear();
}

export function clearLastAssignedVnum() {
  lastAssignedVnum = minVnum - 1;
}

let floorUpdateTimeout = null;

export function setAreaNameInput(el) {
  areaNameInput = el;
  if (floorUpdateTimeout) clearTimeout(floorUpdateTimeout);
  floorUpdateTimeout = setTimeout(() => {
    const [width, height] = getCurrentFloorSize();
    updateFloorToLowestLevel(width, height);
  }, 100); // 100ms debounce delay
}
export function setFilenameInput(el) {
  filenameInput = el;
}

export function recalculateAvailableVnums() {
  // Purge rooms outside the [minVnum, maxVnum] range
  let purged = 0;
  rooms.forEach((level, levelIndex) => {
    for (let i = level.length - 1; i >= 0; i--) {
      const room = level[i];
      const vnum = room.userData.id;
      if (vnum < minVnum || vnum > maxVnum) {
        if (room.parent) {
          room.parent.remove(room);
        }
        level.splice(i, 1);
        usedVnums.delete(vnum);
        purged++;
      }
    }
  });

  usedVnums.clear();
  // Build set of used VNUMs from current rooms array
  rooms.forEach(level => level.forEach(r => usedVnums.add(r.userData.id)));
  availableVnums.clear();
  for (let v = minVnum; v <= maxVnum; v++) {
    if (!usedVnums.has(v)) availableVnums.add(v);
  }
  // For debugging
  /*
  console.log('recalculateAvailableVnums:', {
    minVnum, maxVnum,
    purged,
    used: Array.from(usedVnums),
    available: Array.from(availableVnums)
  });*/
}