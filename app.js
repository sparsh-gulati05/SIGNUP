function signup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            // Send email verification
            userCredential.user.sendEmailVerification().then(() => {
                alert('Verification email sent!');
                window.location.href = 'confirm.html';
            });
        })
        .catch(error => {
            console.error('Error signing up:', error);
        });
}

function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            if (userCredential.user.emailVerified) {
                alert('Login successful');
                // Redirect to a logged-in page
            } else {
                alert('Please verify your email before logging in');
            }
        })
        .catch(error => {
            console.error('Error logging in:', error);
        });
}
