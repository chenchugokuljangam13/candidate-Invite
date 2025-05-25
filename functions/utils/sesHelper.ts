import { SESClient, SendEmailCommand,SendEmailCommandInput } from "@aws-sdk/client-ses";
const ses = new SESClient({region: 'us-east-1'});

export async function sendEmailBySES(destinationEmail: string, senderEmail:string, emailBody: string, ) {
    const emailParams = {
        Destination: { ToAddresses: [destinationEmail]},
        Message: {
            Body: {
                Html: {
                    Data: emailBody
                },
            },
            Subject: {Data: 'Invitation for Assessment'},
        },
        Source: senderEmail,
    };
    return await ses.send(new SendEmailCommand(emailParams))
}