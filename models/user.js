const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const pointSchema = new Schema({
    type: {
        type: String,
        enum: ["Point"],
        // required: true,
    },
    coordinates: {
        type: [Number],
        // required: true,
    },
});

const userSchema = new Schema(
    {
        mobile: {
            type: String,
            // required: true,
        },
        otp: {
            type: Number,
        },
        deleted: {
            type: Boolean,
        },
        verified: {
            type: Boolean,
        },
        loginOtp: {
            type: Number,
        },
        email: {
            type: String,
            // required: true,
            // unique: true,
        },
        username: {
            type: String,
        },
        name: {
            type: String,
            // required: true,
        },
        dob: {
            type: Date,
            // required: true,
        },
        gender: {
            type: String,
            enum: ["m", "f"],
            // required: true,
        },
        school: {
            type: String,
        },
        shul: {
            type: String,
        },
        rabbi: {
            type: String,
        },
        superLikes: {
            type: Number,
        },
        picture: [
            {
                type: String,
            },
        ],
        location: {
            type: pointSchema,
            // required: true,
        },
        goGlobal: {
            type: Boolean,
        },
        maxDistance: {
            type: Number,
        },
        ageRange: {
            min: { type: Number },
            max: { type: Number },
        },
        showMe: {
            type: Boolean,
        },
        shareMyFeed: {
            type: Boolean,
        },
        recommendedSort: {
            type: Boolean,
        },
        showDistanceIn: {
            type: String,
            enum: ["km", "mi"],
        },
        readReceipt: {
            type: Boolean,
        },
        smartPhotos: {
            type: Boolean,
        },
        about: {
            type: String,
        },
        passions: {
            type: String,
        },
        jobTitle: {
            type: String,
        },
        company: {
            type: String,
        },
        city: {
            type: String,
        },
        showMyAge: {
            type: Boolean,
        },
        myDistanceInvisible: {
            type: Boolean,
        },
        block: {
            type: Boolean,
        },
        liked: [{ type: Schema.Types.ObjectId, ref: "User" }],
        disliked: [{ type: Schema.Types.ObjectId, ref: "User" }],
        superliked: [{ type: Schema.Types.ObjectId, ref: "User" }],
        lastSeen: { type: Date },
        resetToken: Number,
        resetTokenExpirationTime: Date,
    },
    { timestamps: true },
);

userSchema.plugin(uniqueValidator);
userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
