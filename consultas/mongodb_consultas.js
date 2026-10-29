// Consultas de MongoDB — generado automáticamente con "npm run docs".
// Ejecutar en mongosh:  mongosh "mongodb://admin:admin123@localhost:27017/usac_pruebas?authSource=admin" consultas/mongodb_consultas.js
// o copiar cada consulta individualmente.

db = db.getSiblingDB('usac_pruebas');

// 1. Aspirantes por tipo de institución educativa
// Cantidad de aspirantes distintos agrupados por tipo de institución de procedencia.
print('--- 1. Aspirantes por tipo de institución educativa');
printjson(db.evaluaciones.aggregate([
  {
    "$group": {
      "_id": {
        "tipo": "$tipo_institucion",
        "aspirante": "$aspirante_id"
      }
    }
  },
  {
    "$group": {
      "_id": "$_id.tipo",
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "tipo_institucion": "$_id",
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "aspirantes": -1
    }
  }
]).toArray());

// 2. Cantidad de aprobados por materia
// Número de evaluaciones con resultado APROBADO por materia.
print('--- 2. Cantidad de aprobados por materia');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "aprobado": true
    }
  },
  {
    "$group": {
      "_id": "$materia",
      "aprobadas": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "materia": "$_id",
      "aprobadas": 1
    }
  },
  {
    "$sort": {
      "aprobadas": -1
    }
  }
]).toArray());

// 3. Aprobados por carrera y año de ingreso
// Aspirantes distintos con al menos una evaluación aprobada, por carrera objetivo y año de ingreso.
print('--- 3. Aprobados por carrera y año de ingreso');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "aprobado": true
    }
  },
  {
    "$group": {
      "_id": {
        "carrera": "$carrera_objetivo",
        "anio": "$anio_de_ingreso",
        "aspirante": "$aspirante_id"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera": "$_id.carrera",
        "anio": "$_id.anio"
      },
      "aprobados": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id.carrera",
      "anio_de_ingreso": "$_id.anio",
      "aprobados": 1
    }
  },
  {
    "$sort": {
      "anio_de_ingreso": 1,
      "aprobados": -1
    }
  }
]).toArray());

// 4. Porcentaje de aprobación por materia
// Evaluaciones aprobadas / evaluaciones totales por materia.
print('--- 4. Porcentaje de aprobación por materia');
printjson(db.evaluaciones.aggregate([
  {
    "$group": {
      "_id": "$materia",
      "total": {
        "$sum": 1
      },
      "aprobadas": {
        "$sum": {
          "$cond": [
            "$aprobado",
            1,
            0
          ]
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "materia": "$_id",
      "total": 1,
      "aprobadas": 1,
      "porcentaje_aprobacion": {
        "$round": [
          {
            "$multiply": [
              {
                "$divide": [
                  "$aprobadas",
                  "$total"
                ]
              },
              100
            ]
          },
          2
        ]
      }
    }
  },
  {
    "$sort": {
      "porcentaje_aprobacion": -1
    }
  }
]).toArray());

// 5. Promedio de edad por carrera
// Edad promedio de los aspirantes (edad en su primera evaluación) por carrera objetivo.
print('--- 5. Promedio de edad por carrera');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "edad": {
        "$ne": null
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera": "$carrera_objetivo",
        "aspirante": "$aspirante_id"
      },
      "edad": {
        "$min": "$edad"
      }
    }
  },
  {
    "$group": {
      "_id": "$_id.carrera",
      "edad_promedio": {
        "$avg": "$edad"
      },
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id",
      "edad_promedio": {
        "$round": [
          "$edad_promedio",
          2
        ]
      },
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "edad_promedio": -1
    }
  }
]).toArray());

// 6. Colección auxiliar resumen_carrera
// Genera (con $out) la colección resumen_carrera con totales, tasa de aprobación, edad promedio y desglose por materia de cada carrera.
print('--- 6. Colección auxiliar resumen_carrera');
printjson(db.evaluaciones.aggregate([
  {
    "$group": {
      "_id": {
        "carrera": "$carrera_objetivo",
        "materia": "$materia"
      },
      "evaluaciones": {
        "$sum": 1
      },
      "aprobadas": {
        "$sum": {
          "$cond": [
            "$aprobado",
            1,
            0
          ]
        }
      },
      "aspirantes": {
        "$addToSet": "$aspirante_id"
      },
      "edades": {
        "$push": "$edad"
      },
      "anios": {
        "$addToSet": "$anio_de_ingreso"
      }
    }
  },
  {
    "$group": {
      "_id": "$_id.carrera",
      "total_evaluaciones": {
        "$sum": "$evaluaciones"
      },
      "total_aprobadas": {
        "$sum": "$aprobadas"
      },
      "aspirantes": {
        "$push": "$aspirantes"
      },
      "edades": {
        "$push": "$edades"
      },
      "anios": {
        "$push": "$anios"
      },
      "por_materia": {
        "$push": {
          "materia": "$_id.materia",
          "evaluaciones": "$evaluaciones",
          "aprobadas": "$aprobadas",
          "porcentaje_aprobacion": {
            "$round": [
              {
                "$multiply": [
                  {
                    "$divide": [
                      "$aprobadas",
                      "$evaluaciones"
                    ]
                  },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    }
  },
  {
    "$project": {
      "carrera": "$_id",
      "total_evaluaciones": 1,
      "total_aprobadas": 1,
      "total_no_aprobadas": {
        "$subtract": [
          "$total_evaluaciones",
          "$total_aprobadas"
        ]
      },
      "porcentaje_aprobacion": {
        "$round": [
          {
            "$multiply": [
              {
                "$divide": [
                  "$total_aprobadas",
                  "$total_evaluaciones"
                ]
              },
              100
            ]
          },
          2
        ]
      },
      "total_aspirantes": {
        "$size": {
          "$reduce": {
            "input": "$aspirantes",
            "initialValue": [],
            "in": {
              "$setUnion": [
                "$$value",
                "$$this"
              ]
            }
          }
        }
      },
      "edad_promedio": {
        "$round": [
          {
            "$avg": {
              "$reduce": {
                "input": "$edades",
                "initialValue": [],
                "in": {
                  "$concatArrays": [
                    "$$value",
                    "$$this"
                  ]
                }
              }
            }
          },
          2
        ]
      },
      "anios_ingreso": {
        "$sortArray": {
          "input": {
            "$reduce": {
              "input": "$anios",
              "initialValue": [],
              "in": {
                "$setUnion": [
                  "$$value",
                  "$$this"
                ]
              }
            }
          },
          "sortBy": 1
        }
      },
      "por_materia": {
        "$sortArray": {
          "input": "$por_materia",
          "sortBy": {
            "materia": 1
          }
        }
      },
      "generado": "$$NOW"
    }
  },
  {
    "$out": "resumen_carrera"
  }
]).toArray());

// 7. Edad promedio de aprobados por carrera y tipo de institución
// Edad promedio de los aspirantes que aprobaron, agrupada por carrera objetivo y tipo de institución.
print('--- 7. Edad promedio de aprobados por carrera y tipo de institución');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "aprobado": true,
      "edad": {
        "$ne": null
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera": "$carrera_objetivo",
        "tipo": "$tipo_institucion",
        "aspirante": "$aspirante_id"
      },
      "edad": {
        "$min": "$edad"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera": "$_id.carrera",
        "tipo": "$_id.tipo"
      },
      "edad_promedio": {
        "$avg": "$edad"
      },
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id.carrera",
      "tipo_institucion": "$_id.tipo",
      "edad_promedio": {
        "$round": [
          "$edad_promedio",
          2
        ]
      },
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "carrera_objetivo": 1,
      "tipo_institucion": 1
    }
  }
]).toArray());

// 8. Distribución de aprobados por municipio y carrera objetivo
// Aspirantes aprobados según el municipio de la institución educativa y la carrera objetivo.
print('--- 8. Distribución de aprobados por municipio y carrera objetivo');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "aprobado": true
    }
  },
  {
    "$group": {
      "_id": {
        "departamento": "$departamento",
        "municipio": "$municipio",
        "carrera": "$carrera_objetivo",
        "aspirante": "$aspirante_id"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "departamento": "$_id.departamento",
        "municipio": "$_id.municipio",
        "carrera": "$_id.carrera"
      },
      "aprobados": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "departamento": "$_id.departamento",
      "municipio": "$_id.municipio",
      "carrera_objetivo": "$_id.carrera",
      "aprobados": 1
    }
  },
  {
    "$sort": {
      "aprobados": -1,
      "municipio": 1
    }
  }
]).toArray());

// 9. Evaluaciones por mes y materia (instituciones públicas)
// Cantidad de evaluaciones por mes de asignación y materia, sólo para aspirantes de instituciones públicas.
print('--- 9. Evaluaciones por mes y materia (instituciones públicas)');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "tipo_institucion": "PUBLICO"
    }
  },
  {
    "$group": {
      "_id": {
        "mes": {
          "$dateToString": {
            "format": "%Y-%m",
            "date": "$fecha_asignacion"
          }
        },
        "materia": "$materia"
      },
      "evaluaciones": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "mes": "$_id.mes",
      "materia": "$_id.materia",
      "evaluaciones": 1
    }
  },
  {
    "$sort": {
      "mes": 1,
      "materia": 1
    }
  }
]).toArray());

// 10. Top 5 carreras más demandadas (aspirantes de 16 a 18 años)
// Las 5 carreras con más aspirantes distintos con edad entre 16 y 18 años (excluye NINGUNO).
print('--- 10. Top 5 carreras más demandadas (aspirantes de 16 a 18 años)');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "edad": {
        "$gte": 16,
        "$lte": 18
      },
      "carrera_objetivo": {
        "$ne": "NINGUNO"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "carrera": "$carrera_objetivo",
        "aspirante": "$aspirante_id"
      }
    }
  },
  {
    "$group": {
      "_id": "$_id.carrera",
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$sort": {
      "aspirantes": -1
    }
  },
  {
    "$limit": 5
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id",
      "aspirantes": 1
    }
  }
]).toArray());

// 11. Historial de desempeño por aspirante
// Evaluaciones de un aspirante agrupadas por materia: intentos, resultados y si logró aprobar.
print('--- 11. Historial de desempeño por aspirante');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "aspirante_id": "949d241ac10256edf11339a303c72a50"
    }
  },
  {
    "$sort": {
      "fecha_asignacion": 1,
      "intento": 1
    }
  },
  {
    "$group": {
      "_id": "$materia",
      "intentos": {
        "$sum": 1
      },
      "aprobada": {
        "$max": "$aprobado"
      },
      "primera_fecha": {
        "$first": "$fecha_asignacion"
      },
      "ultima_fecha": {
        "$last": "$fecha_asignacion"
      },
      "detalle": {
        "$push": {
          "fecha": "$fecha_asignacion",
          "intento": "$intento",
          "anio_de_ingreso": "$anio_de_ingreso",
          "resultado": "$aprobacion"
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "materia": "$_id",
      "intentos": 1,
      "aprobada": 1,
      "primera_fecha": 1,
      "ultima_fecha": 1,
      "detalle": 1
    }
  },
  {
    "$sort": {
      "materia": 1
    }
  }
]).toArray());

// 12. Distribución por sexo y tipo de institución
// Aspirantes distintos agrupados por sexo y tipo de institución educativa.
print('--- 12. Distribución por sexo y tipo de institución');
printjson(db.evaluaciones.aggregate([
  {
    "$group": {
      "_id": {
        "sexo": "$sexo",
        "tipo": "$tipo_institucion",
        "aspirante": "$aspirante_id"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "sexo": "$_id.sexo",
        "tipo": "$_id.tipo"
      },
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "sexo": "$_id.sexo",
      "tipo_institucion": "$_id.tipo",
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "tipo_institucion": 1,
      "sexo": 1
    }
  }
]).toArray());

// 13. Tasa de aprobación por edad
// Porcentaje de evaluaciones aprobadas para cada edad (excluye edades desconocidas).
print('--- 13. Tasa de aprobación por edad');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "edad": {
        "$ne": null
      }
    }
  },
  {
    "$group": {
      "_id": "$edad",
      "total": {
        "$sum": 1
      },
      "aprobadas": {
        "$sum": {
          "$cond": [
            "$aprobado",
            1,
            0
          ]
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "edad": "$_id",
      "total": 1,
      "aprobadas": 1,
      "porcentaje_aprobacion": {
        "$round": [
          {
            "$multiply": [
              {
                "$divide": [
                  "$aprobadas",
                  "$total"
                ]
              },
              100
            ]
          },
          2
        ]
      }
    }
  },
  {
    "$sort": {
      "edad": 1
    }
  }
]).toArray());

// 14. Número promedio de intentos por materia
// Promedio de evaluaciones (oportunidades) que usa cada aspirante en cada materia.
print('--- 14. Número promedio de intentos por materia');
printjson(db.evaluaciones.aggregate([
  {
    "$group": {
      "_id": {
        "materia": "$materia",
        "aspirante": "$aspirante_id"
      },
      "intentos": {
        "$sum": 1
      }
    }
  },
  {
    "$group": {
      "_id": "$_id.materia",
      "promedio_intentos": {
        "$avg": "$intentos"
      },
      "maximo_intentos": {
        "$max": "$intentos"
      },
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "materia": "$_id",
      "promedio_intentos": {
        "$round": [
          "$promedio_intentos",
          2
        ]
      },
      "maximo_intentos": 1,
      "aspirantes": 1
    }
  },
  {
    "$sort": {
      "promedio_intentos": -1
    }
  }
]).toArray());

// 15. Historial completo de un aspirante
// Toda la información disponible de un aspirante (documento de la colección aspirantes).
print('--- 15. Historial completo de un aspirante');
printjson(db.aspirantes.aggregate([
  {
    "$match": {
      "_id": "949d241ac10256edf11339a303c72a50"
    }
  }
]).toArray());

// 16. Carreras con más aspirantes reprobados en primer intento
// Para cada aspirante y materia se toma la primera evaluación (por fecha); se cuentan los aspirantes que no la aprobaron.
print('--- 16. Carreras con más aspirantes reprobados en primer intento');
printjson(db.evaluaciones.aggregate([
  {
    "$sort": {
      "aspirante_id": 1,
      "materia": 1,
      "fecha_asignacion": 1,
      "intento": 1
    }
  },
  {
    "$group": {
      "_id": {
        "aspirante": "$aspirante_id",
        "materia": "$materia"
      },
      "primer_resultado": {
        "$first": "$aprobado"
      },
      "carrera": {
        "$first": "$carrera_objetivo"
      }
    }
  },
  {
    "$match": {
      "primer_resultado": false
    }
  },
  {
    "$group": {
      "_id": {
        "carrera": "$carrera",
        "aspirante": "$_id.aspirante"
      }
    }
  },
  {
    "$group": {
      "_id": "$_id.carrera",
      "aspirantes_reprobados": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "carrera_objetivo": "$_id",
      "aspirantes_reprobados": 1
    }
  },
  {
    "$sort": {
      "aspirantes_reprobados": -1
    }
  }
]).toArray());

// 17. Top 5 municipios con más aspirantes
// Los 5 municipios de la institución de procedencia con más aspirantes distintos.
print('--- 17. Top 5 municipios con más aspirantes');
printjson(db.evaluaciones.aggregate([
  {
    "$group": {
      "_id": {
        "departamento": "$departamento",
        "municipio": "$municipio",
        "aspirante": "$aspirante_id"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "departamento": "$_id.departamento",
        "municipio": "$_id.municipio"
      },
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$sort": {
      "aspirantes": -1
    }
  },
  {
    "$limit": 5
  },
  {
    "$project": {
      "_id": 0,
      "municipio": "$_id.municipio",
      "departamento": "$_id.departamento",
      "aspirantes": 1
    }
  }
]).toArray());

// 18. Tasa de aprobación por tipo de institución
// Porcentaje de evaluaciones aprobadas según el tipo de institución educativa.
print('--- 18. Tasa de aprobación por tipo de institución');
printjson(db.evaluaciones.aggregate([
  {
    "$group": {
      "_id": "$tipo_institucion",
      "total": {
        "$sum": 1
      },
      "aprobadas": {
        "$sum": {
          "$cond": [
            "$aprobado",
            1,
            0
          ]
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "tipo_institucion": "$_id",
      "total": 1,
      "aprobadas": 1,
      "porcentaje_aprobacion": {
        "$round": [
          {
            "$multiply": [
              {
                "$divide": [
                  "$aprobadas",
                  "$total"
                ]
              },
              100
            ]
          },
          2
        ]
      }
    }
  },
  {
    "$sort": {
      "porcentaje_aprobacion": -1
    }
  }
]).toArray());

// 19. Carreras más demandadas por departamento
// Para cada departamento, las 3 carreras con más aspirantes distintos (excluye NINGUNO).
print('--- 19. Carreras más demandadas por departamento');
printjson(db.evaluaciones.aggregate([
  {
    "$match": {
      "carrera_objetivo": {
        "$ne": "NINGUNO"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "departamento": "$departamento",
        "carrera": "$carrera_objetivo",
        "aspirante": "$aspirante_id"
      }
    }
  },
  {
    "$group": {
      "_id": {
        "departamento": "$_id.departamento",
        "carrera": "$_id.carrera"
      },
      "aspirantes": {
        "$sum": 1
      }
    }
  },
  {
    "$sort": {
      "_id.departamento": 1,
      "aspirantes": -1
    }
  },
  {
    "$group": {
      "_id": "$_id.departamento",
      "carreras": {
        "$push": {
          "carrera": "$_id.carrera",
          "aspirantes": "$aspirantes"
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "departamento": "$_id",
      "carrera_mas_demandada": {
        "$arrayElemAt": [
          "$carreras.carrera",
          0
        ]
      },
      "aspirantes": {
        "$arrayElemAt": [
          "$carreras.aspirantes",
          0
        ]
      },
      "top_3": {
        "$slice": [
          "$carreras",
          3
        ]
      }
    }
  },
  {
    "$sort": {
      "aspirantes": -1
    }
  }
]).toArray());

// 20. Evolución de aprobación por año de ingreso
// Cantidad y porcentaje de evaluaciones aprobadas y no aprobadas por año de ingreso.
print('--- 20. Evolución de aprobación por año de ingreso');
printjson(db.evaluaciones.aggregate([
  {
    "$group": {
      "_id": "$anio_de_ingreso",
      "total": {
        "$sum": 1
      },
      "aprobadas": {
        "$sum": {
          "$cond": [
            "$aprobado",
            1,
            0
          ]
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "anio_de_ingreso": "$_id",
      "total": 1,
      "aprobadas": 1,
      "no_aprobadas": {
        "$subtract": [
          "$total",
          "$aprobadas"
        ]
      },
      "porcentaje_aprobadas": {
        "$round": [
          {
            "$multiply": [
              {
                "$divide": [
                  "$aprobadas",
                  "$total"
                ]
              },
              100
            ]
          },
          2
        ]
      },
      "porcentaje_no_aprobadas": {
        "$round": [
          {
            "$multiply": [
              {
                "$divide": [
                  {
                    "$subtract": [
                      "$total",
                      "$aprobadas"
                    ]
                  },
                  "$total"
                ]
              },
              100
            ]
          },
          2
        ]
      }
    }
  },
  {
    "$sort": {
      "anio_de_ingreso": 1
    }
  }
]).toArray());

