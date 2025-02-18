import * as THREE from 'https://unpkg.com/three@0.119.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js';
import Car from './Car.js';
import Board from './Board.js';
import Lights from './Lights.js';
import Micro from './Micro.js';
import CarConnection from './CarConnection.js';
import ColourSensor from './ColourSensor.js';
import UltrasonicSensor from './UltrasonicSensor.js';
import Road from './Road.js';
import Maze from './Maze.js';
import Stopwatch from './Stopwatch.js';

let scene, camera, controls, mouse, mouseDown, zoom, timeout, cameraOrbit, cameraFollow, thirdPersonCam, renderer, lights, car, board, clock;
let keyboard = {}, keyboardControlsEnabled;
let micro, carConn, colourSensor, ultrasonicSensor, road, maze;
let loadingManager;
let paused = true;
let colliding = false;
let collisionCount = 0;
let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;
let firstLoad = true;

const INV_MAX_FPS = 1 / 60;

// Get level from localStorage if present
let currentLevel = localStorage.getItem('level') || 1;
const levelSelect = document.getElementById('level-select-value');
levelSelect.innerHTML = currentLevel;

const initWorldArray = [
    initWorld1, initWorld2, initWorld3, initWorld4, initWorld5
];
const levelCount = initWorldArray.length;

init();
animate();

function init() {
    initThreeJS();
    initWorld();
}

function animate() {
    update(INV_MAX_FPS);
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function goalFunction() {
    clock.stop()
    document.getElementById('time').style.color = 'greenyellow';
}

function initThreeJS() {
    // Camera
    camera = new THREE.PerspectiveCamera(400, SCREEN_WIDTH / SCREEN_HEIGHT, 0.1, 1000);
    camera.position.set(41, 11, 41);
    cameraFollow = new THREE.Object3D();
    thirdPersonCam = false;

    clock = new Stopwatch("time");
    cameraOrbit = new THREE.Vector2();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = 0.95 * Math.PI / 2;
    controls.enableZoom = true;
    controls.enableKeys = false;
    controls.target = new THREE.Vector3(15, 0, 15);
    controls.update(); 
    
    mouse = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];
    timeout = 0;
    zoom = 1;
    // GUI
    let Params = function () {
        this.bgColour = '#232323';
        this.keyboardControls = true;
    };
    let text = new Params();
    let gui = new dat.GUI();
    let bgController = gui.addColor(text, 'bgColour');
    bgController.onChange(value => scene.background = new THREE.Color(value));
    keyboardControlsEnabled = gui.add(text, 'keyboardControls');
    keyboardControlsEnabled.onChange(value => {
        if (value) {
            carConn.setSpeedA(0);
            carConn.setSpeedB(0);
        }
    });

    // Loading manager
    loadingManager = new THREE.LoadingManager(); // keeps track of which models have finished downloading
    loadingManager.onLoad = hideLoadingScreen;

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    document.getElementById('incLevelButton').addEventListener('click', incrementLevel);
    document.getElementById('decLevelButton').addEventListener('click', decrementLevel);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mousedown', onMouseDown,false);
    document.addEventListener('mouseup',onMouseUp, false);
    document.addEventListener('wheel',onwheel, false);
}

function hideLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'none';

    if (firstLoad) {
        firstLoad = false;
        paused = false;

        resetWorld();
        clock.start(); // makes sure the clock starts when the page first loads
    } else {
        resetWorld();
    }
}

function initWorld() {
    document.getElementById('collision-count').style.display = 'none'; // collision count is hidden on most levels
    document.getElementById('time').style.display = 'none'; // similar for stopwatch
    initWorldArray[currentLevel - 1]();
    if (!paused) {
        clock.start()
    }
}

function initWorld1() { // goal square level
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x232323);
    // scene.add(new THREE.AxesHelper(10));
    board = new Board(scene, 30, 6, goalFunction);
    board.setGoal(4, 4);
    lights = new Lights(scene);
    car = new Car(scene, loadingManager);
    carConn = new CarConnection(car);
    micro = new Micro(carConn);

    const frontLeft = new THREE.Vector3(1.125 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontLeft, board);
    micro.addColourSensor(colourSensor);

    const frontRight = new THREE.Vector3(-1.125 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontRight, board);
    micro.addColourSensor(colourSensor);

    ultrasonicSensor = new UltrasonicSensor(car, board, scene);
    micro.addUltrasonicSensor(ultrasonicSensor);
    
    micro.setup();
}
function initWorld2() { // straight road level 
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x232323);
    // scene.add(new THREE.AxesHelper(10));
    const roadPos = new THREE.Vector3(14, 0, 17.5);
    road = new Road(scene, roadPos, loadingManager);
    board = new Board(scene, 35, 7, goalFunction);
    board.setGoal(5, 3);
    board.addRoad(road);
    lights = new Lights(scene);

    const carPos = new THREE.Vector3(7.5, 0, 15);
    const carRotation = new THREE.Euler(0, Math.PI/4, 0);
    car = new Car(scene, loadingManager, carPos, carRotation);
    carConn = new CarConnection(car);
    micro = new Micro(carConn);

    const frontLeft = new THREE.Vector3(1.125 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontLeft, board, true);
    micro.addColourSensor(colourSensor);

    const frontRight = new THREE.Vector3(-1.125 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontRight, board, true);
    micro.addColourSensor(colourSensor);

    ultrasonicSensor = new UltrasonicSensor(car, board, scene);
    micro.addUltrasonicSensor(ultrasonicSensor);

    micro.setup();
}
function initWorld3() { // racetrack level
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x232323);
    // scene.add(new THREE.AxesHelper(10));
    const roadPos = new THREE.Vector3(30, 0, 12.5);
    road = new Road(scene, roadPos, loadingManager, true);
    board = new Board(scene, 40, 8, goalFunction);
    board.addRoad(road);

    lights = new Lights(scene);
    const carPosition = new THREE.Vector3(10, 0, 7.5);
    car = new Car(scene, loadingManager, carPosition);
    carConn = new CarConnection(car);
    micro = new Micro(carConn);

    const frontLeft = new THREE.Vector3(0.30 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontLeft, board, true);
    micro.addColourSensor(colourSensor);

    const frontRight = new THREE.Vector3(-0.30 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontRight, board, true);
    micro.addColourSensor(colourSensor);

    ultrasonicSensor = new UltrasonicSensor(car, board, scene);
    micro.addUltrasonicSensor(ultrasonicSensor);

    micro.setup();
}

// example ultrasonics level
function initWorld4() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x232323);
    // scene.add(new THREE.AxesHelper(10));
    const roadPos = new THREE.Vector3(18, 0, 22.5);
    board = new Board(scene, 50, 6, goalFunction);
    board.setGoal(4, 4);
    board.addWalls();

    board.addObstacle(12.5,15,25,0)
    board.addObstacle(30,30,40,0)

    lights = new Lights(scene);
    car = new Car(scene, loadingManager);
    carConn = new CarConnection(car);
    micro = new Micro(carConn);

    const frontLeft = new THREE.Vector3(1.125 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontLeft, board);
    micro.addColourSensor(colourSensor);

    const frontRight = new THREE.Vector3(-1.125 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontRight, board);
    micro.addColourSensor(colourSensor);

    ultrasonicSensor = new UltrasonicSensor(car, board, scene);
    micro.addUltrasonicSensor(ultrasonicSensor);

    micro.setup();

    document.getElementById('collision-count').style.display = 'block';
    collisionCount = 0;
    updateCollisionCount();
    document.getElementById('time').style.display = 'block';
    document.getElementById('time').style.color = 'red';
}

function initWorld5() { // maze level
    // var wall_thickness = 0.5
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x232323);
    // scene.add(new THREE.AxesHelper(10));
    board = new Board(scene, 100, 10, goalFunction);
    board.setGoal(1, 5);

    const mazePos = new THREE.Vector3(0, -3, 0);
    maze = new Maze(scene, mazePos, loadingManager);
    board.addModel(maze);

    lights = new Lights(scene);
    car = new Car(scene, loadingManager, new THREE.Vector3(5,0,5),new THREE.Euler(0,Math.PI/2,0));
    carConn = new CarConnection(car);
    micro = new Micro(carConn);

    const frontLeft = new THREE.Vector3(1.125 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontLeft, board);
    micro.addColourSensor(colourSensor);

    const frontRight = new THREE.Vector3(-1.125 / 2, 0, 2.025 / 2);
    colourSensor = new ColourSensor(car, frontRight, board);
    micro.addColourSensor(colourSensor);

    ultrasonicSensor = new UltrasonicSensor(car, board, scene);
    micro.addUltrasonicSensor(ultrasonicSensor);

    micro.setup();

    document.getElementById('collision-count').style.display = 'block';
    collisionCount = 0;
    updateCollisionCount();
    document.getElementById('time').style.display = 'block';
    document.getElementById('time').style.color = 'red';
}

function update(delta) {
    if (paused) {
        return;
    }

    car.update(keyboard, delta);

    if (thirdPersonCam) {
        // update camera to look at current position of car, with added offsets/rotations
        car.add(cameraFollow);
        controls.enabled = false;
        cameraFollow.add(camera);
        
        cameraOrbit.x = cameraOrbit.x + mouse[2].x;
        cameraOrbit.y = Math.max(Math.min(cameraOrbit.y + mouse[2].y, 0.15), 0) ;

        cameraFollow.setRotationFromEuler(new THREE.Euler(0, -car.rotation.y - cameraOrbit.x*2*Math.PI, -cameraOrbit.y*2*Math.PI));
        var pos = new THREE.Vector3(30*zoom * 0.1, 50*zoom* 0.1, 30*zoom* 0.1)
        camera.position.copy(pos);
        camera.lookAt(car.position);
    } 

    micro.loop();
    board.update(car.corners());
    clock.update()

    if(micro.ultrasonicSensors[0]?.detectForwards() <= 1 ||
        micro.ultrasonicSensors[0]?.detectBackwards() <= 1 ||
        micro.ultrasonicSensors[0]?.detectLeft() <= 0.5 ||
        micro.ultrasonicSensors[0]?.detectRight() <= 0.5) {

        if (!colliding) {
            startCollision();
        }
        colliding = true;
    } else {
        if (colliding) {
            endCollision();
        }
        colliding = false;
    }
}

function startCollision() {
    collisionCount++;
    board.startCollision();
    updateCollisionCount();
}
function endCollision() {
    board.endCollision();
}
function updateCollisionCount() {
    document.getElementById('collision-count').innerHTML = 'Collisions: ' + collisionCount;
}

function toggleThirdPerson() {
    thirdPersonCam = !thirdPersonCam;
    
    if (!thirdPersonCam) {
        cameraFollow.remove(camera);
        controls.enabled = true;
        camera.position.set(41, 11, 41); //reset camera to initial position
        controls.update()
    }
}

// manually keep track of mouse movements for rotation/translation when in 3rd person view
function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse[0].x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse[0].y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (mouseDown) {
        mouse[2].x = mouse[0].x - mouse[1].x;
        mouse[2].y = mouse[0].y - mouse[1].y;
    }
    
    mouse[1].x = mouse[0].x;
    mouse[1].y = mouse[0].y;
    clearTimeout(timeout);
    timeout = setTimeout(function(){mouse[2].x = 0; mouse[2].y = 0;}, 10);
}
function onMouseDown(evt) {
    evt.preventDefault();
    var isRightMB;

    if ("which" in evt)  // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
        isRightMB = evt.which == 3; 
    else if ("button" in evt)  // IE, Opera 
        isRightMB = evt.button == 2;

    mouseDown = true;

    if (isRightMB && thirdPersonCam) {
        toggleThirdPerson();
    }
}
function onMouseUp(evt) {
    evt.preventDefault();

    mouseDown = false;
}
function onwheel(evt) {
    // evt.preventDefault();
    var delta = 0;

	// normalize the delta
	if (evt.wheelDelta) {

		// IE and Opera
		delta = evt.wheelDelta / 60;

	} else if (evt.detail) {

		// W3C
		delta = -evt.detail / 2;
	}
    zoom = Math.max(Math.min(zoom - delta/10, 100),1);
}

function keyDown(event) {
    if (keyboardControlsEnabled?.getValue()) {
        keyboard[event.keyCode] = true;
    }
    if (event.keyCode === 82) { // r key pressed 
        paused = false;
        resetWorld();
        clock.start();
    }
    else if (event.keyCode === 80 || event.keyCode == 27) { // p key pressed
        paused = !paused;
        document.getElementById('pause-menu').style.display = paused ? 'flex' : 'none';
        if (paused) {
            clock.stop();
        } else {
            clock.start();
        }
    }
    else if (event.keyCode === 67) { // c key pressed
        toggleThirdPerson()
    }
    else if (event.keyCode === 37) { // left arrow key pressed
        if (paused) decrementLevel();
    } else if (event.keyCode === 39) { // right arrow key pressed
        if (paused) incrementLevel();
    }
}

function resetWorld() {
    car.reset();
    micro.reset();
    document.getElementById('pause-menu').style.display = paused ? 'flex' : 'none';

    collisionCount = 0;
    updateCollisionCount();

    clock.reset()
    document.getElementById('time').style.color = 'red';
}

function keyUp(event) {
    keyboard[event.keyCode] = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function storeLevel() {
    localStorage.setItem('level', currentLevel);
}
function incrementLevel() {
    if (currentLevel < levelCount) {
        currentLevel++;
        const levelSelect = document.getElementById('level-select-value');
        levelSelect.innerHTML = currentLevel;
        storeLevel();
    }
    initWorld();
}
function decrementLevel() {
    if (currentLevel - 1 > 0) {
        currentLevel--;
        const levelSelect = document.getElementById('level-select-value');
        levelSelect.innerHTML = currentLevel;
        storeLevel();
    }
    initWorld();
}