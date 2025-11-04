import express from 'express';
import cors from 'cors';
import { initDb } from './database.js';

let db;

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(cors()); 
  app.use(express.json()); 

  try {
    db = await initDb();
    console.log('Base de datos inicializada.');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }

  // --- RUTAS DE LA API ---

  app.get('/', (req, res) => {
    res.send('¡API de PetAgenda funcionando!');
  });

  // Ruta de Login (Sin cambios)
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }
    try {
      const user = await db.get(
        'SELECT * FROM users WHERE email = ? AND password = ?',
        email,
        password
      );
      if (user) {
        const { password, ...userData } = user;
        res.json({
          message: 'Login exitoso',
          token: 'jwt-fake-token-12345',
          user: userData
        });
      } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  // Ruta para VER Clientes (Sin cambios)
  app.get('/api/admin/clients', async (req, res) => {
    try {
      const users = await db.all("SELECT id, name, email, role FROM users WHERE role = 'user'");
      const pets = await db.all('SELECT * FROM pets');
      const clientsWithPets = users.map(user => ({
        ...user,
        pets: pets.filter(pet => pet.userId === user.id)
      }));
      res.json(clientsWithPets);
    } catch (error) {
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  // Ruta para CREAR Clientes (Sin cambios)
  app.post('/api/admin/clients', async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    const defaultPassword = 'password'; 
    const defaultRole = 'user';
    try {
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', email);
      if (existingUser) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
      const result = await db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        name, email, defaultPassword, defaultRole
      );
      const newUser = await db.get(
        'SELECT id, name, email, role FROM users WHERE id = ?',
        result.lastID
      );
      res.status(201).json({ ...newUser, pets: [] });
    } catch (error) {
      res.status(500).json({ error: 'Error del servidor al crear el cliente' });
    }
  });

  // Rutas de Mascotas, Citas, etc. (Sin cambios)
  app.get('/api/admin/pets/:id', async (req, res) => { /* ... (código existente) ... */ });
  app.post('/api/admin/pets', async (req, res) => { /* ... (código existente) ... */ });
  app.post('/api/admin/appointments', async (req, res) => { /* ... (código existente) ... */ });
  app.post('/api/admin/records', async (req, res) => { /* ... (código existente) ... */ });

  
  // --- RUTA PARA ELIMINAR (DELETE) ---
  app.delete('/api/admin/clients/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.run('DELETE FROM users WHERE id = ?', id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      res.status(200).json({ message: 'Cliente eliminado exitosamente' });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al eliminar el cliente' });
    }
  });

  // --- RUTA PARA EDITAR (PUT) ---
  app.put('/api/admin/clients/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    try {
      const existing = await db.get(
        'SELECT * FROM users WHERE email = ? AND id != ?',
        email, id
      );
      if (existing) {
        return res.status(409).json({ error: 'Ese email ya está en uso por otro cliente' });
      }

      const result = await db.run(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        name, email, id
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      const updatedUser = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', id);
      res.status(200).json(updatedUser);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al actualizar el cliente' });
    }
  });


  // --- Iniciar el servidor ---
  app.listen(port, () => {
    console.log(`✅ Backend escuchando en http://localhost:${port}`);
  });
}

startServer();