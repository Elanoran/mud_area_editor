/**
 * @file assets/js/ui/buttons.js
 * @description UI buttons. buttons up...
 * @module ui/buttons
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */
import { undoStack, redoStack, MAX_HISTORY, restoreState, clearUndoStack, clearRedoStack, pushHistory } from '../state/history.js';
import { gridLocked, setGridLocked } from '../ui/init.js';
import { switchLevel, currentLevel } from '../core/level.js';
import { selectedRoom, setSelectedRoom, minVnum, maxVnum,
         setMinVnum, setMaxVnum, clearUsedVnums, clearLastAssignedVnum,
         areaNameInput, filenameInput } from '../core/state.js';
import { levelContainers, rooms } from '../core/store.js';
import { setGroundFloorVisible, groundFloorVisible, animateRoomFallAndExplode, animateRoomExplode } from '../animations/animations.js';
import { LEVEL_OFFSET, areaNames } from '../constants/index.js';
import { getFormats } from '../state/formats.js';
import { dirVectorToIndex, getDirectionName } from '../utils/vectors.js';
import { importMapData } from '../io/import.js';
import { freeVnum } from '../state/rooms.js';
import { getScene } from '../core/scene.js';
import { updateRoomInfo } from '../ui/roomInfo.js';
import { grid, setGridVisible, getGridVisible } from '../scene/grid.js';

export let selectedRoomColor = '#8888ff';

export const gridSelect = document.getElementById('gridSelect');

// Undo button
undoBtn.addEventListener('click', () => {
    // Only undo if there is a previous state
    if (undoStack.length < 2) return;
    // Move current state to redo stack
    redoStack.push(undoStack.pop());
    if (redoStack.length > MAX_HISTORY) redoStack.shift();
    // Restore the new top of undo stack (the previous state)
    const prev = undoStack[undoStack.length - 1];
    restoreState(prev);
    updateUndoRedoUI();
    // Do NOT call pushHistory() here
});

// Redo button
redoBtn.addEventListener('click', () => {
    if (redoStack.length === 0) return;
    // Move the top of redoStack to undoStack and restore it
    const next = redoStack.pop();
    undoStack.push(next);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    restoreState(next);
    updateUndoRedoUI();
    // Do NOT call pushHistory() here
});

// Delete Room button
const deleteBtn = document.getElementById('deleteRoomBtn');
deleteBtn.addEventListener('click', () => {
    if (!selectedRoom) {
    alert('No room selected to delete.');
    return;
    }
    //if (!confirm('Are you sure you want to delete this room?')) return;
    const room = selectedRoom;
    const levelIndex = room.userData.level + LEVEL_OFFSET;
    // Remove exit lines
    room.userData.exitLinks.forEach(line => {
    levelContainers.forEach(container => container.remove(line));
    });
    // Clean up exits in other rooms
    rooms.forEach(levelArr => {
    levelArr.forEach(other => {
        if (other !== room && other.userData.exits) {
        for (const dir in other.userData.exits) {
            if (other.userData.exits[dir].room === room) {
            delete other.userData.exits[dir];
            }
        }
        }
    });
    });
    // Remove outline if present
    if (room.outlineMesh) {
    levelContainers[levelIndex].remove(room.outlineMesh);
    room.outlineMesh.geometry.dispose();
    room.outlineMesh.material.dispose();
    delete room.outlineMesh;
    }
    // Free vnum, animate falling and explosion instead of immediate removal
    freeVnum(room.userData.id);
    const idx = rooms[levelIndex].indexOf(room);
    if (idx !== -1) rooms[levelIndex].splice(idx, 1);
    setSelectedRoom(null);
    // Animate falling and explosion
    //animateRoomFallAndExplode(room, levelContainers[levelIndex], getScene());
    animateRoomExplode(room, levelContainers[levelIndex], getScene());
    // Update visuals
    recalculateExits();
    if (typeof drawLinks === 'function') drawLinks();
    updateRoomInfo(null);
    pushHistory();
});

// Clean Scene button
const cleanBtn = document.getElementById('cleanSceneBtn');
cleanBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to clear the scene? This will remove all rooms and exits.')) return;
    // Clear history after scene clean
    clearUndoStack();
    clearRedoStack();
    // Remove all exit lines
    levelContainers[LEVEL_OFFSET].children
    .filter(obj => obj.type === 'Line')
    .forEach(line => levelContainers[LEVEL_OFFSET].remove(line));
    // Remove all rooms and outlines
    rooms.forEach((levelArr, idx) => {
    levelArr.forEach(room => {
        if (room.outlineMesh) {
        levelContainers[idx].remove(room.outlineMesh);
        room.outlineMesh.geometry.dispose();
        room.outlineMesh.material.dispose();
        }
        levelContainers[idx].remove(room);
        room.geometry.dispose();
        room.material.dispose();
    });
    rooms[idx] = [];
    });
    // --- FULLY reset vnum state and UI inputs ---
    setMinVnum(100);
    setMaxVnum(199);
    clearUsedVnums();
    clearLastAssignedVnum();
    const vnumMinInput = document.getElementById('vnumMin');
    const vnumMaxInput = document.getElementById('vnumMax');
    if (vnumMinInput && vnumMaxInput) {
    vnumMinInput.value = minVnum;
    vnumMaxInput.value = maxVnum;
    }
    setSelectedRoom(null);
    updateRoomInfo(null);
    recalculateExits();
    if (typeof drawLinks === 'function') drawLinks();
    // --- Reset area name and filename to new random funny names ---
    if (areaNameInput && filenameInput) {
    const idx = Math.floor(Math.random() * areaNames.length);
    areaNameInput.value = areaNames[idx].area;
    filenameInput.value = areaNames[idx].file;
    }
    // Push a new baseline history state after cleaning the scene
    pushHistory();
});

const helpPopup = document.getElementById('helpPopup');
const helpBtn = document.getElementById('helpBtn');
const helpClose = document.getElementById('helpClose');

if (helpPopup && helpBtn && helpClose) {
    helpBtn.addEventListener('click', () => {
      helpPopup.style.display = helpPopup.style.display === 'block' ? 'none' : 'block';
    });

    helpClose.addEventListener('click', () => {
      helpPopup.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
      if (
        helpPopup.style.display === 'block' &&
        !helpPopup.contains(event.target) &&
        event.target !== helpBtn
      ) {
        helpPopup.style.display = 'none';
      }
    });
}

const floorToggleBtn = document.getElementById('floorToggleBtn');
export function updateFloorVisibilityButton() {
    if (!floorToggleBtn) return;
    const icon = floorToggleBtn.querySelector('i');
    if (groundFloorVisible) {
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
      floorToggleBtn.title = "Hide ground floor";
    } else {
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
      floorToggleBtn.title = "Show ground floor";
    }
}


if (floorToggleBtn) {
    floorToggleBtn.addEventListener('click', () => {
      setGroundFloorVisible(!groundFloorVisible);
    });
}

const gridToggleBtn = document.getElementById('gridToggleBtn');
if (gridToggleBtn) {
    gridToggleBtn.addEventListener('click', () => {
      // Toggle visibility using the setter/getter
      setGridVisible(!getGridVisible());
      if (grid) {
        grid.visible = getGridVisible();
      }
      // Reflect state in button styling
      gridToggleBtn.classList.toggle('active', getGridVisible());
    });
}

// --- Undo/Redo UI updater ---
export function updateUndoRedoUI() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (!undoBtn || !redoBtn) return;
    if (undoStack.length < 2) {
      undoBtn.classList.add('disabled');
    } else {
      undoBtn.classList.remove('disabled');
    }
    if (redoStack.length === 0) {
      redoBtn.classList.add('disabled');
    } else {
      redoBtn.classList.remove('disabled');
    }
}

// Room color selector logic
document.querySelectorAll('.room-color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.room-color-option').forEach(b => {
        b.classList.remove('selected');
        b.style.removeProperty('transform');
        b.style.zIndex = '';
      });
      btn.classList.add('selected');
      selectedRoomColor = btn.dataset.color;
      // Update color of selected room immediately if a room is selected
      if (selectedRoom) {
        // Only push history if color actually changes
        if (selectedRoom.userData.color !== selectedRoomColor) {
          selectedRoom.material.color.set(selectedRoomColor);
          selectedRoom.userData.color = selectedRoomColor;
          pushHistory();
        }
      }
    });
});

export function initButtons() {
    const lockBtn = document.getElementById('fitViewBtn');
    // Initialize button icon and tooltip
    lockBtn.innerHTML = gridLocked
    ? '<i class="fa-solid fa-lock"></i>'
    : '<i class="fa-solid fa-lock-open"></i>';
    lockBtn.title = gridLocked ? 'Lock' : 'Unlock';
    lockBtn.classList.toggle('active', gridLocked);
    lockBtn.classList.toggle('locked',   gridLocked);
    lockBtn.classList.toggle('unlocked', !gridLocked);
    lockBtn.addEventListener('click', () => {
        setGridLocked(!gridLocked);
        lockBtn.classList.toggle('active', gridLocked);
        // Update icon and tooltip after toggle
        lockBtn.innerHTML = gridLocked
        ? '<i class="fa-solid fa-lock"></i>'
        : '<i class="fa-solid fa-lock-open"></i>';
        lockBtn.title = gridLocked ? 'Lock' : 'Unlock';
        lockBtn.classList.toggle('locked',   gridLocked);
        lockBtn.classList.toggle('unlocked', !gridLocked);
    });

    // Initialize visibility
    switchLevel(currentLevel);
}

// Auto-select the first color button on page load
const firstColorButton = document.querySelector('.room-color-option');
if (firstColorButton) {
    firstColorButton.classList.add('selected');
    selectedRoomColor = firstColorButton.dataset.color;
}

// Remove the old level selector DOM elements from the page if present
const oldLevelSel = document.getElementById('levelSelector');
if (oldLevelSel && oldLevelSel.parentNode) 
    oldLevelSel.parentNode.removeChild(oldLevelSel);
const upBtn = document.getElementById('upButton');
if (upBtn && upBtn.parentNode) 
    upBtn.parentNode.removeChild(upBtn);
const downBtn = document.getElementById('downButton');
if (downBtn && downBtn.parentNode) 
    downBtn.parentNode.removeChild(downBtn);

document.getElementById('exportFormatBtn')?.addEventListener('click', () => {
    // Always get latest formats from state
    const formats = getFormats();
    const exportFormat = document.getElementById('exportFormat')?.value || 'JSON';
    // Helper: get extension from loaded formats or fallback map
    function getFormatExtension(formatName) {
      const formats = getFormats();
      if (formats && formats[formatName] && formats[formatName].fileExtension) {
        return formats[formatName].fileExtension.replace(/^\./, '');
      }
      // Fallbacks:
      if (formatName === 'JSON') return 'json';
      if (formatName === 'ROM' || formatName === 'AW') return 'are';
      return 'txt';
    }
    if (exportFormat === 'JSON') {
      const roomsData = [];
      rooms.forEach((level, levelIndex) => {
        level.forEach(room => {
          const pos = room.position;
          // --- Export exits as a mapping from human-readable direction name to {to, link} ---
          const exits = {};
          if (room.userData.exits) {
            for (const [dir, data] of Object.entries(room.userData.exits)) {
              if (data.room && data.room.userData && typeof data.room.userData.id !== 'undefined') {
                const readableDir = getDirectionName(dir);
                // Add backward compatible structure: { to: id, link: dir }
                exits[dir] = {
                  to: data.room.userData.id
                };
              }
            }
          }
          // Remove exitLinks from export (do not include in JSON)
          roomsData.push({
            id: room.userData.id,
            name: room.userData.name || '',
            desc: room.userData.desc || '',
            level: levelIndex - LEVEL_OFFSET,
            x: pos.x,
            z: pos.z,
            exits,
            color: room.userData.color || '#ffffff'
          });
        });
      });
      // --- Compose areaInfo object ---
      const areaInfo = {
        areaName: document.getElementById('areaName')?.value || '',
        filename: document.getElementById('filename')?.value || '',
        vnumMin: minVnum,
        vnumMax: maxVnum
      };
      const filename = document.getElementById('filename')?.value.trim();
      const ext = getFormatExtension(exportFormat);
      let finalFilename = filename;
      if (!finalFilename.toLowerCase().endsWith('.' + ext)) {
        finalFilename += '.' + ext;
      }
      // --- Save both areaInfo and roomsData in an object ---
      const exportObj = { areaInfo, rooms: roomsData };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const formatName = exportFormat;
    const formats2 = getFormats();
    const format = formats2[formatName];
    if (!format) {
      alert(`Unknown format: ${formatName}`);
      return;
    }

    const areaName = document.getElementById('areaName')?.value.trim();
    const filename = document.getElementById('filename')?.value.trim();
    const vnumMin = document.getElementById('vnumMin')?.value || '0';
    const vnumMax = document.getElementById('vnumMax')?.value || '0';
    const builders = document.getElementById('builders')?.value || '';

    if (!areaName || !filename) {
      alert('Please provide both Area Name and Filename before exporting.');
      return;
    }

    // Always include reverse exits for all formats
    const skipReverse = false;


    // --- Generic export logic driven by formats.json templates ---
    // Helper: Replace placeholders in a template string with values from a data object
    function fillTemplate(template, data, defaults = {}) {
      return template.replace(/%([A-Z0-9_]+)%/g, (m, key) => {
        if (typeof data[key] !== "undefined" && data[key] !== null) return data[key];
        if (typeof defaults[key] !== "undefined") return defaults[key];
        return '';
      });
    }

    // Gather area/room/exit/extra templates for this format
    const areaTemplate = format.area || '';
    const roomTemplate = format.room || '';
    const exitTemplate = format.exit || '';
    const extraTemplate = format.extra || '';

    // Gather all rooms, sorted by vnum if possible
    const allRooms = rooms.flat().slice().sort((a, b) => (a.userData.id || 0) - (b.userData.id || 0));

    // Compose room blocks
    let roomsStr = '';
    allRooms.forEach(room => {
      // Compose data for substitution
      const vnum = room.userData.id;
      const name = room.userData.name?.trim() ? room.userData.name.trim() : `Room ${vnum}`;
      const desc = room.userData.desc?.trim() ? room.userData.desc.trim() : `${vnum}`;
      const flags = room.userData.flags || '0';
      const extraFlags = room.userData.extraFlags || '0';
      const sector = room.userData.sector || '0';
      const zone = room.userData.zone || '0';
      // Compose exits for this room
      let exitsStr = '';
      // --- Export logic for ROM/AW-style using direction indexes ---
      if (exitTemplate && room.userData.exits && (format.romDirections || format.awDirections)) {
        // Output only valid vector keys as per dirVectors
        Object.entries(room.userData.exits || {}).forEach(([vectorKey, data]) => {
          if (!data.room || typeof data.room.userData.id === 'undefined') return;
          // Map vectorKey to direction index
          let dirIndex = dirVectorToIndex[vectorKey];
          if (typeof dirIndex !== 'number') return;
          let exitData = {
            DIRECTION: dirIndex,
            TO_VNUM: data.room.userData.id,
            KEY: '-1',
            FLAGS: '0',
            DOOR_DESC: '',
            KEYWORDS: ''
          };
          if (format.romDirections) {
            exitsStr += `D${dirIndex}\n~\n~\n0 ${data.room.userData.id} 0\n`;
          } else if (format.awDirections) {
            exitsStr += `Door ${dirIndex}\n0 ${data.room.userData.id}\n`;
          } else {
            if (format.exitDefaults) {
              Object.assign(exitData, format.exitDefaults);
            }
            exitsStr += fillTemplate(exitTemplate, exitData);
          }
        });
      } else if (exitTemplate && room.userData.exits) {
        // Fallback: previous logic (non-ROM/AW), but map vector keys to direction numbers if needed
        const usedDirs = new Set();
        for (const key in room.userData.exits) {
          const exit = room.userData.exits[key];
          // Determine numeric direction index from vector key or existing exit.direction
          let dirNum = dirVectorToIndex[key];
          if (exit.direction !== undefined && exit.direction !== null) {
            if (typeof exit.direction === 'number') {
              dirNum = exit.direction;
            } else if (typeof exit.direction === 'string') {
              // Try mapping a vector string or numeric string to an index
              const idx = dirVectorToIndex[exit.direction];
              if (idx !== undefined) {
                dirNum = idx;
              } else {
                const parsed = parseInt(exit.direction, 10);
                if (!isNaN(parsed)) {
                  dirNum = parsed;
                }
              }
            }
          }
          if (dirNum === undefined || dirNum === null) continue;
          const toRoom = exit.room;
          if (!toRoom || typeof toRoom.userData?.id === 'undefined') continue;
          if (format.uniqueExitDirections) {
            if (usedDirs.has(dirNum)) continue;
            usedDirs.add(dirNum);
          }
          let exitData = {
            DIRECTION: dirNum,
            TO_VNUM: toRoom?.userData?.id ?? 0,
            KEY: '-1',
            FLAGS: '0',
            DOOR_DESC: '',
            KEYWORDS: ''
          };
          if (format.exitDefaults) {
            Object.assign(exitData, format.exitDefaults);
          }
          exitsStr += fillTemplate(exitTemplate, exitData);
        }
      }
      // Compose extra descriptions if format.extra exists (not implemented in UI yet)
      let extrasStr = '';
      if (extraTemplate && Array.isArray(room.userData.extras)) {
        for (const extra of room.userData.extras) {
          extrasStr += fillTemplate(extraTemplate, {
            EXTRA_KEYWORDS: extra.keywords || '',
            EXTRA_DESC: extra.desc || ''
          });
        }
      }
      // Compose room data for template
      let roomData = {
        ROOM_VNUM: vnum,
        ROOM_NAME: name,
        ROOM_DESC: desc,
        FLAGS: flags,
        EXTRA_FLAGS: extraFlags,
        SECTOR: sector,
        ZONE: zone,
        EXITS: exitsStr,
        EXTRAS: extrasStr
      };
      if (format.roomDefaults) {
        Object.assign(roomData, format.roomDefaults);
      }
      if (roomTemplate) {
        roomsStr += fillTemplate(roomTemplate, roomData);
      } else {
        roomsStr += `#${vnum}
        Name   ${name}~
        Descr
        ${desc}
        ~
        Flags  ${flags} ${extraFlags}
        Sect   ${sector}
        ${exitsStr}${extrasStr}End

        `;
      }
    });

    // Compose area data for template
    let areaData = {
      AREA_NAME: areaName,
      FILENAME: filename,
      VNUM_MIN: vnumMin,
      VNUM_MAX: vnumMax,
      BUILDERS: builders,
      ROOMS: roomsStr
    };
    // Allow format to override area defaults
    if (format.areaDefaults) {
      Object.assign(areaData, format.areaDefaults);
    }
    let output = '';
    if (areaTemplate) {
      output = fillTemplate(areaTemplate, areaData);
    } else {
      output = roomsStr;
    }

    // Add correct extension if missing
    const ext = getFormatExtension(exportFormat);
    let finalFilename = filename;
    if (!finalFilename.toLowerCase().endsWith('.' + ext)) {
      finalFilename += '.' + ext;
    }
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => importMapData(reader.result);
      reader.readAsText(file);
    }
  });


  // Connect import button to hidden file input
  document.getElementById('importJsonBtn')?.addEventListener('click', () => {
    document.getElementById('importInput')?.click();
  });