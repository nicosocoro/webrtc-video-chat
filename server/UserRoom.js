export const Role = Object.freeze({
    ADMIN: 'admin',
    GUEST: 'guest',
});

export class UserRoom {
    constructor(id, role, ws = null) {
        this.id = id;
        this.role = role;
        this.ws = ws;
    }
}
