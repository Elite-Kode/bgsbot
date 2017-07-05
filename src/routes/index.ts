import { Router, Request, Response, NextFunction } from 'express';

export class IndexRouter {
    router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    public getAll(req: Request, res: Response, next: NextFunction) {
        res.send('Hello World');
    }

    init() {
        this.router.get('/', this.getAll);
    }
}

const indexRoutes = new IndexRouter();

export default indexRoutes.router;
