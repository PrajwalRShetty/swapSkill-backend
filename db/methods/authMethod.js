const bcrypt = require('bcrypt');

const comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = { comparePassword };
