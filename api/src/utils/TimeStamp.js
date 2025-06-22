//lo vamos a usar en los controllers, NO BORRAR

// const miControlador = (req, res) => {
    // Lógica del controlador
    // timeStamp(req); // Registra el timestamp y la URL de la solicitud en la consola
    // Más código del controlador
//   };
  

const timeStamp = (req) => {
    const date = new Date();
    const currentTimeStamp = date.getTime();
    console.log(`${currentTimeStamp} - ${req.protocol}//${req.headers.host}${req.originalUrl}`);
};
module.exports = timeStamp
