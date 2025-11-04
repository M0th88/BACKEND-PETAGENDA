import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initDb() {
  const db = await open({
    filename: './pet_agenda.sqlite',
    driver: sqlite3.Database
  });

  console.log('Conectado a la base de datos SQLite.');
  await db.exec('PRAGMA foreign_keys = ON;');

  // Crear tablas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    );
    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      species TEXT,
      breed TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      petId INTEGER NOT NULL,
      date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'Pendiente',
      FOREIGN KEY (petId) REFERENCES pets(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      petId INTEGER NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (petId) REFERENCES pets(id) ON DELETE CASCADE
    );
  `);
  console.log('Tablas aseguradas.');

  // --- Inserción de Datos de Prueba (Corregida) ---
  try {
    // Verificamos si la tabla de usuarios está vacía antes de insertar
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    
    if (userCount.count === 0) {
      console.log('Base de datos vacía, insertando datos de prueba...');
      
      // Corregido: INSERT OR IGNORE
      await db.run(
        "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
        1, 'Dueño de Prueba', 'test@petagenda.com', 'password', 'user'
      );
      // Corregido: INSERT OR IGNORE
      await db.run(
        "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
        2, 'Ana García', 'ana@garcia.com', 'password', 'user'
      );
      // Corregido: INSERT OR IGNORE
      await db.run(
        "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
        99, 'Admin', 'admin@petagenda.com', 'password', 'admin'
      );
      
      // Corregido: INSERT OR IGNORE
      await db.run(
        "INSERT OR IGNORE INTO pets (userId, name, species, breed) VALUES (?, ?, ?, ?)",
        1, 'Rex', 'Perro', 'Pastor Alemán'
      );
      await db.run(
        "INSERT OR IGNORE INTO pets (userId, name, species, breed) VALUES (?, ?, ?, ?)",
        1, 'Mishi', 'Gato', 'Siamés'
      );
       await db.run(
        "INSERT OR IGNORE INTO pets (userId, name, species, breed) VALUES (?, ?, ?, ?)",
        2, 'Pipo', 'Perro', 'Bulldog'
      );

      console.log('¡Datos de prueba insertados correctamente!');
    } else {
      console.log('La base de datos ya tiene datos. No se insertaron datos de prueba.');
    }
  } catch (error) {
    console.error("Error catastrófico insertando datos de prueba:", error);
  }

  return db;
}