// import { accessKeyId, secretAccessKey } from "../config/env";

// const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// const s3Client = new S3Client({
//   region: 'us-east-1',
//   credentials: {
//     accessKeyId: accessKeyId,
//     secretAccessKey: secretAccessKey,
//   },
// });

// export const uploadPhoto = async (file) => {
//   const key = `horses-${Date.now()}`;
//   const bucketName = 'thh-videos';
//   const region = 'us-east-1'; // Asegúrate de que esta sea la región correcta de tu bucket S3

//   const params = {
//     Bucket: bucketName,
//     Key: key,
//     Body: file.buffer || file,
//     ContentType: file.mimetype,
//     ACL: 'public-read' // Solo si deseas que el archivo sea público
//   };

//   await s3Client.send(new PutObjectCommand(params));

//   // Construye la URL del archivo
//   const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
//   return url;
// };

// const bucketName = 'thh-videos';

// export const uploadPhotoFromBuffer = async (buffer) => {
//   const key = `horses-${Date.now()}`;
//   const region = 'us-east-1'; // Asegúrate de que esta sea la región correcta de tu bucket S3

//   const params = {
//     Bucket: bucketName,
//     Key: key,
//     Body: buffer,
//     ContentType: 'image/png',
//     ACL: 'public-read' // Solo si deseas que el archivo sea público
//   };

//   await s3Client.send(new PutObjectCommand(params));

//   // Construye la URL del archivo
//   const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
//   return url;
// };

// export const s3delete = function (url) {

//   const key = url.split('/').pop();

//   const params = {
//     Bucket: bucketName,
//     Key: key,
//   };

//   return new Promise(async (resolve, reject) => {
//     try {
//       await s3Client.send(new DeleteObjectCommand(params));
//       console.log("Successfully deleted file from bucket");
//       resolve("File deleted successfully");
//     } catch (err) {
//       console.error("Error deleting file:", err);
//       reject(err);
//     }
//   });
// };