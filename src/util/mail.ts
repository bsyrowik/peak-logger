import * as nodemailer from 'nodemailer';

const address = import.meta.env.DEVELOPER_GMAIL_ADDRESS;
const password = import.meta.env.DEVELOPER_GMAIL_PASSWORD;

export async function sendEmail(
    name: string,
    email: string,
    message: string,
    id: number
) {
    console.log(name, email, message, id);

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: address,
            pass: password,
        },
    });
    //console.log(transporter);

    const messageContent = {
        from: address,
        replyTo: email,
        to: address,
        subject: 'Peak Logger Contact Form Submission - ' + id + ' - ' + name,
        text: message,
    };
    //console.log(messageContent);

    transporter.sendMail(messageContent, (error: any, info: any) => {
        if (error) {
            console.error('Error sending email: ', error);
        } else {
            console.log('Email sent: ', info.response);
        }
    });
}
