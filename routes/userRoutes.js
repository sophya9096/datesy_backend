const router = require("express").Router();
const { check } = require("express-validator");
const imageUpload = require("../middlewares/image-upload");
const userControllers = require("../controllers/userControllers");
const checkAuth = require("../middlewares/check-auth");

router.get("/all", userControllers.all);

router.post("/signup", [check("mobile").not().isEmpty()], userControllers.signup);
router.post("/sign-up-otp", [check("mobile").not().isEmpty()], userControllers.singupOTP);

router.post("/login", [check("mobile").not().isEmpty()], userControllers.login);
router.post("/login-otp", [check("mobile").not().isEmpty()], userControllers.loginOTP);

router.use(checkAuth);

router.post("/get-user", userControllers.getUser);

router.post("/profile", userControllers.profile);
router.post("/edit-profile", userControllers.editProfile);
router.post("/delete-user", userControllers.deleteUser);
router.post("/edit-settings", userControllers.editSettings);

router.post("/new-profiles", userControllers.newProfiles);
router.post("/reactions", userControllers.reactions);
router.post("/get-matches", userControllers.getMatches);

router.post("/who-likes-me", userControllers.whoLikesMe);

router.post("/get-chats", userControllers.getChats);
router.post("/get-messages", userControllers.getMessages);
router.post("/last-message", userControllers.lastMessage);
router.post("/send-message", userControllers.sendMessage);

router.post("/clear-messages", userControllers.clearMessages);
router.post("/delete-chat", userControllers.deleteChat);

module.exports = router;
