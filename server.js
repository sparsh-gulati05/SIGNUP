const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();  // Load environment variables from .env file
const crypto = require('crypto'); // Import the crypto module for generating tokens.

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));
const usersFilePath = './users.json';

// Load existing users from the file
let users = [];
if (fs.existsSync(usersFilePath)) {
    users = JSON.parse(fs.readFileSync(usersFilePath));
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

// Function to send verification email
const sendVerificationEmail = async (email, token) => {
    // Read the HTML template
    const templatePath = path.join(__dirname, 'verification_mail.html');
    let emailTemplate = fs.readFileSync(templatePath, 'utf-8');

    // Generate the verification link
    const verificationLink = `http://localhost:${port}/confirm?token=${token}`;
    // Alternative: For deployment, use the line below.
    // const verificationLink = `https://sparsh-gulati05.github.io/UNIFYND/?token=${token}`;

    // Replace placeholders with actual values
    emailTemplate = emailTemplate.replace('{{verification_link}}', verificationLink);
    emailTemplate = emailTemplate.replace('{{email}}', email);

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Email Confirmation',
        html: emailTemplate // Use the HTML template
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};


// Serve the signup page as the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



app.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Read the users file
        const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));

        // Check if the email already exists
        const existingUserIndex = users.findIndex(u => u.email === email);

        let token;
        if (existingUserIndex !== -1) {
            const existingUser = users[existingUserIndex];
            if (existingUser.verified) {
                return res.status(400).send('Account already exists and is verified.');
            } else {
                // Retain the existing token if the user is not verified
                token = existingUser.token;
                // Update the existing user's details
                users[existingUserIndex] = { ...existingUser, password };
            }
        } else {
            // Generate a unique token for email confirmation
            token = crypto.randomBytes(16).toString('hex');

            // Add the new user to the users array
            users.push({ email, password, verified: false, token });
        }

        // Save the updated users array to the file
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

        // Send the confirmation email
        const emailSent = await sendVerificationEmail(email, token);
        if (emailSent) {
            res.status(200).send('Signup successful, please check your email to confirm your account.');
        } else {
            res.status(500).send('Signup successful, but failed to send confirmation email. Please try again later.');
        }
    } catch (error) {
        console.error(`Error in /signup: ${error.message}`);
        res.status(500).send('An unexpected error occurred. Please try again later.');
    }
});

app.get('/confirm', (req, res) => {
    const { token } = req.query; // Extract the token from the query parameters.
    const user = users.find(u => u.token === token); // Find the user with the matching token.

    if (user) {
        user.verified = true; // Set the user's verified status to true.
        user.token = null; // Remove the token after confirmation.
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2)); // Save the updated users array to the file.
        console.log(`User ${user.email} verified successfully`);
        res.sendFile(path.join(__dirname, 'public', 'confirm.html')); // Serve the confirmation page.
    } else {
        res.status(404).send('Invalid confirmation link'); // Respond with a 404 status if the token is invalid.
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Read the users file
        const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));

        const user = users.find(u => u.email === email);

        if (user) {
            if (user.password === password) {
                if (user.verified) {
                    res.status(200).send('Login successful');
                } else {
                    // Resend the verification email
                    const emailSent = await sendVerificationEmail(email, user.token);
                    if (emailSent) {
                        res.status(403).send('Please verify your email before logging in. A verification link has been sent to your email id.');
                    } else {
                        res.status(500).send('Failed to resend verification email. Please try again later.');
                    }
                }
            } else {
                res.status(401).send('Wrong Password. Please try Again!!');
            }
        } else {
            res.status(404).send('Account Not Found. Please Sign up to continue');
        }
    } catch (error) {
        console.error(`Error in /login: ${error.message}`);
        res.status(500).send('An unexpected error occurred. Please try again later.');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
