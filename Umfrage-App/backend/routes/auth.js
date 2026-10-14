'use strict';
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const store   = require('../store/inMemory');

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'E-Mail, Passwort und Name erforderlich.' });
    }
    if (store.findUserByEmail(email)) {
        return res.status(409).json({ error: 'E-Mail bereits registriert.' });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = store.createUser(email, passwordHash, name);
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
    }
    const user = store.findUserByEmail(email);
    if (!user) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }
    const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );
    res.json({ token, name: user.name, id: user.id });
});

module.exports = router;
