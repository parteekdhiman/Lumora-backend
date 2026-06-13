import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  // If SMTP is not configured, gracefully fall back to printing to console for local dev
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n======================================================');
      console.log('📧 MOCK EMAIL INTERCEPTED (SMTP NOT CONFIGURED)');
      console.log(`To: ${options.email}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Message: \n${options.message}`);
      console.log('======================================================\n');
      return;
    } else {
      throw new Error('SMTP credentials not configured in production.');
    }
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME || 'Lumora'} <${process.env.FROM_EMAIL || 'noreply@lumora.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || options.message.replace(/\n/g, '<br>'),
  };

  const info = await transporter.sendMail(message);
  console.log('Message sent: %s', info.messageId);
};
