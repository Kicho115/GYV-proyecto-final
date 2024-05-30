import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as dat from 'dat.gui';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';



// TODO: borrar hitboxes
let playerHelper;

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Adjust to full screen
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Scene
const scene = new THREE.Scene();
const axesHelper = new THREE.AxesHelper(50);
scene.add(axesHelper);

const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
scene.add(ambientLight);

// Camera
const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth / window.innerHeight, // Aspect
    0.1, // Near
    1000 // Far
);
camera.position.set(0, 10, 5);

const orbitControls = new OrbitControls(camera, renderer.domElement);

// Raycaster
const raycaster = new THREE.Raycaster();

// Animations
let mixer;
const clock = new THREE.Clock();

// Floor
const textureLoader = new THREE.TextureLoader();
const floorTexture = 'assets/floorTexture.png';

const floorGeometry = new THREE.PlaneGeometry(250, 250);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotateX(-0.5 * Math.PI);
scene.add(floor);

// Spotlight
const spotLight = new THREE.SpotLight(0xFFFFFF, 100);
spotLight.position.set(-3, 5, 0);
spotLight.castShadow = true;
scene.add(spotLight);

const spotLightHelper = new THREE.SpotLightHelper(spotLight);
scene.add(spotLightHelper);

// Spotlight controls
const gui = new dat.GUI();

const options = {
    ModoExplorar: true,
    targetX: 0,
    targetZ: 0,
    angle: 0.2,
    penumbra: 0,
    intensity: 1,
};

gui.add(options, 'ModoExplorar').onChange(function(e) {
    options.ModoExplorar = e;
})

gui.add(options, 'angle', 0, Math.PI / 2).onChange(function (e) {
    spotLight.angle = e;
    spotLightHelper.update();
});

gui.add(options, 'penumbra', 0, 1).onChange(function (e) {
    spotLight.penumbra = e;
    spotLightHelper.update();
});

gui.add(options, 'intensity', 0, 100).onChange(function (e) {
    spotLight.intensity = e;
});

gui.add(options, 'targetX', -50, 50).onChange(function (e) {
    spotLight.target.position.x = e;
    spotLightHelper.update();
});

gui.add(options, 'targetZ', -50, 50).onChange(function (e) {
    spotLight.target.position.z = e;
    spotLightHelper.update();
})

// Player
let player;
const playerStartPosition = new THREE.Vector3(5, 1, 110);
const playerUrl = './assets/player.obj';
const loader = new OBJLoader();
loader.load(
    playerUrl,
    (object) => {
        player = object;
        player.scale.set(0.125, 0.125, 0.125);
        const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        player.traverse((child) => {
            if (child.isMesh) {
                child.material = blackMaterial;
            }
        });
        // Make the player spawn at the start of the maze
        player.position.copy(playerStartPosition);
        playerHelper = new THREE.BoxHelper(player, 0xff0000); // Color rojo para la hitbox
        scene.add(playerHelper);
        scene.add(player);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('Error loading player:', error);
    }
);

// Enemy
const assetLoader = new GLTFLoader();
let enemy;
const enemyStartPosition = new THREE.Vector3(5, 1, 150);
const enemyUrl = new URL('assets/enemy.glb', import.meta.url);
assetLoader.load(enemyUrl.href, function (gltf) {
    enemy = gltf.scene;
    enemy.position.copy(enemyStartPosition);
    enemy.scale.multiplyScalar(0.18);
    scene.add(enemy);
    mixer = new THREE.AnimationMixer(enemy);
    const enemyAnimation = THREE.AnimationClip.findByName(gltf.animations, 'Correr');
    const enemyAction = mixer.clipAction(enemyAnimation);
    enemyAction.play();
}, undefined, function (error) {
    console.error(error);
})

// Maze texture settings
const mazeTextureUrl = floorTexture;
const mazeTexture = textureLoader.load(mazeTextureUrl, (texture) => {
    // Configurar filtros de textura para mejorar la calidad
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
});

// Maze
let maze;
const mazeUrl = './images/dedalo.obj';
loader.load(
    mazeUrl,
    (object) => {
        maze = object;
        maze.scale.set(10, 10, 10);

        const blackMaterial = new THREE.MeshLambertMaterial({ 
            map: mazeTexture, 
            color: 0x333333
        });
        maze.traverse((child) => {
            if (child.isMesh) {
                child.material = blackMaterial;
            }
        });

        // Calcular el centro del bounding box del laberinto
        const mazeBoundingBox = new THREE.Box3().setFromObject(maze);
        const mazeCenter = new THREE.Vector3();
        mazeBoundingBox.getCenter(mazeCenter);

        // Mover el laberinto para que su centro esté en el origen
        maze.position.sub(mazeCenter);
        maze.position.y = 2;

        scene.add(maze);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('Error loading maze:', error);
    }
);

// Puerta
let puertas = [];
let doorPositions = [[6.2, 1, 101.8], [-40.6, 1, 96.2], [-65.8, 1, 89.3], [-16.5, 1, 81], [18.6, 1, 25, 4], [95.4, 1, 20.3], [61.1, 1, -36.9], [-5.3, 1, -101.9]];
let initialScale = new THREE.Vector3(10, 10, 10);
const puertaUrl = './assets/puerta.obj';
loader.load(
    puertaUrl,
    (object) => {
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        // Mover la puerta para que su centro esté en el origen
        object.position.sub(center);

        // Aplicar el material a cada malla de la puerta
        const puertaMaterial = new THREE.MeshLambertMaterial({
            map: mazeTexture,
            color: 0xE23131,
        });
        object.traverse((child) => {
            if (child.isMesh) {
                child.material = puertaMaterial;
            }
        });

        // Crear una puerta por cada posición en doorPositions
        for (let i = 0; i < doorPositions.length; i++) {
            const puertaContainer = new THREE.Object3D();
            const puertaClone = object.clone();
            puertaContainer.add(puertaClone);

            // Configurar la escala y posición del contenedor
            puertaContainer.scale.copy(initialScale);
            puertaContainer.position.set(doorPositions[i][0], doorPositions[i][1], doorPositions[i][2]);

            // Añadir el contenedor al array de puertas
            puertas.push(puertaContainer);

            // Añadir el contenedor a la escena
            scene.add(puertaContainer);
        }
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('Error loading puerta:', error);
    }
);

// Música
const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('./assets/musicafondo.mp3', function (buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
});

let musicaFondoTocando = false;

// Movement variables
const moveSpeed = 0.1;
const enemySpeed = 0.05;
const keysPressed = {};

// Scoring variables
let score = 0;
let highScores = [];
const scoreText = document.createElement('div');
scoreText.style.position = 'absolute';
scoreText.style.top = '10px';
scoreText.style.right = '10px';
scoreText.style.color = 'white';
document.body.appendChild(scoreText);

// Event listeners for keyboard input
document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
});
document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
});

// Title screen
const titleScreen = document.getElementById('titleScreen');
const highScoresList = document.getElementById('highScoresList');
let gameStarted = false;

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !gameStarted) {
        titleScreen.style.display = 'none';
        gameStarted = true;
        score = 0;
    }
});

// Rotate color
document.addEventListener('keydown', (event) => {
    if (event.key === 'c' && gameStarted) {
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        player.material.color.setHex(colors[currentColorIndex]);
    }
});

// Function to check collision
function checkCollision(obj1, obj2) {
    const obj1Box = new THREE.Box3().setFromObject(obj1);
    const obj2Box = new THREE.Box3().setFromObject(obj2);
    return obj1Box.intersectsBox(obj2Box);
}

// Function to check collision with maze walls
function checkMazeCollision(object, maze) {
    const objectBox = new THREE.Box3().setFromObject(object);
    let collision = false;

    maze.traverse((child) => {
        if (child.isMesh) {
            const wallBox = new THREE.Box3().setFromObject(child);
            if (objectBox.intersectsBox(wallBox)) {
                collision = true;
            }
        }
    });

    return collision;
}

// Function to calculate score
function calculateScore() {
    const distance = player.position.distanceTo(playerStartPosition);
    score = Math.floor(distance);
    scoreText.innerHTML = `Score: ${score}`;
}

// Reset game function
function resetGame() {
    player.position.copy(playerStartPosition);
    enemy.position.copy(enemyStartPosition);
    gameStarted = false;
    titleScreen.style.display = 'block';
    updateHighScores(score);
    displayHighScores();
    sound.stop();
    musicaFondoTocando = false;
}

// Update high scores
function updateHighScores(newScore) {
    highScores.push(newScore);
    highScores.sort((a, b) => b - a);
    highScores = highScores.slice(0, 5);
    localStorage.setItem('highScores', JSON.stringify(highScores));
}

// Display high scores
function displayHighScores() {
    highScoresList.innerHTML = '';
    highScores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${score}`;
        highScoresList.appendChild(li);
    });
}

// Initialize high scores on load
window.addEventListener('load', () => {
    highScores = [];
    localStorage.removeItem('highScores');
});

// Check if the light is touching an object
function isObjectIluminated(object, spotLight) {
    const direction = new THREE.Vector3();
    direction.subVectors(object.position, spotlight.position).normalize();

    raycaster.set(spotlight.position, direction);

    const intersects = raycaster.intersectObject(object);
    console.log(intersects);

    if (intersects.length > 0) {
        const distance = intersects[0].distance;
        // do smth here
    }
};

// Almacenar las posiciones del jugador
const playerPositions = [];
const playerRotations = [];
const timeInterval = 100; // Intervalo de tiempo en ms para almacenar la posición del jugador
let elapsedTime = 0;

function copyPlayerState() {
    if (playerPositions.length > 0 && playerRotations.length > 0) {
        const oldPosition = playerPositions.shift(); // Obtener la posición de hace 10 segundos
        const oldRotation = playerRotations.shift(); // Obtener la rotación de hace 10 segundos

        // Asignar la posición y rotación antigua del jugador al enemigo
        if (enemy) {
            enemy.position.copy(oldPosition);
            enemy.rotation.copy(oldRotation);
            mixer.update(clock.getDelta());
        }
    }
}

// Game loop
function game() {
    if (!gameStarted) {
        renderer.render(scene, camera);
        return;
    }

    if (!musicaFondoTocando) {
        sound.play();
        musicaFondoTocando = true;
    }

    playerMovement();

    // Enemy movement hacia el jugador
    if (enemy) {
        const direction = new THREE.Vector3();
        direction.subVectors(player.position, enemy.position).normalize();
        enemy.position.add(direction.multiplyScalar(enemySpeed));
    }

    // Check collision with enemy
    /*if (checkCollision(player, enemy)) {
        resetGame();
    }*/

    // Spotlight following the player
    spotLight.position.set(player.position.x, player.position.y + 2, player.position.z);
    if (options.ModoExplorar) {
        spotLight.target.position.set(player.position.x, player.position.y, player.position.z);
    }
    spotLightHelper.update();

    // Calculate score
    calculateScore();

    // Update camera position to follow the player
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 5;
    camera.lookAt(player.position);

    if (playerHelper) {
        playerHelper.update();
    }

    // Almacenar la posición del jugador cada intervalo de tiempo
    if (elapsedTime >= 10000) {
        copyPlayerState();
    }else {
        elapsedTime += timeInterval;
    }

    // Almacenar la posición actual del jugador
    playerPositions.push(player.position.clone());
    playerRotations.push(player.rotation.clone());

    // Limitar el tamaño del array dewa posiciones para que no crezca indefinidamente
    if (playerPositions.length > 100) {
        playerPositions.shift();
    }
    if (playerRotations.length > 100) {
        playerRotations.shift();
    }

    renderer.render(scene, camera);
}

let scaleMultiplier = 1;

// Player movement function
function playerMovement() {
    const oldPosition = player.position.clone();
    const oldRotation = player.rotation.clone();

    if (keysPressed['w']) {
        player.position.z -= moveSpeed;
        player.rotation.y = Math.PI;
    }
    if (keysPressed['s']) {
        player.position.z += moveSpeed;
        player.rotation.y = 0;
    }
    if (keysPressed['a']) {
        player.position.x -= moveSpeed;
        player.rotation.y = -Math.PI / 2;
    }
    if (keysPressed['d']) {
        player.position.x += moveSpeed;
        player.rotation.y = Math.PI / 2;
    }
    
    if (checkMazeCollision(player, maze)) {
        player.position.copy(oldPosition);
        player.rotation.copy(oldRotation);
    }
}

// Ajustar el intervalo de almacenamiento de posición al bucle de animación
function animate() {
    setTimeout(function() {
        renderer.setAnimationLoop(animate);
        game();
    }, timeInterval);
}

animate(); // Iniciar el bucle de animación
