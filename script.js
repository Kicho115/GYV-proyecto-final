import * as THREE from 'three';
// import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
// import * as dat from 'dat.gui';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth/window.innerHeight, // Aspect
    0.1, // Near
    1000 // Far
);

// TODO: Cambiar la posicion de la camara cuando tengamops el laberinto
camera.position.set(0,3,5);