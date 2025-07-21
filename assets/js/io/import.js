/**
 * @file assets/js/io/import.js
 * @description File input handler and map data import/parsing functions.
 * @module io/import
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { rooms } from '../core/store.js';
import { levelContainers } from '../core/store.js';
import { LEVEL_OFFSET } from '../constants/index.js';
import { createRoomMesh, getRoomCenter } from '../utils/geometry.js';
import { createExitLine } from '../scene/exits.js';
import { usedVnums, setLastAssignedVnum } from '../core/state.js';
import { minVnum, setMinVnum, setMaxVnum } from '../core/settings.js';
import { switchLevel, currentLevel } from '../core/level.js';
import { pushHistory } from '../state/history.js';
import { getScene } from '../core/scene.js';

export function importMapData(json) {
    // Clear current scene and rooms
    rooms.forEach((level, i) => {
      level.forEach(room => levelContainers[i].remove(room));
      rooms[i] = [];
    });
    // Remove existing link lines
    levelContainers[LEVEL_OFFSET].children
      .filter(obj => obj.type === 'Line')
      .forEach(line => levelContainers[LEVEL_OFFSET].remove(line));

    let data = JSON.parse(json);
    // If areaInfo exists, update area info UI fields and vnum range
    if (data.areaInfo) {
      document.getElementById('areaName').value = data.areaInfo.areaName || '';
      document.getElementById('filename').value = data.areaInfo.filename || '';
      if (document.getElementById('vnumMin')) document.getElementById('vnumMin').value = data.areaInfo.vnumMin || 100;
      if (document.getElementById('vnumMax')) document.getElementById('vnumMax').value = data.areaInfo.vnumMax || 199;
      setMinVnum(parseInt(data.areaInfo.vnumMin) || 100);
      setMaxVnum(parseInt(data.areaInfo.vnumMax) || 199);
    }
    // Support both new and old format: if .rooms exists, use that; else assume array
    if (data.rooms) data = data.rooms;

    const idToRoom = new Map();

    // First pass: recreate all rooms
    data.forEach(entry => {
      const levelIndex = entry.level + LEVEL_OFFSET;
      const color = entry.color || '#cccccc';
      const box = createRoomMesh({
        color,
        level: entry.level,
        id: entry.id,
        name: entry.name || '',
        desc: entry.desc || '',
        sector: entry.sector ?? 0
      });
      box.position.set(entry.x, 0.5, entry.z);
      levelContainers[levelIndex].add(box);
      rooms[levelIndex].push(box);
      idToRoom.set(entry.id, box);
    });

    // Second pass: link exits, always new lines, no duplicates, and check existence
    data.forEach(entry => {
      const fromRoom = idToRoom.get(entry.id);
      if (!fromRoom) return;
      fromRoom.userData.exitLinks = [];
      fromRoom.userData.exits = {};
    });

    data.forEach(entry => {
      const fromRoom = idToRoom.get(entry.id);
      if (!fromRoom) return;
      for (const [vecKey, exit] of Object.entries(entry.exits || {})) {
        const toRoom = idToRoom.get(exit.to);
        if (!toRoom) continue;
        // Only wire up if this exit not already present
        if (!fromRoom.userData.exits[vecKey]) {
          const fromPos = getRoomCenter(fromRoom);
          const toPos = getRoomCenter(toRoom);
          const line = createExitLine(fromPos, toPos, fromRoom, toRoom, false); // no animation on import
          // Ensure the link is parented to the root scene so it doesn’t follow level transforms
          const scene = getScene();
          if (line.parent && line.parent !== scene) {
            line.parent.remove(line);
          }
          scene.add(line);
          fromRoom.userData.exitLinks.push(line);
          toRoom.userData.exitLinks.push(line);
          fromRoom.userData.exits[vecKey] = { room: toRoom, direction: vecKey };
          // Compute reverse vector key for the return direction
          const rev = vecKey.split(',').map(n => -parseInt(n, 10)).join(',');
          if (!toRoom.userData.exits[rev]) {
            toRoom.userData.exits[rev] = { room: fromRoom, direction: rev };
          }
        }
      }
    });

    // --- Update usedVnums and lastAssignedVnum after import ---
    usedVnums.clear();
    let highestVnum = minVnum - 1;
    rooms.forEach(level =>
      level.forEach(room => {
        usedVnums.add(room.userData.id);
        if (room.userData.id > highestVnum) highestVnum = room.userData.id;
      })
    );
    setLastAssignedVnum(highestVnum);
    // Refresh visuals and UI
    recalculateExits();
    if (typeof drawLinks === 'function') drawLinks();
    switchLevel(currentLevel);
    pushHistory();
  }
