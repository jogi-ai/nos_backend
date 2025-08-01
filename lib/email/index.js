import { SendEmailCommand } from '@aws-sdk/client-ses';
import sesClient from './sesClient.js';

async function sendEmailSES(toAddresses, textBody, htmlBody, subject, sourceEmail, replyToAddresses) {
    htmlBody = htmlBody || textBody;
    const params = {
        Destination: {
            ToAddresses: toAddresses, // Where you want to receive the form submissions
        },
        Message: {
        Body: {
            Text: {
            Charset: 'UTF-8',
            Data: textBody || 'No text body provided'
            },
            Html: {
            Charset: 'UTF-8',
            Data: htmlBody || 'No html body provided'
            }
        },
        Subject: {
            Charset: 'UTF-8',
            Data: subject
        }
        },
        Source: sourceEmail, // This must be a verified SES email address
        ReplyToAddresses: replyToAddresses // optional
    };
    const command = new SendEmailCommand(params);
    try {
        const response = await sesClient.send(command);
        console.log('Email sent:', response.MessageId);
        return response;
    } catch (err) {
        console.error('Error sending email:', err);
        return err
    }
}

export {
    sendEmailSES
};