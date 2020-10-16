const crypto = require('crypto');

module.exports = class EmailToCheck {
  constructor(email, expiresIn, name) {
    this.email = email || undefined;
    this.name = name || undefined;
    this.expiresOn = Date.now() + expiresIn * 60 * 1000 || undefined;
  }

  createToken(tok) {
    const randomString = crypto.randomBytes(32).toString('hex');

    const token = crypto
      .createHash('sha256')
      .update(tok ? tok : randomString)
      .digest('hex');

    if (!tok) {
      this.token = token;
      return randomString;
    }

    return token;
  }
};
