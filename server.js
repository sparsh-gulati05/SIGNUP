const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const crypto = require("crypto");

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route handlers
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/forgot_password", (req, res) => {
  res.render("forgot_password");
});

app.get("/reset_password", (req, res) => {
  res.render("reset_password");
});

app.get("/confirm", (req, res) => {
  res.render("confirm");
});

// Signup route
app.post("/signup", (req, res) => {
  const { email, password } = req.body;

  const usersFilePath = path.join(__dirname, "users.json");

  fs.readFile(usersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading users file:", err);
      return res.status(500).send("Internal server error");
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const userExists = users.some((user) => user.email === email);
    if (userExists) {
      return res.status(400).send("User already exists");
    }

    const confirmationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    users.push({
      email,
      password,
      confirmationCode,
      isConfirmed: false,
    });

    fs.writeFile(
      usersFilePath,
      JSON.stringify(users, null, 2),
      "utf8",
      (err) => {
        if (err) {
          console.error("Error writing to users file:", err);
          return res.status(500).send("Internal server error");
        }

        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Email Confirmation",
          text: `Your confirmation code is: ${confirmationCode}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
            return res.status(500).send("Internal server error");
          }

          res.send("Confirmation email sent. Please check your inbox.");
        });
      }
    );
  });
});

// Confirm email route
app.post("/confirm", (req, res) => {
  const { email, code } = req.body;

  const usersFilePath = path.join(__dirname, "users.json");

  fs.readFile(usersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading users file:", err);
      return res.status(500).send("Internal server error");
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const user = users.find((user) => user.email === email);
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (user.confirmationCode !== code) {
      return res.status(400).send("Invalid confirmation code");
    }

    user.isConfirmed = true;
    user.confirmationCode = null;

    fs.writeFile(
      usersFilePath,
      JSON.stringify(users, null, 2),
      "utf8",
      (err) => {
        if (err) {
          console.error("Error writing to users file:", err);
          return res.status(500).send("Internal server error");
        }

        res.send("Email confirmed successfully");
      }
    );
  });
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const usersFilePath = path.join(__dirname, "users.json");

  fs.readFile(usersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading users file:", err);
      return res.status(500).send("Internal server error");
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const user = users.find(
      (user) => user.email === email && user.password === password
    );
    if (!user) {
      return res.status(401).send("Invalid email or password");
    }

    if (!user.isConfirmed) {
      return res
        .status(401)
        .send("Email not confirmed. Please check your inbox.");
    }

    res.send("Login successful");
  });
});

// Forgot password route
app.post("/forgot_password", (req, res) => {
  const { email } = req.body;

  const usersFilePath = path.join(__dirname, "users.json");

  fs.readFile(usersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading users file:", err);
      return res.status(500).send("Internal server error");
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const user = users.find((user) => user.email === email);
    if (!user) {
      return res.status(404).send("User not found");
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // Token expires in 1 hour

    fs.writeFile(
      usersFilePath,
      JSON.stringify(users, null, 2),
      "utf8",
      (err) => {
        if (err) {
          console.error("Error writing to users file:", err);
          return res.status(500).send("Internal server error");
        }

        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Password Reset",
          text: `You requested a password reset. Click the following link to reset your password: http://localhost:${port}/reset_password?token=${resetToken}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
            return res.status(500).send("Internal server error");
          }

          res.send("Password reset email sent. Please check your inbox.");
        });
      }
    );
  });
});

// Reset password route
app.post("/reset_password", (req, res) => {
  const { token, password } = req.body;

  const usersFilePath = path.join(__dirname, "users.json");

  fs.readFile(usersFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading users file:", err);
      return res.status(500).send("Internal server error");
    }

    let users = [];
    if (data) {
      users = JSON.parse(data);
    }

    const user = users.find(
      (user) =>
        user.resetToken === token && user.resetTokenExpiration > Date.now()
    );
    if (!user) {
      return res.status(400).send("Invalid or expired token");
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiration = null;

    fs.writeFile(
      usersFilePath,
      JSON.stringify(users, null, 2),
      "utf8",
      (err) => {
        if (err) {
          console.error("Error writing to users file:", err);
          return res.status(500).send("Internal server error");
        }

        res.send("Password reset successfully");
      }
    );
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
