import express from 'express';
import { UserRoutes } from '../modules/user/user.routes';
import { ProductRoutes } from '../modules/product/product.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { apiLimiter } from '../middlewares/rateLimiter';
import { OrderRoutes } from '../modules/order/order.routes';
import { AdminRoutes } from '../modules/admin/admin.routes';


const router = express.Router();

router.use(apiLimiter);

const moduleRoutes = [
    
    {
        path: '/user',
        route: UserRoutes
    },
    {
        path: '/product',
        route: ProductRoutes
    },
    {
        path: '/auth',
        route: AuthRoutes
    },
    {
        path: '/order',
        route: OrderRoutes
    },
    {
        path : "/admin",
        route : AdminRoutes
    },
];

moduleRoutes.forEach(route => router.use(route.path, route.route))

export default router;