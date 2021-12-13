import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import UserModel from "./models/UserModel.js";
import bcrypt from "bcrypt";

dotenv.config();
// const saltRund = Number(process.env.SALT)

mongoose.connect(process.env.MONGOURI);

const app = express();
const PORT = 3003;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || "tempsecret",
  })
);

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

// SIGNUP
// const salt = await bcrypt.genSalt(8);
// const hash = await bcrypt.hash(password1);
// const user = await UserModel.create({
//   login,
//   firstName,
//   lastName,
//   email,
//   hash,
//   accessGroups: "loggedInUsers,notYetApprovedUsers",
// });

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
      accessGroups: "loggedINUser, notYetAbrovedUsers",
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
  const id = req.body.id;
  let user = await req.session.user;
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
