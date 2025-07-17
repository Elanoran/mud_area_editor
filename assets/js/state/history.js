/**
 * @file assets/js/state/history.js
 * @description Undo/redo stack management and state restoration utilities, where history is made or destroyed.
 * @module state/history
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { rooms } from '../core/store.js';
import { updateUndoRedoUI } from '../ui/buttons.js';
import { levelContainers } from '../core/store.js';
import { usedVnums, setSelectedRoom, setSelectedFace } from '../core/state.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { createRoomMesh, getRoomCenter } from '../utils/geometry.js';
import { createExitLine } from '../scene/exits.js';
 import { updateRoomInfo } from '../ui/roomInfo.js';

// --- Undo/Redo history (max 10 states) ---
export let undoStack = [];
export let redoStack = [];
export const MAX_HISTORY = 10;

export function clearUndoStack() {
  undoStack.length = 0;
}
export function clearRedoStack() {
  redoStack.length = 0;
}

export function captureState() {
    // Serialize rooms and exits
    const data = rooms.flat().map(room => ({
        id: room.userData.id,
        x: room.position.x,
        z: room.position.z,
        level: room.userData.level,
        color: room.userData.color,
        sector: room.userData.sector,
        exits: Object.entries(room.userData.exits || {}).map(([dir, d]) => ({ dir, to: d.room.userData.id }))
    }));
    return JSON.stringify(data);
}

export function restoreState(stateStr) {
    const data = JSON.parse(stateStr);
    // Clear current scene
    rooms.forEach((levelArr, idx) => {
      levelArr.forEach(r => {
        // remove exit lines
        (r.userData.exitLinks || []).forEach(line => levelContainers.forEach(c => c.remove(line)));
        // remove outline
        if (r.outlineMesh) {
          levelContainers[idx].remove(r.outlineMesh);
          r.outlineMesh.geometry.dispose();
          r.outlineMesh.material.dispose();
        }
        levelContainers[idx].remove(r);
      });
      rooms[idx] = [];
    });
    usedVnums.clear();
    // Recreate rooms
    const mapById = {};
    data.forEach(entry => {
      const levelIdx = entry.level + LEVEL_OFFSET;
      const mesh = createRoomMesh({
        color: entry.color,
        level: entry.level,
        id: entry.id,
        name: entry.name || '',
        desc: entry.desc || '',
        sector: entry.sector,
      });
      mesh.position.set(entry.x, 0.5, entry.z);
      levelContainers[levelIdx].add(mesh);
      rooms[levelIdx].push(mesh);
      usedVnums.add(entry.id);
      mapById[entry.id] = mesh;
    });
    // Recreate exits
    data.forEach(entry => {
      const from = mapById[entry.id];
      entry.exits.forEach(({ dir, to }) => {
        const toRoom = mapById[to];
        if (!toRoom) return;
        const fromPos = getRoomCenter(from);
        const toPos = getRoomCenter(toRoom);
        const line = createExitLine(fromPos, toPos, from, toRoom, false); // NO animation
        from.userData.exitLinks.push(line);
        toRoom.userData.exitLinks.push(line);
        from.userData.exits[dir] = { room: toRoom };
      });
    });
    setSelectedRoom(null);
    setSelectedFace(null);
    // Remove any remaining outline meshes just in case
    for (const levelArr of rooms) {
      for (const room of levelArr) {
        if (room.outlineMesh) {
          levelContainers[room.userData.level + LEVEL_OFFSET].remove(room.outlineMesh);
          room.outlineMesh.geometry.dispose();
          room.outlineMesh.material.dispose();
          delete room.outlineMesh;
        }
      }
    }
    recalculateExits();
    if (typeof drawLinks === 'function') drawLinks();
    updateRoomInfo(null);
}

export function pushHistory() {
    undoStack.push(captureState());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateUndoRedoUI();
}