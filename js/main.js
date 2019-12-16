var objList = [];
const G = 6.674 * 0.00000000001
var scene = new THREE.Scene();
var c_left = window.innerWidth / - 2;
var c_right = window.innerWidth / 2
var c_top = window.innerHeight / 2
var c_bottom = window.innerHeight / - 2;
var c_zoom_factor = 1;
var camera = new THREE.OrthographicCamera(c_left, c_right, c_top, c_bottom, -1000, 1000);
camera.position.z = 100;
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

//Boundary for BNTree
let BB_width = window.innerWidth;
let BB_height = window.innerHeight;
let adaptive_BB = true; //Bounding box size is varies to fit all objs in the tree.

//Show or hide bounding box
let showBoundingBox = true;
const BBmaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
let BBLineArr = [];

//Realtime or fixed time step
let fixed_timestep = true;
let time_step = 10; //ms

//Brute Force?
let bruteForce = false;

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function addObj(mass = 10e10, vel = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, color = getRandomColor(), static = false) {
    // radius = 0.01*1e-3*Math.pow(mass,1/3);
    radius = 0.3 * Math.log10(mass);
    var geometry = new THREE.CircleGeometry(radius, 32);
    var material = new THREE.MeshBasicMaterial({ color: color });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, 0);
    scene.add(mesh);
    objList.push({ mesh: mesh, mass: mass, vel: vel, acc: null, static: static });
}

function calNewPos(obj_i) {
    let i_pos = obj_i.mesh.position;

    return { x: i_pos.x + obj_i.vel.x * dt + 0.5 * obj_i.acc.x * dt * dt, y: i_pos.y + obj_i.vel.y * dt + 0.5 * obj_i.acc.y * dt * dt };
}

function calNewVel(obj_i, a_new) {
    let i_pos = obj_i.mesh.position;

    return { x: obj_i.vel.x + 0.5 * (obj_i.acc.x + a_new.x) * dt, y: obj_i.vel.y + 0.5 * (obj_i.acc.y + a_new.y) * dt };
}

function boundingBoxGeometryUpdate(root) {
    scene.remove(...BBLineArr);

    BBLineArr.length = 0;
    buildBBLineArr(root);

    scene.add(...BBLineArr);
}

function buildBBLineArr(root) {
    let BBgeometry = new THREE.Geometry();

    BBgeometry.vertices.push(new THREE.Vector3(root.origin.x, root.origin.y, 0));
    BBgeometry.vertices.push(new THREE.Vector3(root.origin.x, root.origin.y + root.height, 0));
    BBgeometry.vertices.push(new THREE.Vector3(root.origin.x + root.width, root.origin.y + root.height, 0));
    BBgeometry.vertices.push(new THREE.Vector3(root.origin.x + root.width, root.origin.y, 0));

    BBLineArr.push(new THREE.LineLoop(BBgeometry, BBmaterial));

    if (root.children != null) {
        buildBBLineArr(root.children.NW);
        buildBBLineArr(root.children.NE);
        buildBBLineArr(root.children.SW);
        buildBBLineArr(root.children.SE);
    }
}

let dt = 0;
var now = window.performance.now();
var prev = null;
//velocity verlet  https://en.wikipedia.org/wiki/Verlet_integration#Velocity_Verlet
function update() {
    now = window.performance.now();
    if (prev == null) {
        dt = 0;
        console.log("Beginning")
    } else {
        if (fixed_timestep) {
            dt = time_step * 1e-3;
        } else {
            dt = (now - prev) * 1e-3;
        }
    }

    for (var i = 0; i < objList.length; i++) {
        let obj_i = objList[i]
        let i_pos = obj_i.mesh.position
        if (obj_i.acc != null) {	//do not update if object just initialize(no accel)
            let pos_new = calNewPos(obj_i);

            i_pos.x = pos_new.x;
            i_pos.y = pos_new.y;
        }
    }

    if (!bruteForce) {
        if (adaptive_BB) {
            BB_width = 0;
            BB_height = 0;
            for (var i = 0; i < objList.length; i++) {
                let obj_i = objList[i]
                let i_pos = obj_i.mesh.position
                if (2 * Math.abs(i_pos.x) > BB_width) {
                    BB_width = 2 * Math.abs(i_pos.x);
                }
                if (2 * Math.abs(i_pos.y) > BB_height) {
                    BB_height = 2 * Math.abs(i_pos.y);
                }
            }
        }

        //Build tree
        var max_depth = 0; //For finding tree depth
        var root = new BNTree({ x: -BB_width / 2, y: -BB_height / 2 }, BB_width, BB_height, 0);
        for (var i = 0; i < objList.length; i++) {
            let obj = objList[i];
            let pos = obj.mesh.position;
            if (pos.x >= -BB_width / 2 && pos.x <= BB_width / 2 && pos.y >= -BB_height / 2 && pos.y <= BB_height / 2) {
                let depth = root.insertObj(objList[i]);
                if (depth > max_depth) {
                    max_depth = depth;
                }
            }
        }

        if (showBoundingBox) {
            boundingBoxGeometryUpdate(root);
        }
    }


    for (var i = 0; i < objList.length; i++) {
        let obj_i = objList[i]

        if (!obj_i.static) {
            let a_sum;
            if (bruteForce) {
                //brute force
                a_sum = { x: 0, y: 0 };

                for (var j = 0; j < objList.length; j++) {
                    let obj_j = objList[j]

                    let a = calAcc(obj_i.mesh.position, obj_j.mesh.position, obj_j.mass);

                    a_sum.x += a.x;
                    a_sum.y += a.y;
                }
            } else {
                a_sum = root.calTotalAcc(obj_i);
            }

            if (obj_i.acc != null) {	//do not update if object just initialize(no accel)
                let vel_new = calNewVel(obj_i, a_sum);

                obj_i.vel.x = vel_new.x;
                obj_i.vel.y = vel_new.y;
            }
            obj_i.acc = a_sum;
        }
    }
    console.log(dt, (window.performance.now() - now), max_depth, BB_width, BB_height);
    //console.log((window.performance.now()-now));  //Loop compute time
    prev = now;
}

function animate() {
    requestAnimationFrame(animate);


    renderer.render(scene, camera);
}

function mouseZoom(e) {
    c_zoom_factor = Math.max(c_zoom_factor + e.deltaY / 1000, 0.1);
    // console.log(e.deltaY, c_zoom_factor);
    camera.left = c_zoom_factor * c_left;
    camera.right = c_zoom_factor * c_right;
    camera.top = c_zoom_factor * c_top;
    camera.bottom = c_zoom_factor * c_bottom;
    camera.updateProjectionMatrix();
    if (!adaptive_BB) {
        let s = new THREE.Vector2();
        renderer.getSize(s);
        BB_width = Math.max(camera.right - camera.left, s.x);
        BB_height = Math.max(camera.top - camera.bottom, s.y);
    }
}

function init() {
    document.body.appendChild(renderer.domElement);
    document.getElementById("canvas").addEventListener("wheel", mouseZoom);

    for (var i = 0; i < 50; i++) {
        //How to generate a random point within a circle of radius R:
        //https://stackoverflow.com/questions/5837572/generate-a-random-point-within-a-circle-uniformly
        let r = 500 * Math.sqrt(Math.random())
        let tt = Math.random() * 2 * Math.PI;
        let px = -1000 + r * Math.cos(tt)
        let py = 0 + r * Math.sin(tt)

        // let max = 14;
        // let min = 6;
        // let mss = Math.pow(10, Math.floor(Math.random() * (max - min + 1) + min));
        // let v = 7 / Math.pow(px * px + py * py, 1 / 4);
        // let size = Math.sqrt(px * px + py * py);
        // addObj(mss, { x: v * (-py) / size, y: v * px / size }, { x: px, y: py });
        addObj(10e14, { x: 0, y: 0 }, { x: px, y: py }, '#FF0000');
    }

    for (var i = 0; i < 100; i++) {
        //How to generate a random point within a circle of radius R:
        //https://stackoverflow.com/questions/5837572/generate-a-random-point-within-a-circle-uniformly
        let r = 500 * Math.sqrt(Math.random())
        let tt = Math.random() * 2 * Math.PI;
        let px = 1000 + r * Math.cos(tt)
        let py = 0 + r * Math.sin(tt)

        // let max = 14;
        // let min = 6;
        // let mss = Math.pow(10, Math.floor(Math.random() * (max - min + 1) + min));
        // let v = 7 / Math.pow(px * px + py * py, 1 / 4);
        // let size = Math.sqrt(px * px + py * py);
        // addObj(mss, { x: v * (-py) / size, y: v * px / size }, { x: px, y: py });
        addObj(10e14, { x: 0, y: 0 }, { x: px, y: py }, '#00FF00');
    }

    // for (var i = 0; i < 100; i++) {
    //     //How to generate a random point within a circle of radius R:
    //     //https://stackoverflow.com/questions/5837572/generate-a-random-point-within-a-circle-uniformly
    //     let r = 500 * Math.sqrt(Math.random())
    //     let tt = Math.random() * 2 * Math.PI;
    //     let px = 0 + r * Math.cos(tt)
    //     let py = 0 + r * Math.sin(tt)

    //     // let max = 14;
    //     // let min = 6;
    //     // let mss = Math.pow(10, Math.floor(Math.random() * (max - min + 1) + min));
    //     // let v = 7 / Math.pow(px * px + py * py, 1 / 4);
    //     // let size = Math.sqrt(px * px + py * py);
    //     // addObj(mss, { x: v * (-py) / size, y: v * px / size }, { x: px, y: py });
    //     addObj(10e14, { x: 0, y: 0 }, { x: px, y: py }, '#00FF00');
    // }

    // addObj(1e13, { x: 0, y: 50 }, { x: -200, y: 0 });
    // addObj(1e16, { x: 0, y: 0 }, { x: 0, y: 0 }, getRandomColor(),false);
    // addObj(1e13, { x: 0, y: -50 }, { x: 100, y: 0 });
    // addObj(1e13, { x: 0, y: 50 }, { x: -300, y: 0 });

    // addObj(1e16, { x: 0, y: 25 }, { x: -100, y: 0 });
    // addObj(1e16, { x: 0, y: -25 }, { x: 100, y: 0 });

    animate();
    window.setInterval(update, 0);
}