import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { supabaseInit } from './utils/supabasehelper';
import { emailTemplate } from './utils/emails-templates/templates';
import { sendEmailBySES } from './utils/sesHelper';
export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = JSON.parse(event.body || '{}');
    const { candidateName, candidateEmail, url } = body;
    if (!candidateName || !candidateEmail || !url) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Missing candidateName, candidateEmail, or url',
            }),
        };
    }
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_KEY!;
    const supabase = supabaseInit(supabaseUrl, supabaseKey);
    try {
        const { data: candidateData, error: candidateError}  = await supabase
            .from('candidates')
            .insert([{ name: candidateName, email: candidateEmail}])
            .select();
        if (candidateError) {
            console.error('Supabase insert error:', candidateError);
            throw candidateError;
        }
        const candidateId = candidateData[0].id;
        const { data: assessmentData, error: assessmentError } = await supabase
            .from('candidate_assessment')
            .insert([{ candidate_id: candidateId, status: "Pending"}])
            .select();
        if (assessmentError) {
            console.error('Supabase insert error:', assessmentError);
            throw assessmentError;
        }
        const candidateAssessmentId = assessmentData[0].id;
        const emailBody = emailTemplate.sendAssignment({
            candidateName: candidateName,
            dayCount: '2',
            assignmentLink: `${url}?a=${candidateAssessmentId}`
        });
        const emailParams = {
            Destination: { ToAddresses: [candidateEmail]},
            Message: {
                Body: {
                    Html: {
                        Data: emailBody
                    },
                },
                Subject: {Data: 'Assignment Instructions'},
            },
            Source: 'jangamchenchugokul@gmail.com',
        };

        try{
            await sendEmailBySES(emailParams);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Assignment email sent successfully',
                }),
            };
            
        } catch(err) {
            console.log(err)
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Assignment email not sent',
                })
            }
        }
        
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};
