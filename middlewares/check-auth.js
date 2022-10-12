const HttpError = require("../models/http-error").HttpError;
const jwt = require("jsonwebtoken");

const User = require("../models/user");

module.exports = async (req, res, next) => {
    if (req.method === "OPTIONS") {
        return next();
    }
    try {
        // const token = req.headers.authorization.split(" ")[1];
        // if (!token) {
        //     throw new HttpError("Authentication failed", 404);
        // }
        // const decodedToken = jwt.verify(token, process.env.JWT_USER_SECKEY);
        // if (decodedToken.userId !== req.body.userId) {
        //     throw new HttpError("Authentication failed", 404);
        // }
        let existingUser;
        try {
            // existingUser = await User.findOne({ _id: decodedToken.userId });
            existingUser = await User.findOne({ _id: req.body.userId });
            req.userData = { existingUser };
            // req.userData = { userId: decodedToken.userId, existingUser };
        } catch (error) {
            return next(new HttpError("Something went wrong...", 401));
        }

        if (!existingUser) {
            return next(new HttpError("Authentication failed", 404));
        }
        next();
    } catch (error) {
        return next(new HttpError("Authentication failed", 404));
    }
};
