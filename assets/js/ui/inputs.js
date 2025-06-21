/**
 * @file assets/js/ui/inputs.js
 * @description Input defaults and handlers for area names, filenames, and vnum limits.
 * @module ui/inputs
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { usedVnums, setLastAssignedVnum } from '../core/state.js';
import { minVnum, maxVnum, setMinVnum, setMaxVnum } from '../core/settings.js';
import { selectedRoom } from '../core/state.js';
import { rooms } from '../core/store.js';
import { updateFloorToLowestLevel, getCurrentFloorSize } from '../core/level.js';
import { setCurrentSurface } from '../scene/grid.js';

// assets/js/ui/inputs.js
export function initRoomFieldListeners() {
  // --- Watch for changes to Area Name input and update floor ---
  const areaNameInput = document.getElementById('areaName');
  if (areaNameInput) {
    areaNameInput.addEventListener('input', () => {
      const [width, height] = getCurrentFloorSize();
      updateFloorToLowestLevel(width, height);
    });
  }

  // --- Watch for changes to Filename input (future-proof, no-op for now) ---
  const filenameInput = document.getElementById('filename');
  // If you want: filenameInput.addEventListener('input', ...) here

  // --- Watch for changes to Surface Material dropdown and update floor ---
  const surfaceSelect = document.getElementById('surfaceSelect');
  if (surfaceSelect) {
    let floorUpdateTimeout = null;
    surfaceSelect.addEventListener('change', () => {
      setCurrentSurface(surfaceSelect.value);
      if (floorUpdateTimeout) clearTimeout(floorUpdateTimeout);
      floorUpdateTimeout = setTimeout(() => {
        const [width, height] = getCurrentFloorSize();
        updateFloorToLowestLevel(width, height);
      }, 100); // 100ms debounce delay to allow textures to load
    });
  }

  // Only pushHistory on blur if value changed
  let lastRoomName = '';
  let lastRoomDesc = '';
  const roomNameInput = document.getElementById('roomName');
  const roomDescInput = document.getElementById('roomDesc');
  if (roomNameInput) {
    roomNameInput.addEventListener('focus', (e) => {
      if (selectedRoom) lastRoomName = selectedRoom.userData.name || '';
    });
    roomNameInput.addEventListener('blur', (e) => {
      if (selectedRoom) {
        const newVal = e.target.value;
        if (newVal !== (selectedRoom.userData.name || '')) {
          selectedRoom.userData.name = newVal;
          lastRoomName = newVal;
          pushHistory();
        }
      }
    });
  }
  if (roomDescInput) {
    roomDescInput.addEventListener('focus', (e) => {
      if (selectedRoom) lastRoomDesc = selectedRoom.userData.desc || '';
    });
    roomDescInput.addEventListener('blur', (e) => {
      if (selectedRoom) {
        const newVal = e.target.value;
        if (newVal !== (selectedRoom.userData.desc || '')) {
          selectedRoom.userData.desc = newVal;
          lastRoomDesc = newVal;
          pushHistory();
        }
      }
    });
  }

  // Only pushHistory if vnum actually changed
  const roomVnumInput = document.getElementById('roomVnum');
  if (roomVnumInput) {
    let lastVnum = null;
    roomVnumInput.addEventListener('focus', (e) => {
      if (selectedRoom) lastVnum = selectedRoom.userData.id;
    });
    roomVnumInput.addEventListener('blur', (e) => {
      if (!selectedRoom) return;
      const newVnum = parseInt(e.target.value);
      if (isNaN(newVnum)) return;

      if (newVnum < minVnum || newVnum > maxVnum) {
        alert(`VNUM must be between ${minVnum} and ${maxVnum}`);
        e.target.value = selectedRoom.userData.id;
        return;
      }

      if (newVnum !== selectedRoom.userData.id && usedVnums.has(newVnum)) {
        alert(`VNUM ${newVnum} is already in use`);
        e.target.value = selectedRoom.userData.id;
        return;
      }

      if (newVnum !== selectedRoom.userData.id) {
        freeVnum(selectedRoom.userData.id);
        selectedRoom.userData.id = newVnum;
        usedVnums.add(newVnum);
        pushHistory();
      }
    });
  }

  // Set initial values in the inputs on load
    const vnumMinInput = document.getElementById('vnumMin');
    const vnumMaxInput = document.getElementById('vnumMax');
  
    if (vnumMinInput && vnumMaxInput) {
      vnumMinInput.value = minVnum;
      vnumMaxInput.value = maxVnum;
  
      // Listen for user changes
      vnumMinInput.addEventListener('input', () => {
        setMinVnum(parseInt(vnumMinInput.value) || 0);
        setLastAssignedVnum(minVnum - 1);
        usedVnums.clear();
        rooms.forEach(level => level.forEach(r => usedVnums.add(r.userData.id)));
      });
  
      vnumMaxInput.addEventListener('input', () => {
        setMaxVnum(parseInt(vnumMaxInput.value) || 9999);
      });
    }

    // Save sidebar field edits to selectedRoom.userData
    document.getElementById('roomVnum')?.addEventListener('input', e => {
      if (selectedRoom) selectedRoom.userData.id = parseInt(e.target.value, 10);
    });
    document.getElementById('roomName')?.addEventListener('input', e => {
      if (selectedRoom) selectedRoom.userData.name = e.target.value;
    });
    document.getElementById('roomDesc')?.addEventListener('input', e => {
      if (selectedRoom) selectedRoom.userData.desc = e.target.value;
    });
}