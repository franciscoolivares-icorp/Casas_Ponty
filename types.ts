// Definición de Catálogos (Enums) basados en el documento
// Se mantienen los Enums como valores iniciales, pero la interfaz permite strings para flexibilidad

export enum Desarrollo {
  ESTANCIA = "ESTANCIA",
  JOYA = "JOYA",
  REFUGIO = "REFUGIO",
  NOGALES = "NOGALES",
  CARRIEDO = "CARRIEDO",
  MAGNA = "MAGNA"
}

export enum Nivel {
  CASA = "CASA",
  CASA_EXC = "CASA EXC",
  PBF = "PBF",
  PBP = "PBP",
  PBF_EXC = "PBF EXC",
  PBP_EXC = "PBP EXC",
  N1 = "N1",
  N2 = "N2",
  N3 = "N3"
}

export enum Modelo {
  COLONIAL = "COLONIAL",
  CAPILLA = "CAPILLA",
  OLIVO_LT = "OLIVO LT",
  OLIVO = "OLIVO",
  NOGAL = "NOGAL",
  CEDRO = "CEDRO",
  MAGNOLIA = "MAGNOLIA",
  CAOBA = "CAOBA",
  SANTANDER_1 = "SANTANDER 1",
  SANTANDER_2 = "SANTANDER 2",
  NOGAL_1 = "NOGAL 1",
  NOGAL_2 = "NOGAL 2"
}

export enum ModeloAgrupador {
  COLONIAL = "COLONIAL",
  CAPILLA = "CAPILLA",
  NOGAL = "NOGAL",
  JOYA = "JOYA",
  REFUGIO = "REFUGIO",
  CARRIEDO = "CARRIEDO",
  MAGNA = "MAGNA"
}

export enum Estado {
  PRODUCCION = "PRODUCCIÓN",
  DISPONIBLE = "DISPONIBLE",
  APARTADO = "APARTADO",
  VENDIDO = "VENDIDO",
  VENDIDO_P = "VENDIDO-P",
  PREVENTA = "PREVENTA",
  ESCRITURADO_P = "ESCRITURADO-P",
  ESCRITURADO = "ESCRITURADO"
}

export enum EstadoAgrupador {
  PRODUCCION = "PRODUCCIÓN",
  DISPONIBLE = "DISPONIBLE",
  APARTADO = "APARTADO",
  VENDIDO = "VENDIDO",
  ESCRITURADO = "ESCRITURADO"
}

export enum DTUAvaluo {
  AVALUO_CERRADO = "AVALÚO CERRADO",
  CON_DTU = "CON DTU",
  SIN_DTU = "SIN DTU"
}

export enum MetodoCompra {
  BANCARIO = "BANCARIO",
  BANCARIO_APOYO_INFO = "BANCARIO - APOYO INFO",
  COFINAVIT = "COFINAVIT",
  CONTADO = "CONTADO",
  INFO_CONYUGAL = "INFO CONYUGAL",
  INFO_UNAMOS = "INFO UNAMOS",
  INFO_TOTAL = "INFO TOTAL",
  INFO_TRADICIONAL = "INFO TRADICIONAL",
  FOVISSSTE_TRADICIONAL = "FOVISSSTE TRADICIONAL",
  FOVISSSTE_PARA_TODOS = "FOVISSSTE PARA TODOS",
  INFO_FOVISSSTE = "INFO - FOVISSSTE",
  INFO_BANCO = "INFO + BANCO",
  IVEQ = "IVEQ",
  FOVISSSTE_CONYUGAL = "FOVISSSTE CONYUGAL"
}

export enum MetodoCompraAgrupador {
  BANCARIO = "BANCARIO",
  INFO = "INFO",
  FOVISSSTE = "FOVISSSTE",
  CONTADO = "CONTADO"
}

export enum Banco {
  SCOTIABANK = "SCOTIABANK",
  SANTANDER = "SANTANDER",
  BBVA = "BBVA",
  BANORTE = "BANORTE"
}

export enum TipoUsuario {
  ADMINISTRADOR = "ADMINISTRADOR",
  AUDITOR = "AUDITOR",
  COORDINADOR = "COORDINADOR",
  ASESOR = "ASESOR"
}

export enum Asesor {
  ABRAHAM_VELAZQUEZ = "ABRAHAM VELAZQUEZ",
  AGUSTIN_VALDOVINOS = "AGUSTIN VALDOVINOS",
  ALE_FEREGRINO = "ALE FEREGRINO",
  ALEJANDRA_GOMEZ = "ALEJANDRA GOMEZ",
  ALEJANDRA_ZALDIVAR = "ALEJANDRA ZALDIVAR",
  ALEJANDRO_CONTRERAS = "ALEJANDRO CONTRERAS",
  ALFREDO_NUNEZ = "ALFREDO NUNEZ",
  ALICIA_PEREZ = "ALICIA PEREZ",
  ALMA_MARTINEZ = "ALMA MARTINEZ",
  ANA_LILIA_LEON = "ANA LILIA LEON",
  ANGELICA_SANCHEZ = "ANGELICA SANCHEZ",
  BETY_ARAUJO = "BETY ARAUJO",
  BLANCA_CONTRERAS = "BLANCA CONTRERAS",
  CARLOS_RIOS = "CARLOS RIOS",
  CAROLINA_VARGAS = "CAROLINA VARGAS",
  CIRILO_OLVERA = "CIRILO OLVERA",
  CLAUDIA_SANCHEZ = "CLAUDIA SANCHEZ",
  DIANA_FRAUSTO = "DIANA FRAUSTO",
  EFREN_VILLEGAS = "EFREN VILLEGAS",
  ELSA_RODRIGUEZ = "ELSA RODRIGUEZ",
  GABY_MARTINEZ = "GABY MARTINEZ",
  GABY_PONCE = "GABY PONCE",
  GRACE_PEREYRA = "GRACE PEREYRA",
  JUAN_CARLOS_RAMIREZ = "JUAN CARLOS RAMIREZ",
  KAREN_CONTRERAS = "KAREN CONTRERAS",
  LAURA_RUIZ = "LAURA RUIZ",
  LUPITA_CORIA = "LUPITA CORIA",
  MAGUIE_AGUILAR = "MAGUIE AGUILAR",
  MALE_SANCHEZ = "MALE SANCHEZ",
  MARIA_ESCOBAR = "MARIA ESCOBAR",
  MARILOLI_CARRILLO = "MARILOLI CARRILLO",
  MARLEN_SANCHEZ = "MARLEN SANCHEZ",
  MARTHA_YANEZ = "MARTHA YANEZ",
  MARY_MOLZALVO = "MARY MOLZALVO",
  MIGUEL_RODRIGUEZ = "MIGUEL RODRIGUEZ",
  MIRIAM_BALTAZAR = "MIRIAM BALTAZAR",
  MIZAEL_GOMEZ = "MIZAEL GOMEZ",
  NASH_SANCHEZ = "NASH SANCHEZ",
  OFELIA_HERRERA = "OFELIA HERRERA",
  OSWALDO_SERRANO = "OSWALDO SERRANO",
  PATY_CALDERON = "PATY CALDERON",
  RAUL_MANRIQUEZ = "RAUL MANRIQUEZ",
  ROCIO_CERVANTES = "ROCIO CERVANTES",
  SANDRA_SAN_JUAN = "SANDRA SAN JUAN",
  SANDRA_VERAZA = "SANDRA VERAZA",
  SOFIA_FERNANDEZ = "SOFIA FERNANDEZ",
  TANIA_CARRILLO = "TANIA CARRILLO",
  VICTOR_GANEM = "VICTOR GANEM",
  YAZZ_DE_LA_TORRE = "YAZZ DE LA TORRE"
}

// Interfaz Principal de la Base de Datos (Schema)
export interface Propiedad {
  // Identificadores y Clasificación
  idPropiedad: string; // pnty-000001 (Generado)
  created_at?: string; // IMPORTANTE para auditorías de Supabase
  
  desarrollo?: string | null; // Dynamic Catalog
  nivel?: string | null; // Dynamic Catalog
  modelo?: string | null; // Dynamic Catalog
  modeloAgrupador?: string | null; // Dynamic Catalog
  
  // Estado
  estado: string; // Dynamic Catalog
  estadoAgrupador?: string | null; // Dynamic Catalog
  
  // Financiero
  precioLista?: number;
  descuento?: number; // Negativo
  precioFinal?: number;
  precioOperacion?: number;
  m2TerrExc?: number; // 1 decimal
  precioXM2Exc?: number;
  precioTerrExc?: number;
  precioObrasAdicionales?: number;
  obrasAdicionales?: string | null; // CORREGIDO para empatar con DB
  ek?: string | null; // ID ERP (Texto)
  
  // Datos Comprador
  nombreComprador?: string | null;
  titulacion?: string | null; 
  fechaDesde?: string | null; 
  diasDesdeRevisar?: number; // CAMPO CALCULADO
  
  // Avalúo
  dtu?: boolean; 
  dtuAvaluo?: string | null; // Dynamic Catalog
  valorAvaluo?: number;
  
  // Fechas y Tiempos (Calculados o Inputs)
  contadorDiasMaximoApartado?: number; // Calculado
  diasAutorizadosApartado?: number; // Nuevo Campo Editable
  diasAtrasoApartado?: number; // Calculado
  diasRezagoApartado?: number; // Campo Calculado
  
  // Compra
  metodoCompra?: string | null; // Dynamic Catalog
  metodoCompraAgrupador?: string | null; // Dynamic Catalog (Nuevo)
  banco?: string | null; // Dynamic Catalog
  
  // Ubicación
  calle?: string | null;
  manzana?: string | null;
  lote?: string | null;
  edificio?: string | null;
  numeroExterior?: string | null;
  numeroInterior?: string | null;
  condomino?: string | null;
  
  // Extras
  asesorExterno?: boolean;
  asesor?: string | null; // Dynamic Catalog
  observaciones?: string | null; // NUEVO CAMPO AGREGADO
  retroAsesor?: string | null; 
  
  // Broker
  nombreBrokerBanco?: string | null;
  telefonoBrokerBanco?: string | null; // 10 dígitos
  correoBrokerBanco?: string | null;
  
  // Auditoria
  tipoUsuario?: string | null; // Dynamic Catalog
  
  // Documentos (Simulados como strings/urls o booleanos para upload)
  comprobanteApartado?: string | null; // imagen/documento
  mailAutorizaFovissste?: string | null; // imagen/documento
  autorizacionBanco?: string | null; // imagen/documento
  
  // Fechas Clave 
  fechaApartado?: string | null; // Date string ISO
  fechaVenta?: string | null; // Date string ISO
  fechaEscritura?: string | null; // Date string ISO

  // Archivos
  url_comprobante_apartado?: string | null;
  url_autorizacion_bancaria?: string | null;
  url_mail_fovissste?: string | null;
  url_solicitud_reubicacion?: string | null;
}