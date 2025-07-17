/**
 * @file assets/js/ui/inputs.js
 * @description Input defaults and handlers for area names, filenames, and vnum limits.
 * @module ui/inputs
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { usedVnums, setLastAssignedVnum, recalculateAvailableVnums, selectedRoom } from '../core/state.js';
import { minVnum, maxVnum, setMinVnum, setMaxVnum } from '../core/settings.js';
import { rooms } from '../core/store.js';
import { updateFloorToLowestLevel, getCurrentFloorSize } from '../core/level.js';
import { setCurrentSurface } from '../scene/grid.js';
import { pushHistory } from '../state/history.js';
import { sectorColorMap } from '../utils/geometry.js';

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
    roomNameInput.addEventListener('focus', () => {
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
    roomDescInput.addEventListener('focus', () => {
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
    roomVnumInput.addEventListener('focus', () => {
      if (selectedRoom) lastVnum = selectedRoom.userData.id;
    });
    roomVnumInput.addEventListener('blur', (e) => {
      if (!selectedRoom) return;
      const newVnum = parseInt(e.target.value, 10);
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

  // Set initial values in the min/max VNUM inputs
  const vnumMinInput = document.getElementById('vnumMin');
  const vnumMaxInput = document.getElementById('vnumMax');
  let shadowMin = minVnum;
  let shadowMax = maxVnum;
  if (vnumMinInput && vnumMaxInput) {
    vnumMinInput.value = minVnum;
    vnumMaxInput.value = maxVnum;
    vnumMinInput.addEventListener('focus', () => {
      shadowMin = parseInt(vnumMinInput.value, 10) || minVnum;
    });
    vnumMaxInput.addEventListener('focus', () => {
      shadowMax = parseInt(vnumMaxInput.value, 10) || maxVnum;
    });
    vnumMinInput.addEventListener('blur', () => {
      const newMin = parseInt(vnumMinInput.value, 10) || minVnum;
      const existing = rooms.flat().map(r => r.userData.id);
      const minExisting = existing.length ? Math.min(...existing) : null;
      if (minExisting !== null && newMin > minExisting) {
        alert(`Minimum VNUM cannot exceed existing room VNUM ${minExisting}`);
        vnumMinInput.value = shadowMin;
      } else {
        setMinVnum(newMin);
        setLastAssignedVnum(newMin - 1);
        if (typeof recalculateAvailableVnums === 'function') recalculateAvailableVnums();
      }
    });
    vnumMaxInput.addEventListener('blur', () => {
      const newMax = parseInt(vnumMaxInput.value, 10) || maxVnum;
      const existing = rooms.flat().map(r => r.userData.id);
      const maxExisting = existing.length ? Math.max(...existing) : null;
      if (maxExisting !== null && newMax < maxExisting) {
        alert(`Maximum VNUM cannot be less than existing room VNUM ${maxExisting}`);
        vnumMaxInput.value = shadowMax;
      } else {
        setMaxVnum(newMax);
        if (typeof recalculateAvailableVnums === 'function') recalculateAvailableVnums();
      }
    });
  }

  // Populate and handle Sector select
  const sectorSelect = document.getElementById('sectorSelect');
  if (sectorSelect) {
    const sectors = [
      { name: 'inside',       value: 0 },
      { name: 'city',         value: 1 },
      { name: 'field',        value: 2 },
      { name: 'forest',       value: 3 },
      { name: 'hills',        value: 4 },
      { name: 'mountain',     value: 5 },
      { name: 'water_swim',   value: 6 },
      { name: 'water_noswim', value: 7 },
      { name: 'air',          value: 9 },
      { name: 'desert',       value: 10 },
      { name: 'city_tundra',  value: 11 },
      { name: 'tundra',       value: 12 },
      { name: 'swamp',        value: 13 },
      { name: 'savannah',     value: 14 },
      { name: 'underwater',   value: 15 },
      { name: 'beach',        value: 16 }
    ];
    sectorSelect.innerHTML = '';
    sectors.forEach(sec => {
      const opt = document.createElement('option');
      opt.value = sec.value;
      opt.textContent = sec.name.replace('_', ' ');
      sectorSelect.appendChild(opt);
    });
    if (selectedRoom && typeof selectedRoom.userData.sector === 'number') {
      sectorSelect.value = selectedRoom.userData.sector;
    }
    sectorSelect.addEventListener('change', e => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && selectedRoom) {
        selectedRoom.userData.sector = v;
        if (typeof pushHistory === 'function') pushHistory();
        // Update the top-face material to match the new sector color
        const mats = Array.isArray(selectedRoom.material)
          ? selectedRoom.material
          : [selectedRoom.material];
        if (mats[2]) {
          mats[2].color.set(sectorColorMap[v] || '#cccccc');
        }
      }
    });
  }

  // Save sidebar field edits to selectedRoom.userData
  document.getElementById('roomName')?.addEventListener('input', e => {
    if (selectedRoom) selectedRoom.userData.name = e.target.value;
  });
  document.getElementById('roomDesc')?.addEventListener('input', e => {
    if (selectedRoom) selectedRoom.userData.desc = e.target.value;
  });
}