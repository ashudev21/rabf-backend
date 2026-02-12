import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { _config } from "../config/config.js";
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emailHelper = async (options) => {
    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            service: "gmail",
            secure: false, // true for 465, false for other ports
            auth: {
                user: "ashishrahulraj2005@gmail.com",
                pass: "zwpk oetq ufal isnm",
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        console.log("Nodemailer Configured with:", {
            host: _config.SMTP_HOST,
            port: _config.SMTP_PORT,
            user: _config.SMTP_USER,
            passLength: _config.SMTP_PASS ? _config.SMTP_PASS.length : 0
        });

        const { email, subject, template, data } = options;

        const templatePath = path.join(__dirname, "../mails", template);

        // Render HTML with EJS
        const html = await ejs.renderFile(templatePath, data);

        // Mail options
        const mailOptions = {
            from: _config.SMTP_USER,
            to: email,
            subject,
            html,
        };

        // Send mail
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        return info;

    } catch (error) {
        console.error("Error sending email: ", error);
        throw new Error(`Error while sending email: ${error.message}`);
    }
};

export default emailHelper;