// Instruction by https://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
const MAXDEPTH = 50;
const theta = 0.5;
const epsilon2 = Math.pow(3, 2); //parameter for softening the gravity to mitigate singularity problem(velocity go to infinity when distance go to zero)

class BNTree {
    constructor(origin, width, height, depth) { //origin is bottom left corner of boundary
        this.obj_list = [];

        this.depth = depth;

        //Center of mass
        this.CM_point = null; //center of mass point
        this.total_mass = 0;

        //Boundary
        this.origin = origin;
        this.width = width;
        this.height = height;

        //Child node
        this.children = null; //{ NW: BNTree, NE: BNTree, SW: BNTree, SE: BNTree };
    }

    is_empty() {
        return this.CM_point == null;
    }

    is_external() {
        return this.children == null;
    }

    divideRegion() {
        let new_width = 0.5 * this.width;
        let new_height = 0.5 * this.height;
        let new_depth = this.depth + 1;
        let NW = new BNTree({ x: this.origin.x, y: this.origin.y + new_height }, new_width, new_height, new_depth);
        let NE = new BNTree({ x: this.origin.x + new_width, y: this.origin.y + new_height }, new_width, new_height, new_depth);
        let SW = new BNTree({ x: this.origin.x, y: this.origin.y }, new_width, new_height, new_depth);
        let SE = new BNTree({ x: this.origin.x + new_width, y: this.origin.y }, new_width, new_height, new_depth);
        this.children = { NW: NW, NE: NE, SW: SW, SE: SE };
    }

    calCM(m1, m2, pos1, pos2) {
        let total_mass = m1 + m2;
        let x = (pos1.x * m1 + pos2.x * m2) / total_mass;
        let y = (pos1.y * m1 + pos2.y * m2) / total_mass;
        return { x: x, y: y, mass: total_mass };
    }

    //Calculate the quadrant and insert to children
    insertQuadrant(obj) {
        let depth = this.depth; //For debugging //depth of inserted obj

        let obj_pos = { x: obj.mesh.position.x, y: obj.mesh.position.y };

        let horizontal_center = this.children.NE.origin.x;
        let vertical_center = this.children.NE.origin.y;

        if (obj_pos.x < horizontal_center && obj_pos.y >= vertical_center) {
            depth = this.children.NW.insertObj(obj);
        } else if (obj_pos.x >= horizontal_center && obj_pos.y >= vertical_center) {
            depth = this.children.NE.insertObj(obj);
        } else if (obj_pos.x < horizontal_center && obj_pos.y < vertical_center) {
            depth = this.children.SW.insertObj(obj);
        } else if (obj_pos.x >= horizontal_center && obj_pos.y < vertical_center) {
            depth = this.children.SE.insertObj(obj);
        }
        return depth;
    }

    insertObj(obj) {
        let depth = this.depth; //For debugging //depth of inserted obj

        let obj_pos = { x: obj.mesh.position.x, y: obj.mesh.position.y };

        if (this.is_empty()) {
            this.obj_list.push(obj);
            this.CM_point = obj_pos;
            this.total_mass += obj.mass;
        } else if (this.is_external()) { //external node and not empty
            if (this.depth < MAXDEPTH) {
                //Divide region and insert objs to children
                this.divideRegion();
                this.insertQuadrant(this.obj_list[0]);
                depth = this.insertQuadrant(obj);
                this.obj_list = [];
            } else {
                // console.log("Depth Limit reached",this.depth)
                this.obj_list.push(obj);
            }

            //Calculate new CM
            let new_CM = this.calCM(this.total_mass, obj.mass, this.CM_point, obj_pos);
            this.CM_point.x = new_CM.x;
            this.CM_point.y = new_CM.y;
            this.total_mass = new_CM.mass;
        } else {
            //Calculate new CM 
            let new_CM = this.calCM(this.total_mass, obj.mass, this.CM_point, obj_pos);
            this.CM_point.x = new_CM.x;
            this.CM_point.y = new_CM.y;
            this.total_mass = new_CM.mass;

            //Recursively insert in appropriate quadrant
            depth = this.insertQuadrant(obj);
        }

        return depth;
    }

    // TODO : Calculate acc on obj
    calTotalAcc(obj) {
        if (this.is_empty()) {
            return { x: 0, y: 0 };
        }

        if (this.is_external()) {
            let a_sum = { x: 0, y: 0 };
            for (let j = 0; j < this.obj_list.length; j++) {
                let obj_j = this.obj_list[j];
                let a = calAcc(obj.mesh.position, obj_j.mesh.position, obj_j.mass);
                a_sum.x += a.x;
                a_sum.y += a.y;
            }
            return a_sum;
        } else if (Math.max(this.width,this.height) / calDistance(obj.mesh.position, this.CM_point) < theta) {
            return calAcc(obj.mesh.position, this.CM_point, this.total_mass);
        } else {
            let NW_acc = this.children.NW.calTotalAcc(obj);
            let NE_acc = this.children.NE.calTotalAcc(obj);
            let SW_acc = this.children.SW.calTotalAcc(obj);
            let SE_acc = this.children.SE.calTotalAcc(obj);
            return { x: NW_acc.x + NE_acc.x + SW_acc.x + SE_acc.x, y: NW_acc.y + NE_acc.y + SW_acc.y + SE_acc.y };
        }
    }
}

//Calculate acceleration on i by j. 
function calAcc(i_pos, j_pos, j_mass) {
    let r = calDistance(i_pos, j_pos);
    if (r > 0) {
        //See http://www.scholarpedia.org/article/N-body_simulations_(gravitational)
        let r_vec = { x: j_pos.x - i_pos.x, y: j_pos.y - i_pos.y } //distance vector

        //F_scalar = m(i)*a(i) = G*m(i)*m(j) / r(i,j)^2
        //a_scalar = G*m(j) / r(i,j)^2
        //a_vec = a_scalar* (r_vec / r_scalar)
        //a_vec = G*m(j)*r_vec / r(i,j)^3
        let tmp = G * j_mass / Math.pow(r * r + epsilon2, 3 / 2);
        let ax = tmp * r_vec.x; //accel x
        let ay = tmp * r_vec.y; //accel y

        return { x: ax, y: ay };
    }
    return { x: 0, y: 0 };
}

function calDistance(i_pos, j_pos) {
    return Math.sqrt(Math.pow(j_pos.x - i_pos.x, 2) + Math.pow(j_pos.y - i_pos.y, 2));
}