const express = require('express');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/verify-token');


const User = require('../models/user');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, { hashedPassword: 0 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }]});

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists. Try again' });
    }

    const hashedPassword = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS));

    const user = await User.create({ username, email, hashedPassword, role: role || 'user' });

    const token = jwt.sign(
      {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET
    );

    return res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ error: 'Could not return user information or generate a token' });
  }
});

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email }, { username: 1, email: 1, hashedPassword: 1, role: 1 });


    if (!existingUser) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    const isValidPassword = bcrypt.compareSync(password, existingUser.hashedPassword);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    const token = jwt.sign(
      {
        _id: existingUser._id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
      },
      process.env.JWT_SECRET
    );

    return res.status(200).json({ user: existingUser, token });
  } catch (error) {
    res.status(400).json({ error: 'Something went wrong, try again.' });
  }
});

module.exports = router;
