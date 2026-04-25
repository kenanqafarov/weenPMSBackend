const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      handle: user.handle
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const valid = await user.matchPassword(password);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      handle: user.handle
    }
  });
}

module.exports = { login, signToken };
