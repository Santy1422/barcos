import { serverConfig } from "./config/env";
import express from 'express'
import bodyParser from "body-parser";
import cors from 'cors'
import routes from "./routes";
const {users, clients} = require('./database')
const { globalLimit } = require('./utils/rate-limiters');


const server = express();
//Lo configuramos con Middlewares generales:
server.use(cors({ origin: '*' }));
server.use(express.json()); // Parsea el body de las peticiones con Content-Type: application/json
server.use(express.urlencoded({ extended: true })); // Parsea el body de las peticiones con Content-Type: application/x-www-form-urlencoded
 server.use(express.static('public'));
//Le agregamos las rutas:
server.use(routes);


//ruta general 404
server.use('*', (req, res) => {
  res.status(404).send({ error: true, message: "Ruta no encontrada: " + req.baseUrl });
});


//atrapador de errores de express:
server.use((err, req, res, next) => {
  let message_to_send = 'API: ' + err.message;
  console.error(message_to_send)
  res.status(err.statusCode || 500).send({
    error: true,
    message: message_to_send,
  });
});


//Una vez configurado, Iniciamos el servidor:
server.listen(serverConfig.port, () => {
  console.log(`Server has started on port ${serverConfig.port}!`);
});

