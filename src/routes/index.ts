import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import announcementsRouter from "./announcements.js";
import authRouter from "./auth.js";
import playersRouter from "./players.js";
import ordersRouter from "./orders.js";
import statsRouter from "./stats.js";
import siteSettingsRouter from "./siteSettings.js";
import storeItemsRouter from "./storeItems.js";
import gamemodesRouter from "./gamemodes.js";
import voteSitesRouter from "./voteSites.js";
import faqItemsRouter from "./faqItems.js";
import couponsRouter from "./coupons.js";
import staffApplicationsRouter from "./staffApplications.js";
import rulesRouter from "./rules.js";
import banAppealsRouter from "./banAppeals.js";
import partnersRouter from "./partners.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/announcements", announcementsRouter);
router.use("/admin", authRouter);
router.use("/players", playersRouter);
router.use("/orders", ordersRouter);
router.use("/stats", statsRouter);
router.use("/settings", siteSettingsRouter);
router.use("/store-items", storeItemsRouter);
router.use("/gamemodes", gamemodesRouter);
router.use("/vote-sites", voteSitesRouter);
router.use("/faq", faqItemsRouter);
router.use("/coupons", couponsRouter);
router.use("/staff-applications", staffApplicationsRouter);
router.use("/rules", rulesRouter);
router.use("/ban-appeals", banAppealsRouter);
router.use("/partners", partnersRouter);

export default router;
