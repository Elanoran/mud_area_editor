/**
 * @file assets/js/textures/surface.js
 * @description Loads and manages surface textures and materials for room surfaces.
 * @module textures/surface
 * @author Elanoran
 * @web https://github.com/Elanoran/mud_area_editor
 */

import { THREE } from '../vendor/three.js';

export const SURFACE_MATERIALS = {
  grass: {
    folder: 'assets/textures/Grass001_1K_Color',
    base:  'Grass001_1K-JPG',
    type:  'texture',
    displacementScale: 0.3,
    height: 0.6  // add your desired floor thickness here
  },
  asphalt: {
    folder: 'assets/textures/Asphalt025C_1K-JPG',
    base:  'Asphalt025C_1K-JPG',
    type:  'texture',
    displacementScale: 0.25,
    height: 0.5
  },
  fabric: {
    folder: 'assets/textures/Fabric066_1K-JPG',
    base:  'Fabric066_1K-JPG',
    type:  'texture',
    displacementScale: 0.1,
    height: 0.3
  },
  glass: {
    folder: 'assets/textures/Glass02_1K',
    base:  'Glass02_AO_1K',
    type:  'texture',
    displacementScale: 0.1,
    height: 0.3
  },
  blue: {
    color: 0x3498db,
    type: 'color',
    displacementScale: 0,
    height: 0.6
  },
  sand: {
    color: 0xf7e9b5,
    type: 'color',
    displacementScale: 0,
    height: 0.6
  },
  dirt: {
    color: 0x8d6748,
    type: 'color',
    displacementScale: 0,
    height: 0.6
  },
  charcoal: {
    color: 0x443e3e,
    type: 'color',
    displacementScale: 0,
    height: 0.6
  }
};

/**
 * Loads either a color-only or a set of textures for the given surface.
 * @function loadSurfaceTextures
 * @param {string} surfaceName - The key identifying a surface in SURFACE_MATERIALS.
 * @returns {{type: 'color', color: number} | {type: 'texture', color: THREE.Texture, normal: THREE.Texture, rough: THREE.Texture, ao: THREE.Texture|null, disp: THREE.Texture|null}}
 *   An object with `type` and corresponding texture or color properties.
 * @throws {Error} When `surfaceName` is not found in SURFACE_MATERIALS.
 */
export function loadSurfaceTextures(surfaceName) {
    const mat = SURFACE_MATERIALS[surfaceName];
    if (!mat) throw new Error('Unknown material: ' + surfaceName);

    // Handle color-only
    if (mat.type === 'color') return { color: mat.color, type: 'color' };

    // Else, texture
    const loader = new THREE.TextureLoader();
    const out = {};
    out.color = loader.load(`${mat.folder}/${mat.base}_Color.jpg`);
    out.normal = loader.load(`${mat.folder}/${mat.base}_NormalDX.jpg`);
    out.rough = loader.load(`${mat.folder}/${mat.base}_Roughness.jpg`);
    loader.load(`${mat.folder}/${mat.base}_AmbientOcclusion.jpg`, t => out.ao = t, undefined, () => out.ao = null);
    loader.load(`${mat.folder}/${mat.base}_Displacement.jpg`, t => out.disp = t, undefined, () => out.disp = null);
    [out.color, out.normal, out.rough].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    });
    out.type = 'texture';
    return out;
}

/**
 * Creates a THREE.MeshStandardMaterial based on provided textures or color.
 * @function createSurfaceMaterial
 * @param {{type: string, color?: number, normal?: THREE.Texture, rough?: THREE.Texture, ao?: THREE.Texture, disp?: THREE.Texture}} textures
 *   The output of loadSurfaceTextures, containing texture maps or a color value.
 * @returns {THREE.MeshStandardMaterial} A material configured with the given textures or solid color.
 */
export function createSurfaceMaterial(textures) {
    let material;
    if (textures.type === 'color') {
      material = new THREE.MeshStandardMaterial({
        color: textures.color,
        roughness: 1.0
      });
    } else {
      const params = {
        map: textures.color,
        normalMap: textures.normal,
        roughnessMap: textures.rough,
        roughness: 1.0,
        color: 0xffffff
      };
      if (textures.ao) params.aoMap = textures.ao;
      if (textures.disp) {
        params.displacementMap = textures.disp;
        params.displacementScale = 0.25;
        params.displacementBias = 0.0;
      }
      material = new THREE.MeshStandardMaterial(params);
    }

    // Silence unused 'vUv' varying warnings
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace(/varying vec2 vUv;[\n\r]*/g, '')
        .replace(/vUv = uv;[\n\r]*/g, '');
      shader.fragmentShader = shader.fragmentShader.replace(/\bvUv\b/g, 'vec2(0)');
    };

    return material;
}

export function setRoomEmissive(material, hex) {
  if (material && material.isMeshStandardMaterial && material.emissive) {
    material.emissive.setHex(hex);
  }
}