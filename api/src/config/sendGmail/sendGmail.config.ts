const nodemailer = require("nodemailer");

export const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: "francovalenzuela.dev@gmail.com",
        pass: "rlqgvvvjonyvdxqv",
    },
});

transporter.verify().then(() => { console.log("ya se puede enviar") })






// const { OAuth2Client } = require("google-auth-library");
// const client = new OAuth2Client("your_client_id_here");

// async function getAccessToken(token) {
//     const ticket = await client.verifyIdToken({
//         idToken: token,
//         audience: "your_client_id_here",
//     });
//     const { payload } = ticket;
//     return payload.access_token;
// }

// export const transporter = nodemailer.createTransport({
//     host: "smtp.gmail.com",
//     port: 587,
//     secure: false,
//     auth: {
//         type: "OAuth2",
//         user: "francrak46254425@gmail.com",
//         clientId: "350211778443-8gev0pancps3221vjdoa4nkflii3p3q6.apps.googleusercontent.com",
//         clientSecret: "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",
//         refreshToken: "your_refresh_token_here",
//         accessToken: async (callback) => {
//             const token = await getAccessToken("https://oauth2.googleapis.com/token");
//             callback(null, token);
//         }
//     }
// }
// );










// const nodemailer = require("nodemailer");

// export const transporter = nodemailer.createTransport({
//     host: "smtp.gmail.com",
//     port: 465,
//     secure: true,
//     auth: {
//         user: "francrak46254425@gmail.com",
//         pass: "fmmlxbmsidkrnusw",
//     },
// });

// transporter.verify().then(() => {console.log("Listo para enviar email")})