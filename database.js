import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Función asíncrona para inicializar la base de datos
// ¡Aquí la "exportamos", no la importamos!
export async function initDb() {
  const db = await open({
    filename: './pet_agenda.sqlite', // Nombre del archivo de la DB
    driver: sqlite3.Database
  });

  console.log('Conectado a la base de datos SQLite.');

  // Activa las llaves foráneas
  await db.exec('PRAGMA foreign_keys = ON;');

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

  // --- Insertar Datos Iniciales ---
  try {
    await db.run(
      "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
      1, 'Dueño de Prueba', 'test@petagenda.com', 'password', 'user'
    );
    await db.run(
      "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
      2, 'Ana García', 'ana@garcia.com', 'password', 'user'
    );
    await db.run(
      "INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
      99, 'Admin', 'admin@petagenda.com', 'password', 'admin'
    );
    
    await db.run(
      "INSERT OR IGNORE INTO pets (id, userId, name, species, breed) VALUES (?, ?, ?, ?, ?)",
      1, 1, 'Rex', 'Perro', 'Pastor Alemán'
    );

    console.log('Datos de prueba insertados.');
  } catch (error) {
    console.error("Error insertando datos de prueba:", error);
  }

  return db;
}