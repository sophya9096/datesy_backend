const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const HttpError = require("./models/http-error").HttpError;
const Chat = require("./models/chat");
const Message = require("./models/message");
const User = require("./models/user");
const formatMessage = require("./utils/message");

const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads/images", express.static(path.join("uploads", "images")));
app.use(express.static(path.join("public")));

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    next();
});

// app.use("/", async (req, res, next) => {
//     console.log(req.headers);
//     console.log(req.body);
//     console.log("/", req.body.userId);
//     next();
// });

app.use("/user", userRoutes);

app.use("/clear", async (req, res, next) => {
    await Chat.deleteMany();
    await Message.deleteMany();
    next();
});

app.use("/clearlikes", async (req, res, next) => {
    let users = await User.find();
    users.map(async (i) => {
        i.liked = [];
        i.disliked = [];
        i.superliked = [];
        await i.save();
    });
    next();
});

// app.use((req, res, next) => {
//     res.sendFile(path.resolve(__dirname, "public", "index.html"));
//     res.json({ message: "" });
// });

app.use((req, res, next) => {
    const error = new HttpError("Route couldn't found", 404);
    throw error;
});

app.use((error, req, res, next) => {
    // if (req.file) {
    //     fs.unlink(req.file.path, (err) => {
    //         console.log(err);
    //     });
    // }
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message, data: data });
});

mongoose.set("useCreateIndex", true);
const mongooseOptions = {
    useNewUrlParser: true,
    // autoReconnect: true,
    // poolSize: 25,
    // connectTimeoutMS: 30000,
    // socketTimeoutMS: 30000,
    useUnifiedTopology: true,
};

// var d = new Date();
// var localTime = d.getTime();
// var localOffset = d.getTimezoneOffset() * 60000;
// var utc = localTime + localOffset;
// var offset = 2; //UTC of Israel is +02.00
// var dubai = utc + 3600000 * offset;
// var nd = new Date(dubai);
// console.log("Israel time is " + nd.toLocaleString());

mongoose
    .connect(
        `mongodb://root:${process.env.DB_PWD}@cluster0-shard-00-00-n7ejg.mongodb.net:27017,cluster0-shard-00-01-n7ejg.mongodb.net:27017,cluster0-shard-00-02-n7ejg.mongodb.net:27017/datesy?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority`,
        mongooseOptions,
    )
    .then((result) => {
        console.log("Yo");
        const users = [];
        // app.listen(process.env.PORT || 5000);
        const server = app.listen(process.env.PORT || 5000);
        const io = require("./socket").init(server);
        io.on("connection", (socket) => {
            console.log("socket", socket.id);
            socket.on("onJoin", async ({ room, previousRoom }) => {
                console.log("room,previousRoom", room, previousRoom);
                previousRoom && socket.leave(previousRoom);
                socket.join(room);
                // let existingChat;
                // try {
                //     existingChat = await Chat.findOne({ _id: room });
                // } catch (error) {
                //     return next(new HttpError("Something went wrong...", 401));
                // }
            });

            // socket.on("login", (data) => {
            //     users[data.id] = data.id;
            //     console.log(users);
            //     console.log("disconnectingDatesy", data);
            // });

            // User Left The Chat
            socket.on("disconnecting", (data) => {
                var room = data.room ? data.room : Object.keys(socket.rooms)[1];
                console.log("room", room);
            });
        });
    })
    .catch((err) => {
        console.log("Yo Error", err);
    });

// socket.on("onAgainJoin", ({ room, name }) => {
//     socket.join(room);
//     io.emit("adminInfo", formatMessage(name, "User has joined the chat", true, room));
// });

// // Admin joins the chat
// socket.on("onAdminJoin", ({ room, name, previousRoom }) => {
//     previousRoom && socket.leave(previousRoom);
//     socket.join(room);
// });

// // All Chat Messages
// socket.on("adminMessage", ({ username, room, message, sender }) => {
//     io.to(room).emit("chatAdminReply", formatMessage(username, message, sender));
// });
// socket.on("userMessage", ({ username, room, message, sender }) => {
//     io.to(room).emit("chatUserReply", formatMessage(username, message, sender));
//     io.emit("chatReplyForAdmin", formatMessage(username, message, sender, room));
// });

// // User Left The Chat
// socket.on("disconnecting", (data) => {
//     var room = data.room ? data.room : Object.keys(socket.rooms)[1];
//     // io.to(rooms[1]).emit("adminInfo", formatMessage("", "User has left the chat", true));
//     io.emit("adminInfo", formatMessage("", "User has left the chat", true, room));
// });

// // User Left The Chat
// socket.on("adminDisconnecting", (data) => {
//     var room = data.room ? data.room : Object.keys(socket.rooms)[1];
//     // io.to(rooms[1]).emit("adminInfo", formatMessage("", "User has left the chat", true));
//     io.emit("adminInfo", formatMessage("", "User has left the chat", true, room));
// });
