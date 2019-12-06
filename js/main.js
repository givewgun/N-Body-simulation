var objList = [];
const G = 6.674 * 0.00000000001
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const color = 0xFFFFFF;
const intensity = 1;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function addObj(mass = 10, vel = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, static = false, radius = 0.1) {
    var geometry = new THREE.SphereGeometry(radius, 32, 32);
    var material = new THREE.MeshPhongMaterial({ color: getRandomColor() });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, 0);
    scene.add(mesh);
    objList.push({ mesh: mesh, mass: mass, vel: vel, acc: null, static: static });
}

//Calculate acceleration on i by j. 
function calAcc(obj_i, obj_j) {
    let i_pos = obj_i.mesh.position
    let j_pos = obj_j.mesh.position

    let r2 = Math.pow(j_pos.x - i_pos.x, 2) + Math.pow(j_pos.y - i_pos.y, 2); //r^2
    if (r2 > 0) {
        let epsilon2 = Math.pow(0.1, 2); //parameter for softening the gravity to mitigate singularity problem(velocity go to infinity when distance go to zero)
        //See http://www.scholarpedia.org/article/N-body_simulations_(gravitational)
        let r_vec = { x: j_pos.x - i_pos.x, y: j_pos.y - i_pos.y } //distance vector

        //F_scalar = m(i)*a(i) = G*m(i)*m(j) / r(i,j)^2
        //a_scalar = G*m(j) / r(i,j)^2
        //a_vec = a_scalar* (r_vec / r_scalar)
        //a_vec = G*m(j)*r_vec / r(i,j)^3
        let tmp = G * obj_j.mass / Math.pow(r2 + epsilon2, 3 / 2);
        let ax = tmp * r_vec.x; //accel x
        let ay = tmp * r_vec.y; //accel y

        return { x: ax, y: ay };
    }
    return { x: 0, y: 0 };
}

function calNewPos(obj_i) {
    let i_pos = obj_i.mesh.position;

    return { x: i_pos.x + obj_i.vel.x * dt + 0.5 * obj_i.acc.x * dt * dt, y: i_pos.y + obj_i.vel.y * dt + 0.5 * obj_i.acc.y * dt * dt };
}

function calNewVel(obj_i, a_new) {
    let i_pos = obj_i.mesh.position;

    return { x: obj_i.vel.x + 0.5 * (obj_i.acc.x + a_new.x) * dt, y: obj_i.vel.y + 0.5 * (obj_i.acc.y + a_new.y) * dt };
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
        //dt=(now-prev)*1e-3;;
        dt = 5 * 1e-3;
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

    for (var i = 0; i < objList.length; i++) {
        let obj_i = objList[i]

        if (!obj_i.static) {
            let a_sum = { x: 0, y: 0 };

            for (var j = 0; j < objList.length; j++) {
                let obj_j = objList[j]

                let a = calAcc(obj_i, obj_j);

                a_sum.x += a.x;
                a_sum.y += a.y;
            }

            if (obj_i.acc != null) {	//do not update if object just initialize(no accel)
                let vel_new = calNewVel(obj_i, a_sum);

                obj_i.vel.x = vel_new.x;
                obj_i.vel.y = vel_new.y;
            }
            obj_i.acc = a_sum;
        }
    }

    prev = now;
}

function animate() {
    requestAnimationFrame(animate);


    renderer.render(scene, camera);
}

function init() {
    document.body.appendChild(renderer.domElement);

    for (var i = 0; i < 100; i++) {
        addObj(1e10, { x: 0, y: 0 }, { x: (Math.random() - 0.5) * 7, y: (Math.random() - 0.5) * 7 });
    }

    // addObj(1e10, { x: 0, y: 7 }, { x: -2, y: 0 });
    // addObj(1e12, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
    // addObj(1e10, { x: 0, y: -7 }, { x: 1, y: 0 });
    // addObj(1e10, { x: 0, y: 5 }, { x: -3, y: 0 });

    // addObj(1e10,{x:0,y:0.2},{x:-2,y:0});
    // addObj(1e10,{x:0,y:-0.2},{x:2,y:0});

    animate();
    window.setInterval(update, 5);
}