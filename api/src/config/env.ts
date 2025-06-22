import dotenv from 'dotenv'
dotenv.config();


export const serverConfig = {
        //@ts-ignore

    port: process.env.PORT,
    //@ts-ignore
    ip: process.env.IP
}
    //@ts-ignore

export const portServer = process.env.PORT

export const openAiApi= process.env.OPENAI_API_KEY

// USUARIOS
export const userConexion = {
        //@ts-ignore

db_uri: process.env.USER_MONGO_URI,
    //@ts-ignore

activeService: process.env.isActive,
    //@ts-ignore

jwtAcces: process.env.JWT_ACCESCODE
}
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if(!userConexion.db_uri)throw new console.error("Falta uri de mongo para el servicio de usuario");
if(!userConexion.jwtAcces)throw new console.error("falta la clave jwt");
if(!userConexion.activeService)console.error("El servicio de usuarios esta inactivo");
if(!openAiApi)console.error("Falta la api de openAi");
