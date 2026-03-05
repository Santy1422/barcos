import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Directorio para logs en archivos (no en MongoDB)
const LOGS_DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const writeLogToFile = (data: any): void => {
  const date = new Date().toISOString().split('T')[0];
  const fileName = path.join(LOGS_DIR, `frontend-errors-${date}.log`);
  const logLine = JSON.stringify(data) + '\n';
  fs.appendFile(fileName, logLine, (err) => {
    if (err) console.error('Error escribiendo frontend log a archivo:', err.message);
  });
};

// POST /api/logs/frontend - Recibir errores del frontend (guardado en archivo local)
router.post('/frontend', async (req: Request, res: Response) => {
  try {
    const {
      method,
      url,
      statusCode,
      error,
      module,
      action,
      userEmail,
    } = req.body;

    // Validar campos mínimos
    if (!url || !error?.message) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: url, error.message'
      });
    }

    const logData = {
      timestamp: new Date().toISOString(),
      source: 'frontend',
      method: method || 'UNKNOWN',
      url,
      statusCode: statusCode || 0,
      userEmail,
      error: {
        message: error.message,
        code: error.code,
        name: error.name || 'FrontendError'
      },
      module,
      action
    };

    // Guardar en archivo local (NO en MongoDB)
    writeLogToFile(logData);

    console.log(`📱 [FRONTEND ERROR] ${method || 'ERR'} ${url} - ${error.message} (${userEmail || 'anonymous'})`);

    res.json({ success: true, message: 'Error logged successfully' });
  } catch (err: any) {
    console.error('Error guardando frontend log:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al guardar log',
      error: err.message
    });
  }
});

// GET /api/logs - Obtener logs desde archivos locales
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.log')).sort().reverse();
    const logs: any[] = [];

    for (const file of files) {
      if (logs.length >= Number(limit)) break;
      try {
        const content = fs.readFileSync(path.join(LOGS_DIR, file), 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        for (const line of lines.reverse()) {
          if (logs.length >= Number(limit)) break;
          try { logs.push(JSON.parse(line)); } catch {}
        }
      } catch {}
    }

    res.json({ success: true, data: logs, total: logs.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener logs', error: err.message });
  }
});

// GET /api/logs/stats - Info de archivos de log
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.log'));
    const fileStats = files.map(f => {
      const stat = fs.statSync(path.join(LOGS_DIR, f));
      return { name: f, size: stat.size, modified: stat.mtime };
    }).sort((a, b) => b.modified.getTime() - a.modified.getTime());

    res.json({
      success: true,
      data: {
        totalFiles: files.length,
        totalSize: fileStats.reduce((sum, f) => sum + f.size, 0),
        files: fileStats
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: err.message });
  }
});

export default router;
