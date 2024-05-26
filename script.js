import * as THREE from 'three';
// import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
// import * as dat from 'dat.gui';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);