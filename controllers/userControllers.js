var http = require("https");
var fs = require("fs");
var path = require("path");
const User = require("../models/user");
const Chat = require("../models/chat");
const Message = require("../models/message");
const HttpError = require("../models/http-error").HttpError;
const formatMessage = require("../utils/message");

const io = require("../socket");

const { validationResult } = require("express-validator");
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const sendGrid = require("nodemailer-sendgrid-transport");
const client = require("twilio")(process.env.ACCOUNTSID, process.env.AUTHTOKEN);

const AWS = require("aws-sdk");
const { fail } = require("assert");
const user = require("../models/user");
const ID = "AKIAJP3OXKCZZTES7T4Q";
const SECRET = "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";
const BUCKET_NAME_IMAGES = "images-datesy";
const s3 = new AWS.S3({
    accessKeyId: ID,
    secretAccessKey: SECRET,
});
const transporter = nodemailer.createTransport(
    sendGrid({
        auth: {
            api_key: `${process.env.SEND_GRID_API}`,
        },
    }),
);

exports.all = async (req, res, next) => {
    let users = await User.find();
    res.status(200).json({ users });
};

exports.signup = async (req, res, next) => {
    const { mobile, resend, email, isGoogle, isFacebook } = req.body;
    console.log("mobile", mobile, email);
    const otpGenerated = parseInt(Math.floor(1000 + Math.random() * 9000));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.errors.map((err) => {
            if (err.param === "mobile" && !isGoogle && isFacebook) {
                return next(new HttpError("Please provide a valid mobile number", 422));
            }
        });
    }

    let existingUser;

    if (email && !mobile) {
        try {
            existingUser = await User.findOne({ email });
        } catch (error) {
            return next(new HttpError("Something went wrong", 500));
        }
        if (existingUser && existingUser.deleted) {
            res.status(200).json({ deleted: true });
            return;
        }
        if (!existingUser) {
            res.status(200).json({ new: true });
            return;
        }
        if (existingUser && existingUser.verified) {
            let token;
            try {
                token = jwt.sign({ userId: existingUser._id, mobile: existingUser.mobile }, process.env.JWT_USER_SECKEY);
            } catch (error) {
                return next(new HttpError("Something went wrong", 500));
            }
            res.status(200).json({ otp: true, token, userId: existingUser._id });
            return;
        }
    }

    if (email && mobile) {
        try {
            existingUser = await User.findOne({ mobile });
        } catch (error) {
            return next(new HttpError("Something went wrong", 500));
        }
        if (existingUser && existingUser.deleted) {
            res.status(200).json({ deleted: true });
            return;
        }
        if (existingUser && existingUser.email !== email) {
            return next(new HttpError("User exists already", 500));
        }
        try {
            existingUser = await User.findOne({ email });
        } catch (error) {
            return next(new HttpError("Something went wrong", 500));
        }
        if (existingUser && existingUser.deleted) {
            res.status(200).json({ deleted: true });
            return;
        }
        if (existingUser && existingUser.mobile !== mobile) {
            return next(new HttpError("User exists already", 500));
        }
    }

    try {
        if (mobile && !email) {
            existingUser = await User.findOne({ mobile });
        }
        if (existingUser && existingUser.deleted) {
            res.status(200).json({ deleted: true });
            return;
        }
        if (email && mobile) {
            existingUser = await User.findOne({ mobile, email });
        }
        if (existingUser && existingUser.deleted) {
            res.status(200).json({ deleted: true });
            return;
        }
    } catch (error) {
        console.log("error", error);
        return next(new HttpError("Something went wrong", 500));
    }

    let user;
    if (existingUser && !existingUser.verified) {
        console.log("IF");
        existingUser.otp = otpGenerated;
        try {
            user = await existingUser.save();
            if (mobile)
                client.messages
                    .create({
                        to: `+92${mobile.toString().substr(mobile.length - 10)}`,
                        from: process.env.PHONENUMBER,
                        body: `Your OTP is ${otpGenerated}`,
                    })
                    .then((message) => console.log(message.sid));
        } catch (error) {
            return next(new HttpError("Something went wrong, signing up failed", 500));
        }
        res.status(200).json({ success: user.otp ? true : false, new: true });
        return;
    } else if (existingUser) {
        console.log("IF 2");
        existingUser.otp = otpGenerated;
        try {
            user = await existingUser.save();
            if (mobile)
                client.messages
                    .create({
                        to: `+92${mobile.toString().substr(mobile.length - 10)}`,
                        from: process.env.PHONENUMBER,
                        body: `Your OTP is ${otpGenerated}`,
                    })
                    .then((message) => console.log(message.sid));
        } catch (error) {
            return next(new HttpError("Something went wrong, signing up failed", 500));
        }
        res.status(200).json({ success: user.otp ? true : false, new: false });
        return;
    } else {
        console.log("Else");
        if (mobile) {
            user = new User({
                mobile,
                otp: otpGenerated,
            });
        }
        if (email && mobile) {
            user = new User({
                email,
                mobile,
                otp: otpGenerated,
            });
        }
        try {
            const sess = await mongoose.startSession();
            sess.startTransaction();
            user = await user.save({ session: sess });
            if (mobile)
                client.messages
                    .create({
                        to: `+92${mobile.toString().substr(mobile.length - 10)}`,
                        from: process.env.PHONENUMBER,
                        body: `Your OTP is ${otpGenerated}`,
                    })
                    .then((message) => console.log(message.sid));
            await sess.commitTransaction();
        } catch (error) {
            console.log("error", error);
            return next(new HttpError("Something went wrong, signing up failed", 500));
        }
        res.status(200).json({ success: user.otp ? true : false, new: true });
    }
};
exports.singupOTP = async (req, res, next) => {
    const { mobile, otp, resend } = req.body;
    console.log("mobile, otp, resend", mobile, otp, resend);
    const otpGenerated = parseInt(Math.floor(1000 + Math.random() * 9000));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.errors.map((err) => {
            if (err.param === "mobile") {
                return next(new HttpError("Please provide a valid mobile number", 422));
            }
        });
    }

    let existingUser;
    try {
        existingUser = await User.findOne({ mobile });
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }

    if (!existingUser) {
        return next(new HttpError("User with provided mobile number does not exist", 500));
    }

    // if (existingUser.verified) {
    //     return next(new HttpError("User with provided mobile number exists already", 500));
    // }

    let otpTrue, token, userId;
    if (resend) {
        existingUser.otp = otpGenerated;
        client.messages
            .create({
                to: mobile,
                from: process.env.PHONENUMBER,
                body: `Your OTP is ${otpGenerated}`,
            })
            .then((message) => console.log(message.sid));
        try {
            await existingUser.save();
        } catch (error) {
            return next(new HttpError("Something went wrong", 500));
        }
    } else {
        // if (existingUser.otp === parseInt(otp)) {
        if (parseInt(otp) === 0000) {
            existingUser.otp = undefined;
            // existingUser.verified = true;
            try {
                await existingUser.save();
            } catch (error) {
                return next(new HttpError("Something went wrong", 500));
            }

            try {
                userId = await existingUser.save();
            } catch (error) {
                return next(new HttpError("Something went wrong", 500));
            }
            try {
                token = jwt.sign({ userId: userId._id, mobile: userId.mobile }, process.env.JWT_USER_SECKEY);
            } catch (error) {
                return next(new HttpError("Something went wrong", 500));
            }
            otpTrue = true;
        } else {
            otpTrue = false;
        }
    }

    res.status(200).json({ otp: otpTrue ? true : false, token, userId: userId._id });
};

exports.login = async (req, res, next) => {
    const { mobile, email } = req.body;
    const otpGenerated = parseInt(Math.floor(1000 + Math.random() * 9000));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.errors.map((err) => {
            if (err.param === "mobile") {
                return next(new HttpError("Please provide a valid mobile number", 422));
            }
        });
    }

    let existingUser;
    try {
        existingUser = await User.findOne({ mobile });
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }

    if (!existingUser) {
        return next(new HttpError("User with provided mobile number does not exist", 500));
    }

    if (existingUser && !existingUser.verified) {
        return next(new HttpError("User with provided mobile number does not exist", 500));
    }

    let user;
    existingUser.loginOtp = otpGenerated;
    try {
        user = await existingUser.save();
        client.messages
            .create({
                to: mobile,
                from: process.env.PHONENUMBER,
                body: `Your OTP is ${otpGenerated}`,
            })
            .then((message) => console.log(message.sid));
    } catch (error) {
        return next(new HttpError("Something went wrong, signing up failed", 500));
    }

    res.status(200).json({ success: user.loginOtp ? true : false });
};
exports.loginOTP = async (req, res, next) => {
    const { mobile, otp, resend } = req.body;
    const otpGenerated = parseInt(Math.floor(1000 + Math.random() * 9000));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        errors.errors.map((err) => {
            if (err.param === "mobile") {
                return next(new HttpError("Please provide a valid mobile number", 422));
            }
        });
    }

    let existingUser;
    try {
        existingUser = await User.findOne({ mobile });
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }

    if (!existingUser) {
        return next(new HttpError("User with provided mobile number does not exist", 500));
    }

    if (!existingUser.verified) {
        return next(new HttpError("User with provided mobile number does not exist", 500));
    }

    let otpTrue, token, userId;
    if (resend) {
        existingUser.loginOtp = otpGenerated;
        client.messages
            .create({
                to: mobile,
                from: process.env.PHONENUMBER,
                body: `Your OTP is ${otpGenerated}`,
            })
            .then((message) => console.log(message.sid));
        try {
            await existingUser.save();
        } catch (error) {
            return next(new HttpError("Something went wrong", 500));
        }
    } else {
        // if (existingUser.loginOtp === parseInt(otp)) {
        if (parseInt(otp) === 0000) {
            existingUser.loginOtp = undefined;
            userId = existingUser._id;
            try {
                token = jwt.sign({ userId: existingUser._id, mobile: existingUser.mobile }, process.env.JWT_USER_SECKEY);
            } catch (error) {
                return next(new HttpError("Something went wrong", 500));
            }
            try {
                await existingUser.save();
            } catch (error) {
                return next(new HttpError("Something went wrong", 500));
            }
            otpTrue = true;
        } else {
            otpTrue = false;
        }
    }

    res.status(200).json({ otp: otpTrue ? true : false, token, userId });
};

exports.getUser = async (req, res, next) => {
    const { existingUser } = req.userData;
    res.status(200).json({ existingUser });
};
exports.profile = async (req, res, next) => {
    let profileSubmit;
    const { existingUser } = req.userData;
    const { email, name, dob, gender, school, shul, rabbi, coords, picture } = req.body;
    console.log("email, name, dob, gender, school, shul, rabbi, coords", email, name, dob, gender, school, shul, rabbi, coords, picture);

    let checkingEmail;
    try {
        checkingEmail = await User.findOne({ email });
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }

    // if (checkingEmail) {
    //     return next(new HttpError("Another account has been associated with the provided email", 401));
    // }
    existingUser.email = email;
    existingUser.name = name;
    existingUser.dob = dob;
    existingUser.gender = gender;
    existingUser.school = school;
    existingUser.shul = shul;
    existingUser.rabbi = rabbi;
    existingUser.superLikes = 3;
    existingUser.maxDistance = 50;
    existingUser.showMyAge = true;
    existingUser.showMe = true;
    existingUser.shareMyFeed = true;
    existingUser.recommendedSort = true;
    existingUser.readReceipt = true;
    existingUser.showDistanceIn = "km";
    existingUser.ageRange = { min: 18, max: 41 };
    existingUser.picture = [...picture];
    existingUser.verified = true;
    existingUser.location = coords
        ? {
              type: "Point",
              coordinates: [parseFloat(coords.lng), parseFloat(coords.lat)],
          }
        : {
              type: "Point",
              coordinates: [0, 0],
          };
    try {
        profileSubmit = await existingUser.save();
    } catch (error) {
        console.log("error", error);
        return next(new HttpError("Something went wrong", 401));
    }
    console.log("req.existingUser", existingUser);
    res.status(200).json({ success: profileSubmit.gender ? true : false });
};
exports.editProfile = async (req, res, next) => {
    let profileSubmit;
    const { existingUser } = req.userData;
    const { smartPhotos, about, passions, jobTitle, company, school, gender, city, showMyAge, myDistanceInvisible } = req.body;
    console.log("smartPhotos", smartPhotos, about, passions, jobTitle, company, school, gender, city, showMyAge, myDistanceInvisible);

    existingUser.smartPhotos = smartPhotos;
    existingUser.about = about;
    existingUser.passions = passions;
    existingUser.jobTitle = jobTitle;
    existingUser.company = company;
    existingUser.city = city;
    existingUser.showMyAge = showMyAge;
    existingUser.myDistanceInvisible = myDistanceInvisible;
    existingUser.school = school;
    existingUser.gender = gender;
    try {
        profileSubmit = await existingUser.save();
    } catch (error) {
        return next(new HttpError("Something went wrong", 401));
    }
    console.log("req.existingUser", existingUser);
    res.status(200).json({ success: profileSubmit.gender ? true : false });
};
exports.deleteUser = async (req, res, next) => {
    const { existingUser } = req.userData;
    let user;
    existingUser.deleted = true;
    try {
        user = await existingUser.save();
    } catch (error) {
        return next(new HttpError("Something went wrong", 401));
    }

    res.status(200).json({ deleted: user.deleted ? true : false });
};
exports.editSettings = async (req, res, next) => {
    let profileSubmit;
    const { existingUser } = req.userData;
    const {
        coords,
        goGlobal,
        maxDistance,
        ageRange,
        showMe,
        shareMyFeed,
        recommendedSort,
        username,
        showDistanceIn,
        readReceipt,
    } = req.body;

    let checkingUsername;
    try {
        checkingUsername = await User.findOne({ $or: [{ _id: { $ne: existingUser._id } }], username });
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }

    if (checkingUsername) {
        return next(new HttpError("Username is taken", 401));
    }

    // if (checkingUsername && existingUser.username !== username) {
    //     return next(new HttpError("Username is taken", 401));
    // }
    // if (checkingUsername) {
    //     return next(new HttpError("Username is taken", 401));
    // }

    existingUser.location = coords
        ? {
              type: "Point",
              coordinates: [parseFloat(coords.lng), parseFloat(coords.lat)],
          }
        : {
              type: "Point",
              coordinates: [0, 0],
          };
    existingUser.goGlobal = goGlobal;
    existingUser.maxDistance = maxDistance;
    existingUser.ageRange = { min: parseInt(ageRange.min), max: parseInt(ageRange.max) };
    existingUser.showMe = showMe;
    existingUser.shareMyFeed = shareMyFeed;
    existingUser.recommendedSort = recommendedSort;
    existingUser.username = username ? username : existingUser.username;
    existingUser.showDistanceIn = showDistanceIn;
    existingUser.readReceipt = readReceipt;
    try {
        profileSubmit = await existingUser.save();
    } catch (error) {
        return next(new HttpError("Something went wrong", 401));
    }
    console.log("req.existingUser", existingUser);
    res.status(200).json({ success: profileSubmit.gender ? true : false });
};

exports.newProfiles = async (req, res, next) => {
    const skip = req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0;
    const { existingUser } = req.userData;
    console.log("userId", req.body.userId);
    let users;
    let meters = existingUser.showDistanceIn === "km" ? existingUser.maxDistance * 1000 : existingUser.maxDistance * 1609.34;
    try {
        users = await User.find(
            {
                $and: [
                    { _id: { $ne: existingUser._id } },
                    { $or: [{ _id: { $nin: existingUser.superliked } }] },
                    { $or: [{ _id: { $nin: existingUser.liked } }] },
                    { $or: [{ _id: { $nin: existingUser.disliked } }] },
                ],
                verified: true,
                location: {
                    $near: {
                        $maxDistance: meters,
                        $geometry: {
                            type: "Point",
                            coordinates: [existingUser.location.coordinates[0], existingUser.location.coordinates[1]],
                        },
                    },
                },
                gender: existingUser.gender === "m" ? "f" : "m",
            },
            undefined,
            {
                skip,
                limit: 10,
            },
        );
    } catch (error) {
        console.log("error", error);
        return next(new HttpError("Something went wrong", 500));
    }
    res.status(200).json({ users });
};

exports.reactions = async (req, res, next) => {
    const { existingUser } = req.userData;
    const { reactions, undo } = req.body;
    console.log("reactions", reactions, existingUser._id);
    let superLikes = existingUser.superLikes;
    const sess = await mongoose.startSession();
    sess.startTransaction();

    const liked = [],
        disliked = [],
        superliked = [];
    let likedExisting = [...existingUser.liked],
        dislikedExisting = [...existingUser.disliked],
        superlikedExisting = [...existingUser.superliked];
    reactions.map(async (i) => {
        if (Object.values(i)[0] === "l") {
            liked.push(Object.keys(i)[0]);
            if (undo) {
                likedExisting = likedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                dislikedExisting = dislikedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                let lA = superlikedExisting.length;
                superlikedExisting = superlikedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                let lB = superlikedExisting.length;
                if (lA !== lB) superLikes = superLikes + 1;
            }
        }
        if (Object.values(i)[0] === "d") {
            disliked.push(Object.keys(i)[0]);
            if (undo) {
                likedExisting = likedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                dislikedExisting = dislikedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                let lA = superlikedExisting.length;
                superlikedExisting = superlikedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                let lB = superlikedExisting.length;
                if (lA !== lB) superLikes = superLikes + 1;
            }
        }
        if (Object.values(i)[0] === "s") {
            if (undo) {
                likedExisting = likedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                dislikedExisting = dislikedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                let lA = superlikedExisting.length;
                superlikedExisting = superlikedExisting.filter((k) => k.toString() !== Object.keys(i)[0].toString());
                let lB = superlikedExisting.length;
                if (lA !== lB) superLikes = superLikes + 1;
            }
            if (superLikes > 0) {
                superliked.push(Object.keys(i)[0]);
                superLikes = superLikes - 1;
            }
        }
        let userToMatch;
        try {
            userToMatch = await User.findOne({
                _id: Object.keys(i)[0],
                $or: [{ $or: [{ liked: existingUser._id }] }, { $or: [{ superliked: existingUser._id }] }],
            });
        } catch (error) {
            return next(new HttpError("Something went wrong", 500));
        }
        if (userToMatch) {
            io.getIO().emit("newMatch", { userToMatch });
            const createdChat = new Chat({
                user1: existingUser._id,
                user2: userToMatch._id,
                user1Name: existingUser.name,
                user2Name: userToMatch.name,
                user1SeenChat: false,
                user2SeenChat: false,
                initiated: false,
            });
            try {
                createdChat.save({ session: sess });
            } catch (error) {
                return next(new HttpError("Something went wrong...", 401));
            }
        }
    });
    existingUser.liked = [...likedExisting, ...liked];
    existingUser.disliked = [...dislikedExisting, ...disliked];
    existingUser.superliked = [...superlikedExisting, ...superliked];
    existingUser.superLikes = superLikes;
    let user;
    try {
        user = await existingUser.save({ session: sess });
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }
    await sess.commitTransaction();
    res.status(200).json({ success: user._id ? true : false });
};

exports.whoLikesMe = async (req, res, next) => {
    const { existingUser } = req.userData;
    const skip = req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0;
    let users;
    try {
        users = await User.find(
            {
                $and: [
                    { _id: { $ne: existingUser._id } },
                    { $or: [{ _id: { $nin: existingUser.superliked } }] },
                    { $or: [{ _id: { $nin: existingUser.liked } }] },
                    { $or: [{ _id: { $nin: existingUser.disliked } }] },
                ],
                $or: [{ $or: [{ superliked: existingUser._id }] }, { $or: [{ liked: existingUser._id }] }],
                // $and: [{ $or: [{ superliked: existingUser._id }] }],
                // $and: [{ $or: [{ liked: existingUser._id }] }],
                verified: true,
            },
            undefined,
            {
                skip,
                limit: 10,
            },
        );
    } catch (error) {
        console.log("error", error);
        return next(new HttpError("Something went wrong", 500));
    }

    res.status(200).json({ users });
};

exports.getMatches = async (req, res, next) => {
    const skip = req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0;
    const { existingUser } = req.userData;
    console.log("existingUser", existingUser.name);
    let matches;
    try {
        matches = await Chat.find(
            {
                $or: [{ $or: [{ user1: existingUser._id }] }, { $or: [{ user2: existingUser._id }] }],
                initiated: false,
            },
            undefined,
            { skip, limit: 10 },
        )
            .populate({
                path: "user1",
                select: "name picture lastSeen _id",
                // match: { user1: existingUser._id },
            })
            .populate({
                path: "user2",
                select: "name picture lastSeen _id",
                // match: { user2: existingUser._id },
            });
    } catch (error) {
        console.log("error", error);
        return next(new HttpError("Something went wrong...", 401));
    }
    res.status(200).json({ matches });
};

exports.getChats = async (req, res, next) => {
    const skip = req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0;
    const { existingUser } = req.userData;
    const { query } = req.body;
    const regex = new RegExp(escapeRegex(query ? query : ""), "gi");
    let chats;
    try {
        chats = await Chat.find(
            {
                $or: [{ $or: [{ user1: existingUser._id }] }, { $or: [{ user2: existingUser._id }] }],
                $and: [{ $or: [{ user1DeleteChat: !existingUser._id }] }, { $or: [{ user2DeleteChat: !existingUser._id }] }],
                initiated: true,
            },
            undefined,
            { skip, limit: 10 },
        )
            .populate({
                path: "user1",
                select: "name picture lastSeen _id",
                // match: { user1: existingUser._id },
            })
            .populate({
                path: "user2",
                select: "name picture lastSeen _id",
                // match: { user2: existingUser._id },
            })
            .sort({ updatedAt: -1 });
    } catch (error) {
        return next(new HttpError("Something went wrong...", 401));
    }
    res.status(200).json({ chats });
};

exports.lastMessage = async (req, res, next) => {
    const skip = req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0;
    const { existingUser } = req.userData;
    const { cid } = req.body;
    let messages, chat, user1, user2;
    try {
        chat = await Chat.findOne({
            _id: cid,
        });
    } catch (error) {
        return next(new HttpError("Something went wrong...", 401));
    }
    if (chat) {
        user1 = chat.user1.toString() === existingUser._id.toString() ? true : false;
        user2 = chat.user2.toString() === existingUser._id.toString() ? true : false;
        try {
            if (user1) {
                console.log("user1");
                messages = await Message.find({ cid, $or: [{ user1Deleted: undefined }, { user1Deleted: false }] }, undefined, {
                    skip,
                    limit: 7,
                }).sort({ createdAt: -1 });
            }
            if (user2) {
                console.log("user2");
                messages = await Message.find({ cid, $or: [{ user2Deleted: undefined }, { user2Deleted: false }] }, undefined, {
                    skip,
                    limit: 1,
                }).sort({ createdAt: -1 });
            }
        } catch (error) {
            console.log("errror", error);
            return next(new HttpError("Something went wrong...", 401));
        }
        res.status(200).json({ messages });
    } else {
        return next(new HttpError("Something went wrong...", 401));
    }
};
exports.getMessages = async (req, res, next) => {
    const skip = req.query.skip && /^\d+$/.test(req.query.skip) ? Number(req.query.skip) : 0;
    const { existingUser } = req.userData;
    const { cid } = req.body;
    let messages, chat, user1, user2;
    try {
        chat = await Chat.findOne({
            _id: cid,
        });
    } catch (error) {
        return next(new HttpError("Something went wrong...", 401));
    }
    if (chat) {
        user1 = chat.user1.toString() === existingUser._id.toString() ? true : false;
        user2 = chat.user2.toString() === existingUser._id.toString() ? true : false;
        try {
            if (user1) {
                console.log("user1");
                messages = await Message.find({ cid, $or: [{ user1Deleted: undefined }, { user1Deleted: false }] }, undefined, {
                    skip,
                    limit: 7,
                }).sort({ createdAt: -1 });
            }
            if (user2) {
                console.log("user2");
                messages = await Message.find({ cid, $or: [{ user2Deleted: undefined }, { user2Deleted: false }] }, undefined, {
                    skip,
                    limit: 7,
                }).sort({ createdAt: -1 });
            }
        } catch (error) {
            console.log("errror", error);
            return next(new HttpError("Something went wrong...", 401));
        }
        res.status(200).json({ messages });
    } else {
        return next(new HttpError("Something went wrong...", 401));
    }
};

exports.sendMessage = async (req, res, next) => {
    const { existingUser } = req.userData;
    const { from, to, message, cid, emoji } = req.body;

    console.log("from, to, message, cid", from, to, message, cid);
    let chat, user2, sentMessage, editedChat;

    try {
        chat = await Chat.findOne({
            $and: [{ $or: [{ user1: from }, { user1: to }] }, { $or: [{ user2: to }, { user2: from }] }],
        });
    } catch (error) {
        return next(new HttpError("Something went wrong...", 401));
    }

    if (!chat) {
        try {
            user2 = await User.findOne({ _id: to });
        } catch (error) {
            return next(new HttpError("Something went wrong...", 401));
        }

        if (!user2) {
            return next(new HttpError("Something went wrong...", 401));
        }
        const sess = await mongoose.startSession();
        sess.startTransaction();
        const createdChat = new Chat({
            user1: from,
            user2: to,
            user1Name: existingUser.name,
            user2Name: user2.name,
            user1SeenChat: true,
            user2SeenChat: false,
            user1DeleteChat: false,
            user2DeleteChat: false,
            initiated: true,
        });
        try {
            chat = await createdChat.save({ session: sess });
        } catch (error) {
            return next(new HttpError("Something went wrong...", 401));
        }
        const createdMessage = new Message({
            cid: chat._id,
            message,
            sender: from,
        });
        try {
            sentMessage = await createdMessage.save({ session: sess });
        } catch (error) {
            return next(new HttpError("Something went wrong...", 401));
        }
        await sess.commitTransaction();
        if (sentMessage._id) {
            io.getIO().emit("newMessage", formatMessage(from, message, to, chat._id));
        }
    } else {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        const createdMessage = new Message({
            cid: chat._id,
            message,
            sender: from,
        });
        try {
            sentMessage = await createdMessage.save({ session: sess });
        } catch (error) {
            return next(new HttpError("Something went wrong...", 401));
        }
        chat.user1SeenChat = chat.user1.toString() === from.toString() ? true : false;
        chat.user2SeenChat = chat.user2.toString() === from.toString() ? true : false;
        chat.user1DeleteChat = false;
        chat.user2DeleteChat = false;
        chat.initiated = true;
        try {
            editedChat = await chat.save({ session: sess });
        } catch (error) {
            return next(new HttpError("Something went wrong...", 401));
        }
        await sess.commitTransaction();
        if (sentMessage._id) {
            console.log("asd");
            io.getIO().emit("newMessage", formatMessage(from, message, to, chat._id));
        }
    }
    res.status(200).json({ success: sentMessage._id ? true : false });
};

exports.clearMessages = async (req, res, next) => {
    const { existingUser } = req.userData;
    const { cid } = req.body;
    let messages, chat, user1, user2;
    try {
        messages = await Message.find({ cid });
    } catch (error) {
        return next(new HttpError("Something went wrong...", 401));
    }
    try {
        chat = await Chat.findOne({ _id: cid });
    } catch (error) {
        return next(new HttpError("Something went wrong...", 401));
    }
    if (chat) {
        user1 = chat.user1.toString() === existingUser._id.toString() ? true : false;
        user2 = chat.user2.toString() === existingUser._id.toString() ? true : false;
        messages.map(async (i) => {
            i.user1Deleted = user1 && true;
            i.user2Deleted = user2 && true;
            try {
                await i.save();
            } catch (error) {
                return next(new HttpError("Something went wrong...", 401));
            }
        });
        res.status(200).json({ success: true });
    } else {
        return next(new HttpError("Something went wrong...", 401));
    }
};
exports.deleteChat = async (req, res, next) => {
    const { existingUser } = req.userData;
    const { cid } = req.body;
    let messages, chat, user1, user2;
    try {
        messages = await Message.find({ cid });
    } catch (error) {
        return next(new HttpError("Something went wrong...", 401));
    }
    try {
        chat = await Chat.findOne({ _id: cid });
    } catch (error) {
        return next(new HttpError("Something went wrong...", 401));
    }
    if (chat) {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        user1 = chat.user1.toString() === existingUser._id.toString() ? true : false;
        user2 = chat.user2.toString() === existingUser._id.toString() ? true : false;
        chat.user1DeleteChat = user1 && true;
        chat.user2DeleteChat = user2 && true;
        try {
            await chat.save({ session: sess });
        } catch (error) {
            return next(new HttpError("Something went wrong...", 401));
        }
        messages.map(async (i) => {
            console.log("i", i);
            i.user1Deleted = user1 && true;
            i.user2Deleted = user2 && true;
            try {
                await i.save({ session: sess });
            } catch (error) {
                // return next(new HttpError("Something went wrong...", 401));
            }
        });
        await sess.commitTransaction();
        res.status(200).json({ success: true });
    } else {
        return next(new HttpError("Something went wrong...", 401));
    }
};

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
