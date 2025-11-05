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
      console.error(error);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  // --- RUTA NUEVA ---
  // Ruta para VER MASCOTAS del cliente logueado
  app.get('/api/pets', async (req, res) => {
    const userId = req.query.userId; 
    if (!userId) {
      return res.status(400).json({ error: 'Falta el ID del usuario' });
    }
    try {
      const pets = await db.all('SELECT * FROM pets WHERE userId = ?', userId);
      res.json(pets);
    } catch (error) {
      console.error(error);
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
      console.error(error);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  // --- RUTA PARA CREAR CLIENTES (MODIFICADA) ---
  app.post('/api/admin/clients', async (req, res) => {
    // CAMBIO: Recibimos 'password' del body
    const { name, email, password } = req.body;
    
    // CAMBIO: Añadida validación de contraseña
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }
    
    const defaultRole = 'user';

    try {
      const existingUser = await db.get('SELECT * FROM users WHERE email = ?', email);
      if (existingUser) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
      
      // CAMBIO: Usamos la 'password' recibida del frontend
      const result = await db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        name, email, password, defaultRole // <- 'password' en lugar de 'defaultPassword'
      );

      const newUser = await db.get(
        'SELECT id, name, email, role FROM users WHERE id = ?',
        result.lastID
      );
      res.status(201).json({ ...newUser, pets: [] });

    } catch (error) {
      console.error('Error al crear cliente:', error);
      res.status(500).json({ error: 'Error del servidor al crear el cliente' });
    }
  });

  // Ruta para VER detalles de UNA mascota (Sin cambios)
  app.get('/api/admin/pets/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const pet = await db.get('SELECT * FROM pets WHERE id = ?', id);
      if (!pet) {
        return res.status(404).json({ error: 'Mascota no encontrada' });
      }
      const owner = await db.get('SELECT id, name, email FROM users WHERE id = ?', pet.userId);
      const appointments = await db.all('SELECT * FROM appointments WHERE petId = ?', id);
      const records = await db.all('SELECT * FROM medical_records WHERE petId = ?', id);
      res.json({ pet, owner, appointments, records });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al obtener detalles' });
    }
  });

  // Ruta para CREAR una mascota (Sin cambios)
  app.post('/api/admin/pets', async (req, res) => {
    const { name, species, breed, userId } = req.body;
    if (!name || !userId || !species) {
      return res.status(400).json({ error: 'Nombre, especie y ID de usuario son requeridos' });
    }
    try {
      const result = await db.run(
        'INSERT INTO pets (name, species, breed, userId) VALUES (?, ?, ?, ?)',
        name, species, breed || null, userId
      );
      const newPet = await db.get(
        'SELECT * FROM pets WHERE id = ?',
        result.lastID
      );
      res.status(201).json(newPet);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al crear la mascota' });
    }
  });

  // Ruta para CREAR una cita (Sin cambios)
  app.post('/api/admin/appointments', async (req, res) => {
    const { petId, date, reason } = req.body;
    if (!petId || !date || !reason) {
      return res.status(400).json({ error: 'petId, date y reason son requeridos' });
    }
    try {
      const result = await db.run(
        'INSERT INTO appointments (petId, date, reason, status) VALUES (?, ?, ?, ?)',
        petId, date, reason, 'Pendiente'
      );
      const newAppointment = await db.get('SELECT * FROM appointments WHERE id = ?', result.lastID);
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al crear la cita' });
    }
  });

  // Ruta para CREAR un registro médico (Sin cambios)
  app.post('/api/admin/records', async (req, res) => {
    const { petId, type, name, date } = req.body;
    if (!petId || !type || !name || !date) {
      return res.status(400).json({ error: 'petId, type, name y date son requeridos' });
    }
    try {
      const result = await db.run(
        'INSERT INTO medical_records (petId, type, name, date) VALUES (?, ?, ?, ?)',
        petId, type, name, date
      );
      const newRecord = await db.get('SELECT * FROM medical_records WHERE id = ?', result.lastID);
      res.status(201).json(newRecord);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error del servidor al crear el registro' });
    }
  });

  // Ruta para ELIMINAR un cliente (Sin cambios)
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

  // Ruta para EDITAR un cliente (Sin cambios)
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