/**
 * ⚠️  VERSIÓN VULNERABLE - SOLO PARA FINES EDUCATIVOS ⚠️
 * 
 * Este servidor tiene UNA VULNERABILIDAD INTENCIONAL de inyección SQL.
 * La consulta de login usa concatenación de strings en lugar de
 * prepared statements, lo cual permite inyección SQL.
 * 
 * NUNCA uses este código en producción.
 */

const express = require('express');
const Database = require('better-sqlite3');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'ciberseguridad-secret-key',
    resave: false,
    saveUninitialized: false
}));

// ── Base de datos SQLite ────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'usuarios.db'));

// Crear tabla de usuarios si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    contrasena TEXT NOT NULL
  )
`);

// Insertar usuario predeterminado si no existe
const existe = db.prepare('SELECT COUNT(*) as count FROM usuarios WHERE usuario = ?').get('administrador');
if (existe.count === 0) {
    db.prepare('INSERT INTO usuarios (usuario, contrasena) VALUES (?, ?)').run('administrador', 'pruebadeacceso1');
    console.log('✅ Usuario "administrador" creado en la base de datos.');
}

// ── Rutas ───────────────────────────────────────────────────────────

// Página principal
app.get('/', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🚨 ENDPOINT VULNERABLE A INYECCIÓN SQL 🚨                     ║
// ║  Usa concatenación de strings en lugar de prepared statements   ║
// ╚══════════════════════════════════════════════════════════════════╝
app.post('/login', (req, res) => {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
        return res.json({ success: false, message: 'Por favor, completa todos los campos.' });
    }

    // 🚨 ¡VULNERABLE! - Concatenación directa de strings en la consulta SQL
    // En lugar de usar: db.prepare('SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?').get(usuario, contrasena)
    // Usamos concatenación, lo cual permite inyección SQL:
    const query = `SELECT * FROM usuarios WHERE usuario = '${usuario}' AND contrasena = '${contrasena}'`;

    console.log('\n🔍 ═══════════════════════════════════════════');
    console.log('📝 Consulta SQL ejecutada:');
    console.log(`   ${query}`);
    console.log('═══════════════════════════════════════════════\n');

    try {
        const user = db.prepare(query).get();

        if (user) {
            req.session.usuario = user.usuario;
            console.log(`✅ Login exitoso para: ${user.usuario}`);
            return res.json({ success: true, message: `¡Bienvenido, ${user.usuario}!` });
        } else {
            console.log('❌ Login fallido - credenciales incorrectas');
            return res.json({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }
    } catch (err) {
        console.log(`💥 Error SQL: ${err.message}`);
        return res.json({ success: false, message: `Error en la consulta: ${err.message}` });
    }
});

// Dashboard (página protegida)
app.get('/dashboard', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API para obtener datos del usuario autenticado
app.get('/api/user', (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    res.json({ usuario: req.session.usuario });
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ── Iniciar servidor ────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('');
    console.log('⚠️  ═══════════════════════════════════════════════════════');
    console.log('⚠️  SERVIDOR VULNERABLE - SOLO PARA FINES EDUCATIVOS');
    console.log('⚠️  ═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 Credenciales: usuario="administrador" | contraseña="pruebadeacceso1"`);
    console.log('');
    console.log('🎯 Prueba estas inyecciones SQL en el campo de USUARIO:');
    console.log('');
    console.log("   1️⃣  ' OR '1'='1' --");
    console.log("      → Salta la autenticación completamente");
    console.log('');
    console.log("   2️⃣  administrador' --");
    console.log("      → Entra como administrador sin saber la contraseña");
    console.log('');
    console.log("   3️⃣  ' OR 1=1 --");
    console.log("      → Devuelve el primer usuario de la tabla");
    console.log('');
    console.log("   (En el campo de contraseña puedes poner cualquier cosa)");
    console.log('');
});
