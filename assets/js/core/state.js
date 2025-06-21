 /**
 * @file assets/js/core/state.js
 * @module core/state
 * @description State.
 * @author Elanoran
 */

import { updateRoomInfo } from '../ui/roomInfo.js';
 
export let selectedFace = null;
export let selectedRoom = null;
export let isDragging = false;

export let minVnum = 100;
export let maxVnum = 199;
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

export function setMinVnum(val) {
  minVnum = val;
}

export function setMaxVnum(val) {
  maxVnum = val;
}

export function clearUsedVnums() {
  usedVnums.clear();
}

export function clearLastAssignedVnum() {
  lastAssignedVnum = minVnum - 1;
}

export function setAreaNameInput(el) {
  areaNameInput = el;
}
export function setFilenameInput(el) {
  filenameInput = el;
}