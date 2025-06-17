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

// --- Funny random names for areaName and filename, paired by index ---
const funnyNames = [
  { area: "The Dank Cavern",     file: "dankness"   },
  { area: "Bacon Village",      file: "bacon"      },
  { area: "Meme Plains",        file: "memezone"   },
  { area: "Secret Cow Level",   file: "cows"       },
  { area: "Damp Catacombs",     file: "secretz"    }
];

window.addEventListener('load', () => {
  window.sunAnimationActive = false;

  // Set random funny names if both areaName and filename are empty on load, paired by index
  const areaNameInput = document.getElementById('areaName');
  const filenameInput = document.getElementById('filename');
  if (areaNameInput && filenameInput && !areaNameInput.value.trim() && !filenameInput.value.trim()) {
    const idx = Math.floor(Math.random() * funnyNames.length);
    areaNameInput.value = funnyNames[idx].area;
    filenameInput.value = funnyNames[idx].file;
  }
  // --- Direction constants ---
  const toggleBtn = document.getElementById('toggleAreaInfoBtn');

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
  
  // --- Tab switching with dynamic height ---
  // New tab logic for #tool-info .tab-header and #areaInfoContainer structure
  const tabButtons = document.querySelectorAll('.tab-button');
  const areaInfoContainer = document.getElementById('areaInfoContainer');
  const tabContents = areaInfoContainer ? areaInfoContainer.querySelectorAll('.tab-content') : [];

  function showTab(tabId) {
    tabContents.forEach(tab => {
      tab.classList.toggle('active', tab.id === tabId);
    });
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    // Set container height to active tab height (with smooth transition)
    const activeTab = areaInfoContainer.querySelector('.tab-content.active');
    if (activeTab) {
      areaInfoContainer.style.height = activeTab.scrollHeight + 'px';
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      showTab(btn.dataset.tab);
    });
  });

  // On load, ensure correct height
  window.addEventListener('DOMContentLoaded', () => {
    // Find the initially active tab button, or default to 'areaTab'
    const active = areaInfoContainer.querySelector('.tab-button.active');
    showTab(active ? active.dataset.tab : 'areaTab');
  });

  // Optional: reset height on window resize
  window.addEventListener('resize', () => {
    const activeTab = areaInfoContainer.querySelector('.tab-content.active');
    if (activeTab) {
      areaInfoContainer.style.height = activeTab.scrollHeight + 'px';
    }
  });
  let formatsData = {};
  let formats = {};
  // Track active puffs globally
  let activePuffs = [];

  // Fetch formats.json after window load
  fetch('./formats.json?nocache=' + Date.now())
    .then(response => response.json())
    .then(data => {
      formatsData = data;
      formats = formatsData.formats;

      // --- Dynamically populate export format dropdown ---
      const exportFormatSelect = document.getElementById('exportFormat');
      if (exportFormatSelect) {
        exportFormatSelect.innerHTML = ''; // Clear any hardcoded options
        for (const key of Object.keys(formats)) {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = formats[key].label || key;
          exportFormatSelect.appendChild(opt);
        }
      }

      const filenameExtSpan = document.getElementById('filenameExt');
      const filenameInput = document.getElementById('filename');

      // Helper: get extension from loaded formats or fallback map
      function getFormatExtension(formatName) {
        if (formats && formats[formatName] && formats[formatName].fileExtension) {
          return formats[formatName].fileExtension.replace(/^\./, '');
        }
        // Fallbacks:
        if (formatName === 'JSON') return 'json';
        if (formatName === 'ROM' || formatName === 'AW') return 'are';
        return 'txt';
      }

      // Update extension UI and auto-fix filename extension if needed
      function updateFilenameExtUI() {
        const fmt = exportFormatSelect.value;
        const ext = getFormatExtension(fmt);
        if (filenameExtSpan) filenameExtSpan.textContent = '.' + ext;
      }

      // Listen for export format changes
      if (exportFormatSelect) {
        exportFormatSelect.addEventListener('change', () => {
          updateFilenameExtUI();
        });
      }

      // On initial load after populating dropdown
      updateFilenameExtUI();
    });

  // --- Track floor meshes per level ---
  let floorMeshes = {};

  let groundFloorVisible = false;

  let groundFloorColor = 0x484444;

  let gridVisible = true;

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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
      context.clearRect(0, 0, canvas.width, canvas.height); // ensure fully transparent

      context.font = 'bold 28px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = getCompassColor(text);
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,   // always draw above floor
        depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2, 1, 1);
      sprite.renderOrder = 999; // always on top!
      return sprite;
    }
    function getCompassColor(text) {
      if (text === 'N') {
        return getComputedStyle(document.documentElement).getPropertyValue('--compass-north-color').trim() || 'red';
      } else if (text === 'S') {
        return getComputedStyle(document.documentElement).getPropertyValue('--compass-south-color').trim() || 'green';
      } else {
        return getComputedStyle(document.documentElement).getPropertyValue('--compass-default-color').trim() || 'white';
      }
    }
    // Create meshes for each direction
    return {
      north: makeTextMesh('N'),
      south: makeTextMesh('S'),
      east:  makeTextMesh('E'),
      west:  makeTextMesh('W')
    };
  }

  // --- Utility: create a floating label (sprite) for a room ---
  function makeRoomLabel(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 64;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 24px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff';
    context.shadowColor = 'black';
    context.shadowBlur = 4;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 0.6, 1);
    sprite.renderOrder = 9999;
    return sprite;
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

    const COMPASS_Y = 0.51; // Just above the floor and rooms
    compassLabels.north.position.set(0, COMPASS_Y, -height / 2);
    compassLabels.south.position.set(0, COMPASS_Y, height / 2);
    compassLabels.east.position.set(width / 2, COMPASS_Y, 0);
    compassLabels.west.position.set(-width / 2, COMPASS_Y, 0);

    for (const key of Object.keys(compassLabels)) {
      levelContainers[LEVEL_OFFSET].add(compassLabels[key]);
    }
  }

  // controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();
  // Grid lock toggle using lock button
  let gridLocked = true;
  const lockBtn = document.getElementById('fitViewBtn');
  // Initialize button icon and tooltip
  // Initialize button icon and tooltip
  lockBtn.innerHTML = gridLocked
    ? '<i class="fa-solid fa-lock"></i>'
    : '<i class="fa-solid fa-lock-open"></i>';
  lockBtn.title = gridLocked ? 'Lock' : 'Unlock';
  lockBtn.classList.toggle('active', gridLocked);
  lockBtn.classList.toggle('locked',   gridLocked);
  lockBtn.classList.toggle('unlocked', !gridLocked);
  lockBtn.addEventListener('click', () => {
    gridLocked = !gridLocked;
    lockBtn.classList.toggle('active', gridLocked);
    // Update icon and tooltip after toggle
    lockBtn.innerHTML = gridLocked
      ? '<i class="fa-solid fa-lock"></i>'
      : '<i class="fa-solid fa-lock-open"></i>';
    lockBtn.title = gridLocked ? 'Lock' : 'Unlock';
    lockBtn.classList.toggle('locked',   gridLocked);
    lockBtn.classList.toggle('unlocked', !gridLocked);
  });

  // Delete Room button
  const deleteBtn = document.getElementById('deleteRoomBtn');
  deleteBtn.addEventListener('click', () => {
    if (!selectedRoom) {
      alert('No room selected to delete.');
      return;
    }
    if (!confirm('Are you sure you want to delete this room?')) return;
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
    selectedRoom = null;
    // Animate falling and explosion
    animateRoomFallAndExplode(room, levelContainers[levelIndex]);
    // Update visuals
    recalculateExits();
    if (typeof drawLinks === 'function') drawLinks();
    updateRoomInfo(null);
    pushHistory();
  });

  // --- Animate room falling and explosion effect ---
  function animateRoomFallAndExplode(roomMesh, levelContainer) {
    levelContainer.remove(roomMesh);
    scene.add(roomMesh);

    // Start at current y
    let startY = roomMesh.position.y;
    let targetY = startY - 1; // Always fall one full unit
    let velocity = 0;
    let gravity = -0.020; // lower = slower fall
    let frame = 0;
    let maxFrames = 240;

    function fallFrame() {
      velocity += gravity;
      if (velocity < -0.20) velocity = -0.20; // limit max fall speed
      roomMesh.position.y += velocity;
      frame++;
      if (roomMesh.position.y <= targetY || frame >= maxFrames) {
        roomMesh.position.y = targetY;
        spawnFireAndSmoke(roomMesh.position.clone(), scene);
        setTimeout(() => {
          scene.remove(roomMesh);
          roomMesh.geometry.dispose();
          roomMesh.material.dispose();
        }, 700);
        return;
      }
      requestAnimationFrame(fallFrame);
    }
    fallFrame();
  }

  // Clean Scene button
  const cleanBtn = document.getElementById('cleanSceneBtn');
  cleanBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to clear the scene? This will remove all rooms and exits.')) return;
    // Clear history after scene clean
    undoStack = [];
    redoStack = [];
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
    minVnum = 100;
    maxVnum = 199;
    usedVnums.clear();
    lastAssignedVnum = minVnum - 1;
    const vnumMinInput = document.getElementById('vnumMin');
    const vnumMaxInput = document.getElementById('vnumMax');
    if (vnumMinInput && vnumMaxInput) {
      vnumMinInput.value = minVnum;
      vnumMaxInput.value = maxVnum;
    }
    selectedRoom = null;
    updateRoomInfo(null);
    recalculateExits();
    if (typeof drawLinks === 'function') drawLinks();
    // --- Reset area name and filename to new random funny names ---
    if (areaNameInput && filenameInput) {
      const idx = Math.floor(Math.random() * funnyNames.length);
      areaNameInput.value = funnyNames[idx].area;
      filenameInput.value = funnyNames[idx].file;
    }
    // Push a new baseline history state after cleaning the scene
    pushHistory();
  });

  // --- Undo/Redo history (max 10 states) ---
  let undoStack = [];
  let redoStack = [];
  const MAX_HISTORY = 10;

  function captureState() {
    // Serialize rooms and exits
    const data = rooms.flat().map(room => ({
      id: room.userData.id,
      x: room.position.x,
      z: room.position.z,
      level: room.userData.level,
      color: room.userData.color,
      exits: Object.entries(room.userData.exits || {}).map(([dir, d]) => ({ dir, to: d.room.userData.id }))
    }));
    return JSON.stringify(data);
  }

  function restoreState(stateStr) {
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
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({ color: entry.color, emissive: 0x000000 })
      );
      mesh.position.set(entry.x, 0.5, entry.z);
      mesh.userData = { id: entry.id, exits: {}, exitLinks: [], color: entry.color, level: entry.level };
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
        const line = createExitLine(fromPos, toPos, from, toRoom);
        from.userData.exitLinks.push(line);
        toRoom.userData.exitLinks.push(line);
        from.userData.exits[dir] = { room: toRoom };
      });
    });
    selectedRoom = null;
    selectedFace = null;
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

  function pushHistory() {
    undoStack.push(captureState());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateUndoRedoUI();
  }

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
    // Remove any previous grid
    if (grid) {
      levelContainers.forEach(g => g.remove(grid));
    }

    // Remove ALL previous floor meshes from ALL levels, not just the current
    for (let key in floorMeshes) {
      if (floorMeshes[key]) {
        levelContainers[key].remove(floorMeshes[key]);
        floorMeshes[key].geometry.dispose();
        floorMeshes[key].material.dispose();
        delete floorMeshes[key];
      }
    }

    // Create new floor mesh for the current level only
    const floorGeometry = new THREE.PlaneGeometry(width, height);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: groundFloorColor });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    floorMesh.visible = groundFloorVisible;
    levelContainers[currentLevel + LEVEL_OFFSET].add(floorMesh);
    floorMeshes[currentLevel + LEVEL_OFFSET] = floorMesh;

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
    updateFloorToLowestLevel(width, height);
  }

  // --- Floor follows lowest room level ---
  function updateFloorToLowestLevel(width, height) {
    // Remove any existing floor meshes
    for (let key in floorMeshes) {
      if (floorMeshes[key]) {
        levelContainers[key].remove(floorMeshes[key]);
        floorMeshes[key].geometry.dispose();
        floorMeshes[key].material.dispose();
        delete floorMeshes[key];
      }
    }
    // Find lowest level with rooms
    let lowestIdx = null;
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].length > 0) {
        lowestIdx = i;
        break;
      }
    }
    if (lowestIdx === null) return; // no rooms anywhere

    // Create and add new floor mesh at the lowest room level
    const floorGeometry = new THREE.PlaneGeometry(width, height);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: groundFloorColor });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    floorMesh.visible = groundFloorVisible; // <-- Add this line!
    levelContainers[lowestIdx].add(floorMesh);
    floorMeshes[lowestIdx] = floorMesh;
  }

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const light = new THREE.DirectionalLight(0xffffff, 0.7);
  light.position.set(5, 10, 7);
  scene.add(light);
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.left = -50;
  light.shadow.camera.right = 50;
  light.shadow.camera.top = 50;
  light.shadow.camera.bottom = -50;
  light.shadow.camera.near = 1;
  light.shadow.camera.far = 100;

  // interaction
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  window.rooms = Array.from({ length: MAX_LEVELS }, () => []);
  let rooms = window.rooms;

  let selectedFace = null;
  let selectedRoom = null;
  let selectedRoomColor = '#8888ff';
  let isDragging = false;
  // --- Hover label state ---
  let hoverLabel = null;
  let hoverRoom = null;
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

  // For move-drag: track original position for history
  let dragStartPos = null;
  function onPointerDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    // Defensive: If selectedRoom is gone but selectedFace remains, clear selection and abort
    if (!selectedRoom && selectedFace) {
      selectedFace = null;
      // Defensive: do not proceed with link logic if selection is gone
      return;
    }
    raycaster.setFromCamera(mouse, camera);

    if (event.button === 0) {
      const current = currentLevel + LEVEL_OFFSET;

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
            // Store original position for history
            dragStartPos = {
              x: selectedRoom.position.x,
              z: selectedRoom.position.z
            };
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
          if (selectedRoom && selectedRoom.outlineMesh) {
            levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
            selectedRoom.outlineMesh.geometry.dispose();
            selectedRoom.outlineMesh.material.dispose();
            delete selectedRoom.outlineMesh;
          }
          if (selectedRoom && selectedRoom.material && 'emissive' in selectedRoom.material) {
            selectedRoom.material.emissive.setHex(0x000000);
          }
          selectedRoom = null;
            // --- Push history after removing a link ---
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
            // --- Push history after creating a link ---
            pushHistory();
          }
          selectedFace = null;
          // --- Clear highlight and selectedRoom after link creation ---
          // Ensure both the selectedRoom reference and its highlight are cleared
          if (selectedRoom && selectedRoom.outlineMesh) {
            levelContainers[selectedRoom.userData.level + LEVEL_OFFSET].remove(selectedRoom.outlineMesh);
            selectedRoom.outlineMesh.geometry.dispose();
            selectedRoom.outlineMesh.material.dispose();
            delete selectedRoom.outlineMesh;
          }
          if (selectedRoom && selectedRoom.material && 'emissive' in selectedRoom.material) {
            selectedRoom.material.emissive.setHex(0x000000);
          }
          selectedRoom = null;
        }
        return;
      }
    }

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, point)) {
      const x = Math.floor(point.x) + 0.5, z = Math.floor(point.z) + 0.5;

      if (event.button === 0 && event.shiftKey) {
        // Only allow add room if no room is currently selected
        if (!selectedFace) {
          const levelIndex = currentLevel + LEVEL_OFFSET;
          // Check if a room already exists at this exact location and level (on current level only)
          const existingIndex = rooms[levelIndex].findIndex(room =>
            Math.abs(room.position.x - x) < 0.5 &&
            Math.abs(room.position.z - z) < 0.5 &&
            Math.abs(levelContainers[levelIndex].position.y + 0.5 - room.position.y) < 0.1
          );

          if (existingIndex !== -1) {
            // Do nothing if a room already exists at this position
            return;
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
            box.castShadow = true;
            box.receiveShadow = true;
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
            // Animate new room pop-in (creation only, not import/restore)
            animateRoomPopIn(box);
            updateFloorToLowestLevel(gridSize.width, gridSize.height);
            pushHistory();
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


  // --- Room hover label logic ---
    // Remove any previous pointermove hover label logic and deduplicate
  // --- Room hover label logic (deduplicated, robust) ---
  renderer.domElement.addEventListener('pointermove', function (event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Only show label for rooms on currentLevel, currentLevel+1, currentLevel-1
    const levelRange = [currentLevel + LEVEL_OFFSET, currentLevel + 1 + LEVEL_OFFSET, currentLevel - 1 + LEVEL_OFFSET];
    const candidates = [];
    for (const idx of levelRange) {
      if (rooms[idx]) candidates.push(...rooms[idx]);
    }
    const intersects = raycaster.intersectObjects(candidates);
    if (intersects.length > 0) {
      const room = intersects[0].object;
      if (hoverRoom !== room) {
        // Remove any previous label
        if (hoverLabel) {
          if (hoverLabel.parent) hoverLabel.parent.remove(hoverLabel);
          hoverLabel.material.map.dispose();
          hoverLabel.material.dispose();
          hoverLabel = null;
        }
        hoverRoom = room;
        const name = room.userData.name || '';
        const vnum = room.userData.id != null ? String(room.userData.id) : '';
        const labelText = `${name ? name + ' ' : ''}(${vnum})`;
        hoverLabel = makeRoomLabel(labelText);
        hoverLabel.position.copy(room.position);
        hoverLabel.position.y += 1.2; // raise label above room
        levelContainers[room.userData.level + LEVEL_OFFSET].add(hoverLabel);
      }
    } else {
      // Pointer is not over any room
      if (hoverLabel) {
        if (hoverLabel.parent) hoverLabel.parent.remove(hoverLabel);
        hoverLabel.material.map.dispose();
        hoverLabel.material.dispose();
        hoverLabel = null;
      }
      hoverRoom = null;
    }
  });

  // Remove label when mouse leaves the canvas
  renderer.domElement.addEventListener('mouseleave', () => {
    if (hoverLabel) {
      if (hoverLabel.parent)
        hoverLabel.parent.remove(hoverLabel);
      hoverLabel.material.map.dispose();
      hoverLabel.material.dispose();
      hoverLabel = null;
    }
    hoverRoom = null;

    // Only disable OrbitControls rotation while dragging and a node is selected
    controls.enableRotate = !(isDragging && selectedRoom);
    if (!isDragging || !selectedRoom) return;
    if (gridLocked) return;
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
      if (!gridLocked)
      {
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
    // Only pushHistory if position changed during drag
    if (selectedRoom && dragStartPos) {
      if (
        selectedRoom.position.x !== dragStartPos.x ||
        selectedRoom.position.z !== dragStartPos.z
      ) {
        // Only after position is changed
        pushHistory();
      }
    }
    dragStartPos = null;
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

    // Animate and clean up smoke puffs
    for (let i = activePuffs.length - 1; i >= 0; i--) {
      const puff = activePuffs[i];
      puff.userData.puffLife += 0.016;
      puff.material.opacity *= 0.93; // fade out
      puff.scale.multiplyScalar(1.05 + 0.01 * Math.random());
      puff.position.y += 0.012 * puff.userData.puffSpeed;
      if (puff.material.opacity < 0.05) {
        scene.remove(puff);
        puff.geometry.dispose();
        puff.material.dispose();
        activePuffs.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }
  animate();


  // --- Level Wheel Selector ---
  const MIN_LEVEL = -20;
  const MAX_LEVEL = 20;

  // Remove the old level selector DOM elements from the page if present
  const oldLevelSel = document.getElementById('levelSelector');
  if (oldLevelSel && oldLevelSel.parentNode) oldLevelSel.parentNode.removeChild(oldLevelSel);
  const upBtn = document.getElementById('upButton');
  if (upBtn && upBtn.parentNode) upBtn.parentNode.removeChild(upBtn);
  const downBtn = document.getElementById('downButton');
  if (downBtn && downBtn.parentNode) downBtn.parentNode.removeChild(downBtn);

  // Create wheel container (if not already present in HTML)
  let wheelContainer = document.getElementById('levelWheelContainer');
  if (!wheelContainer) {
    wheelContainer = document.createElement('div');
    wheelContainer.id = 'levelWheelContainer';
    wheelContainer.className = 'level-wheel-container';
    // Insert next to sidebar or at suitable parent (modify if specific layout needed)
    const sidebar = document.querySelector('.sidebar') || document.body;
    sidebar.parentNode.insertBefore(wheelContainer, sidebar.nextSibling);
  }
  wheelContainer.innerHTML = `
    <button id="levelWheelUp" class="wheel-arrow">&#9650;</button>
    <div id="levelWheel" class="level-wheel"></div>
    <button id="levelWheelDown" class="wheel-arrow">&#9660;</button>
  `;


  // Render and handle the wheel
  function renderLevelWheel() {
    const wheel = document.getElementById('levelWheel');
    if (!wheel) return;
    wheel.innerHTML = '';
    // Render from highest (top, positive) to lowest (bottom, negative)
    for (let i = currentLevel + 5; i >= currentLevel - 5; i--) {
      if (i < MIN_LEVEL || i > MAX_LEVEL) continue;
      const el = document.createElement('div');
      el.className = 'level-item';
      if (i === currentLevel) {
        el.classList.add('center');
        el.textContent = i === 0 ? '0' : (i > 0 ? '+' + i : i);
      } else {
        const fade = Math.abs(i - currentLevel);
        el.classList.add('fade' + Math.min(fade, 5));
        el.textContent = i === 0 ? '0' : (i > 0 ? '+' + i : i);
        el.addEventListener('click', () => {
          switchLevel(i);
          renderLevelWheel();
        });
      }
      wheel.appendChild(el);
    }
  }
  document.getElementById('levelWheelUp').onclick = () => {
    if (currentLevel < MAX_LEVEL) {
      switchLevel(currentLevel + 1);
      renderLevelWheel();
    }
  };
  document.getElementById('levelWheelDown').onclick = () => {
    if (currentLevel > MIN_LEVEL) {
      switchLevel(currentLevel - 1);
      renderLevelWheel();
    }
  };
  // On level change, re-render wheel:
  const origSwitchLevel = switchLevel;
  window.switchLevel = function(newLevel) {
    origSwitchLevel(newLevel);
    renderLevelWheel();
  };
  // Or, just call renderLevelWheel() at the end of your existing switchLevel function if preferred.

  renderLevelWheel();

  // --- Enable scrolling with mouse wheel on the level wheel ---
  const levelWheelDiv = document.getElementById('levelWheelContainer');
  if (levelWheelDiv) {
    levelWheelDiv.addEventListener('wheel', (event) => {
      event.preventDefault(); // Prevent page scroll
      const delta = Math.sign(event.deltaY);
      if (delta > 0 && currentLevel > MIN_LEVEL) {
        switchLevel(currentLevel - 1);
        renderLevelWheel();
      } else if (delta < 0 && currentLevel < MAX_LEVEL) {
        switchLevel(currentLevel + 1);
        renderLevelWheel();
      }
    }, { passive: false });
  }


  // --- Direction vectors for use in export/import ---

  document.getElementById('exportFormatBtn')?.addEventListener('click', () => {
    const exportFormat = document.getElementById('exportFormat')?.value || 'JSON';
    // Helper: get extension from loaded formats or fallback map
    function getFormatExtension(formatName) {
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
      const filename = document.getElementById('filename')?.value.trim();
      const ext = getFormatExtension(exportFormat);
      let finalFilename = filename;
      if (!finalFilename.toLowerCase().endsWith('.' + ext)) {
        finalFilename += '.' + ext;
      }
      const blob = new Blob([JSON.stringify(roomsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
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
      // Set shadows for imported rooms
      box.castShadow = true;
      box.receiveShadow = true;
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
    pushHistory();
  }

  // Initialize visibility
  switchLevel(currentLevel);
  // After initial scene and UI setup, capture baseline history state
  pushHistory();
  updateUndoRedoUI();
  // --- Undo/Redo UI updater ---
  function updateUndoRedoUI() {
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
  // Most common square grids
  { label: '10 x 10',   width: 10, height: 10 },
  { label: '15 x 15',   width: 15, height: 15 },
  { label: '20 x 20',   width: 20, height: 20 },
  { label: '30 x 30',   width: 30, height: 30 },
  { label: '40 x 40',   width: 40, height: 40 },
  { label: '50 x 50',   width: 50, height: 50 },
  { label: '60 x 60',   width: 60, height: 60 },
  // Rectangle and specialty grids
  { label: '10 x 30',   width: 10, height: 30 },
  { label: '30 x 10',   width: 30, height: 10 },
  { label: '5 x 40',    width: 5,  height: 40 },
  { label: '40 x 5',    width: 40, height: 5  },
  { label: '12 x 35',   width: 12, height: 35 },
  { label: '35 x 12',   width: 35, height: 12 },
  { label: '15 x 25',   width: 15, height: 25 },
  { label: '25 x 15',   width: 25, height: 15 },
];
    gridSelect.innerHTML = '';
    options.forEach((opt, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = opt.label;
      gridSelect.appendChild(option);
    });
    const defaultLabel = '20 x 20';
    let defaultIndex = options.findIndex(opt => opt.label === defaultLabel);
    if (defaultIndex === -1) defaultIndex = 0; // fallback if not found

    gridSize = { width: options[defaultIndex].width, height: options[defaultIndex].height };
    gridSelect.selectedIndex = defaultIndex;
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
  function updateFloorVisibilityButton() {
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

  // --- Animate sun (directional light) up/down and fade floor in/out ---
  function animateSunAndFloor(show, duration = 1200) {
    if (!light) return;
    if (window.sunAnimationActive) return;
    window.sunAnimationActive = true;
    const startTime = performance.now();

    // Sun positions
    const east = new THREE.Vector3(15, 2, 0);                  // sunrise
    const mid = new THREE.Vector3(7, 12, 7);                   // noon (highest)
    const west = new THREE.Vector3(-15, 2, 0);                 // sunset

    // Floor fade
    let affectedFloors = [];
    for (let key in floorMeshes) {
      if (floorMeshes[key]) affectedFloors.push(floorMeshes[key]);
    }
    affectedFloors.forEach(floor => {
      if (!floor.material.transparent) floor.material.transparent = true;
    });

    // Animate: Show (east→mid), Hide (mid→west)
    const from = show ? east : mid;
    const to   = show ? mid  : west;

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);

      // Animate sun
      light.position.lerpVectors(from, to, t);

      // Animate floor opacity even faster in/out (10% at start/end)
      let opacity = 1;
      if (show) {
        // Fade in extremely fast (first 10%)
        opacity = t < 0.1 ? (t / 0.1) : 1;
      } else {
        // Stay fully visible until last 10%, then fade fast
        opacity = t < 0.9 ? 1 : 1 - ((t - 0.9) / 0.1);
      }
      opacity = Math.max(0, Math.min(1, opacity));

      affectedFloors.forEach(floor => {
        floor.material.opacity = opacity;
        floor.visible = opacity > 0.01;
      });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Snap to final positions and values
        light.position.copy(to);
        affectedFloors.forEach(floor => {
          floor.material.opacity = show ? 1 : 0;
          floor.visible = show;
        });
        window.sunAnimationActive = false;
      }
    }

    requestAnimationFrame(step);
  }

  // Function to show/hide the floor mesh with animation
  function setGroundFloorVisible(visible) {
    // Only run animation if visibility changes
    if (groundFloorVisible === visible) return;
    if (window.sunAnimationActive) return;
    groundFloorVisible = visible;
    // For fade in: make sure all are visible at start
    if (visible) {
      for (let key in floorMeshes) {
        if (floorMeshes[key]) {
          floorMeshes[key].visible = true;
        }
      }
    }
    animateSunAndFloor(visible);
    updateFloorVisibilityButton();
  }

  // Set to hidden on start
  setGroundFloorVisible(false);

  if (floorToggleBtn) {
    floorToggleBtn.addEventListener('click', () => {
      setGroundFloorVisible(!groundFloorVisible);
    });
  }

  const gridToggleBtn = document.getElementById('gridToggleBtn');
  if (gridToggleBtn) {
    gridToggleBtn.addEventListener('click', () => {
      gridVisible = !gridVisible;
      if (grid) {
        grid.visible = gridVisible;
      }
      // Optionally, change icon color or style to reflect state
      gridToggleBtn.classList.toggle('active', gridVisible);
    });
  }

  function spawnSmokePuff(pos, scene, count = 6) {
    // Fire puffs
    for (let i = 0; i < fireCount; i++) {
      const geo = new THREE.SphereGeometry(0.09 + Math.random() * 0.10, 10, 10);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08 + 0.10 * Math.random(), 1, 0.55 + Math.random() * 0.15),
        transparent: true,
        opacity: 0.8,
        emissive: 0xff6600,
        emissiveIntensity: 1.1,
        roughness: 0.5,
        metalness: 0,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.position.x += (Math.random() - 0.5) * 0.20;
      mesh.position.y += 0.38 + Math.random() * 0.16;
      mesh.position.z += (Math.random() - 0.5) * 0.20;
      mesh.userData = { puffLife: 0, puffSpeed: 0.5 + Math.random() * 0.5, isFire: true };

      scene.add(mesh);
      activePuffs.push(mesh);
    }
    // Smoke puffs
    for (let i = activePuffs.length - 1; i >= 0; i--) {
      const puff = activePuffs[i];
      puff.userData.puffLife += 0.016;
      if (puff.userData.isFire) {
        // Fire puffs: fast, fade+shrink+orange
        puff.material.opacity *= 0.84;
        puff.material.emissiveIntensity *= 0.90;
        puff.scale.multiplyScalar(1.09 + 0.01 * Math.random());
        puff.position.y += 0.016 * puff.userData.puffSpeed;
      } else {
        // Smoke puffs: slow, fade+grow+drift
        puff.material.opacity *= 0.93;
        puff.scale.multiplyScalar(1.04 + 0.01 * Math.random());
        puff.position.y += 0.012 * puff.userData.puffSpeed;
      }
      if (puff.material.opacity < 0.05) {
        scene.remove(puff);
        puff.geometry.dispose();
        puff.material.dispose();
        activePuffs.splice(i, 1);
      }
    }
  }

  function spawnFireAndSmoke(pos, scene, fireCount = 6, smokeCount = 6) {
  // Fire puffs
  for (let i = 0; i < fireCount; i++) {
    const geo = new THREE.SphereGeometry(0.09 + Math.random() * 0.10, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08 + 0.10 * Math.random(), 1, 0.55 + Math.random() * 0.15),
      transparent: true,
      opacity: 0.8,
      emissive: 0xff6600,
      emissiveIntensity: 1.1,
      roughness: 0.5,
      metalness: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 0.20;
    mesh.position.y += 0.38 + Math.random() * 0.16;
    mesh.position.z += (Math.random() - 0.5) * 0.20;
    mesh.userData = { puffLife: 0, puffSpeed: 0.5 + Math.random() * 0.5, isFire: true };

    scene.add(mesh);
    activePuffs.push(mesh);
  }
  // Smoke puffs
  for (let i = 0; i < smokeCount; i++) {
    const geo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.45 + Math.random() * 0.25,
      roughness: 1,
      metalness: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 0.25;
    mesh.position.y += 0.44 + Math.random() * 0.23;
    mesh.position.z += (Math.random() - 0.5) * 0.25;
    mesh.userData = { puffLife: 0, puffSpeed: 0.5 + Math.random() * 0.5, isFire: false };

    scene.add(mesh);
    activePuffs.push(mesh);
  }
}
});
  // --- Animate a room "pop-in" effect on creation ---
  function animateRoomPopIn(roomMesh) {
    roomMesh.scale.set(0.1, 0.1, 0.1);
    const targetScale = { x: 1, y: 1, z: 1 };
    let t = 0;
    function popFrame() {
      t += 0.08;
      // Optional: Ease-out and bounce
      const eased = t < 1 ? (1 - Math.pow(1 - t, 3)) : 1;
      let overshoot = 1 + 0.12 * Math.sin(10 * t) * (1 - t); // Small bounce
      roomMesh.scale.set(
        THREE.MathUtils.lerp(0.1, targetScale.x * overshoot, eased),
        THREE.MathUtils.lerp(0.1, targetScale.y * overshoot, eased),
        THREE.MathUtils.lerp(0.1, targetScale.z * overshoot, eased)
      );
      if (t < 1) {
        requestAnimationFrame(popFrame);
      } else {
        roomMesh.scale.set(1, 1, 1);
      }
    }
    popFrame();
  }