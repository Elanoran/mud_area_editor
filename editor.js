import * as THREE from 'https://esm.sh/three@0.157.0';
import { OrbitControls } from 'https://esm.sh/three@0.157.0/examples/jsm/controls/OrbitControls.js';

window.addEventListener('load', () => {
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
  const rooms = Array.from({ length: MAX_LEVELS }, () => []);

  let selectedFace = null;
  let selectedRoom = null;
  let isDragging = false;

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

      // --- Shift+Left click on room: remove room if not selectedFace, and only if on current level ---
      if (event.shiftKey && !selectedFace) {
        const intersects = raycaster.intersectObjects(rooms[current]);
        if (intersects.length > 0) {
          const intersect = intersects[0];
          const room = intersect.object;
          const index = rooms[current].indexOf(room);
          if (index !== -1 && room.parent === levelContainers[current]) {
            // Remove exits pointing to or from this room
            room.userData.exitLines.forEach(line => {
              levelContainers.forEach(container => container.remove(line));
            });
            rooms.forEach(level => {
              level.forEach(other => {
                if (other !== room) {
                  const exits = other.userData.exits || {};
                  for (let key in exits) {
                    if (exits[key] === room) {
                      delete exits[key];
                    }
                  }
                }
              });
            });
            freeVnum(room.userData.id);
            levelContainers[current].remove(room);
            rooms[current].splice(index, 1);
            return; // stop further handling
          }
        }
      }

      // --- Existing intersect logic for left-click ---
      const candidates = [
        ...rooms[current],
        ...(rooms[current + 1] || []),
        ...(rooms[current - 1] || [])
      ];
      const intersects = raycaster.intersectObjects(candidates);
      if (intersects.length > 0) {
        const intersect = intersects[0];

        if (!event.shiftKey) {
          // Normal click selects a room, or deselects if already selected
          if (!selectedFace || selectedFace.object !== intersect.object) {
            if (selectedFace) {
              selectedFace.object.material.emissive = new THREE.Color(0x000000);
            }
            selectedFace = { object: intersect.object, point: getRoomCenter(intersect.object) };
            selectedRoom = intersect.object;
            // Populate the VNUM and other fields when a room is selected
            if (selectedRoom) {
              const vnumField = document.getElementById('roomVnum');
              const nameField = document.getElementById('roomName');
              const descField = document.getElementById('roomDesc');
              if (vnumField) vnumField.value = selectedRoom.userData.id ?? '';
              if (nameField) nameField.value = selectedRoom.userData.name ?? '';
              if (descField) descField.value = selectedRoom.userData.desc ?? '';
            }
            intersect.object.material.emissive = new THREE.Color(0x3333ff);
            isDragging = true;
          } else {
            intersect.object.material.emissive = new THREE.Color(0x000000);
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

          // Only allow cardinal directions (no diagonal)
          if (Math.abs(step.x) + Math.abs(step.y) + Math.abs(step.z) !== 1) {
            from.material.emissive = new THREE.Color(0x000000);
            selectedFace = null;
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
            const exitLine = from.userData.exitLines.find(line => {
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
              from.userData.exitLines = from.userData.exitLines.filter(l => l !== exitLine);
              to.userData.exitLines = to.userData.exitLines.filter(l => l !== exitLine);
            }
            delete from.userData.exits[fromKey];
            delete to.userData.exits[toKey];
            from.material.emissive = new THREE.Color(0x000000);
            selectedFace = null;
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
            from.userData.exitLines.push(line);
            to.userData.exitLines.push(line);
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
          }
          from.material.emissive = new THREE.Color(0x000000);
          selectedFace = null;
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
            room.userData.exitLines.forEach(line => {
              levelContainers.forEach(container => container.remove(line));
            });
            // Clean up exits from other rooms pointing to this one
            rooms.forEach(level => {
              level.forEach(other => {
                if (other !== room) {
                  const exits = other.userData.exits || {};
                  for (let key in exits) {
                    if (exits[key] === room) {
                      delete exits[key];
                    }
                  }
                }
              });
            });
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
            const box = new THREE.Mesh(
              new THREE.BoxGeometry(1, 1, 1),
              new THREE.MeshStandardMaterial({ color: 0x8888ff, emissive: 0x000000 })
            );
            box.position.set(x, 0.5, z);
            box.userData = { id: vnum, exits: {}, exitLines: [] };
            levelContainers[levelIndex].add(box);
            rooms[levelIndex].push(box);
          }
        }
      }
    }
  }

  window.addEventListener('pointerdown', onPointerDown);

  window.addEventListener('pointermove', (event) => {
    // Only disable OrbitControls rotation while dragging and a node is selected
    controls.enableRotate = !(isDragging && selectedRoom);
    if (!isDragging || !selectedRoom) return;
    if (document.getElementById('gridLock')?.checked) return;
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

      // Update any exit lines connected to this room
      if (selectedRoom.userData?.exitLines) {
        selectedRoom.userData.exitLines.forEach(line => {
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
    }
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
    // Re-enable OrbitControls rotation after dragging
    controls.enableRotate = true;
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'PageUp' && currentLevel < 20) {
      switchLevel(currentLevel + 1);
    } else if (e.code === 'PageDown' && currentLevel > -20) {
      switchLevel(currentLevel - 1);
    }
  });

  function switchLevel(newLevel) {
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
            // Color adjustment instead of opacity
            if (obj.material.color && obj.material.color instanceof THREE.Color) {
              const fadeFactor = Math.min(1.0, distance * 0.2);
              const baseColor = obj.material.userData?.baseColor || obj.material.color.clone();
              obj.material.userData = { baseColor };
              obj.material.color.copy(baseColor).lerp(new THREE.Color(0x8888ff), fadeFactor);
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

  document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
    const data = [];
    rooms.forEach((level, levelIndex) => {
      level.forEach(room => {
        const pos = room.position;
        // Only store forward exits (avoid reverse duplicates)
        const links = Object.values(room.userData.exits || {}).filter(link => {
          const fromId = room.userData.id;
          const toId = link.room.userData.id;
          return fromId < toId; // only store forward link
        }).map(link => {
          return {
            direction: parseInt(link.direction),
            toRoomId: link.room.userData.id
          };
        });
        data.push({
          id: room.userData.id,
          name: room.userData.name || '',
          desc: room.userData.desc || '',
          level: levelIndex - LEVEL_OFFSET,
          x: pos.x,
          z: pos.z,
          links
        });
      });
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('exportFormatBtn')?.addEventListener('click', () => {
    const formatName = document.getElementById('exportFormat')?.value || 'ROM';
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

    // --- Special logic for ROM_FULL format ---
    if (formatName === "ROM_FULL" && formats["ROM_FULL"]) {
      // Build #AREA header block
      // Header example:
      // #AREA
      // %FILENAME%.are~
      // %AREA_NAME%~
      // { %VNUM_MIN% %VNUM_MAX% } %BUILDERS%~
      // %VNUM_MIN% %VNUM_MAX%
      // ...
      let header = '';
      // Ensure areaHeader exists in formats["ROM_FULL"]
      if (formats["ROM_FULL"].areaHeader) {
        header = formats["ROM_FULL"].areaHeader
          .replace('%FILENAME%', filename)
          .replace('%AREA_NAME%', areaName)
          .replace('%BUILDERS%', builders)
          .replace('%VNUM_MIN%', vnumMin)
          .replace('%VNUM_MAX%', vnumMax);
      } else {
        header = `#AREA
${filename}.are~
${areaName}~
{ ${vnumMin} ${vnumMax} } ${builders}~
${vnumMin} ${vnumMax}
`;
      }

      // --- Build #ROOMS block ---
      let roomsBlock = "#ROOMS\n";
      // Gather all rooms, sorted by vnum
      const allRooms = rooms.flat().slice().sort((a, b) => (a.userData.id || 0) - (b.userData.id || 0));
      allRooms.forEach(room => {
        // Default name and desc logic
        const vnum = room.userData.id;
        const name = (room.userData.name?.trim() ? room.userData.name.trim() : `Room ${vnum}`) + '~';
        const desc = (room.userData.desc?.trim() ? room.userData.desc.trim() : `${vnum}`) + '\n~';
        // Room header: vnum, name, desc, then flags line (always "0 0 0")
        let lines = [];
        lines.push(`#${vnum}`);
        lines.push(name);
        lines.push(desc);
        lines.push("0 0 0");
        // Exits
        let exitsStr = '';
        if (formats["ROM_FULL"].exit && room.userData.exits) {
          // Output all exits (ROM expects all exits, not just forward)
          for (const key in room.userData.exits) {
            const exit = room.userData.exits[key];
            const direction = exit.direction;
            const toRoom = exit.room;
            if (!toRoom) continue;
            // Only output each exit once per direction
            // For ROM, output all exits (no duplicate direction from same room)
            if (typeof direction === "undefined" || direction === null) continue;
            // Use exit format
            exitsStr += formats["ROM_FULL"].exit
              .replace('%DIRECTION%', direction)
              .replace('%TO_VNUM%', toRoom.userData.id)
              .replace('%KEY%', '-1')
              .replace('%FLAGS%', '0')
              .replace('%DOOR_DESC%', '')
              .replace('%KEYWORDS%', '');
          }
        }
        // Extra descriptions (empty for now)
        let extraDescStr = '';
        // End of room
        roomsBlock += lines.join('\n') + '\n' + exitsStr + extraDescStr + 'S\n';
      });
      roomsBlock += "#0\n";

      // --- Compose the full area file ---
      let output = '';
      output += header;
      output += "#MOBILES\n#0\n";
      output += "#OBJECTS\n#0\n";
      output += roomsBlock;
      output += "#RESETS\n#0\n";
      output += "#SHOPS\n#0\n";
      output += "#SPECIALS\n#0\n";
      output += "#$\n";

      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.are') ? filename : `${filename}.are`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

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
      if (exitTemplate && room.userData.exits) {
        // To avoid duplicate exits for bidirectional links, use a Set for directions if needed
        const usedDirs = new Set();
        for (const key in room.userData.exits) {
          const exit = room.userData.exits[key];
          const direction = exit.direction;
          const toRoom = exit.room;
          // Some formats want only one exit per direction
          if (typeof direction !== "undefined" && direction !== null) {
            if (format.uniqueExitDirections) {
              if (usedDirs.has(direction)) continue;
              usedDirs.add(direction);
            }
          }
          // Compose exit data for template
          let exitData = {
            DIRECTION: typeof direction !== "undefined" ? direction : '',
            TO_VNUM: toRoom?.userData?.id ?? 0,
            KEY: '-1',
            FLAGS: '0',
            DOOR_DESC: '',
            KEYWORDS: ''
          };
          // Allow format to override exit defaults
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
      // Allow format to override room defaults
      if (format.roomDefaults) {
        Object.assign(roomData, format.roomDefaults);
      }
      if (roomTemplate) {
        roomsStr += fillTemplate(roomTemplate, roomData);
      } else {
        // Fallback: generic room block
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
        for (const key in room.userData.exits) {
          const toRoom = room.userData.exits[key].room;
          const direction = room.userData.exits[key].direction;
          const exitStr = format.exit
            .replace('%DIRECTION%', direction)
            .replace('%TO_VNUM%', toRoom.userData.id)
            .replace('%FLAGS%', '0') // Placeholder
            .replace('%KEY%', '-1') // Placeholder
            .replace('%DOOR_DESC%', '') // Placeholder
            .replace('%KEYWORDS%', ''); // Placeholder
          exits += exitStr;
        }

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
    // Clear current scene
    rooms.forEach((level, i) => {
      level.forEach(room => levelContainers[i].remove(room));
      rooms[i] = [];
    });
    scene.children.filter(obj => obj.type === 'Line').forEach(line => scene.remove(line));

    const data = JSON.parse(json);
    const idToRoom = new Map();
    data.forEach(entry => {
      const levelIndex = entry.level + LEVEL_OFFSET;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x8888ff, emissive: 0x000000 })
      );
      box.position.set(entry.x, 0.5, entry.z);
      box.userData = { id: entry.id, exits: {}, exitLines: [] };
      usedVnums.add(entry.id);
      if (entry.id > lastAssignedVnum) {
        lastAssignedVnum = entry.id;
      }
      levelContainers[levelIndex].add(box);
      rooms[levelIndex].push(box);
      idToRoom.set(entry.id, box);
    });
    // Restore exits from room.links in both directions
    function createLink(fromRoom, toRoom, direction) {
      const fromPos = getRoomCenter(fromRoom);
      const toPos = getRoomCenter(toRoom);
      const line = createExitLine(fromPos, toPos, fromRoom, toRoom);
      if (typeof direction !== "undefined" && direction !== null) {
        line.userData.direction = direction;
      }
      fromRoom.userData.exitLines.push(line);
      toRoom.userData.exitLines.push(line);
      // Store exit info
      // Compute vector key for this direction (for full compatibility, but here just store by direction)
      if (!fromRoom.userData.exits) fromRoom.userData.exits = {};
      fromRoom.userData.exits[direction] = { room: toRoom, direction };
    }
    data.forEach(room => {
      const newRoom = idToRoom.get(room.id);
      if (room.links) {
        for (const link of room.links) {
          const toRoom = idToRoom.get(link.toRoomId);
          if (!toRoom) continue;

          // Create forward link
          createLink(newRoom, toRoom, parseInt(link.direction));

          // Create reverse link
          const reverseDir = (parseInt(link.direction) + 3) % 6;
          createLink(toRoom, newRoom, reverseDir);
        }
      }
    });
    switchLevel(currentLevel);
  }

  // Initialize visibility
  switchLevel(currentLevel);

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