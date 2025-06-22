
var apiKey = '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';
var campaignName = 'Campaña de ejemplo';
var senderName = 'Guia-Pay';
var senderEmail = 'santy.garcia19996g@gmail.com';

export interface Email {
    subject:string,
    htmlContent:string,
    recipientEmail:string
}

export async function sendEmail (params: Email ) {
    // Include the Brevo library
    var SibApiV3Sdk = require('sib-api-v3-sdk');
    var defaultClient = SibApiV3Sdk.ApiClient.instance;
  
    // Instantiate the client
    var apiKeyInstance = defaultClient.authentications['api-key'];
    apiKeyInstance.apiKey = apiKey;
  
    var apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    var sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
    // Define the email settings
    sendSmtpEmail.subject = params.subject;
    sendSmtpEmail.sender = {"name": senderName, "email": senderEmail};
    sendSmtpEmail.htmlContent = params.htmlContent;
  
    // Define the recipient
    sendSmtpEmail.to = [{"email": params.recipientEmail}];
  
    // Schedule the sending
  
    // Make the call to the client
    apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
        console.log('Email sent successfully. Returned data: ', data);
    }).catch(function(error) {
        console.error('Error sending email: ', error);
    });
  }