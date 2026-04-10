export class Room {
    constructor(id) {
        this.id = id;
        this.members = new Map(); // userId -> UserRoom
    }

    add(userRoom) {
        this.members.set(userRoom.id, userRoom);
    }

    remove(userId) {
        this.members.delete(userId);
    }

    get(userId) {
        return this.members.get(userId);
    }

    get size() {
        return this.members.size;
    }
}
