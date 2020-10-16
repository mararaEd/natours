const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.EMAIL_FROM;
  }

  newTransport() {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.TEST_ME === 'yeah'
    ) {
      // sendgrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email.
  async send(template, subject) {
    // 1) Render HTML based on a pug template.
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options.
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    // 3) Create a transporter and send email.
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', `Welcome to the Natour's Family!`);
  }

  async sendPassword() {
    await this.send(
      'passwordReset',
      'Your password reset token(valid for only 10 minutes.)'
    );
  }

  async sendSignUp() {
    await this.send('signUp', 'Your signup token(valid for only 15 minutes.)');
  }
};

const sendEmail = async (options) => {
  // // 1) Create a transporter.
  // // Gmail
  // // Activate "less secure app" in gmail.
  // //   const transporter = nodemailer.createTransport({
  // //     service: 'Gmail',
  // //     auth: {
  // //       user: process.env.EMAIL_USERNAME,
  // //       pass: process.env.EMAIL_PASSWORD,
  // //     },
  // // });
  // // MailTrap
  // const transporter = nodemailer.createTransport({
  //   host: process.env.EMAIL_HOST,
  //   port: process.env.EMAIL_PORT,
  //   auth: {
  //     user: process.env.EMAIL_USERNAME,
  //     pass: process.env.EMAIL_PASSWORD,
  //   },
  // });
  // // 2) Define the email Options.
  // const emailOptions = {
  //   from: 'Marara Edosa <hello@marara.io>',
  //   to: options.email,
  //   subject: options.subject,
  //   text: options.message,
  //   // html:
  // };
  // // 3) Actually Send email.
  // await transporter.sendMail(emailOptions);
  // 2) define the email options.
  // 3) send email
};
