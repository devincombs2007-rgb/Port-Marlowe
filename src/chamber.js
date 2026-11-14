// Static chamber surfaces, fixtures and lighting.
(function () {
  const G = window.GSW;
  const ROOM = G.ROOM;
  const { lerp, smoothstep } = THREE.MathUtils;

  function tileMaterial(color, grout, roughness, bumpScale, anisotropy, seed) {
    const tile = 256, size = tile * 2;
    const makeImage = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      return { canvas, context, image: context.createImageData(size, size) };
    };
    const albedo = makeImage(), surface = makeImage();
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const grid = 16;
    const clouds = Float32Array.from({ length: grid * grid }, random);
    const tileTones = Array.from({ length: 4 }, () => (random() - 0.5) * 11);

    for (let y = 0; y < size; y++) {
      const row = Math.floor(y * grid / size);
      const fy = smoothstep(y * grid / size - row, 0, 1);
      const nextRow = (row + 1) % grid;
      const ty = y % tile;
      for (let x = 0; x < size; x++) {
        const column = Math.floor(x * grid / size);
        const fx = smoothstep(x * grid / size - column, 0, 1);
        const nextColumn = (column + 1) % grid;
        const cloud = lerp(lerp(clouds[row * grid + column], clouds[row * grid + nextColumn], fx),
          lerp(clouds[nextRow * grid + column], clouds[nextRow * grid + nextColumn], fx), fy);
        const grain = random() - 0.5;
        const tx = x % tile;
        const edge = Math.min(tx, ty, tile - 1 - tx, tile - 1 - ty);
        const face = smoothstep(edge + cloud * 0.9, 0.9, 4.3);
        const tone = tileTones[Math.floor(y / tile) * 2 + Math.floor(x / tile)];
        const shade = (cloud - 0.5) * 13 + grain * 9;
        const i = (y * size + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          albedo.image.data[i + channel] = lerp(grout[channel], color[channel] + tone, face) + shade;
        }
        albedo.image.data[i + 3] = 255;
        // Three.js reads height from red and roughness from green.
        surface.image.data[i] = lerp(45, 192 + cloud * 14, face) + grain * 15;
        surface.image.data[i + 1] = (lerp(0.92, roughness + (cloud - 0.5) * 0.12, face)) * 255;
        surface.image.data[i + 3] = 255;
      }
    }

    const texture = ({ canvas, context, image }) => {
      context.putImageData(image, 0, 0);
      const result = new THREE.CanvasTexture(canvas);
      result.wrapS = result.wrapT = THREE.RepeatWrapping;
      result.anisotropy = anisotropy;
      return result;
    };
    const map = texture(albedo), detail = texture(surface);
    map.encoding = THREE.sRGBEncoding;
    return new THREE.MeshStandardMaterial({ map, roughnessMap: detail, bumpMap: detail, bumpScale });
  }

  G.buildChamber = function (scene, renderer) {
    const width = ROOM.x1 - ROOM.x0, depth = ROOM.z1 - ROOM.z0;
    const height = ROOM.y1 - ROOM.y0, centerZ = (ROOM.z0 + ROOM.z1) / 2;
    const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const floor = tileMaterial([143, 150, 148], [84, 91, 89], 0.57, 0.005, anisotropy, 17);
    const wall = tileMaterial([182, 188, 185], [129, 139, 136], 0.75, 0.003, anisotropy, 53);
    const ceiling = new THREE.MeshStandardMaterial({ color: 0xa8b1b2, roughness: 0.93 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x364547, roughness: 0.61, metalness: 0.28 });
    const painted = new THREE.MeshStandardMaterial({ color: 0x5b6b69, roughness: 0.67 });
    const inset = new THREE.MeshStandardMaterial({ color: 0x17272b, roughness: 0.31, metalness: 0.12 });
    const diffuser = new THREE.MeshBasicMaterial({ color: 0xf5fbff });
    const strip = new THREE.MeshStandardMaterial({ color: 0x525e5e, roughness: 0.8 });

    function plane(w, h, material, position, rotation, offset = [0, 0]) {
      const geometry = new THREE.PlaneGeometry(w, h);
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * w + offset[0], uv.getY(i) * h + offset[1]);
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    function box(w, h, d, material, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // Align the visible floor joints to the world grid used by the chamber.
    plane(width, depth, floor, [0, ROOM.y0, centerZ], [-Math.PI / 2, 0, 0], [ROOM.x0, -ROOM.z1]);
    plane(width, depth, ceiling, [0, ROOM.y1, centerZ], [Math.PI / 2, 0, 0]);
    plane(width, height, wall, [0, height / 2, ROOM.z0], [0, 0, 0]);
    plane(width, height, wall, [0, height / 2, ROOM.z1], [0, Math.PI, 0]);
    plane(depth, height, wall, [ROOM.x0, height / 2, centerZ], [0, Math.PI / 2, 0]);
    plane(depth, height, wall, [ROOM.x1, height / 2, centerZ], [0, -Math.PI / 2, 0]);

    for (const [x, z] of [[ROOM.x0, ROOM.z0], [ROOM.x1, ROOM.z1]]) {
      box(0.02, 0.12, depth, strip, x, 0.06, centerZ);
      box(width, 0.12, 0.02, strip, 0, 0.06, z);
    }

    const back = ROOM.z0;
    // Keep the door and vent faces flush so marks on the wall remain visible.
    const backPanel = (w, h, material, x, y, offset) =>
      plane(w, h, material, [x, y, back + offset], [0, 0, 0]);
    const door = 2.12;
    backPanel(1.15, 2.16, metal, door, 1.08, 0.0003);
    backPanel(1.01, 2.08, painted, door, 1.04, 0.0006);
    backPanel(0.45, 0.55, metal, door, 1.6, 0.0009);
    backPanel(0.39, 0.49, inset, door, 1.6, 0.0012);
    box(0.15, 0.032, 0.04, metal, door - 0.36, 1.02, back + 0.023);

    const vent = -2.12;
    backPanel(1.36, 0.58, metal, vent, 2.23, 0.0003);
    backPanel(1.23, 0.44, inset, vent, 2.23, 0.0006);
    for (let i = -2; i <= 2; i++) {
      box(1.21, 0.024, 0.012, painted, vent, 2.23 + i * 0.075, back + 0.004);
    }

    const ruler = document.createElement('canvas');
    ruler.width = 96;
    ruler.height = 1024;
    const marks = ruler.getContext('2d');
    marks.fillStyle = '#e6e6db';
    marks.fillRect(0, 0, ruler.width, ruler.height);
    marks.fillStyle = '#263538';
    marks.font = 'bold 21px monospace';
    for (let cm = 0; cm <= 200; cm += 10) {
      const y = (1 - cm / 200) * (ruler.height - 1);
      const major = cm % 50 === 0;
      marks.fillRect(0, y - 1, major ? 43 : 23, 3);
      if (major && cm) marks.fillText(cm, 47, y + 21);
    }
    const rulerTexture = new THREE.CanvasTexture(ruler);
    rulerTexture.encoding = THREE.sRGBEncoding;
    const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 2),
      new THREE.MeshStandardMaterial({ map: rulerTexture, roughness: 0.86 }));
    scale.position.set(-0.75, 1, back + 0.001);
    scale.receiveShadow = true;
    scene.add(scale);

    const panels = [0.5, 4.2], panelWidth = 1.65, panelDepth = 0.5;
    const panelY = ROOM.y1 - 0.063;
    for (const z of panels) {
      box(panelWidth + 0.11, 0.072, panelDepth + 0.11, metal, 0, ROOM.y1 - 0.034, z);
      box(panelWidth, 0.026, panelDepth, diffuser, 0, panelY, z);
      const fill = new THREE.PointLight(0xe1f1ff, 0.3, 8, 2);
      fill.position.set(0, panelY - 0.09, z);
      scene.add(fill);
    }
    scene.add(new THREE.HemisphereLight(0xe5f1f7, 0x626560, 0.32));
    const key = new THREE.DirectionalLight(0xfff4e6, 0.97);
    key.position.set(0, panelY - 0.08, panels[0]);
    key.target.position.set(0.2, 0.8, -0.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3.1, right: 3.1, top: 3.1, bottom: -3.1, near: 0.1, far: 8 });
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.018;
    scene.add(key, key.target);

    // Bake the same ceiling panels into the reflection map from inside the chamber.
    const environment = new THREE.Scene(), generator = new THREE.PMREMGenerator(renderer);
    const sampleHeight = 1.4;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshBasicMaterial({ color: 0x84908e, side: THREE.BackSide }));
    shell.position.set(0, height / 2 - sampleHeight, centerZ);
    environment.add(shell);
    const floorBounce = new THREE.Mesh(new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({ color: 0x555d5a }));
    floorBounce.rotation.x = -Math.PI / 2;
    floorBounce.position.set(0, ROOM.y0 + 0.01 - sampleHeight, centerZ);
    environment.add(floorBounce);
    const reflectionPanel = new THREE.PlaneGeometry(panelWidth, panelDepth);
    const reflectionLight = new THREE.MeshBasicMaterial({ color: 0xe8f3ff });
    reflectionLight.color.multiplyScalar(9);
    for (const z of panels) {
      const panel = new THREE.Mesh(reflectionPanel, reflectionLight);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(0, panelY - sampleHeight, z);
      environment.add(panel);
    }
    scene.environment = generator.fromScene(environment, 0.045).texture;
    generator.dispose();
    for (const { geometry, material } of [shell, floorBounce]) {
      geometry.dispose();
      material.dispose();
    }
    reflectionPanel.dispose();
    reflectionLight.dispose();
    return new THREE.Vector2(vent, back);
  };
})();
