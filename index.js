const express = require("express");

const app = express();
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const PORT = 3000;
const host = "localhost";
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));
// Enable CORS for all routes
app.use(
  cors({
    origin: "http://localhost:5173", // Allow only this origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // If you need to include credentials like cookies in requests
    allowedHeaders: "Content-Type,Authorization", // Specify allowed headers if necessary
  })
);

//Define mongoose schemas

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  completed: Boolean,
});

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  completed: Boolean,
});

// Define mongoose models
const User = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);

//Connect to Mongodb
//connect to mongodb
mongoose.connect(
  "mongodb+srv://laxmimit:pingpong@cluster0.b31uole.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/tasks",
  { useNewUrlParser: true, dbName: "tasks" }
);

const SECRET = "this is secret";

const generateJwt = (user) => {
  const payload = { user: user.username };
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
};

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    return res.sendStatus(401);
  }
};
//post endpoint
app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body);
  const user = await User.findOne({ username });

  if (user) {
    res.status(403).json({ message: "User already exist" });
  } else {
    const obj = { username: username, password: password };
    const new_user = new User(obj);
    new_user.save();
    const token = jwt.sign({ username, role: "user" }, SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({ message: "user created successfully", token });
  }
});
/*
post: '/user/login'
*/
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    const token = jwt.sign({ username, role: "user" }, SECRET, {
      expiresIn: "1h",
    });
    res.json({ message: "Logged in Successfully", token });
  } else {
    res.status(403).json({ message: "Invalid username or password" });
  }
});
/**To add task: POST /api/tasks */
app.post("/api/tasks", authenticateJwt, async (req, res) => {
  const task = new Task(req.body);
  await task.save();
  res.json({ message: "Task added successfully", taskId: task.id });
});
/* GET: /api/taks
description: gets all tasks
*/
app.get("/api/tasks", async (req, res) => {
  const tasks = await Task.find({});
  res.json(tasks);
});
/**
 * Update: '/api/tasks/{taskId}
 */
app.put("/api/tasks/:taskId", authenticateJwt, async (req, res) => {
  const taskId = req.params.taskId;
  console.log(req.body);
  const { title, description, completed } = req.body;
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    task.title = title || task.title;
    task.description = description || task.description;
    task.completed = completed || task.completed;
    await task.save();
    res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Server Error", Error });
  }
});
/**Delete: '/api/delte/:taskId */
app.delete("/api/tasks/:taskId", authenticateJwt, async (req, res) => {
  const taskId = req.params.taskId;
  try {
    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});
//delete all taks
app.delete("/api/tasks", authenticateJwt, async (req, res) => {
  try {
    const result = await Task.deleteMany({});

    res
      .status(200)
      .json({ message: `Task deleted successfully ${result.deletedCount}` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});
app.get("/", (req, res) => {
  res.send("Hello,world!");
});

app.listen(PORT, host, () => {
  console.log(`Server is running on http://${host}:${PORT}`);
});
