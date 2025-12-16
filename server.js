const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Session Config
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using https
}));

// Passport Config
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE',
    callbackURL: "http://localhost:5000/auth/google/callback"
},
    function (accessToken, refreshToken, profile, cb) {
        // In a real app, you might look up the user in your DB here
        return cb(null, profile);
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Middleware to check authentication
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login.html');
}

// Routes
// Public routes
app.use(express.static(path.join(__dirname, 'public'), {
    index: false // Disable auto-serving index.html so we can intercept admin.html if needed
}));

// Auth Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    function (req, res) {
        // Successful authentication, redirect to admin.
        res.redirect('/admin.html');
    });

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/login.html');
    });
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ user: null });
    }
});

// Protected Route for admin.html
app.get('/admin.html', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'protected', 'admin.html'));
});

// Serve other static files normally, but since we disabled index above, we need to handle root or explicit calls manually if they conflict.
// However, express.static usually handles "everything else". 
// The issue is if "admin.html" exists in public, express.static served it before.
// We explicitly disabled `index` but `express.static` serves files by name.
// To truly protect `admin.html` which is in `public`, we should remove it from direct static access or put it in a different folder.
// A simpler way without moving files is to define the specific route BEFORE express.static, but express.static checks file existence.
// Best approach: Move admin.html to a `protected` folder or `views` folder.
// For now, I will intercept it. Note: If express.static finds the file, it serves it.
// I will move `app.use(express.static...)` *after* the protected route? No, that breaks other static assets for admin.
// I will rename `admin.html` to `dashboard.html` in the protected route, or just accept that I need to move it.
// Let's Move admin.html to a new directory `protected` basically.


// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Start server only after successful DB connection
        if (require.main === module) {
            app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Routes
const feedbackRoutes = require('./routes/feedback');
app.use('/api/feedback', feedbackRoutes);

module.exports = app;
