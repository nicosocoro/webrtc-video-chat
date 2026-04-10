export const createRouter = () => {
    const routes = [];

    const register = (method, pattern, handler) => {
        routes.push({ method, pattern: new RegExp(`^${pattern}$`), handler });
    };

    const dispatch = (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        for (const route of routes) {
            if (req.method !== route.method) continue;
            const match = req.url.match(route.pattern);
            if (match) {
                req.params = match.groups ?? {};
                route.handler(req, res);
                return;
            }
        }
        res.writeHead(404);
        res.end();
    };

    return {
        post: (pattern, handler) => register('POST', pattern, handler),
        get:  (pattern, handler) => register('GET',  pattern, handler),
        dispatch,
    };
};
