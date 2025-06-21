/**
 * @file assets/js/interaction/linking.js
 * @description Linking.
 * @module interaction/linking
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

// TODO: Modularize into interaction/linking.js
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
    const fromPos = getRoomCenter(from);
    const toPos = getRoomCenter(to);
    const directionVec = new THREE.Vector3().subVectors(toPos, fromPos);
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
        levelContainers.forEach(container => container.remove(line));
        if (line.geometry?.attributes?.position) {
          animateBreakingLink(line.geometry.attributes.position.array, levelContainers);
        }
      });
      from.userData.exitLinks = from.userData.exitLinks.filter(line => !exitLines.includes(line));
      to.userData.exitLinks   = to.userData.exitLinks.filter(line => !exitLines.includes(line));
      delete from.userData.exits[fromKey];
      delete to.userData.exits[toKey];
      recalculateExits();
      if (typeof drawLinks === 'function') drawLinks();
      if (typeof updateRoomInfo === 'function') updateRoomInfo(from);
      if (selectedRoom?.outlineMesh) {
        levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
        selectedRoom.outlineMesh.geometry.dispose();
        selectedRoom.outlineMesh.material.dispose();
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
      const mid = fromPos.clone().add(step.clone().multiplyScalar(i));
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
    if (!blocked && !(from.userData.exits[fromKey] || to.userData.exits[toKey])) {
      const line = createExitLine(fromPos, toPos, from, to);
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