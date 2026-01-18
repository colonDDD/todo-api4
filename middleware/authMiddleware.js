const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
  id: decoded.id,
  email: decoded.email,
  role: decoded.role
};
 // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
