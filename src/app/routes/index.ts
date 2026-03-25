import express from 'express';
import { UserRoutes } from '../modules/user/user.routes';
import { ProductRoutes } from '../modules/product/product.routes';


const router = express.Router();

const moduleRoutes = [
    
    {
        path: '/user',
        route: UserRoutes
    },
    {
        path: '/product',
        route: ProductRoutes
    }
];

moduleRoutes.forEach(route => router.use(route.path, route.route))

export default router;