import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import UserModel from "./models/UserModel.js";
import bcrypt from "bcrypt";

// const MongoStore = require('connect-mongo')(session);
// import MongoStore from 'connect-mongo'
dotenv.config();
mongoose.connect(process.env.MONGOURI);

const app = express();
// const PORT = 3003 || 3016;
const PORT = process.env.PORT || 80;

const userIsInGroup = (user, accessGroup) => {
  const accessGroupArray = user.accessGroups.split(",").map((m) => m.trim());
  return accessGroupArray.includes(accessGroup);
};

app.set("trust proxy", 1); // allow / trust Heroku proxy to forward secure cookies
app.use(express.json());
app.use(
  cors({
    origin: process.env.ORIGIN_URL || "http://localhost:3000",
    credentials: true, // accept incoming cookies
  })
);

// Configure SESSION COOKIES (=> this will create a cookie in the browser once we set some data into req.session)
app.use(
  session({
    name: "sessId",
    secret: process.env.SESSION_SECRET,
    // store: MongoStore.create({ mongoUrl: process.env.MONGOURI }),
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true, // httpOnly => cookie can just be written from API and not by Javascript
      maxAge: 60 * 1000 * 30, // 30 minutes of inactivity
      // sameSite: "none", // allow cookies transfered from OTHER origin
      // secure: true, // allow cookies to be set just via HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use(cookieParser());

app.get("/user", async (req, res) => {
  const user = await UserModel.find();
  res.json(user);
});

app.post("/login", async (req, res) => {
  const login = req.body.login;
  const password = req.body.password;
  let user = await UserModel.findOne({ login });
  if (!user) {
    user = await UserModel.findOne({ login: "anonymousUser" });
  } else {
    bcrypt.compare(password, user.hash).then((passwordIsOk) => {
      if (passwordIsOk) {
        req.session.user = user;
        req.session.save();
        res.json(user);
      } else {
        res.sendStatus(403);
      }
    });
  }
});

app.get("/currentuser", async (req, res) => {
  let user = req.session.user;
  if (!user) {
    user = await UserModel.findOne({ login: "anonymousUser" });
  }
  res.json(user);
});

app.get("/logout", async (req, res) => {
  req.session.destroy();
  const user = await UserModel.findOne({ login: "anonymousUser" });
  res.json(user);
});

app.delete("/deleteuser", async (req, res) => {
  const _id = req.body._id;
  const user = await UserModel.findByIdAndDelete({
    _id: new mongoose.Types.ObjectId(_id),
  });
  res.json({ user });
});


app.post("/signup", async (req, res) => {
  const user = req.body.user;
  if (
    user.login.trim() === "" ||
    user.password1.trim() === "" ||
    user.password1 !== user.password2
  ) {
    res.status(403);
  } else {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(user.password1, salt);
    const _user = {
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      email: user.email,
      hash,
      accessGroups: "loggedInUser, notYetApprovedUsers",
    };
    const dbuser = await UserModel.create(_user);
    res.json({
      userAdded: dbuser,
    });
    req.session.user = user;
    req.session.save();
  }
});

// approveuser
app.post("/approveuser", async (req, res) => {
  console.log(req.body);
  const id = req.body.id;
  let user = req.session.user;
  console.log(user);
  if (!user) {
    res.sendStatus(403);
  } else {
    if (!userIsInGroup(user, "admins")) {
      res.sendStatus(403);
    } else {
      const updateResult = await UserModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: { accessGroups: "loggedInUsers,members" } },
        { new: true }
      );
      res.json({ result: updateResult });
    }
  }
});

// show all approved users
app.get("/approveuser", async (req, res) => {
  const users = await UserModel.find({
    accessGroups: { $regex: "members", $options: "i" },
  });
  res.json({
    users,
  });
});

// notyetapprovedusers
app.get("/notyetapprovedusers", async (req, res) => {
  const users = await UserModel.find({
    accessGroups: { $regex: "notYetApprovedUsers", $options: "i" },
  });
  res.json({
    users,
  });
});

app.listen(PORT, (req, res) => {
  console.log(`API listening on port http://localhost:${PORT}`);
});
