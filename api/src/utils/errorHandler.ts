import { Response } from 'express';

export const handleError = (res: Response, error: any, message: string = 'An error occurred') => {
  console.error(message, error);
  
  const statusCode = error.statusCode || 500;
  const errorMessage = error.message || message;
  
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: process.env.NODE_ENV === 'development' ? error : undefined
  });
};