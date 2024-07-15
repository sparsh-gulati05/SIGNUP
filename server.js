const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();  // Load environment variables from .env file

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// User data storage
const usersFilePath = './users.json';

// Load existing users from the file
let users = [];
if (fs.existsSync(usersFilePath)) {
    users = JSON.parse(fs.readFileSync(usersFilePath));
}

// Setup Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

// Serve the signup page as the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/signup', (req, res) => {
    const { email, password } = req.body;
    const user = { email, password, confirmed: false };
    users.push(user);

    // Save users to file
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    // Send confirmation email
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Email Confirmation',
        text: `Please confirm your email by clicking the following link: https://sparsh-gulati05.github.io/UNIFYND/`
        // text: `Please confirm your email by clicking the following link: http://localhost:${port}/confirm?email=${email}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send(error.toString());
        }
        res.status(200).send('Signup successful, please check your email to confirm your account.');
    });
});

app.get('/confirm', (req, res) => {
    const { email } = req.query;
    const user = users.find(u => u.email === email);

    if (user) {
        user.confirmed = true;
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        res.sendFile(path.join(__dirname, 'public', 'confirm.html'));
    } else {
        res.status(404).send('User not found');
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        if (user.confirmed) {
            res.status(200).send('Login successful');
        } else {
            res.status(403).send('Please confirm your email before logging in');
        }
    } else {
        res.status(401).send('Invalid credentials');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
