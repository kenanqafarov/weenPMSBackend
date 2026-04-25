const User = require('../models/User');

async function listUsers(_req, res) {
  const users = await User.find({}).select('name email role handle').sort({ name: 1 }).lean();
  res.json({ users });
}

async function me(req, res) {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      handle: req.user.handle
    }
  });
}

module.exports = { me, listUsers };

