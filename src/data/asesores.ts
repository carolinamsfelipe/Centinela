export interface ResenaAsesor {
  autor: string;
  cargo: string;
  empresa: string;
  comentario: string;
  calificacion: number;
}

export interface AsesorFinanciero {
  id: string;
  nombre: string;
  cargo: string;
  matricula: string;
  avatar: string;
  rating: number;
  resenasTotal: number;
  especialidades: string[];
  sectores: string[];
  tiempoRespuesta: string;
  bio: string;
  resenaDestacada: ResenaAsesor;
  disponible: boolean;
}

export const ASESORES_FINANCIEROS: AsesorFinanciero[] = [
  {
    id: "martin-varela",
    nombre: "Lic. Martín Varela, CFA",
    cargo: "Ex-CFO Corporativo & Especialista en Deuda",
    matricula: "Matrícula CNV N° 1248 · CFA Charterholder",
    avatar: "MV",
    rating: 4.9,
    resenasTotal: 48,
    especialidades: ["Reestructuración de Deuda", "Negociación Bancaria", "Capital de Trabajo"],
    sectores: ["Metalúrgica & Manufactura", "Construcción", "Agroindustria"],
    tiempoRespuesta: "< 2 horas",
    bio: "Más de 15 años de trayectoria como director financiero en PyMEs industriales. Especialista en renegociación de pasivos comerciales, refinanciación bancaria y estructuración de pagarés bursátiles avalados por SGR.",
    resenaDestacada: {
      autor: "Carlos Menéndez",
      cargo: "Socio Gerente",
      empresa: "Industrias Metalpress SRL",
      comentario:
        "Teníamos el ciclo de caja estirado a 110 días y los bancos nos recortaban las líneas. Martín nos armó un flujo semanal de caja y renegoció plazos con proveedores clave en 3 semanas.",
      calificacion: 5,
    },
    disponible: true,
  },
  {
    id: "mariana-rossi",
    nombre: "Cra. Mariana Rossi",
    cargo: "Especialista en Tesorería y Ciclo de Caja (CCC)",
    matricula: "Matrícula CPCECABA T° 312 F° 84 · Posgrado Finanzas UBA",
    avatar: "MR",
    rating: 4.95,
    resenasTotal: 62,
    especialidades: ["Capital de Trabajo & CCC", "Flujo de Fondos", "Cobranzas & Créditos"],
    sectores: ["Comercio Mayorista", "Distribución & Logística", "Retail"],
    tiempoRespuesta: "< 1 hora",
    bio: "Consultora financiera orientada a acelerar el ciclo de efectivo. Asesora a empresas en acortar sus días en la calle (DSO), rotar inventarios críticos y renegociar plazos comerciales para liberar liquidez atrapada.",
    resenaDestacada: {
      autor: "Valeria Fontana",
      cargo: "Directora de Operaciones",
      empresa: "Logística y Distribución Andina",
      comentario:
        "Logramos liberar más de $35 millones de capital de trabajo acortando plazos de cobranza y negociando descuentos por pronto pago. Claridad quirúrgica.",
      calificacion: 5,
    },
    disponible: true,
  },
  {
    id: "santiago-benitez",
    nombre: "Ing. Santiago Benítez, MBA",
    cargo: "Estratega en Riesgo Cambiario y Coberturas",
    matricula: "Matrícula CNV N° 1891 · MBA IAE Business School",
    avatar: "SB",
    rating: 4.85,
    resenasTotal: 34,
    especialidades: ["Estrategia Cambiaria (ARS/USD)", "Futuros Rofex & Coberturas", "Deuda Dual"],
    sectores: ["Agro & Granos", "Importación de Insumos", "Exportadoras"],
    tiempoRespuesta: "< 3 horas",
    bio: "Experto en calce de monedas y coberturas de tipo de cambio frente a saltos devaluatorios y brecha cambiaria. Diseña esquemas de financiamiento comercial atados a dólar linked y pagarés bursátiles en moneda dura.",
    resenaDestacada: {
      autor: "Hernán Rossi",
      cargo: "Presidente",
      empresa: "Agroindustrial El Trébol S.A.",
      comentario:
        "Una devaluación nos amenazaba con disparar el costo de insumos importados. Santiago estructuró una cobertura sintética en Rofex y calce de flujo que protegió nuestro margen operativo.",
      calificacion: 5,
    },
    disponible: true,
  },
  {
    id: "valeria-gomez",
    nombre: "Dra. Valeria Gómez",
    cargo: "Consultora en Mercado de Capitales y Valuación PyME",
    matricula: "Matrícula CNV N° 1554 · Doctora en Finanzas",
    avatar: "VG",
    rating: 4.9,
    resenasTotal: 41,
    especialidades: ["Mercado de Capitales PyME", "Valuación de Empresas", "Búsqueda de Inversores"],
    sectores: ["Tecnología & Servicios", "Salud & Farma", "Alimentos & Bebidas"],
    tiempoRespuesta: "< 2 horas",
    bio: "Especialista en estructuración de instrumentos de financiamiento en el mercado de capitales argentino: Facturas de Crédito Electrónicas MiPyME, cauciones bursátiles y Obligaciones Negociables PyME Simples en BYMA.",
    resenaDestacada: {
      autor: "Luciano Balbi",
      cargo: "CEO",
      empresa: "Sistemas & Automatización SA",
      comentario:
        "Nos guió en la estructuración de financiamiento bursátil con aval de SGR. Dejamos de depender exclusivamente del descubierto bancario a tasas asfixiantes.",
      calificacion: 5,
    },
    disponible: true,
  },
];
