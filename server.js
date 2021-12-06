import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = 3003;

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3002",
    credentials: true,
  })
);

app.use(express.json());
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || "use-env-secret728272",
  })
);

const users = [
  {
    username: "anonymousUser",
    firstName: "Anonymous",
    lastName: "User",
    accessGroups: "loggedOutUsers",
  },
  {
    username: "jj",
    firstName: "James",
    lastName: "JustSignedUpton",
    accessGroups: "loggedInUsers,members",
  },
  {
    username: "aa",
    firstName: "Ashley",
    lastName: "Approvedmemberton",
    accessGroups: "loggedInUsers, members",
  },
  {
    username: "kc",
    firstName: "Kyle",
    lastName: "ContentEditorton",
    accessGroups: "loggedInUsers, members, contentEditors",
  },
  {
    username: "ma",
    firstName: "Mindy",
    lastName: "Administraton",
    accessGroups: "loggedInUsers,members, admins",
  },
];

app.post("/login", (req, res) => {
  const username = req.body.username;
  // const password = req.body.password;
  let user = users.find((user) => user.username === username);
  if (!user) {
    user = users.find((user) => user.username === "anonymousUser");
  }
  req.session.user = user;
  req.session.save();
  res.json(user);
});

app.get("/currentuser", (req, res) => {
  let user = req.session.user;
  if (!user) {
    user = users.find((user) => user.username === "anonymousUser");
  }
  res.json(user);
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  const user = users.find((user) => user.username === "anonymousUser");
  res.json(user);
});

app.listen(PORT, (req, res) => {
  console.log(`API listening on port http://localhost:${PORT}`);
});
