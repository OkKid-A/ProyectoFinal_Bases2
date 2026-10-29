// Genera CSV de prueba con datos sintéticos. Uso: node generar_ejemplo.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let semilla = 42;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
const elegir = (arr) => arr[Math.floor(azar() * arr.length)];

const MATERIAS = ['MATEMATICA', 'FISICA', 'QUIMICA', 'LENGUAJE'];
const CARRERAS = [
  'INGENIERIA CIVIL', 'INGENIERIA EN CIENCIAS Y SISTEMAS', 'INGENIERIA INDUSTRIAL',
  'INGENIERIA MECANICA', 'INGENIERIA QUIMICA', 'INGENIERIA ELECTRICA', 'INGENIERIA ELECTRONICA',
  'INGENIERIA MECANICA INDUSTRIAL', 'INGENIERIA AMBIENTAL', 'NINGUNO',
];
const UBICACIONES = [
  ['GUATEMALA', 'GUATEMALA - CIUDAD CAPITAL ZONA 1'], ['GUATEMALA', 'GUATEMALA - CIUDAD CAPITAL ZONA 11'],
  ['GUATEMALA', 'MIXCO'], ['GUATEMALA', 'VILLA NUEVA'], ['GUATEMALA', 'SAN MIGUEL PETAPA'],
  ['SACATEPEQUEZ', 'ANTIGUA GUATEMALA'], ['QUETZALTENANGO', 'QUETZALTENANGO'], ['ESCUINTLA', 'ESCUINTLA'],
  ['CHIMALTENANGO', 'CHIMALTENANGO'], ['PETEN', 'FLORES'], ['ALTA VERAPAZ', 'COBAN'], ['IZABAL', 'PUERTO BARRIOS'],
];
const TIPOS = ['PRIVADO', 'PRIVADO', 'PUBLICO', 'PUBLICO', 'COOPERATIVA', 'MUNICIPAL'];
const ENCABEZADO = [
  'fecha_asignacion', 'sexo', 'anio_nacimiento', 'materia', 'numero_de_fecha_de_evaluacion', 'anio_de_ingreso',
  'aprobacion', 'carrera_objetivo', 'departamento_institucion_educativa', 'municipio_institucion_educativa',
  'tipo_institucion_educativa', 'correlativo_aspirante',
];

const csv = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

function generar(anioIngreso, cantidadAspirantes) {
  const filas = [];
  for (let i = 0; i < cantidadAspirantes; i++) {
    const id = crypto.createHash('md5').update(`asp-${anioIngreso}-${i}`).digest('hex');
    const sexo = azar() < 0.7 ? 'M' : 'F';
    const nacimiento = azar() < 0.08 ? 'SIN REGISTRO' : String(anioIngreso - 1 - Math.floor(16 + azar() * 6 + (azar() < 0.1 ? 8 : 0)));
    const carrera = elegir(CARRERAS);
    const [depto, muni] = elegir(UBICACIONES);
    const tipo = elegir(TIPOS);
    const habilidad = azar() + (tipo === 'PRIVADO' ? 0.1 : 0);
    for (const materia of MATERIAS.slice(0, 2 + Math.floor(azar() * 3))) {
      for (let intento = 1; intento <= 3; intento++) {
        const aprobo = azar() < habilidad * 0.8 + intento * 0.08;
        const mes = 6 + intento * 2 + Math.floor(azar() * 2);
        const fecha = `${anioIngreso - 1}-${String(Math.min(mes, 12)).padStart(2, '0')}-${String(1 + Math.floor(azar() * 28)).padStart(2, '0')}`;
        filas.push([fecha, sexo, nacimiento, materia, intento, anioIngreso, aprobo ? 'APROBADO' : 'NO APROBADO', carrera, depto, muni, tipo, id]);
        if (aprobo) break;
      }
    }
  }

  // Datos sucios
  for (let i = 0; i < 15; i++) {
    const f = [...elegir(filas)];
    f[1] = elegir(['m', 'Masculino', 'F', 'femenino']);
    f[3] = f[3].toLowerCase() === 'fisica' ? 'Física' : ` ${f[3].toLowerCase()} `;
    f[6] = elegir(['aprobado', 'No Aprobado', 'REPROBADO']);
    f[10] = elegir(['Público', 'privada', 'OFICIAL']);
    f[4] = String(f[4]) + '.0';
    f[11] = f[11].toUpperCase();
    filas.push(f);
  }
  // Registros inválidos
  const base = filas[0];
  filas.push([...base.slice(0, 11), '']); // sin correlativo
  filas.push(['2014-13-45', ...base.slice(1)]); // fecha imposible
  filas.push([base[0], base[1], base[2], '', ...base.slice(4)]); // materia vacía
  filas.push([...base.slice(0, 6), 'PENDIENTE', ...base.slice(7)]); // aprobación desconocida
  filas.push([...base.slice(0, 4), 'cero', ...base.slice(5)]); // intento no numérico
  filas.push(base.slice(0, 6)); // faltan columnas
  filas.push([...base.slice(0, 2), '1800', ...base.slice(3)]); // año nacimiento fuera de rango (advertencia)
  filas.push(base); // duplicado exacto

  const contenido = [ENCABEZADO.join(','), ...filas.map((f) => f.map(csv).join(','))].join('\n');
  const archivo = path.join(__dirname, `pruebas_especificas_ejemplo_${anioIngreso}.csv`);
  fs.writeFileSync(archivo, contenido + '\n');
  console.log(`${archivo}: ${filas.length} filas`);
}

generar(2015, 400);
generar(2016, 450);
