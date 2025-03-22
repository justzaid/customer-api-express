function isOwner(req, res, next) {
  if (req.user._id !== req.params.userId) {
    return res.status(401).json({ error: 'Unable to access: Unauthorized.' });
  }

  next();
}

module.exports = isOwner;
