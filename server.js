const express = require("express");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

const fs = require("node:fs");
const EventEmitter = require("events");

dotenv.config();

const app = express();
const PORT = 3000;

const client = new MongoClient(process.env.MONGO_URI);

let db;
let usersCollection;

const activityEmitter = new EventEmitter();

activityEmitter.on("signup", (email) => {
    const timestamp = new Date().toISOString();

    fs.appendFileSync(
        "audit.log",
        `Signup: ${email} - ${timestamp}\n`
    );
});

activityEmitter.on("login", (email) => {
    const timestamp = new Date().toISOString();

    fs.appendFileSync(
        "audit.log",
        `Login: ${email} - ${timestamp}\n`
    );
});

app.use(express.json());
app.use(express.static("public"));

// Sign Up Route
app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if email already exists
        const existingUser = await usersCollection.findOne({ email: email });

        if (existingUser) {
            return res.json({
                success: false,
                message: "Email already registered"
            });
        }

        // Add new user to MongoDB
        await usersCollection.insertOne({
            name: name,
            email: email,
            password: password
        });

        activityEmitter.emit("signup", email);

        res.json({
            success: true,
            message: "Registration successful"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with matching email and password
        const user = await usersCollection.findOne({
            email: email,
            password: password
        });

        if (user) {

            activityEmitter.emit("login", email);

            res.json({
                success: true,
                message: "Login successful",
                name: user.name
            });
        } else {
            res.json({
                success: false,
                message: "Invalid email or password"
            });
        }

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

async function connectDB() {
    try {
        await client.connect();

        db = client.db("studentDB");
        usersCollection = db.collection("users");

        console.log("Connected to MongoDB");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error);
    }
}

connectDB();