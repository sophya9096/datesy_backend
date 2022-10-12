const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const chatSchema = new Schema({
    user1: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    user2: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    initiated: {
        type: Boolean,
    },
    user1Name: {
        type: String,
    },
    user2Name: {
        type: String,
    },
    // user1LastSeen: {
    //     type: String,
    // },
    // user2LastSeen: {
    //     type: String,
    // },
    user1SeenChat: {
        type: Boolean,
    },
    user2SeenChat: {
        type: Boolean,
    },
    user1DeleteChat: {
        type: Boolean,
    },
    user2DeleteChat: {
        type: Boolean,
    },
    user1ClearChat: {
        type: Boolean,
    },
    user2ClearChat: {
        type: Boolean,
    },
});

module.exports = mongoose.model("Chat", chatSchema);
