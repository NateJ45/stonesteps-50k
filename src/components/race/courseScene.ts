// Foundation, edit with care
// =============================================================================
// courseScene - the WebGL scene, in its own module so `three` is its own chunk
// =============================================================================
// NOTHING IMPORTS THIS STATICALLY. CourseMap3D.tsx reaches it through a dynamic
// import inside a click handler, which is what keeps three.js (and the terrain
// data) out of /course's measured load entirely. Import it from anywhere at the
// top level and the whole point is lost, silently, with the only symptom being
// a Lighthouse score nobody is looking at that week.
//
// The maths lives in src/lib/courseTerrain.ts so it can be tested without a GPU.
// What is left here is the part that genuinely needs one.
// =============================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { heightAt, heightRange, verticalExaggeration, type TerrainData } from '@/lib/courseTerrain';
import type { CourseLoop } from '@/lib/courseMap';

export interface SceneHandle {
  dispose: () => void;
}

interface Palette {
  low: THREE.Color;
  high: THREE.Color;
  long: THREE.Color;
  short: THREE.Color;
  oval: THREE.Color;
  background: THREE.Color;
}

/**
 * Read the site's own colours out of CSS rather than hard-coding them.
 *
 * The scene has to work in both themes and the palette is already defined once,
 * in globals.css. Sampling the computed values means the 3D view follows a
 * rebrand (`npm run apply-brand`) for free and cannot drift from the 2D map
 * sitting directly above it.
 */
function readPalette(host: HTMLElement): Palette {
  const cs = getComputedStyle(host);
  const pick = (name: string, fallback: string) => {
    const v = cs.getPropertyValue(name).trim();
    return new THREE.Color(v || fallback);
  };
  return {
    // Low ground takes the page's own paper, high ground the stone the site
    // draws its borders and eyebrows in, so the model reads as this site's
    // terrain rather than as a generic DEM.
    low: pick('--color-muted', '#e8e0cc'),
    high: pick('--color-secondary', '#8a7f66'),
    long: pick('--color-primary', '#a83c26'),
    short: pick('--color-foreground', '#1a1712'),
    oval: pick('--color-foreground', '#1a1712'),
    background: pick('--color-muted', '#e8e0cc'),
  };
}

/**
 * Build the scene, and return a handle that tears every bit of it down.
 *
 * THE DISPOSE PATH IS NOT OPTIONAL AND NOT AUTOMATIC. Three allocates GPU
 * buffers that the JavaScript garbage collector knows nothing about, so a
 * viewer that is opened, closed and opened again leaks a terrain mesh and a
 * renderer each time until the browser drops the context and the canvas goes
 * blank. Every geometry, material and the renderer itself is disposed here.
 */
export function createCourseScene(
  host: HTMLElement,
  terrain: TerrainData,
  loops: CourseLoop[],
): SceneHandle {
  const palette = readPalette(host);
  const { lo, hi } = heightRange(terrain);
  const exaggeration = verticalExaggeration(terrain);
  const { box } = terrain;
  const width = box.maxX - box.minX;
  const depth = box.maxY - box.minY;

  const scene = new THREE.Scene();
  scene.background = palette.background;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const camera = new THREE.PerspectiveCamera(42, 1, 10, width * 6);

  /* ---- terrain ---------------------------------------------------------- */

  // PlaneGeometry is built in the XY plane; rotating it flat maps its y to
  // world -z. Working in a right-handed world where x is east, y is UP and
  // -z is north keeps the camera maths conventional.
  const seg = terrain.grid - 1;
  const geo = new THREE.PlaneGeometry(width, depth, seg, seg);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    // Plane vertices run row-major from the far edge; convert each back to the
    // data frame and ask the heightfield, rather than assuming the two share an
    // ordering. Slower to build, impossible to get subtly wrong.
    const x = pos.getX(i) + (box.minX + box.maxX) / 2;
    const y = -pos.getZ(i) + (box.minY + box.maxY) / 2;
    const h = heightAt(terrain, x, y);
    pos.setY(i, (h - lo) * exaggeration);

    const t = hi > lo ? (h - lo) / (hi - lo) : 0;
    c.copy(palette.low).lerp(palette.high, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: false });
  const ground = new THREE.Mesh(geo, groundMat);
  scene.add(ground);

  /* ---- the course ------------------------------------------------------- */

  // Drape the route on the surface, lifted clear of it. WITHOUT THE LIFT the
  // ribbon and the ground occupy the same plane and the depth buffer picks a
  // winner per pixel, which stipples the course in and out along its length.
  // That artefact is called z-fighting and it reads as a broken line.
  const lift = Math.max(6, (hi - lo) * 0.012) * exaggeration;
  const routeMeshes: THREE.Mesh[] = [];
  const tubeRadius = Math.max(width, depth) * 0.0022;

  for (const loop of loops) {
    const pts = loop.points.map((p) => {
      const h = heightAt(terrain, p[0], p[1]);
      return new THREE.Vector3(
        p[0] - (box.minX + box.maxX) / 2,
        (h - lo) * exaggeration + lift,
        -(p[1] - (box.minY + box.maxY) / 2),
      );
    });
    if (pts.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3);
    const tube = new THREE.TubeGeometry(
      curve,
      Math.min(1400, pts.length * 2),
      tubeRadius,
      6,
      false,
    );
    const mat = new THREE.MeshLambertMaterial({
      color: loop.kind === 'long' ? palette.long : palette.short,
    });
    const mesh = new THREE.Mesh(tube, mat);
    scene.add(mesh);
    routeMeshes.push(mesh);
  }

  // The Oval, as a marker standing clear of the ground so it reads from above.
  const start = loops[0]?.points[0];
  let oval: THREE.Mesh | null = null;
  if (start) {
    const h = heightAt(terrain, start[0], start[1]);
    const g = new THREE.SphereGeometry(tubeRadius * 3.2, 16, 12);
    const m = new THREE.MeshLambertMaterial({ color: palette.oval });
    oval = new THREE.Mesh(g, m);
    oval.position.set(
      start[0] - (box.minX + box.maxX) / 2,
      (h - lo) * exaggeration + lift * 2.2,
      -(start[1] - (box.minY + box.maxY) / 2),
    );
    scene.add(oval);
  }

  /* ---- light ------------------------------------------------------------ */

  // One directional light from the northwest is what makes the relief legible:
  // this is a hillshade, and the whole reason the view exists. Ambient alone
  // renders a coloured pancake.
  // EXPOSURE IS THE DIFFERENCE BETWEEN TERRAIN AND A GREY LUMP. The first pass
  // ran the sun at 2.1 with 0.85 of ambient on top; anything facing the light
  // clipped to white and the whole model came out desaturated grey with the
  // brand palette invisible underneath. Lambert has no tone mapping to save
  // you, so the two intensities have to sum to roughly 1 on a lit face.
  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(-width * 0.6, (hi - lo) * exaggeration * 4 + depth * 0.5, -depth * 0.6);
  scene.add(sun);
  // Enough ambient to keep the shaded valleys readable, not enough to flatten
  // the hillshade that is the entire reason for this view.
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  /* ---- camera and controls ---------------------------------------------- */

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = Math.max(width, depth) * 0.25;
  controls.maxDistance = Math.max(width, depth) * 2.2;
  // Stop the camera going under the ground, where the scene is an unlit shell
  // and looks broken rather than upside down.
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0, 0);

  camera.position.set(width * 0.55, (hi - lo) * exaggeration * 3.2 + depth * 0.45, depth * 0.75);
  camera.lookAt(0, 0, 0);

  /* ---- resize and loop --------------------------------------------------- */

  const resize = () => {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(host);

  let raf = 0;
  let running = true;
  const tick = () => {
    if (!running) return;
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  tick();

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      controls.dispose();
      geo.dispose();
      groundMat.dispose();
      for (const m of routeMeshes) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      if (oval) {
        oval.geometry.dispose();
        (oval.material as THREE.Material).dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
