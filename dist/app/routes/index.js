"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_routes_1 = require("../modules/user/user.routes");
const product_routes_1 = require("../modules/product/product.routes");
const auth_routes_1 = require("../modules/auth/auth.routes");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const order_routes_1 = require("../modules/order/order.routes");
const admin_routes_1 = require("../modules/admin/admin.routes");
const router = express_1.default.Router();
router.use(rateLimiter_1.apiLimiter);
const moduleRoutes = [
    {
        path: '/user',
        route: user_routes_1.UserRoutes
    },
    {
        path: '/product',
        route: product_routes_1.ProductRoutes
    },
    {
        path: '/auth',
        route: auth_routes_1.AuthRoutes
    },
    {
        path: '/order',
        route: order_routes_1.OrderRoutes
    },
    {
        path: "/admin",
        route: admin_routes_1.AdminRoutes
    },
];
moduleRoutes.forEach(route => router.use(route.path, route.route));
exports.default = router;
