// --- Unified direction definitions ---
const DIRECTIONS = [
  { key: 'n',  name: 'North',     vector: '0,0,-1', index: 0 },
  { key: 'e',  name: 'East',      vector: '1,0,0',  index: 1 },
  { key: 's',  name: 'South',     vector: '0,0,1',  index: 2 },
  { key: 'w',  name: 'West',      vector: '-1,0,0', index: 3 },
  { key: 'u',  name: 'Up',        vector: '0,1,0',  index: 4 },
  { key: 'd',  name: 'Down',      vector: '0,-1,0', index: 5 },
  { key: 'ne', name: 'Northeast', vector: '1,0,-1', index: 6 },
  { key: 'nw', name: 'Northwest', vector: '-1,0,-1', index: 7 },
  { key: 'se', name: 'Southeast', vector: '1,0,1',  index: 8 },
  { key: 'sw', name: 'Southwest', vector: '-1,0,1', index: 9 }
];

const dirKeyToIndex    = {};
const dirKeyToName     = {};
const dirVectorToIndex = {};
const dirIndexToName   = {};
const dirIndexToVector = {};
DIRECTIONS.forEach(d => {
  dirKeyToIndex[d.key]       = d.index;
  dirKeyToName[d.key]        = d.name;
  dirVectorToIndex[d.vector] = d.index;
  dirIndexToName[d.index]    = d.name;
  dirIndexToVector[d.index]  = d.vector;
});

function getDirectionName(dir) {
  if (dirVectorToIndex[dir] !== undefined) return dirIndexToName[dirVectorToIndex[dir]];
  if (dirKeyToIndex[dir]    !== undefined) return dirKeyToName[dir];
  const idx = parseInt(dir);
  if (!isNaN(idx) && dirIndexToName[idx]) return dirIndexToName[idx];
  return dir;
}

// --- Global utility to update room info in UI ---
if (typeof window.updateRoomInfo !== "function") {
  window.updateRoomInfo = function updateRoomInfo(room) {
    if (!room || !room.id) return;
    const coordField = document.getElementById('roomVnumCoords');
    if (coordField) {
      coordField.value = `(${room.x.toFixed(1)}, ${room.z.toFixed(1)}, ${room.level})`;
    }

    const exitsList = document.getElementById('roomExitsList');
    if (exitsList) {
      exitsList.innerHTML = '';

      if (room.exits) {
        for (const [dirKey, targetId] of Object.entries(room.exits)) {
          const li = document.createElement('li');
          const label = getDirectionName(dirKey);
          li.textContent = `${label} → Room ${targetId}`;
          exitsList.appendChild(li);
        }
      }
    }
  }
}
import * as THREE from 'https://esm.sh/three@0.157.0';
import { OrbitControls } from 'https://esm.sh/three@0.157.0/examples/jsm/controls/OrbitControls.js';

window.addEventListener('load', () => {
  // --- Direction constants ---
  const toggleBtn = document.getElementById('toggleAreaInfoBtn');
  const areaInfoContainer = document.getElementById('areaInfoContainer');

  if (toggleBtn && areaInfoContainer) {
    toggleBtn.addEventListener('click', () => {
      areaInfoContainer.classList.toggle('hidden');
      toggleBtn.textContent = areaInfoContainer.classList.contains('hidden') ? '+' : '-';
      // --- Dynamic height logic for #area-info ---
      const areaInfo = document.getElementById('area-info');
      if (areaInfo) {
        areaInfo.classList.remove('expanded-area', 'expanded-room', 'collapsed');
        if (areaInfoContainer.classList.contains('hidden')) {
          areaInfo.classList.add('collapsed');
        } else {
          const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
          if (activeTab === 'roomTab') {
            areaInfo.classList.add('expanded-room');
          } else {
            areaInfo.classList.add('expanded-area');
          }
        }
      }
    });
  }
  // --- Tab switching logic ---
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.tab;

      const areaInfoContainer = document.getElementById('areaInfoContainer');
      const areaInfo = document.getElementById('area-info');
      const isAlreadyActive = button.classList.contains('active');
      const isHidden = areaInfoContainer.classList.contains('hidden');

      // Toggle collapse if already active and visible
      if (isAlreadyActive && !isHidden) {
        areaInfoContainer.classList.add('hidden');
        areaInfo?.classList.remove('expanded-area', 'expanded-room');
        areaInfo?.classList.add('collapsed');
        return;
      }

      // Activate the tab and show areaInfoContainer
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(targetId)?.classList.add('active');

      areaInfoContainer.classList.remove('hidden');
      areaInfo?.classList.remove('collapsed', 'expanded-area', 'expanded-room');
      areaInfo?.classList.add(targetId === 'roomTab' ? 'expanded-room' : 'expanded-area');
    });
  });
  let formatsData = {};
  let formats = {};

  // Fetch formats.json after window load
 fetch('./formats.json?nocache=' + Date.now())
    .then(response => response.json())
    .then(data => {
      formatsData = data;
      formats = formatsData.formats;
    });

  // scene, camera, renderer setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  const MAX_LEVELS = 41;
  const LEVEL_OFFSET = 20; // so level 0 is index 20
  let currentLevel = 0;
  const levelContainers = Array.from({ length: MAX_LEVELS }, () => new THREE.Group());
  levelContainers.forEach(g => scene.add(g));

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(5, 7, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // --- Compass label logic ---
  // Compass label meshes (Text Meshes or Sprites for N/S/E/W)
  let compassLabels = null;

  function createCompassLabels() {
    // Helper to create a text mesh for a label
    function makeTextMesh(text) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 128;
      canvas.height = 64;
      context.fillStyle = text === 'N' ? 'red' : text === 'S' ? 'green' : 'white';
      context.font = 'bold 28px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2, 1, 1);
      return sprite;
    }
    // Create meshes for each direction
    return {
      north: makeTextMesh('N'),
      south: makeTextMesh('S'),
      east: makeTextMesh('E'),
      west: makeTextMesh('W')
    };
  }

  function updateCompassLabels(grid) {
    if (!grid?.geometry?.parameters) return;

    if (!compassLabels) {
      compassLabels = createCompassLabels();
    } else {
      for (const key of Object.keys(compassLabels)) {
        levelContainers[LEVEL_OFFSET].remove(compassLabels[key]);
      }
    }

    const { width, height } = grid.geometry.parameters;

    compassLabels.north.position.set(0, 0.1, -height / 2);
    compassLabels.south.position.set(0, 0.1, height / 2);
    compassLabels.east.position.set(width / 2, 0.1, 0);
    compassLabels.west.position.set(-width / 2, 0.1, 0);

    for (const key of Object.keys(compassLabels)) {
      levelContainers[LEVEL_OFFSET].add(compassLabels[key]);
    }
  }

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  // grid
  let grid;
  let gridSize = { width: 20, height: 20 };
  const gridSelect = document.getElementById('gridSelect');
  function buildCustomGrid(rows, cols, spacing = 1) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.3 });

    for (let i = 0; i <= rows; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, i * spacing),
        new THREE.Vector3(cols * spacing, 0, i * spacing)
      ]);
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }

    for (let j = 0; j <= cols; j++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(j * spacing, 0, 0),
        new THREE.Vector3(j * spacing, 0, rows * spacing)
      ]);
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }

    return group;
  }

  function updateGrid(width, height) {
    if (grid) {
      levelContainers.forEach(g => g.remove(grid));
    }

    const spacing = 1;
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.3 });

    for (let i = 0; i <= height; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, i * spacing),
        new THREE.Vector3(width * spacing, 0, i * spacing)
      ]);
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }

    for (let j = 0; j <= width; j++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(j * spacing, 0, 0),
        new THREE.Vector3(j * spacing, 0, height * spacing)
      ]);
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }

    group.position.set(-width / 2, 0, -height / 2);

    // Add dummy geometry.parameters so compass can access dimensions
    group.geometry = { parameters: { width, height } };

    grid = group;
    levelContainers[currentLevel + LEVEL_OFFSET].add(grid);
    updateCompassLabels(grid);
  }

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const light = new THREE.DirectionalLight(0xffffff, 0.7);
  light.position.set(5, 10, 7);
  scene.add(light);

  // interaction
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  window.rooms = Array.from({ length: MAX_LEVELS }, () => []);
  let rooms = window.rooms;

  let selectedFace = null;
  let selectedRoom = null;
  let selectedRoomColor = '#8888ff';
  let isDragging = false;
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
        selectedRoom.material.color.set(selectedRoomColor);
        selectedRoom.userData.color = selectedRoomColor;
      }
    });
  });
  // Auto-select the first color button on page load
  const firstColorButton = document.querySelector('.room-color-option');
  if (firstColorButton) {
    firstColorButton.classList.add('selected');
    selectedRoomColor = firstColorButton.dataset.color;
  }

  let minVnum = 100;
  let maxVnum = 199;
  const usedVnums = new Set();
  let lastAssignedVnum = minVnum - 1;

  // Set initial values in the inputs on load
  const vnumMinInput = document.getElementById('vnumMin');
  const vnumMaxInput = document.getElementById('vnumMax');

  if (vnumMinInput && vnumMaxInput) {
    vnumMinInput.value = minVnum;
    vnumMaxInput.value = maxVnum;

    // Listen for user changes
    vnumMinInput.addEventListener('input', () => {
      minVnum = parseInt(vnumMinInput.value) || 0;
      lastAssignedVnum = minVnum - 1;
      usedVnums.clear();
      rooms.forEach(level => level.forEach(r => usedVnums.add(r.userData.id)));
    });

    vnumMaxInput.addEventListener('input', () => {
      maxVnum = parseInt(vnumMaxInput.value) || 9999;
    });
  }

  function getNextVnum() {
    for (let v = minVnum; v <= maxVnum; v++) {
      if (!usedVnums.has(v)) {
        usedVnums.add(v);
        if (v > lastAssignedVnum) lastAssignedVnum = v;
        return v;
      }
    }
    return null;
  }

  function freeVnum(vnum) {
    usedVnums.delete(vnum);
    if (vnum < lastAssignedVnum) {
      // allow future use, but not reassign immediately
    } else if (vnum === lastAssignedVnum) {
      // update lastAssignedVnum if we deleted the last one
      while (!usedVnums.has(lastAssignedVnum) && lastAssignedVnum >= minVnum) {
        lastAssignedVnum--;
      }
    }
  }

  function getRoomCenter(mesh) {
    const levelIndex = rooms.findIndex(r => r.includes(mesh));
    const offsetY = (levelIndex - LEVEL_OFFSET) * 2;
    const pos = mesh.position.clone();
    pos.y += offsetY;
    return pos;
  }

  function createExitLine(from, to, fromRoom, toRoom) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    const line = new THREE.Line(geometry, material);
    line.userData = { fromRoom, toRoom };
    levelContainers[LEVEL_OFFSET].add(line);
    return line;
  }

  function onPointerDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (event.button === 0) {
      const current = currentLevel + LEVEL_OFFSET;

      // --- Shift+Left click on room: remove room only if nothing is currently selected for linking ---
      if (event.shiftKey && !selectedFace) {
        const intersects = raycaster.intersectObjects(rooms[current]);
        if (intersects.length > 0) {
          const intersect = intersects[0];
          // Only remove room if no room is currently selected (for linking)
          if (!selectedRoom && intersect && intersect.object?.userData?.id !== undefined) {
            const room = intersect.object;
            const index = rooms[current].indexOf(room);
            if (index !== -1 && room.parent === levelContainers[current]) {
              // Remove exits pointing to or from this room
              room.userData.exitLinks.forEach(line => {
                levelContainers.forEach(container => container.remove(line));
              });
              rooms.forEach(level => {
                level.forEach(other => {
                  if (other !== room) {
                    const exits = other.userData.exits || {};
                    for (let key in exits) {
                      if (exits[key].room === room) {
                        delete exits[key];
                      }
                    }
                  }
                });
              });
              // Remove selection outline if the deleted room is currently selected
              if (selectedRoom === room) {
                if (selectedRoom.outlineMesh) {
                  levelContainers[currentLevel + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
                  selectedRoom.outlineMesh.geometry.dispose();
                  selectedRoom.outlineMesh.material.dispose();
                  delete selectedRoom.outlineMesh;
                }
                selectedRoom = null;
              }
              freeVnum(room.userData.id);
              levelContainers[current].remove(room);
              rooms[current].splice(index, 1);
              return; // stop further handling
            }
          }
        }
      }

      // --- Existing intersect logic for left-click ---
      // Only allow selection/toggling for rooms on currentLevel, currentLevel+1, currentLevel-1
      const candidates = [
        ...rooms[current],
        ...(rooms[current + 1] || []),
        ...(rooms[current - 1] || [])
      ];
      const intersects = raycaster.intersectObjects(candidates);
      if (intersects.length > 0) {
        const intersect = intersects[0];
        const room = intersect.object;
        const roomLevel = room.userData.level;
        const levelDiff = Math.abs(roomLevel - currentLevel);
        if (levelDiff > 1) {
          // Do not allow selection/toggle beyond ±1 level
          return;
        }
        if (!event.shiftKey) {
          // Restore previous logic: clicking toggles highlight (select/deselect) for rooms on current, +1, -1 level
          if (!selectedRoom || selectedRoom !== room) {
            // Remove previous outline mesh if any
            if (selectedRoom?.outlineMesh) {
              // Remove from its own level container
              levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
              selectedRoom.outlineMesh.geometry.dispose();
              selectedRoom.outlineMesh.material.dispose();
              delete selectedRoom.outlineMesh;
            }
            selectedRoom = room;
            selectedFace = { object: room, point: getRoomCenter(room) };
            // Populate the VNUM and other fields when a room is selected
            if (selectedRoom) {
              const vnumField = document.getElementById('roomVnum');
              const vnumCoordsSpan = document.getElementById('roomVnumCoords');
              const nameField = document.getElementById('roomName');
              const descField = document.getElementById('roomDesc');
              if (vnumField) vnumField.value = selectedRoom.userData.id ?? '';
              if (nameField) nameField.value = selectedRoom.userData.name ?? '';
              if (descField) descField.value = selectedRoom.userData.desc ?? '';
              if (vnumCoordsSpan) {
                const x = selectedRoom.position?.x ?? '?';
                const z = selectedRoom.position?.z ?? '?';
                const level = selectedRoom.userData?.level ?? '?';
                vnumCoordsSpan.textContent = `(${x}, ${z}, ${level})`;
              }

              // --- Update exits list UI (human-readable direction names) ---
              const exitsList = document.getElementById("roomExitsList");
              if (exitsList) {
                exitsList.innerHTML = "";
                let room = selectedRoom;
                let exits = room.exits || (room.userData && room.userData.exits);
                if (exits) {
                  for (const [dir, targetId] of Object.entries(exits)) {
                    let displayTarget = targetId;
                    // If value is an object, try to extract id
                    if (typeof targetId === "object" && targetId !== null) {
                      if (typeof targetId === "object" && "room" in targetId && targetId.room && typeof targetId.room.userData?.id !== "undefined") {
                        displayTarget = targetId.room.userData.id;
                      } else if ("id" in targetId) {
                        displayTarget = targetId.id;
                      }
                    }
                    const direction = getDirectionName(dir);
                    const li = document.createElement("li");
                    li.textContent = `${direction} to ${displayTarget}`;
                    exitsList.appendChild(li);
                  }
                }
              }
            }
            // Create new outline mesh
            const outlineMaterial = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              side: THREE.BackSide
            });
            const outlineMesh = new THREE.Mesh(selectedRoom.geometry.clone(), outlineMaterial);
            outlineMesh.scale.multiplyScalar(1.05);
            outlineMesh.position.copy(selectedRoom.position);
            levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].add(outlineMesh);
            // Store reference to cleanup later
            selectedRoom.outlineMesh = outlineMesh;
            isDragging = true;
          } else {
            // Deselect: remove outline mesh
            if (selectedRoom?.outlineMesh) {
              levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
              selectedRoom.outlineMesh.geometry.dispose();
              selectedRoom.outlineMesh.material.dispose();
              delete selectedRoom.outlineMesh;
            }
            selectedFace = null;
            selectedRoom = null;
          }
        } else if (selectedFace) {
          // Shift+click: link or unlink rooms
          const from = selectedFace.object;
          const to = intersect.object;
          const fromPos = getRoomCenter(from);
          const toPos = getRoomCenter(to);
          const directionVec = new THREE.Vector3().subVectors(toPos, fromPos);
          const normalized = directionVec.clone().normalize();
          const step = new THREE.Vector3(Math.round(normalized.x), Math.round(normalized.y), Math.round(normalized.z));

          // Allow linking in all 10 directions (including diagonals)
          const allowedSteps = [
            [0, 0, -1], // n
            [1, 0, 0],  // e
            [0, 0, 1],  // s
            [-1, 0, 0], // w
            [0, 1, 0],  // u
            [0, -1, 0], // d
            [1, 0, -1], // ne
            [-1, 0, -1], // nw
            [1, 0, 1], // se
            [-1, 0, 1] // sw
          ];
          const valid = allowedSteps.some(([x, y, z]) =>
            step.x === x && step.y === y && step.z === z
          );
          if (!valid) {
            if (selectedRoom?.outlineMesh) {
              levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
              selectedRoom.outlineMesh.geometry.dispose();
              selectedRoom.outlineMesh.material.dispose();
              delete selectedRoom.outlineMesh;
            }
            selectedFace = null;
            selectedRoom = null;
            return;
          }

          // --- Compute direction (0=N, 1=E, 2=S, 3=W, 4=Up, 5=Down) ---
          let direction = null;
          if (step.z === -1 && step.x === 0 && step.y === 0) direction = 0; // North (negative z)
          else if (step.x === 1 && step.y === 0 && step.z === 0) direction = 1; // East (positive x)
          else if (step.z === 1 && step.x === 0 && step.y === 0) direction = 2; // South (positive z)
          else if (step.x === -1 && step.y === 0 && step.z === 0) direction = 3; // West (negative x)
          else if (step.y === 1 && step.x === 0 && step.z === 0) direction = 4; // Up (positive y)
          else if (step.y === -1 && step.x === 0 && step.z === 0) direction = 5; // Down (negative y)

          // Check if link exists both ways
          const fromKey = step.toArray().toString();
          const toKey = step.clone().negate().toArray().toString();
          if (from.userData.exits[fromKey] && to.userData.exits[toKey]) {
            // Remove the existing link
            const exitLine = from.userData.exitLinks.find(line => {
              const pos = line.geometry.attributes.position.array;
              return (
                (Math.abs(pos[0] - fromPos.x) < 0.1 && Math.abs(pos[2] - fromPos.z) < 0.1 &&
                 Math.abs(pos[3] - toPos.x) < 0.1 && Math.abs(pos[5] - toPos.z) < 0.1) ||
                (Math.abs(pos[0] - toPos.x) < 0.1 && Math.abs(pos[2] - toPos.z) < 0.1 &&
                 Math.abs(pos[3] - fromPos.x) < 0.1 && Math.abs(pos[5] - fromPos.z) < 0.1)
              );
            });
            if (exitLine) {
              levelContainers.forEach(container => container.remove(exitLine));
              from.userData.exitLinks = from.userData.exitLinks.filter(l => l !== exitLine);
              to.userData.exitLinks = to.userData.exitLinks.filter(l => l !== exitLine);
            }
            delete from.userData.exits[fromKey];
            delete to.userData.exits[toKey];
            selectedFace = null;
            // --- Clear highlight and selectedRoom after link/unlink ---
            // Ensure both the selectedRoom reference and its highlight are cleared
            if (selectedRoom?.outlineMesh) {
              levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
              selectedRoom.outlineMesh.geometry.dispose();
              selectedRoom.outlineMesh.material.dispose();
              delete selectedRoom.outlineMesh;
            }
            if (selectedRoom) {
              const mat = selectedRoom.material;
              if (mat && 'emissive' in mat) {
                mat.emissive.setHex(0x000000);
              }
              selectedRoom = null;
            }
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

          // Only create link if not blocked and not already linked
          if (!blocked && !(from.userData.exits[fromKey] || to.userData.exits[toKey])) {
            const line = createExitLine(fromPos, toPos, from, to);
            // --- Store direction on the link object ---
            if (direction !== null) {
              line.userData.direction = direction;
            }
            from.userData.exitLinks.push(line);
            to.userData.exitLinks.push(line);
            from.userData.exits[fromKey] = { room: to, direction };
            // --- Proper reverse direction logic for 6 directions ---
            let reverseDirection = null;
            switch (direction) {
              case 0: reverseDirection = 2; break; // North → South
              case 1: reverseDirection = 3; break; // East → West
              case 2: reverseDirection = 0; break; // South → North
              case 3: reverseDirection = 1; break; // West → East
              case 4: reverseDirection = 5; break; // Up → Down
              case 5: reverseDirection = 4; break; // Down → Up
            }
            to.userData.exits[toKey] = { room: from, direction: reverseDirection };
            // Draw links (if any additional logic is needed, e.g., updating visuals)
            // (If drawLinks() is a function, it would be called here. If not, ignore this comment.)

            // --- Add separate logic to store exits directionally for export consistency ---
            // Only after visual link, maintain exits on both rooms as offset->id
            // (This does not interfere with userData.exits used for visuals)
            // --- Safely calculate and assign exits only if coordinates are valid ---
            const dx = room.x - selectedRoom.x;
            const dy = (room.level || 0) - (selectedRoom.level || 0);
            const dz = room.z - selectedRoom.z;

            if (!isNaN(dx) && !isNaN(dy) && !isNaN(dz)) {
              const offsetKey = `${dx},${dy},${dz}`;
              const reverseOffsetKey = `${-dx},${-dy},${-dz}`;

              if (!selectedRoom.exits) selectedRoom.exits = {};
              if (!room.exits) room.exits = {};

              selectedRoom.exits[offsetKey] = room.id;
              room.exits[reverseOffsetKey] = selectedRoom.id;
            }
          }
          selectedFace = null;
          // --- Clear highlight and selectedRoom after link creation ---
          // Ensure both the selectedRoom reference and its highlight are cleared
          // (Consistent with standard left-click toggle logic)
          if (selectedRoom?.outlineMesh) {
            levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
            selectedRoom.outlineMesh.geometry.dispose();
            selectedRoom.outlineMesh.material.dispose();
            delete selectedRoom.outlineMesh;
          }
          if (selectedRoom) {
            selectedRoom.material.emissive.setHex(0x000000);
            selectedRoom = null;
          }
        }
        return;
      }
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, point)) {
      const x = Math.floor(point.x) + 0.5, z = Math.floor(point.z) + 0.5;

      if (event.button === 0 && event.shiftKey) {
        // Only allow add/delete room if no room is currently selected
        // Also, only allow if no room is currently selected (selectedFace === null)
        if (!selectedFace) {
          const levelIndex = currentLevel + LEVEL_OFFSET;
          // Check if a room already exists at this exact location and level (on current level only)
          const existingIndex = rooms[levelIndex].findIndex(room =>
            Math.abs(room.position.x - x) < 0.5 &&
            Math.abs(room.position.z - z) < 0.5 &&
            Math.abs(levelContainers[levelIndex].position.y + 0.5 - room.position.y) < 0.1
          );

          if (existingIndex !== -1) {
            // Remove room and its links
            const room = rooms[levelIndex][existingIndex];
            room.userData.exitLinks.forEach(line => {
              levelContainers.forEach(container => container.remove(line));
            });
            // Clean up exits from other rooms pointing to this one
            rooms.forEach(level => {
              level.forEach(other => {
                if (other !== room) {
                  const exits = other.userData.exits || {};
                  for (let key in exits) {
                    if (exits[key].room === room) {
                      delete exits[key];
                    }
                  }
                }
              });
            });
            // Remove selection outline if the deleted room is currently selected
            if (selectedRoom === room) {
              if (selectedRoom.outlineMesh) {
                levelContainers[currentLevel + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
                selectedRoom.outlineMesh.geometry.dispose();
                selectedRoom.outlineMesh.material.dispose();
                delete selectedRoom.outlineMesh;
              }
              selectedRoom = null;
            }
            freeVnum(room.userData.id);
            levelContainers[levelIndex].remove(room);
            rooms[levelIndex].splice(existingIndex, 1);
          } else {
            // Add new room
            const vnum = getNextVnum();
            if (vnum === null) {
              alert("No available vnums in range " + minVnum + "-" + maxVnum);
              return;
            }
            // Ensure color is set from current selection or fallback
            const color = selectedRoomColor || '#cccccc';
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(1, 1, 1),
              new THREE.MeshStandardMaterial({ color, emissive: 0x000000 })
            );
            box.position.set(x, 0.5, z);
            // Explicitly set material color and userData.color
            box.material.color.set(color);
            box.userData = {
              id: vnum,
              exits: {},
              exitLinks: [],
              color: color,
              level: currentLevel
            };
            levelContainers[levelIndex].add(box);
            rooms[levelIndex].push(box);
          }
        }
      }
    }
  }

  window.addEventListener('pointerdown', onPointerDown);

  // --- Utility: get direction string between two rooms, for recalc ---
  // Updated for correct direction vectors and a 135° compass rotation
  function getDirectionBetween(from, to) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const angle = (Math.atan2(dz, dx) * 180 / Math.PI + 360) % 360;

    if (angle >= 337.5 || angle < 22.5) return 'east';
    if (angle >= 22.5 && angle < 67.5) return 'southeast';
    if (angle >= 67.5 && angle < 112.5) return 'south';
    if (angle >= 112.5 && angle < 157.5) return 'southwest';
    if (angle >= 157.5 && angle < 202.5) return 'west';
    if (angle >= 202.5 && angle < 247.5) return 'northwest';
    if (angle >= 247.5 && angle < 292.5) return 'north';
    if (angle >= 292.5 && angle < 337.5) return 'northeast';

    return null;
  }

  // --- Utility: get reverse direction string ---
  function getReverseDirection(dir) {
    const opposites = {
      n: "s", s: "n", e: "w", w: "e",
      u: "d", d: "u",
      ne: "sw", sw: "ne", nw: "se", se: "nw"
    };
    return opposites[dir] || dir;
  }

  // --- Recalculate all exits based on room positions, but only for rooms with visual links ---
  function recalculateExits() {
    // Build flat map of all rooms by id and positions
    const allRooms = [];
    for (let level of rooms) {
      for (let r of level) {
        // Ensure .x, .z, .level are present
        r.x = r.position.x;
        r.z = r.position.z;
        r.level = r.userData.level || 0;
        allRooms.push(r);
      }
    }
    // Clear all .exits objects in place
    for (const room of allRooms) {
      room.exits = {};
    }

    for (const roomA of allRooms) {
      for (const roomB of allRooms) {
        if (roomA === roomB) continue;

        // Only assign exits if there is a visual link (exitLine) between roomA and roomB
        const hasLink = roomA.userData.exitLinks?.some(line =>
          (line.userData.fromRoom === roomA && line.userData.toRoom === roomB) ||
          (line.userData.fromRoom === roomB && line.userData.toRoom === roomA)
        );
        if (!hasLink) continue;

        const dir = getDirectionBetween(roomA, roomB);
        if (dir && !(dir in roomA.exits)) {
          // Use userData?.id if possible, fallback to .id
          roomA.exits[dir] = parseInt(roomB.userData?.id ?? roomB.id, 10);
        }
      }
    }
  }

  window.addEventListener('pointermove', (event) => {
    // Only disable OrbitControls rotation while dragging and a node is selected
    controls.enableRotate = !(isDragging && selectedRoom);
    if (!isDragging || !selectedRoom) return;
    const gridLockElem = document.getElementById('gridLock');
    const gridLockChecked = gridLockElem?.checked;
    if (gridLockChecked) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, point)) {
      const newX = Math.floor(point.x) + 0.5;
      const newZ = Math.floor(point.z) + 0.5;
      selectedRoom.position.x = newX;
      selectedRoom.position.z = newZ;
      // --- Sync numeric properties for recalculateExits() ---
      selectedRoom.x = selectedRoom.position.x;
      selectedRoom.z = selectedRoom.position.z;
      selectedRoom.level = selectedRoom.userData.level || 0;
      // Sync outline mesh position if present
      if (selectedRoom.outlineMesh) {
        selectedRoom.outlineMesh.position.copy(selectedRoom.position);
      }

      // --- Update coords display if the moved room is the selected one ---
      if (selectedRoom) {
        const vnumCoordsSpan = document.getElementById('roomVnumCoords');
        if (vnumCoordsSpan) {
          const x = selectedRoom.position.x.toFixed(1);
          const z = selectedRoom.position.z.toFixed(1);
          const level = selectedRoom.userData?.level ?? '?';
          vnumCoordsSpan.textContent = `(${x}, ${z}, ${level})`;
        }
      }

      // Update any exit lines connected to this room
      if (selectedRoom.userData?.exitLinks) {
        selectedRoom.userData.exitLinks.forEach(line => {
          const pos = line.geometry.attributes.position.array;
          const from = line.userData.fromRoom;
          const to = line.userData.toRoom;
          const fromPos = getRoomCenter(from);
          const toPos = getRoomCenter(to);
          pos[0] = fromPos.x;
          pos[1] = fromPos.y;
          pos[2] = fromPos.z;
          pos[3] = toPos.x;
          pos[4] = toPos.y;
          pos[5] = toPos.z;
          line.geometry.attributes.position.needsUpdate = true;
        });
      }
      // --- Recalculate all exits based on room positions ---
      if (!gridLockChecked) {
        recalculateExits();
        if (selectedRoom) updateRoomInfo(selectedRoom);
        // Draw links after recalculation and UI update
        if (typeof drawLinks === 'function') {
          drawLinks();
        }
      }
    }
  });

  // --- Update a room's position and recalculate exits after the update ---
  // Usage: updateRoomPosition(room, x, z, y = 0)
  function updateRoomPosition(room, x, z, y = 0) {
    // Update the room's internal position object first
    room.position.x = x;
    room.position.z = z;
    room.position.y = y;

    // Update the mesh position
    room.mesh?.position?.set
      ? room.mesh.position.set(x, y, z)
      : room.position.set(x, y, z);

    // Update label position if present
    if (room.label) {
      room.label.position.set(x, y + 0.4, z);
    }

    // Update internal data values (if present)
    if (typeof roomData !== "undefined" && roomData[room.id]) {
      roomData[room.id].x = x;
      roomData[room.id].z = z;
      roomData[room.id].level = y;
    }

    // Now recalculate exits after updating position values
    recalculateExits();
    // Update UI to reflect changes
    if (typeof updateRoomInfo === "function") updateRoomInfo(room);
  }

  window.addEventListener('pointerup', () => {
    isDragging = false;
    // Re-enable OrbitControls rotation after dragging
    controls.enableRotate = true;
    recalculateExits();
    if (typeof drawLinks === 'function') {
      drawLinks();
    }
    if (selectedRoom) {
      updateRoomInfo(selectedRoom);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'PageUp' && currentLevel < 20) {
      switchLevel(currentLevel + 1);
    } else if (e.code === 'PageDown' && currentLevel > -20) {
      switchLevel(currentLevel - 1);
    }
  });

  function switchLevel(newLevel) {
    // Clear selected room and remove any highlight outline
    if (selectedRoom) {
      if (selectedRoom.outlineMesh) {
        levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
        selectedRoom.outlineMesh.geometry.dispose();
        selectedRoom.outlineMesh.material.dispose();
        delete selectedRoom.outlineMesh;
      }
      selectedRoom = null;
    }
    // Clear any highlighted room from all levels
    for (const level of rooms) {
      for (const room of level) {
        if (room.material?.emissive) {
          room.material.emissive.setHex(0x000000);
        }
      }
    }

    currentLevel = newLevel;
    levelContainers.forEach((g, i) => {
      const levelIndex = i - LEVEL_OFFSET;
      const distance = Math.abs(levelIndex - currentLevel);
      if (distance <= 20) {
        g.visible = true;
        g.position.y = (levelIndex - currentLevel) * 2;
        g.traverse(obj => {
          if (obj.type === 'Line') return;
          if (obj.material && obj.material instanceof THREE.Material) {
            if (!obj.material.transparent) {
              obj.material.transparent = true;
            }
            // Always restore room color from userData.color, not from current color picker
            if (obj.material.color && obj.material.color instanceof THREE.Color) {
              // Use room.userData.color if present, else fallback to '#cccccc'
              const targetColor = obj.userData?.color || '#cccccc';
              obj.material.color.set(targetColor);
              // Optionally fade color toward 0x8888ff for distant levels (keep fade logic)
              const fadeFactor = Math.min(1.0, distance * 0.2);
              if (fadeFactor > 0.0) {
                obj.material.color.lerp(new THREE.Color(0x8888ff), fadeFactor);
              }
            }
          }
        });
      } else {
        g.visible = false;
      }
    });
    // Move grid to current level container and update its size
    let rows = 20, cols = 20;
    if (gridSelect?.value) {
      const [w, h] = gridSelect.options[gridSelect.selectedIndex].textContent.split('x').map(s => parseInt(s.trim()));
      rows = w;
      cols = h;
    }
    if (grid) {
      levelContainers.forEach(g => g.remove(grid));
      levelContainers[currentLevel + LEVEL_OFFSET].add(grid);
    }
    updateGrid(rows, cols);
    if (grid) {
      updateCompassLabels(grid);
      for (const key of Object.keys(compassLabels)) {
        levelContainers.forEach(g => g.remove(compassLabels[key]));
        levelContainers[currentLevel + LEVEL_OFFSET].add(compassLabels[key]);
      }
    }
    if (levelSelector) levelSelector.value = currentLevel;
  }

  // resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // animate
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    // No need to call updateCompassLabels(grid) every frame; it's called in updateGrid().
    renderer.render(scene, camera);
  }
  animate();

  document.getElementById('upButton')?.addEventListener('click', () => {
    if (currentLevel < 20) switchLevel(currentLevel + 1);
  });

  document.getElementById('downButton')?.addEventListener('click', () => {
    if (currentLevel > -20) switchLevel(currentLevel - 1);
  });

  const levelSelector = document.getElementById('levelSelector');
  if (levelSelector) {
    const levels = [
      ...Array.from({ length: 20 }, (_, i) => 20 - i),
      0,
      ...Array.from({ length: 20 }, (_, i) => -(i + 1))
    ];
    for (let i of levels) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Level ${i > 0 ? '+' + i : i}`;
      if (i === 0) option.selected = true;
      levelSelector.appendChild(option);
    }
  }

  document.getElementById('levelSelector')?.addEventListener('change', (e) => {
    switchLevel(parseInt(e.target.value));
  });


  // --- Direction vectors for use in export/import ---

  document.getElementById('exportFormatBtn')?.addEventListener('click', () => {
    const exportFormat = document.getElementById('exportFormat')?.value || 'JSON';
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
                exits[readableDir] = {
                  to: data.room.userData.id,
                  link: dir
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
      const blob = new Blob([JSON.stringify(roomsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'map.json';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const formatName = exportFormat;
    const format = formats[formatName];
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

    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.are') ? filename : `${filename}.are`;
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

  function exportMapData() {
    const areaName = document.getElementById('areaName')?.value.trim();
    const filename = document.getElementById('filename')?.value.trim();

    if (!areaName || !filename) {
      alert('Please provide both Area Name and Filename before exporting.');
      return;
    }

    const formatName = document.getElementById('exportFormat')?.value || 'ROM';
    const format = formats[formatName];
    if (!format) {
      alert(`Unknown format: ${formatName}`);
      return;
    }

    let output = '';
    rooms.forEach((level, levelIndex) => {
      level.forEach(room => {
        // Substitute default name/desc for empty values
        const name = room.userData.name?.trim() ? room.userData.name.trim() : `Room ${room.userData.id}`;
        const desc = room.userData.desc?.trim() ? room.userData.desc.trim() : `${room.userData.id}`;
        const roomStr = format.room
          .replace('%ROOM_VNUM%', room.userData.id)
          .replace('%ROOM_NAME%', name)
          .replace('%ROOM_DESC%', desc)
          .replace('%FLAGS%', '0') // Placeholder
          .replace('%SECTOR%', '0') // Placeholder
          .replace('%ZONE%', '0') // Placeholder
          .replace('%EXTRA_FLAGS%', '0'); // Placeholder

        let exits = '';
        // Remove vector-based key output for ROM-style export
        Object.entries(room.userData.exits || {}).forEach(([dir, data]) => {
          if (!data.room || typeof data.room.userData.id === 'undefined') return;
          // Map direction to ROM index, including diagonals (normalize to lowercase)
          let exitDir = dir;
          if (!dirKeyToIndex.hasOwnProperty(exitDir.toLowerCase())) {
            exitDir = getDirectionBetweenRooms(room, data.room);
          }
          const dirIndex = dirKeyToIndex[exitDir.toLowerCase()];
          if (dirIndex === undefined) {
            // Optionally log a warning:
            // console.warn(`Skipping exit with invalid direction: ${exitDir}`);
            return; // Skip invalid direction
          }
          exits += `D${dirIndex}\n~\n~\n0 ${data.room.userData.id} 0\n`;
        });

        output += roomStr.replace('%EXITS%', exits);
      });
    });
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rooms.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importMapData(json) {
    // Clear current scene and rooms
    rooms.forEach((level, i) => {
      level.forEach(room => levelContainers[i].remove(room));
      rooms[i] = [];
    });
    // Remove existing link lines
    levelContainers[LEVEL_OFFSET].children
      .filter(obj => obj.type === 'Line')
      .forEach(line => levelContainers[LEVEL_OFFSET].remove(line));

    const data = JSON.parse(json);
    const idToRoom = new Map();

    // First pass: recreate all rooms
    data.forEach(entry => {
      const levelIndex = entry.level + LEVEL_OFFSET;
      const color = entry.color || '#cccccc';
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color, emissive: 0x000000 })
      );
      box.position.set(entry.x, 0.5, entry.z);
      box.userData = {
        id: entry.id,
        exits: {},
        color,
        level: entry.level
      };
      levelContainers[levelIndex].add(box);
      rooms[levelIndex].push(box);
      idToRoom.set(entry.id, box);
    });

    // Second pass: link exits based on JSON export shape
    data.forEach(entry => {
      const fromRoom = idToRoom.get(entry.id);
      if (!fromRoom) return;
      for (const { to, link } of Object.values(entry.exits || {})) {
        const toRoom = idToRoom.get(to);
        if (!toRoom) continue;
        const fromPos = getRoomCenter(fromRoom);
        const toPos = getRoomCenter(toRoom);
        const line = createExitLine(fromPos, toPos, fromRoom, toRoom);
        line.userData.direction = link;
        fromRoom.userData.exitLinks = fromRoom.userData.exitLinks || [];
        fromRoom.userData.exitLinks.push(line);
        toRoom.userData.exitLinks = toRoom.userData.exitLinks || [];
        toRoom.userData.exitLinks.push(line);
        // store exits in both directions
        fromRoom.userData.exits[link] = { room: toRoom, direction: link };
        const rev = link.split(',').map(n => -parseInt(n)).join(',');
        toRoom.userData.exits[rev] = { room: fromRoom, direction: rev };
      }
    });

    // Refresh visuals and UI
    recalculateExits();
    if (typeof drawLinks === 'function') drawLinks();
    switchLevel(currentLevel);
  }

  // Initialize visibility
  switchLevel(currentLevel);

  // --- Improved direction utility: strict axis-aligned and diagonal direction calculation ---
  function getDirectionBetweenRooms(from, to) {
    // Accepts either mesh or plain object with x, z, level/position.y
    const getX = (room) => room.x !== undefined ? room.x : (room.position?.x ?? 0);
    const getZ = (room) => room.z !== undefined ? room.z : (room.position?.z ?? 0);
    const getLevel = (room) =>
      room.level !== undefined ? room.level
        : (room.position?.y !== undefined
            ? (typeof room.userData?.level === 'number' ? room.userData.level : room.position.y)
            : (room.userData?.level ?? 0));
    const dx = Math.round(getX(to) - getX(from));
    const dz = Math.round(getZ(to) - getZ(from));
    const dy = Math.round(getLevel(to) - getLevel(from));

    if (dx === 0 && dz === -1 && dy === 0) return 'n';
    if (dx === 1 && dz === 0 && dy === 0) return 'e';
    if (dx === 0 && dz === 1 && dy === 0) return 's';
    if (dx === -1 && dz === 0 && dy === 0) return 'w';
    if (dx === 0 && dz === 0 && dy === 1) return 'u';
    if (dx === 0 && dz === 0 && dy === -1) return 'd';

    // Diagonal directions (fallback if not strictly cardinal)
    if (dx === 1 && dz === -1 && dy === 0) return 'ne';
    if (dx === -1 && dz === -1 && dy === 0) return 'nw';
    if (dx === 1 && dz === 1 && dy === 0) return 'se';
    if (dx === -1 && dz === 1 && dy === 0) return 'sw';

    // Fallback for unknown direction
    return '?';
  }

  // --- Grid selector logic ---
  function populateGridDropdown() {
    const options = [
      { label: '20 x 20', width: 20, height: 20 },
      { label: '10 x 30', width: 10, height: 30 },
      { label: '30 x 10', width: 30, height: 10 },
      { label: '5 x 40', width: 5, height: 40 },
      { label: '40 x 5', width: 40, height: 5 },
      { label: '50 x 50', width: 50, height: 50 },
      { label: '15 x 25', width: 15, height: 25 },
      { label: '25 x 15', width: 25, height: 15 },
      { label: '12 x 35', width: 12, height: 35 },
      { label: '35 x 12', width: 35, height: 12 },
    ];
    gridSelect.innerHTML = '';
    options.forEach((opt, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = opt.label;
      gridSelect.appendChild(option);
    });
    gridSize = { width: options[0].width, height: options[0].height };
    gridSelect.selectedIndex = 0;
    updateGrid(gridSize.width, gridSize.height);
  }

  // Grid dropdown logic (moved here to ensure DOM is ready and layout is stable)
  if (gridSelect) {
    populateGridDropdown();
    gridSelect.addEventListener('change', () => {
      const selected = gridSelect.selectedIndex;
      const option = gridSelect.options[selected];
      const [w, h] = option.textContent.split('x').map(s => parseInt(s.trim()));
      gridSize = { width: w, height: h };
      updateGrid(w, h);
    });
  }

  // Connect import button to hidden file input
  document.getElementById('importJsonBtn')?.addEventListener('click', () => {
    document.getElementById('importInput')?.click();
  });

  document.getElementById('roomName')?.addEventListener('input', (e) => {
    if (selectedRoom) selectedRoom.userData.name = e.target.value;
  });
  document.getElementById('roomDesc')?.addEventListener('input', (e) => {
    if (selectedRoom) selectedRoom.userData.desc = e.target.value;
  });

  document.getElementById('roomVnum')?.addEventListener('blur', (e) => {
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

    freeVnum(selectedRoom.userData.id);
    selectedRoom.userData.id = newVnum;
    usedVnums.add(newVnum);
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
});