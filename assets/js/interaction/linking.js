/**
 * @file assets/js/interaction/linking.js
 * @description Linking.
 * @module interaction/linking
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { getScene } from '../core/scene.js';

// TODO: Modularize into interaction/linking.js
/**
 * Compute the point on the surface of a room's bounding box
 * in the direction of the given vector.
 */
export function getExitPoint(room, directionVec, THREE) {
  const box = new THREE.Box3().setFromObject(room);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const dir = directionVec.clone().normalize();
  // Prevent division by zero
  const dx = Math.abs(dir.x) > 1e-6 ? size.x / 2 / Math.abs(dir.x) : Infinity;
  const dy = Math.abs(dir.y) > 1e-6 ? size.y / 2 / Math.abs(dir.y) : Infinity;
  const dz = Math.abs(dir.z) > 1e-6 ? size.z / 2 / Math.abs(dir.z) : Infinity;
  // Use smallest scale to hit the box face
  const k = Math.min(dx, dy, dz);
  return center.clone().add(dir.multiplyScalar(k));
}

export function handleLinkPointerDown(event, context) {
  const {
    raycaster,
    rooms,
    currentLevel,
    LEVEL_OFFSET,
    selectedRoom,
    selectedFace,
    setSelectedRoom,
    setSelectedFace,
    updateRoomInfo,
    THREE,
    levelContainers,
    getRoomCenter,
    getDirectionVectorKey,
    createExitLine,
    animateBreakingLink,
    setRoomEmissive,
    pushHistory,
    recalculateExits,
    drawLinks,
  } = context;
  const current = currentLevel + LEVEL_OFFSET;
  const candidates = [
    ...rooms[current],
    ...(rooms[current + 1] || []),
    ...(rooms[current - 1] || [])
  ];
  const intersects = raycaster.intersectObjects(candidates);
  if (intersects.length > 0) {
    const intersect = intersects[0];
    const from = selectedFace.object;
    const to = intersect.object;
    const centerFrom = getRoomCenter(from);
    const centerTo   = getRoomCenter(to);
    const directionVec = new THREE.Vector3().subVectors(centerTo, centerFrom);
    const normalized = directionVec.clone().normalize();
    const step = new THREE.Vector3(Math.round(normalized.x), Math.round(normalized.y), Math.round(normalized.z));
    // Accept any straight or diagonal (or up/down) line regardless of distance
    let valid = false;
    if (step.y === 0) {
      if (
        (step.x !== 0 && step.z === 0) ||
        (step.x === 0 && step.z !== 0) ||
        (Math.abs(step.x) === Math.abs(step.z) && step.x !== 0)
      ) {
        valid = true;
      }
    } else if (step.x === 0 && step.z === 0 && step.y !== 0) {
      valid = true;
    }
    if (!valid) {
      if (selectedRoom?.outlineMesh) {
        levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
        selectedRoom.outlineMesh.geometry.dispose();
        selectedRoom.outlineMesh.material.dispose();
        delete selectedRoom.outlineMesh;
      }
      setSelectedFace(null);
      setSelectedRoom(null);
      return;
    }
    // --- Compute direction (0=N, 1=E, 2=S, 3=W, 4=Up, 5=Down) ---
    let direction = null;
    if (step.z === -1 && step.x === 0 && step.y === 0) direction = 0;
    else if (step.x === 1 && step.y === 0 && step.z === 0) direction = 1;
    else if (step.z === 1 && step.x === 0 && step.y === 0) direction = 2;
    else if (step.x === -1 && step.y === 0 && step.z === 0) direction = 3;
    else if (step.y === 1 && step.x === 0 && step.z === 0) direction = 4;
    else if (step.y === -1 && step.x === 0 && step.z === 0) direction = 5;
    const fromKey = getDirectionVectorKey(from, to);
    const toKey = getDirectionVectorKey(to, from);
    const exitLines = from.userData.exitLinks.filter(line =>
      (line.userData.fromRoom === from && line.userData.toRoom === to) ||
      (line.userData.fromRoom === to   && line.userData.toRoom === from)
    );
    if (exitLines.length > 0) {
      exitLines.forEach(line => {
        // 1) Detach from all level containers
        levelContainers.forEach(container => container.remove(line));
        // 2) Remove from scene root
        getScene().remove(line);
        // 3) Dispose geometry
        if (line.geometry) {
          line.geometry.dispose();
        }
        // 4) Dispose materials (handle arrays)
        const mats = Array.isArray(line.material) ? line.material : [line.material];
        mats.forEach(mat => {
          if (mat && typeof mat.dispose === 'function') mat.dispose();
        });
        // 5) Remove any exit indicator spheres (if created)
        if (line.userData.isExitIndicator && line.userData.indicatorMesh) {
          const indicator = line.userData.indicatorMesh;
          levelContainers.forEach(container => container.remove(indicator));
          getScene().remove(indicator);
          if (indicator.geometry) indicator.geometry.dispose();
          if (indicator.material && typeof indicator.material.dispose === 'function') {
            indicator.material.dispose();
          }
        }
      });
      // 6) Clean up all room references and exit mappings
      rooms.flat().forEach(room => {
        room.userData.exitLinks = (room.userData.exitLinks || []).filter(l => !exitLines.includes(l));
        // Remove matching exits entries
        for (const dir in room.userData.exits) {
          const link = room.userData.exits[dir];
          if (link && exitLines.includes(link.lineObject)) {
            delete room.userData.exits[dir];
          }
        }
      });
      // 7) Recalculate and redraw
      recalculateExits();
      if (typeof drawLinks === 'function') drawLinks();
      if (typeof updateRoomInfo === 'function') updateRoomInfo(from);
      // 8) Clear selection outline
      if (selectedRoom?.outlineMesh) {
        const ol = selectedRoom.outlineMesh;
        levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(ol);
        if (ol.geometry) ol.geometry.dispose();
        if (Array.isArray(ol.material)) {
          ol.material.forEach(m => m.dispose && m.dispose());
        } else if (ol.material && ol.material.dispose) {
          ol.material.dispose();
        }
        delete selectedRoom.outlineMesh;
      }
      setRoomEmissive(selectedRoom?.material, 0x000000);
      setSelectedFace(null);
      setSelectedRoom(null);
      pushHistory();
      return;
    }
    // Check if any room exists between start and end (block "skipping")
    let blocked = false;
    const dist = directionVec.length();
    for (let i = 1; i < Math.floor(dist); i++) {
      const mid = centerFrom.clone().add(step.clone().multiplyScalar(i));
      const levelRooms = rooms[currentLevel + LEVEL_OFFSET];
      if (levelRooms.some(room =>
        Math.abs(room.position.x - mid.x) <= 0.5 &&
        Math.abs(room.position.z - mid.z) <= 0.5 &&
        Math.abs(room.position.y - mid.y) <= 0.5
      )) {
        blocked = true;
        break;
      }
    }
    // Compute dynamic exit points on each room's face
    const fromPoint = getExitPoint(from, directionVec, THREE);
    const toPoint   = getExitPoint(to, directionVec.clone().negate(), THREE);
    if (!blocked && !(from.userData.exits[fromKey] || to.userData.exits[toKey])) {
      const line = createExitLine(fromPoint, toPoint, from, to);
      // Ensure the link is parented to the root scene so it doesn’t follow level transforms
      const scene = getScene();
      // Remove from any temporary parent
      if (line.parent && line.parent !== scene) {
        line.parent.remove(line);
      }
      scene.add(line);
      if (direction !== null) {
        line.userData.direction = direction;
      }
      from.userData.exitLinks.push(line);
      to.userData.exitLinks.push(line);
      from.userData.exits[fromKey] = { room: to, direction };
      let reverseDirection = null;
      switch (direction) {
        case 0: reverseDirection = 2; break;
        case 1: reverseDirection = 3; break;
        case 2: reverseDirection = 0; break;
        case 3: reverseDirection = 1; break;
        case 4: reverseDirection = 5; break;
        case 5: reverseDirection = 4; break;
      }
      to.userData.exits[toKey] = { room: from, direction: reverseDirection };
      recalculateExits();
      if (typeof drawLinks === 'function') drawLinks();
      if (typeof updateRoomInfo === 'function') updateRoomInfo(from);
      pushHistory();
    }
    setSelectedFace(null);
    if (selectedRoom && selectedRoom.outlineMesh) {
      levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
      selectedRoom.outlineMesh.geometry.dispose();
      selectedRoom.outlineMesh.material.dispose();
      delete selectedRoom.outlineMesh;
    }
    setRoomEmissive(selectedRoom?.material, 0x000000);
    setSelectedRoom(null);
  }
}