import { serverConfig } from "./config/env";
import express from 'express'
import bodyParser from "body-parser";
import cors from 'cors'
import routes from "./routes";
import { requestLogger, errorLogger } from "./middlewares/requestLogger";
const {users, clients} = require('./database')
const { globalLimit } = require('./utils/rate-limiters');


const server = express();
//Lo configuramos con Middlewares generales:
server.use(cors({ origin: '*' }));
// Configurar límites de tamaño para archivos grandes (Excel)
server.use(express.json({ limit: '500mb' })); // Aumentar límite para JSON
server.use(express.urlencoded({ extended: true, limit: '500mb' })); // Aumentar límite para URL-encoded
server.use(bodyParser.json({ limit: '500mb' }));
server.use(bodyParser.urlencoded({ extended: true, limit: '500mb' }));

// Middleware para manejar archivos grandes
server.use((req, res, next) => {
  // Aumentar timeout para archivos grandes
  req.setTimeout(300000); // 5 minutos
  res.setTimeout(300000); // 5 minutos
  next();
});

server.use(express.static('public'));

// Middleware de logging de requests (antes de las rutas)
server.use(requestLogger);

//Le agregamos las rutas:
server.use(routes);


//ruta general 404
server.use('*', (req, res) => {
  res.status(404).send({ error: true, message: "Ruta no encontrada: " + req.baseUrl });
});

// Middleware de logging de errores (antes del handler general)
server.use(errorLogger);

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

