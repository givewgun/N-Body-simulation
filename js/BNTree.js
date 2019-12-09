// Instruction by https://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
const MAXDEPTH = 50;

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
        let obj_pos = { x: obj.mesh.position.x, y: obj.mesh.position.y };

        let horizontal_center = this.children.NE.origin.x;
        let vertical_center = this.children.NE.origin.y;

        if (obj_pos.x < horizontal_center && obj_pos.y >= vertical_center) {
            this.children.NW.insertObj(obj);
        } else if (obj_pos.x >= horizontal_center && obj_pos.y >= vertical_center) {
            this.children.NE.insertObj(obj);
        } else if (obj_pos.x < horizontal_center && obj_pos.y < vertical_center) {
            this.children.SW.insertObj(obj);
        } else if (obj_pos.x >= horizontal_center && obj_pos.y < vertical_center) {
            this.children.SE.insertObj(obj);
        }
    }

    insertObj(obj) {
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
                this.insertQuadrant(obj);
                this.obj_list = [];
            } else {
                console.log("Depth Limit reached",this.depth)
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
            this.insertQuadrant(obj);
        }
    }

    // TODO : Calculate force to obj
    calForce(obj) {
        if (this.is_external()) {

        }
    }
}