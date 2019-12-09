// Instruction by https://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
class BNTree {
    constructor(origin, width, height) { //origin is bottom left corner of boundary
        this.obj = null;

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
        let NW = new BNTree({ x: this.origin.x, y: this.origin.y + new_height }, new_width, new_height);
        let NE = new BNTree({ x: this.origin.x + new_width, y: this.origin.y + new_height }, new_width, new_height);
        let SW = new BNTree({ x: this.origin.x, y: this.origin.y }, new_width, new_height);
        let SE = new BNTree({ x: this.origin.x + new_width, y: this.origin.y }, new_width, new_height);
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
        obj_pos = { x: obj.mesh.position.x, y: obj.mesh.position.y };

        let horizontal_center = this.children.NE.origin.x;
        let vertical_center = this.children.NE.origin.y;

        if (obj_pos.x < horizontal_center && obj_pos.y >= vertical_center) {
            this.insertObj(this.children.NW, obj);
        } else if (obj_pos.x >= horizontal_center && obj_pos.y >= vertical_center) {
            this.insertObj(this.children.NE, obj);
        } else if (obj_pos.x < horizontal_center && obj_pos.y < vertical_center) {
            this.insertObj(this.children.SW, obj);
        } else if (obj_pos.x >= horizontal_center && obj_pos.y < vertical_center) {
            this.insertObj(this.children.SE, obj);
        }
    }

    insertObj(obj) {
        obj_pos = { x: obj.mesh.position.x, y: obj.mesh.position.y };

        if (this.is_empty()) {
            this.obj = obj;
            this.CM_point = obj_pos;
            this.total_mass += obj.mass;
        } else if (this.is_external()) { //external node and not empty
            //Divide region and insert objs to children
            this.divideRegion();
            this.insertQuadrant(this.obj);
            this.insertQuadrant(obj);
            this.obj = null;

            //Calculate new CM
            let new_CM = calCM(this.total_mass, obj.mass, this.CM_point, obj_pos);
            this.CM_point.x = new_CM.x;
            this.CM_point.y = new_CM.y;
            this.total_mass = new_CM.mass;

        } else {
            //Calculate new CM 
            let new_CM = calCM(this.total_mass, obj.mass, this.CM_point, obj_pos);
            this.CM_point.x = new_CM.x;
            this.CM_point.y = new_CM.y;
            this.total_mass = new_CM.mass;

            //Recursively insert in appropriate quadrant
            this.insertQuadrant(obj);
        }
    }

    // TODO : Calculate force to obj
    calForce(obj){
        
    }
}