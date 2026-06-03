function toPublicUser(user) {
  if (!user) return null;
  const {
    passwordHash: _passwordHash,
    ...publicFields
  } = user;
  return publicFields;
}

module.exports = { toPublicUser };
