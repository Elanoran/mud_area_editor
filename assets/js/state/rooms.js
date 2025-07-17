/**
 * @file assets/js/state/rooms.js
 * @description Maintains room data structures, vnum allocation, and room list state.
 * @module state/rooms
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { usedVnums, setLastAssignedVnum, getLastAssignedVnum, availableVnums } from '../core/state.js';
import { minVnum, maxVnum } from '../core/settings.js';
import { getRoomCenter } from '../utils/geometry.js';
import { THREE } from '../vendor/three.js';
import { getExitPoint } from '../interaction/linking.js';

export function getNextVnum() {
    for (let v = minVnum; v <= maxVnum; v++) {
      if (!usedVnums.has(v)) {
        usedVnums.add(v);
        availableVnums.delete(v);
        if (v > getLastAssignedVnum()) setLastAssignedVnum(v);
        return v;
      }
    }
    return null;
  }

 export function freeVnum(vnum) {
    usedVnums.delete(vnum);
    if (vnum >= minVnum && vnum <= maxVnum) availableVnums.add(vnum);
    if (vnum < getLastAssignedVnum()) {
      // allow future use, but not reassign immediately
    } else if (vnum === getLastAssignedVnum()) {
      // update lastAssignedVnum if we deleted the last one
      while (!usedVnums.has(getLastAssignedVnum()) && getLastAssignedVnum() >= minVnum) {
        setLastAssignedVnum(getLastAssignedVnum() - 1);
      }
    }
  }

  // TODO: Move updateRoomPosition to scene/rooms.js
 export function updateRoomPosition(room, x, z, y) {
    // Preserve existing Y if no Y value specified during drag
    const newY = (typeof y !== 'undefined') ? y : room.position.y;
    // Update the room's internal position object first
    room.position.x = x;
    room.position.z = z;
    room.position.y = newY;
    // Update the mesh position
    room.mesh?.position?.set
      ? room.mesh.position.set(x, newY, z)
      : room.position.set(x, newY, z);
    // Update label position if present
    if (room.label) {
      room.label.position.set(x, newY + 0.4, z);
    }
    // Update outline mesh position if present
    if (room.outlineMesh) {
      room.outlineMesh.position.set(x, newY, z);
    }
    // Move connected exit lines with the room
    if (room.userData.exitLinks) {
      room.userData.exitLinks.forEach(line => {
        // Handle exit indicator spheres
        if (line.userData.isExitIndicator) {
          const exitPoint = getExitPoint(line.userData.room, line.userData.directionVec, THREE);
          line.position.copy(exitPoint);
          return;
        }
        // Handle link lines
        if (line.geometry?.attributes?.position?.array) {
          const pos = line.geometry.attributes.position.array;
          // Compute world positions so links stay fixed in world-space
          const worldFrom = new THREE.Vector3();
          const worldTo   = new THREE.Vector3();
          line.userData.fromRoom.getWorldPosition(worldFrom);
          line.userData.toRoom.getWorldPosition(worldTo);
          pos[0] = worldFrom.x;
          pos[1] = worldFrom.y;
          pos[2] = worldFrom.z;
          pos[3] = worldTo.x;
          pos[4] = worldTo.y;
          pos[5] = worldTo.z;
          line.geometry.attributes.position.needsUpdate = true;
        }
      });
    }
    // Update internal data values (if present)
    if (typeof roomData !== "undefined" && roomData[room.id]) {
      roomData[room.id].x = x;
      roomData[room.id].z = z;
      roomData[room.id].level = newY;
    }
    // Now recalculate exits after updating position values
    recalculateExits();
    // Update UI to reflect changes
    if (typeof updateRoomInfo === "function") updateRoomInfo(room);
  }

// TODO: Modularize into interaction/roomCreation.js
export function handleRoomCreationPointerDown(event, context) {
  const {
    raycaster,
    selectedFace,
    currentLevel,
    LEVEL_OFFSET,
    rooms,
    levelContainers,
    getNextVnum,
    selectedRoomColor,
    createRoomMesh,
    animateRoomPopIn,
    updateFloorToLowestLevel,
    gridSize,
    pushHistory,
    THREE,
  } = context;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, point)) {
    const x = Math.floor(point.x) + 0.5, z = Math.floor(point.z) + 0.5;
    if (event.button === 0 && event.shiftKey) {
      if (!selectedFace) {
        const levelIndex = currentLevel + LEVEL_OFFSET;
        const existingIndex = rooms[levelIndex].findIndex(room =>
          Math.abs(room.position.x - x) < 0.5 &&
          Math.abs(room.position.z - z) < 0.5 &&
          Math.abs(levelContainers[levelIndex].position.y + 0.5 - room.position.y) < 0.1
        );
        if (existingIndex !== -1) {
          return;
        } else {
          if (availableVnums.size === 0) {
            alert(`No available vnums in range ${minVnum}-${maxVnum}`);
            return;
          }
          const vnum = getNextVnum();
          if (vnum === null) {
            alert(`No available vnums in range ${minVnum}-${maxVnum}`);
            return;
          }
          const color = selectedRoomColor || '#cccccc';
          const box = createRoomMesh({
            color,
            level: currentLevel,
            id: vnum
          });
          box.position.set(x, 0.5, z);
          levelContainers[levelIndex].add(box);
          rooms[levelIndex].push(box);
          animateRoomPopIn(box);
          updateFloorToLowestLevel(gridSize.width, gridSize.height);
          pushHistory();
        }
      }
    }
  }
}