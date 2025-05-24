import { SESClient, SendEmailCommand,SendEmailCommandInput } from "@aws-sdk/client-ses";
const ses = new SESClient({region: 'us-east-1'});

export async function sendEmailBySES(emailParams: SendEmailCommandInput) {
    return await ses.send(new SendEmailCommand(emailParams))
}