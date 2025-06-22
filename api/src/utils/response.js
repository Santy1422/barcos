module.exports = (res, statusCode, payload) =>{
    res.status(statusCode).json({
        error: false,
        payload
    });

};