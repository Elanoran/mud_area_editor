 /**
 * @file assets/js/core/state.js
 * @module core/state
 * @description State.
 * @author Elanoran
 */

import { updateRoomInfo } from '../ui/roomInfo.js';
import { minVnum } from '../core/settings.js';
import { updateFloorToLowestLevel } from '../core/level.js';
import { getCurrentFloorSize } from '../core/level.js';
 
export let selectedFace = null;
export let selectedRoom = null;
export let isDragging = false;

export const usedVnums = new Set();
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