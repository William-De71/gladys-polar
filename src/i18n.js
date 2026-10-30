// -----------------------------------------------------------------------------
// Texts of the integration, in English, French, German and Spanish (English
// fallback).
//
// The manifest carries its own labels; these are the texts the code writes at
// runtime: device and feature names, the scales of Polar (Nightly Recharge
// status, "compared to your usual level", cardio load status), sport names,
// widget contents, scene summaries, messages of the Configuration screen.
// Vocabulary of the Gladys interface (appareil / Gerät / dispositivo, scène /
// Szene / escena). Polar's own product names (Nightly Recharge, ANS charge,
// Sleep Plus Stages) stay in English, as Polar writes them in every language.
// -----------------------------------------------------------------------------

const LANGUAGES = ['en', 'fr', 'de', 'es'];

// Nightly Recharge status, 1 to 6 (index 0 unused).
const RECHARGE = {
  en: ['', 'Very poor', 'Poor', 'Compromised', 'OK', 'Good', 'Very good'],
  fr: ['', 'Très faible', 'Faible', 'Compromise', 'Correcte', 'Bonne', 'Très bonne'],
  de: ['', 'Sehr schwach', 'Schwach', 'Beeinträchtigt', 'OK', 'Gut', 'Sehr gut'],
  es: ['', 'Muy baja', 'Baja', 'Comprometida', 'Correcta', 'Buena', 'Muy buena'],
};

// Sleep charge and ANS charge status: compared to the usual level, 1 to 5.
const CHARGE = {
  en: ['', 'Much below usual', 'Below usual', 'Usual', 'Above usual', 'Much above usual'],
  fr: [
    '',
    'Bien en dessous de l’habitude',
    'En dessous de l’habitude',
    'Habituelle',
    'Au-dessus de l’habitude',
    'Bien au-dessus de l’habitude',
  ],
  de: ['', 'Weit unter üblich', 'Unter üblich', 'Üblich', 'Über üblich', 'Weit über üblich'],
  es: [
    '',
    'Muy por debajo de lo habitual',
    'Por debajo de lo habitual',
    'Habitual',
    'Por encima de lo habitual',
    'Muy por encima de lo habitual',
  ],
};

// Cardio load status (the enum of the cardio load data model).
const CARDIO_STATUS = {
  LOAD_STATUS_NOT_AVAILABLE: {
    en: 'Not available',
    fr: 'Non disponible',
    de: 'Nicht verfügbar',
    es: 'No disponible',
  },
  DETRAINING: {
    en: 'Detraining',
    fr: 'Désentraînement',
    de: 'Trainingsabbau',
    es: 'Desentrenamiento',
  },
  MAINTAINING: { en: 'Maintaining', fr: 'Maintien', de: 'Erhaltend', es: 'Mantenimiento' },
  PRODUCTIVE: { en: 'Productive', fr: 'Productif', de: 'Produktiv', es: 'Productivo' },
  OVERREACHING: { en: 'Overreaching', fr: 'Surcharge', de: 'Überlastung', es: 'Sobrecarga' },
  RECOVERY_AFTER_OVERREACHING: {
    en: 'Recovering from overreaching',
    fr: 'Récupération après surcharge',
    de: 'Erholung nach Überlastung',
    es: 'Recuperación tras sobrecarga',
  },
  PRODUCTIVE_DROPPED_FROM_OVERREACHING: {
    en: 'Productive (after overreaching)',
    fr: 'Productif (après surcharge)',
    de: 'Produktiv (nach Überlastung)',
    es: 'Productivo (tras sobrecarga)',
  },
  PRODUCTIVE_ALMOST_OVERREACHING: {
    en: 'Productive, close to overreaching',
    fr: 'Productif, proche de la surcharge',
    de: 'Produktiv, nahe Überlastung',
    es: 'Productivo, cerca de sobrecarga',
  },
  UNRECOGNIZED: { en: 'Unknown', fr: 'Inconnu', de: 'Unbekannt', es: 'Desconocido' },
};

// The names of the most common sports in the four languages; any other
// sport keeps the English name Polar gives it (POLAR_SPORT_NAMES).
const SPORTS = {
  RUNNING: { en: 'Running', fr: 'Course à pied', de: 'Laufen', es: 'Carrera' },
  ROAD_RUNNING: {
    en: 'Road running',
    fr: 'Course sur route',
    de: 'Straßenlauf',
    es: 'Carrera en asfalto',
  },
  TRAIL_RUNNING: { en: 'Trail running', fr: 'Trail', de: 'Traillauf', es: 'Trail running' },
  TREADMILL_RUNNING: {
    en: 'Treadmill running',
    fr: 'Course sur tapis',
    de: 'Laufband',
    es: 'Carrera en cinta',
  },
  JOGGING: { en: 'Jogging', fr: 'Jogging', de: 'Joggen', es: 'Footing' },
  CYCLING: { en: 'Cycling', fr: 'Vélo', de: 'Radfahren', es: 'Ciclismo' },
  ROAD_BIKING: {
    en: 'Road cycling',
    fr: 'Vélo de route',
    de: 'Rennrad',
    es: 'Ciclismo en carretera',
  },
  MOUNTAIN_BIKING: {
    en: 'Mountain biking',
    fr: 'VTT',
    de: 'Mountainbike',
    es: 'Bicicleta de montaña',
  },
  INDOOR_CYCLING: {
    en: 'Indoor cycling',
    fr: 'Vélo d’intérieur',
    de: 'Indoor-Cycling',
    es: 'Ciclismo en sala',
  },
  E_BIKE: { en: 'Electric biking', fr: 'Vélo électrique', de: 'E-Bike', es: 'Bicicleta eléctrica' },
  GRAVEL: { en: 'Gravel cycling', fr: 'Gravel', de: 'Gravel', es: 'Gravel' },
  WALKING: { en: 'Walking', fr: 'Marche', de: 'Gehen', es: 'Caminar' },
  NORDIC_WALKING: {
    en: 'Nordic walking',
    fr: 'Marche nordique',
    de: 'Nordic Walking',
    es: 'Marcha nórdica',
  },
  HIKING: { en: 'Hiking', fr: 'Randonnée', de: 'Wandern', es: 'Senderismo' },
  SWIMMING: { en: 'Swimming', fr: 'Natation', de: 'Schwimmen', es: 'Natación' },
  POOL_SWIMMING: {
    en: 'Pool swimming',
    fr: 'Natation en piscine',
    de: 'Beckenschwimmen',
    es: 'Natación en piscina',
  },
  OPEN_WATER_SWIMMING: {
    en: 'Open water swimming',
    fr: 'Natation en eau libre',
    de: 'Freiwasserschwimmen',
    es: 'Aguas abiertas',
  },
  STRENGTH_TRAINING: {
    en: 'Strength training',
    fr: 'Musculation',
    de: 'Krafttraining',
    es: 'Fuerza',
  },
  CORE: { en: 'Core', fr: 'Gainage', de: 'Rumpftraining', es: 'Core' },
  HIIT: { en: 'HIIT', fr: 'HIIT', de: 'HIIT', es: 'HIIT' },
  CIRCUIT_TRAINING: {
    en: 'Circuit training',
    fr: 'Circuit training',
    de: 'Zirkeltraining',
    es: 'Circuito',
  },
  FUNCTIONAL_TRAINING: {
    en: 'Functional training',
    fr: 'Entraînement fonctionnel',
    de: 'Funktionelles Training',
    es: 'Entrenamiento funcional',
  },
  YOGA: { en: 'Yoga', fr: 'Yoga', de: 'Yoga', es: 'Yoga' },
  PILATES: { en: 'Pilates', fr: 'Pilates', de: 'Pilates', es: 'Pilates' },
  STRETCHING: { en: 'Stretching', fr: 'Étirements', de: 'Dehnen', es: 'Estiramientos' },
  ROWING: { en: 'Rowing', fr: 'Aviron', de: 'Rudern', es: 'Remo' },
  INDOOR_ROWING: { en: 'Indoor rowing', fr: 'Rameur', de: 'Rudergerät', es: 'Remo en sala' },
  CROSS_TRAINER: { en: 'Cross-trainer', fr: 'Vélo elliptique', de: 'Crosstrainer', es: 'Elíptica' },
  DOWNHILL_SKIING: { en: 'Downhill skiing', fr: 'Ski alpin', de: 'Ski alpin', es: 'Esquí alpino' },
  'CROSS-COUNTRY_SKIING': {
    en: 'Skiing',
    fr: 'Ski de fond',
    de: 'Skilanglauf',
    es: 'Esquí de fondo',
  },
  XC_SKIING_CLASSIC: {
    en: 'Classic XC skiing',
    fr: 'Ski de fond classique',
    de: 'Langlauf klassisch',
    es: 'Esquí de fondo clásico',
  },
  XC_SKIING_FREESTYLE: {
    en: 'Freestyle XC skiing',
    fr: 'Ski de fond skating',
    de: 'Langlauf Skating',
    es: 'Esquí de fondo patinador',
  },
  SNOWBOARDING: { en: 'Snowboarding', fr: 'Snowboard', de: 'Snowboarden', es: 'Snowboard' },
  TENNIS: { en: 'Tennis', fr: 'Tennis', de: 'Tennis', es: 'Tenis' },
  SOCCER: { en: 'Soccer', fr: 'Football', de: 'Fußball', es: 'Fútbol' },
  BASKETBALL: { en: 'Basketball', fr: 'Basket-ball', de: 'Basketball', es: 'Baloncesto' },
  BADMINTON: { en: 'Badminton', fr: 'Badminton', de: 'Badminton', es: 'Bádminton' },
  SQUASH: { en: 'Squash', fr: 'Squash', de: 'Squash', es: 'Squash' },
  PADEL: { en: 'Padel', fr: 'Padel', de: 'Padel', es: 'Pádel' },
  GOLF: { en: 'Golf', fr: 'Golf', de: 'Golf', es: 'Golf' },
  CLIMBING: { en: 'Climbing', fr: 'Escalade', de: 'Klettern', es: 'Escalada' },
  DANCING: { en: 'Dancing', fr: 'Danse', de: 'Tanzen', es: 'Baile' },
  GROUP_EXERCISE: {
    en: 'Group exercise',
    fr: 'Cours collectif',
    de: 'Gruppentraining',
    es: 'Clase colectiva',
  },
  OTHER_INDOOR: {
    en: 'Other indoor',
    fr: 'Autre (intérieur)',
    de: 'Sonstiges (drinnen)',
    es: 'Otro (interior)',
  },
  OTHER_OUTDOOR: {
    en: 'Other outdoor',
    fr: 'Autre (extérieur)',
    de: 'Sonstiges (draußen)',
    es: 'Otro (exterior)',
  },
  OTHER: { en: 'Other sport', fr: 'Autre sport', de: 'Andere Sportart', es: 'Otro deporte' },
};

// The English names of every `detailed_sport_info` value, as the appendix of
// the AccessLink documentation lists them.
const POLAR_SPORT_NAMES = {
  AEROBICS: 'Aerobics',
  AGILITY: 'Dog agility',
  AMERICAN_FOOTBALL: 'Football',
  AQUATICS: 'Aqua fitness',
  BACKCOUNTRY_SKIING: 'Backcountry skiing',
  BADMINTON: 'Badminton',
  BALLET_DANCING: 'Ballet',
  BALLROOM_DANCING: 'Ballroom',
  BASEBALL: 'Baseball',
  BASKETBALL: 'Basketball',
  BEACH_TENNIS: 'Beach tennis',
  BEACH_VOLLEYBALL: 'Beach volley',
  BIATHLON: 'Biathlon',
  BODY_AND_MIND: 'Body&Mind',
  BOOTCAMP: 'Bootcamp',
  BOXING: 'Boxing',
  CALISTHENICS: 'Calisthenics',
  CIRCUIT_TRAINING: 'Circuit training',
  CORE: 'Core',
  CRICKET: 'Cricket',
  CROSS_TRAINER: 'Cross-trainer',
  CROSS_COUNTRY_RUNNING: 'Cross-country running',
  'CROSS-COUNTRY_SKIING': 'Skiing',
  CYCLING: 'Cycling',
  CLIMBING: 'Climbing',
  CURLING: 'Curling',
  DANCING: 'Dancing',
  DOWNHILL_SKIING: 'Downhill skiing',
  DUATHLON: 'Duathlon',
  DUATHLON_CYCLING: 'Cycling',
  DUATHLON_RUNNING: 'Running',
  E_BIKE: 'Electric biking',
  ESPORTS: 'Esports',
  FIELD_HOCKEY: 'Field hockey',
  FINNISH_BASEBALL: 'Finnish baseball',
  FITNESS_BOXING: 'Fitness boxing',
  FITNESS_DANCING: 'Fitness dancing',
  FITNESS_MARTIAL_ARTS: 'Fitness martial arts',
  FITNESS_RACING: 'Fitness Racing',
  FITNESS_STEP: 'Step workout',
  FLOORBALL: 'Floorball',
  FREE_MULTISPORT: 'Multisport',
  FRISBEEGOLF: 'Disc golf',
  FUNCTIONAL_TRAINING: 'Functional training',
  FUTSAL: 'Futsal',
  GOLF: 'Golf',
  GRAVEL: 'Gravel cycling',
  GROUP_EXERCISE: 'Group exercise',
  GYMNASTICK: 'Gymnastics',
  HANDBALL: 'Handball',
  HIIT: 'High-intensity interval training',
  HIKING: 'Hiking',
  ICE_HOCKEY: 'Ice hockey',
  ICE_SKATING: 'Ice skating',
  INDOOR_CYCLING: 'Indoor cycling',
  INDOOR_ROWING: 'Indoor rowing',
  INLINE_SKATING: 'Inline skating',
  JAZZ_DANCING: 'Jazz',
  JOGGING: 'Jogging',
  JUDO_MARTIAL_ARTS: 'Judo',
  JUMP_ROPE: 'Rope skipping',
  KETTLEBELL: 'Kettlebell',
  KICKBIKE: 'Kickbiking',
  KICKBOXING_MARTIAL_ARTS: 'Kickboxing',
  LATIN_DANCING: 'Latin',
  LES_MILLS_BARRE: 'LES MILLS BARRE',
  LES_MILLS_BODYATTACK: 'LES MILLS BODYATTACK',
  LES_MILLS_BODYBALANCE: 'LES MILLS BODYBALANCE',
  LES_MILLS_BODYCOMBAT: 'LES MILLS BODYCOMBAT',
  LES_MILLS_BODYJAM: 'LES MILLS BODYJAM',
  LES_MILLS_BODYPUMP: 'LES MILLS BODYPUMP',
  LES_MILLS_BODYSTEP: 'LES MILLS BODYSTEP',
  LES_MILLS_CXWORKS: 'LES MILLS CXWORX',
  LES_MILLS_GRIT_ATHLETIC: 'LES MILLS GRIT Athletic',
  LES_MILLS_GRIT_CARDIO: 'LES MILLS GRIT Cardio',
  LES_MILLS_GRIT_STRENGTH: 'LES MILLS GRIT Strength',
  LES_MILLS_RPM: 'LES MILLS RPM',
  LES_MILLS_SHBAM: "LES MILLS SH'BAM",
  LES_MILLS_SPRINT: 'LES MILLS SPRINT',
  LES_MILLS_TONE: 'LES MILLS TONE',
  LES_MILLS_TRIP: 'LES MILLS TRIP',
  MOBILITY_DYNAMIC: 'Mobility (dynamic)',
  MOBILITY_STATIC: 'Mobility (static)',
  MODERN_DANCING: 'Modern',
  MOTORSPORTS_CAR_RACING: 'Car racing',
  MOTORSPORTS_ENDURO: 'Enduro',
  MOTORSPORTS_HARD_ENDURO: 'Hard Enduro',
  MOTORSPORTS_MOTOCROSS: 'Motocross',
  MOTORSPORTS_ROADRACING: 'Road racing',
  MOTORSPORTS_SNOCROSS: 'Snocross',
  MOUNTAIN_BIKING: 'Mountain biking',
  NORDIC_WALKING: 'Nordic walking',
  OBSTACLE_COURSE_RACING: 'Obstacle course racing',
  OFFROADDUATHLON: 'Off-road duathlon',
  OFFROADDUATHLON_CYCLING: 'Mountain biking',
  OFFROADDUATHLON_RUNNING: 'Trail running',
  OFFROADTRIATHLON: 'Off-road triathlon',
  OFFROADTRIATHLON_CYCLING: 'Mountain biking',
  OFFROADTRIATHLON_RUNNING: 'Trail running',
  OFFROADTRIATHLON_SWIMMING: 'Open water swimming',
  OPEN_WATER_SWIMMING: 'Open water swimming',
  ORIENTEERING: 'Orienteering',
  ORIENTEERING_MTB: 'Mountain bike orienteering',
  ORIENTEERING_SKI: 'Ski orienteering',
  OTHER_INDOOR: 'Other indoor',
  OTHER_OUTDOOR: 'Other outdoor',
  PADEL: 'Padel racing',
  PARASPORTS_HAND_CYCLING: 'Handcycling',
  PARASPORTS_SLED_HOCKEY: 'Sled hockey',
  PARASPORTS_WATER_SKIING: 'Adaptive water skiing',
  PARASPORTS_WHEELCHAIR: 'Wheelchair racing',
  PARASPORTS_WHEELCHAIR_BASKETBALL: 'Wheelchair basketball',
  PARASPORTS_WHEELCHAIR_TENNIS: 'Wheelchair tennis',
  PICKLEBALL: 'Pickleball',
  PILATES: 'Pilates',
  POOL_SWIMMING: 'Pool swimming',
  RIDING: 'Riding',
  RINGETTE: 'Ringette',
  ROAD_BIKING: 'Road cycling',
  ROAD_RUNNING: 'Road running',
  ROLLER_BLADING: 'Roller skating',
  ROLLER_SKIING_CLASSIC: 'Classic roller skiing',
  ROLLER_SKIING_FREESTYLE: 'Freestyle roller skiing',
  ROWING: 'Rowing',
  RUGBY: 'Rugby',
  RUCKING: 'Rucking',
  RUNNING: 'Running',
  SHOW_DANCING: 'Show',
  SHOOTING_SPORT_INDOOR: 'Shooting (indoor)',
  SHOOTING_SPORT_OUTDOOR: 'Shooting (outdoor)',
  SKATEBOARDING: 'Skateboarding',
  SKATING: 'Skating',
  SKIERG: 'Ski machine',
  SNOWBOARDING: 'Snowboarding',
  SNOWSHOE_TREKKING: 'Snowshoe trekking',
  SOCCER: 'Soccer',
  SPINNING: 'Spinning',
  SUP: 'SUP',
  SQUASH: 'Squash',
  STAIR_WORKOUT: 'Stair workout',
  STREET_DANCING: 'Street',
  STRENGTH_TRAINING: 'Strength training',
  STRETCHING: 'Stretching',
  SWIMMING: 'Swimming',
  TABLE_TENNIS: 'Table tennis',
  TAEKWONDO_MARTIAL_ARTS: 'Taekwondo',
  TELEMARK_SKIING: 'Telemark skiing',
  TENNIS: 'Tennis',
  TRACK_AND_FIELD_RUNNING: 'Track&field running',
  TRAIL_RUNNING: 'Trail running',
  TREADMILL_RUNNING: 'Treadmill running',
  TRIATHLON: 'Triathlon',
  TRIATHLON_CYCLING: 'Cycling',
  TRIATHLON_RUNNING: 'Running',
  TRIATHLON_SWIMMING: 'Open water swimming',
  TROTTING: 'Trotting',
  ULTIMATE: 'Ultimate',
  ULTRARUNNING_RUNNING: 'Ultra running',
  VERTICALSPORTS_WALLCLIMBING: 'Climbing (indoor)',
  VERTICALSPORTS_OUTCLIMBING: 'Climbing (outdoor)',
  VOLLEYBALL: 'Volleyball',
  WALKING: 'Walking',
  WATER_EXERCISE: 'Water sports',
  WATER_RUNNING: 'Water running',
  WATERSPORTS_CANOEING: 'Canoeing',
  WATERSPORTS_KAYAKING: 'Kayaking',
  WATERSPORTS_KITESURFING: 'Kitesurfing',
  WATERSPORTS_SAILING: 'Sailing',
  WATERSPORTS_SURFING: 'Surfing',
  WATERSPORTS_WAKEBOARDING: 'Wakeboarding',
  WATERSPORTS_WATERSKI: 'Water skiing',
  WATERSPORTS_WINDSURFING: 'Windsurfing',
  XC_SKIING_CLASSIC: 'Classic XC skiing',
  XC_SKIING_FREESTYLE: 'Freestyle XC skiing',
  YOGA: 'Yoga',
};

const TEXTS = {
  unknown: { en: 'unknown', fr: 'inconnu', de: 'unbekannt', es: 'desconocido' },
  // devices
  deviceName: { en: 'Polar {name}', fr: 'Polar {name}', de: 'Polar {name}', es: 'Polar {name}' },
  deviceNameDefault: {
    en: 'Polar Flow account',
    fr: 'Compte Polar Flow',
    de: 'Polar-Flow-Konto',
    es: 'Cuenta Polar Flow',
  },
  feature_steps: { en: 'Steps today', fr: 'Pas du jour', de: 'Schritte heute', es: 'Pasos de hoy' },
  feature_active_time: {
    en: 'Active time today',
    fr: 'Temps actif du jour',
    de: 'Aktive Zeit heute',
    es: 'Tiempo activo de hoy',
  },
  feature_calories: {
    en: 'Calories today (kcal)',
    fr: 'Calories du jour (kcal)',
    de: 'Kalorien heute (kcal)',
    es: 'Calorías de hoy (kcal)',
  },
  feature_distance: {
    en: 'Distance today',
    fr: 'Distance du jour',
    de: 'Strecke heute',
    es: 'Distancia de hoy',
  },
  feature_daily_goal: {
    en: 'Daily activity goal',
    fr: 'Objectif d’activité du jour',
    de: 'Tägliches Aktivitätsziel',
    es: 'Objetivo de actividad diario',
  },
  feature_sleep_score: {
    en: 'Sleep score',
    fr: 'Score de sommeil',
    de: 'Schlafwert',
    es: 'Puntuación del sueño',
  },
  feature_sleep_time: {
    en: 'Time asleep',
    fr: 'Durée de sommeil',
    de: 'Schlafdauer',
    es: 'Tiempo dormido',
  },
  feature_nightly_recharge: {
    en: 'Nightly Recharge status (1-6)',
    fr: 'Statut Nightly Recharge (1-6)',
    de: 'Nightly-Recharge-Status (1-6)',
    es: 'Estado Nightly Recharge (1-6)',
  },
  feature_ans_charge: {
    en: 'ANS charge (-10 to +10)',
    fr: 'Charge SNA (-10 à +10)',
    de: 'ANS-Ladung (-10 bis +10)',
    es: 'Carga SNA (-10 a +10)',
  },
  feature_hrv: {
    en: 'Heart rate variability (night)',
    fr: 'Variabilité cardiaque (nuit)',
    de: 'Herzfrequenzvariabilität (Nacht)',
    es: 'Variabilidad cardíaca (noche)',
  },
  feature_night_heart_rate: {
    en: 'Heart rate at night (bpm)',
    fr: 'Fréquence cardiaque nocturne (bpm)',
    de: 'Herzfrequenz nachts (bpm)',
    es: 'Frecuencia cardíaca nocturna (ppm)',
  },
  feature_breathing_rate: {
    en: 'Breathing rate (per minute)',
    fr: 'Fréquence respiratoire (par minute)',
    de: 'Atemfrequenz (pro Minute)',
    es: 'Frecuencia respiratoria (por minuto)',
  },
  feature_cardio_load_ratio: {
    en: 'Cardio load ratio',
    fr: 'Ratio de charge cardio',
    de: 'Cardio-Load-Verhältnis',
    es: 'Ratio de carga cardio',
  },
  feature_cardio_load_status: {
    en: 'Cardio load status',
    fr: 'Statut de charge cardio',
    de: 'Cardio-Load-Status',
    es: 'Estado de carga cardio',
  },
  // units and short texts
  bpm: { en: 'bpm', fr: 'bpm', de: 'S/min', es: 'ppm' },
  minutes: { en: '{m} min', fr: '{m} min', de: '{m} Min.', es: '{m} min' },
  hoursMinutes: { en: '{h} h {m}', fr: '{h} h {m}', de: '{h} Std. {m}', es: '{h} h {m}' },
  heartRateAvgText: {
    en: 'average heart rate {value} bpm',
    fr: 'fréquence cardiaque moyenne {value} bpm',
    de: 'durchschnittliche Herzfrequenz {value} S/min',
    es: 'frecuencia cardíaca media {value} ppm',
  },
  // scene summaries
  summaryNight: {
    en: 'Sleep score {score}, {duration} asleep.',
    fr: 'Score de sommeil {score}, {duration} de sommeil.',
    de: 'Schlafwert {score}, {duration} geschlafen.',
    es: 'Puntuación del sueño {score}, {duration} dormido.',
  },
  summaryRecharge: {
    en: 'Nightly Recharge {status}, ANS charge {ans}, heart rate variability {hrv} ms.',
    fr: 'Nightly Recharge {status}, charge SNA {ans}, variabilité cardiaque {hrv} ms.',
    de: 'Nightly Recharge {status}, ANS-Ladung {ans}, Herzfrequenzvariabilität {hrv} ms.',
    es: 'Nightly Recharge {status}, carga SNA {ans}, variabilidad cardíaca {hrv} ms.',
  },
  summaryRechargeShort: {
    en: 'Nightly Recharge {status}.',
    fr: 'Nightly Recharge {status}.',
    de: 'Nightly Recharge {status}.',
    es: 'Nightly Recharge {status}.',
  },
  summaryGoal: {
    en: 'Daily activity goal reached: {steps} steps, {active} active.',
    fr: 'Objectif d’activité du jour atteint : {steps} pas, {active} d’activité.',
    de: 'Tägliches Aktivitätsziel erreicht: {steps} Schritte, {active} aktiv.',
    es: 'Objetivo de actividad diario alcanzado: {steps} pasos, {active} activo.',
  },
  summaryActivity: {
    en: '{steps} steps, {goal} % of the daily goal.',
    fr: '{steps} pas, {goal} % de l’objectif du jour.',
    de: '{steps} Schritte, {goal} % des Tagesziels.',
    es: '{steps} pasos, {goal} % del objetivo diario.',
  },
  summaryNothing: {
    en: 'No Polar data yet: sync the watch with Polar Flow.',
    fr: 'Pas encore de données Polar : synchronisez la montre avec Polar Flow.',
    de: 'Noch keine Polar-Daten: synchronisiere die Uhr mit Polar Flow.',
    es: 'Aún no hay datos de Polar: sincroniza el reloj con Polar Flow.',
  },
  // widgets
  widgetUpdated: {
    en: 'Last reading',
    fr: 'Dernière lecture',
    de: 'Letzte Abfrage',
    es: 'Última lectura',
  },
  widgetNotConnected: {
    en: 'Polar is not connected: open the configuration of the integration and click Connect with Polar.',
    fr: 'Polar n’est pas connecté : ouvrez la configuration de l’intégration et cliquez sur Se connecter avec Polar.',
    de: 'Polar ist nicht verbunden: Öffne die Konfiguration der Integration und klicke auf Mit Polar verbinden.',
    es: 'Polar no está conectado: abre la configuración de la integración y pulsa Conectar con Polar.',
  },
  widgetNotRead: {
    en: 'Polar has not been read yet: wait a minute.',
    fr: 'Polar n’a pas encore été lu : patientez une minute.',
    de: 'Polar wurde noch nicht abgefragt: Warte eine Minute.',
    es: 'Polar aún no se ha leído: espera un minuto.',
  },
  tileGoal: { en: 'Daily goal', fr: 'Objectif du jour', de: 'Tagesziel', es: 'Objetivo diario' },
  tileSteps: { en: 'Steps', fr: 'Pas', de: 'Schritte', es: 'Pasos' },
  tileActive: { en: 'Active time', fr: 'Temps actif', de: 'Aktive Zeit', es: 'Tiempo activo' },
  tileCalories: { en: 'Calories', fr: 'Calories', de: 'Kalorien', es: 'Calorías' },
  tileDistance: { en: 'Distance', fr: 'Distance', de: 'Strecke', es: 'Distancia' },
  widgetInactivity: {
    en: 'Inactivity alerts',
    fr: 'Alertes d’inactivité',
    de: 'Inaktivitätsalarme',
    es: 'Alertas de inactividad',
  },
  widgetNoActivityToday: {
    en: 'No activity synced today yet (last one: {date}). Sync the watch with Polar Flow.',
    fr: 'Aucune activité synchronisée aujourd’hui (dernière : {date}). Synchronisez la montre avec Polar Flow.',
    de: 'Heute noch keine Aktivität synchronisiert (zuletzt: {date}). Synchronisiere die Uhr mit Polar Flow.',
    es: 'Aún no hay actividad sincronizada hoy (última: {date}). Sincroniza el reloj con Polar Flow.',
  },
  widgetNoActivity: {
    en: 'No daily activity in Polar yet. Polar only shares the data synced after the account was linked.',
    fr: 'Pas encore d’activité quotidienne chez Polar. Polar ne partage que les données synchronisées après la liaison du compte.',
    de: 'Noch keine Tagesaktivität bei Polar. Polar teilt nur Daten, die nach der Verknüpfung des Kontos synchronisiert wurden.',
    es: 'Aún no hay actividad diaria en Polar. Polar solo comparte los datos sincronizados después de vincular la cuenta.',
  },
  buttonSync: { en: 'Sync now', fr: 'Synchroniser', de: 'Jetzt abrufen', es: 'Sincronizar' },
  widgetNoNight: {
    en: 'No night in Polar yet: wear the watch at night and sync it with Polar Flow.',
    fr: 'Pas encore de nuit chez Polar : portez la montre la nuit et synchronisez-la avec Polar Flow.',
    de: 'Noch keine Nacht bei Polar: Trage die Uhr nachts und synchronisiere sie mit Polar Flow.',
    es: 'Aún no hay noches en Polar: lleva el reloj por la noche y sincronízalo con Polar Flow.',
  },
  widgetNightOf: {
    en: 'Night of {date}',
    fr: 'Nuit du {date}',
    de: 'Nacht zum {date}',
    es: 'Noche del {date}',
  },
  tileSleepScore: { en: 'Sleep score', fr: 'Score', de: 'Schlafwert', es: 'Puntuación' },
  tileAsleep: { en: 'Asleep', fr: 'Sommeil', de: 'Geschlafen', es: 'Dormido' },
  tileDeep: { en: 'Deep sleep', fr: 'Profond', de: 'Tiefschlaf', es: 'Profundo' },
  tileRem: { en: 'REM sleep', fr: 'Paradoxal', de: 'REM-Schlaf', es: 'REM' },
  widgetRecharge: {
    en: 'Nightly Recharge',
    fr: 'Nightly Recharge',
    de: 'Nightly Recharge',
    es: 'Nightly Recharge',
  },
  widgetAnsCharge: { en: 'ANS charge', fr: 'Charge SNA', de: 'ANS-Ladung', es: 'Carga SNA' },
  widgetHrv: {
    en: 'Heart rate variability',
    fr: 'Variabilité cardiaque',
    de: 'Herzfrequenzvariabilität',
    es: 'Variabilidad cardíaca',
  },
  widgetNightHeartRate: {
    en: 'Heart rate',
    fr: 'Fréquence cardiaque',
    de: 'Herzfrequenz',
    es: 'Frecuencia cardíaca',
  },
  widgetBreathing: {
    en: 'Breathing rate',
    fr: 'Respiration',
    de: 'Atemfrequenz',
    es: 'Respiración',
  },
  widgetSleepWindow: { en: 'Asleep', fr: 'Endormi', de: 'Geschlafen', es: 'Dormido' },
  widgetInterruptions: {
    en: 'Interruptions',
    fr: 'Interruptions',
    de: 'Unterbrechungen',
    es: 'Interrupciones',
  },
  widgetNoExercise: {
    en: 'No training session in the last 30 days. Polar only shares the sessions synced after the account was linked.',
    fr: 'Aucun entraînement sur les 30 derniers jours. Polar ne partage que les séances synchronisées après la liaison du compte.',
    de: 'Kein Training in den letzten 30 Tagen. Polar teilt nur Einheiten, die nach der Verknüpfung des Kontos synchronisiert wurden.',
    es: 'Ningún entrenamiento en los últimos 30 días. Polar solo comparte las sesiones sincronizadas después de vincular la cuenta.',
  },
  badgeLoad: { en: 'Load {value}', fr: 'Charge {value}', de: 'Last {value}', es: 'Carga {value}' },
  widgetTrainingStatus: {
    en: 'Training status',
    fr: 'Statut d’entraînement',
    de: 'Trainingsstatus',
    es: 'Estado de entrenamiento',
  },
  widgetCardioRatio: {
    en: 'Cardio load ratio',
    fr: 'Ratio de charge cardio',
    de: 'Cardio-Load-Verhältnis',
    es: 'Ratio de carga cardio',
  },
  widgetStrainTolerance: {
    en: 'Strain / tolerance',
    fr: 'Effort / tolérance',
    de: 'Belastung / Toleranz',
    es: 'Esfuerzo / tolerancia',
  },
  chart_steps: {
    en: 'Steps, last 7 days',
    fr: 'Pas, 7 derniers jours',
    de: 'Schritte, letzte 7 Tage',
    es: 'Pasos, últimos 7 días',
  },
  chart_active_time: {
    en: 'Active time (min), last 7 days',
    fr: 'Temps actif (min), 7 derniers jours',
    de: 'Aktive Zeit (Min.), letzte 7 Tage',
    es: 'Tiempo activo (min), últimos 7 días',
  },
  chart_sleep_score: {
    en: 'Sleep score, last 7 nights',
    fr: 'Score de sommeil, 7 dernières nuits',
    de: 'Schlafwert, letzte 7 Nächte',
    es: 'Puntuación del sueño, 7 noches',
  },
  series_steps: { en: 'Steps', fr: 'Pas', de: 'Schritte', es: 'Pasos' },
  series_active_time: {
    en: 'Active time',
    fr: 'Temps actif',
    de: 'Aktive Zeit',
    es: 'Tiempo activo',
  },
  series_sleep_score: { en: 'Sleep score', fr: 'Score', de: 'Schlafwert', es: 'Puntuación' },
  widgetNoWeek: {
    en: 'Nothing synced in the last seven days.',
    fr: 'Rien de synchronisé ces sept derniers jours.',
    de: 'In den letzten sieben Tagen nichts synchronisiert.',
    es: 'Nada sincronizado en los últimos siete días.',
  },
  widgetAverage: {
    en: 'Daily average',
    fr: 'Moyenne par jour',
    de: 'Tagesdurchschnitt',
    es: 'Media diaria',
  },
  widgetBestDay: { en: 'Best day', fr: 'Meilleur jour', de: 'Bester Tag', es: 'Mejor día' },
  // connection status
  statusNoClient: {
    en: 'Enter the Client ID and the secret of your AccessLink client, save, then click Connect with Polar.',
    fr: 'Saisissez le Client ID et le secret de votre client AccessLink, enregistrez, puis cliquez sur Se connecter avec Polar.',
    de: 'Gib die Client-ID und das Secret deines AccessLink-Clients ein, speichere und klicke dann auf Mit Polar verbinden.',
    es: 'Introduce el Client ID y el secreto de tu cliente AccessLink, guarda y pulsa Conectar con Polar.',
  },
  statusNotConnected: {
    en: 'Click Connect with Polar to link your Polar Flow account.',
    fr: 'Cliquez sur Se connecter avec Polar pour lier votre compte Polar Flow.',
    de: 'Klicke auf Mit Polar verbinden, um dein Polar-Flow-Konto zu verknüpfen.',
    es: 'Pulsa Conectar con Polar para vincular tu cuenta Polar Flow.',
  },
  statusReauth: {
    en: 'Polar refused the access (revoked or expired): click Connect with Polar again.',
    fr: 'Polar a refusé l’accès (révoqué ou expiré) : cliquez à nouveau sur Se connecter avec Polar.',
    de: 'Polar hat den Zugriff abgelehnt (widerrufen oder abgelaufen): Klicke erneut auf Mit Polar verbinden.',
    es: 'Polar rechazó el acceso (revocado o caducado): vuelve a pulsar Conectar con Polar.',
  },
  statusConsent: {
    en: 'Polar refuses to share the data: accept the mandatory consents of your account on account.polar.com, then use Sync now.',
    fr: 'Polar refuse de partager les données : acceptez les consentements obligatoires de votre compte sur account.polar.com, puis utilisez Synchroniser.',
    de: 'Polar gibt die Daten nicht frei: Akzeptiere die Pflichteinwilligungen deines Kontos auf account.polar.com und nutze dann Jetzt abrufen.',
    es: 'Polar se niega a compartir los datos: acepta los consentimientos obligatorios de tu cuenta en account.polar.com y usa Sincronizar.',
  },
  statusConnected: {
    en: 'Connected to Polar Flow ({name}). Last reading at {time}, next one around {next}.',
    fr: 'Connecté à Polar Flow ({name}). Dernière lecture à {time}, prochaine vers {next}.',
    de: 'Mit Polar Flow verbunden ({name}). Letzte Abfrage um {time}, nächste gegen {next}.',
    es: 'Conectado a Polar Flow ({name}). Última lectura a las {time}, la próxima hacia las {next}.',
  },
  statusExpiresSoon: {
    en: 'The Polar access ends on {date}: click Connect with Polar again before.',
    fr: 'L’accès Polar prend fin le {date} : cliquez à nouveau sur Se connecter avec Polar avant.',
    de: 'Der Polar-Zugriff endet am {date}: Klicke vorher erneut auf Mit Polar verbinden.',
    es: 'El acceso a Polar termina el {date}: vuelve a pulsar Conectar con Polar antes.',
  },
  statusRateLimited: {
    en: 'Polar asks to slow down (request limit of your AccessLink client): next try in {minutes} min.',
    fr: 'Polar demande de ralentir (limite de requêtes de votre client AccessLink) : nouvel essai dans {minutes} min.',
    de: 'Polar bittet um weniger Anfragen (Limit deines AccessLink-Clients): nächster Versuch in {minutes} Min.',
    es: 'Polar pide reducir el ritmo (límite de peticiones de tu cliente AccessLink): nuevo intento en {minutes} min.',
  },
  statusServer: {
    en: 'Polar AccessLink is unavailable (HTTP {status}): next try in {minutes} min.',
    fr: 'Polar AccessLink est indisponible (HTTP {status}) : nouvel essai dans {minutes} min.',
    de: 'Polar AccessLink ist nicht erreichbar (HTTP {status}): nächster Versuch in {minutes} Min.',
    es: 'Polar AccessLink no está disponible (HTTP {status}): nuevo intento en {minutes} min.',
  },
  statusUnreachable: {
    en: 'Polar AccessLink cannot be reached ({detail}): next try in {minutes} min.',
    fr: 'Polar AccessLink est injoignable ({detail}) : nouvel essai dans {minutes} min.',
    de: 'Polar AccessLink ist nicht erreichbar ({detail}): nächster Versuch in {minutes} Min.',
    es: 'No se puede contactar con Polar AccessLink ({detail}): nuevo intento en {minutes} min.',
  },
  statusRefused: {
    en: 'Polar AccessLink refused the request ({detail}): next try in {minutes} min.',
    fr: 'Polar AccessLink a refusé la requête ({detail}) : nouvel essai dans {minutes} min.',
    de: 'Polar AccessLink hat die Anfrage abgelehnt ({detail}): nächster Versuch in {minutes} Min.',
    es: 'Polar AccessLink rechazó la petición ({detail}): nuevo intento en {minutes} min.',
  },
  connectState: {
    en: 'Connection refused: the answer of Polar does not match the request (expired, or opened twice). Click Connect with Polar again.',
    fr: 'Connexion refusée : la réponse de Polar ne correspond pas à la demande (expirée ou ouverte deux fois). Cliquez à nouveau sur Se connecter avec Polar.',
    de: 'Verbindung abgelehnt: Die Antwort von Polar passt nicht zur Anfrage (abgelaufen oder doppelt geöffnet). Klicke erneut auf Mit Polar verbinden.',
    es: 'Conexión rechazada: la respuesta de Polar no corresponde a la solicitud (caducada o abierta dos veces). Vuelve a pulsar Conectar con Polar.',
  },
  connectFailed: {
    en: 'Polar refused the connection ({reason}). Check the Client ID, the secret and the redirect URL of the AccessLink client, then try again.',
    fr: 'Polar a refusé la connexion ({reason}). Vérifiez le Client ID, le secret et l’URL de redirection du client AccessLink, puis réessayez.',
    de: 'Polar hat die Verbindung abgelehnt ({reason}). Prüfe die Client-ID, das Secret und die Weiterleitungs-URL des AccessLink-Clients und versuche es erneut.',
    es: 'Polar rechazó la conexión ({reason}). Comprueba el Client ID, el secreto y la URL de redirección del cliente AccessLink e inténtalo de nuevo.',
  },
  connectCodeUsed: {
    en: 'This Polar authorization was already used: click Connect with Polar again.',
    fr: 'Cette autorisation Polar a déjà été utilisée : cliquez à nouveau sur Se connecter avec Polar.',
    de: 'Diese Polar-Autorisierung wurde bereits verwendet: Klicke erneut auf Mit Polar verbinden.',
    es: 'Esta autorización de Polar ya se usó: vuelve a pulsar Conectar con Polar.',
  },
  // configuration screen actions and widget button
  refreshDone: {
    en: 'Polar read: {summary}',
    fr: 'Polar lu : {summary}',
    de: 'Polar abgefragt: {summary}',
    es: 'Polar leído: {summary}',
  },
  refreshTooSoon: {
    en: 'Polar was read {minutes} min ago: try again in a few minutes.',
    fr: 'Polar a été lu il y a {minutes} min : réessayez dans quelques minutes.',
    de: 'Polar wurde vor {minutes} Min. abgefragt: Versuche es in ein paar Minuten erneut.',
    es: 'Polar se leyó hace {minutes} min: inténtalo de nuevo en unos minutos.',
  },
  diagnosticDone: {
    en: 'Diagnostic written to the logs of the integration ({count} line(s) starting with “Polar diagnostic”).',
    fr: 'Diagnostic écrit dans les journaux de l’intégration ({count} ligne(s) commençant par « Polar diagnostic »).',
    de: 'Diagnose in die Protokolle der Integration geschrieben ({count} Zeile(n) beginnend mit „Polar diagnostic“).',
    es: 'Diagnóstico escrito en los registros de la integración ({count} línea(s) que empiezan por «Polar diagnostic»).',
  },
  disconnected: {
    en: 'Polar account unlinked: Gladys no longer reads it. The device stays, delete it if you wish.',
    fr: 'Compte Polar délié : Gladys ne le lit plus. L’appareil reste, supprimez-le si vous le souhaitez.',
    de: 'Polar-Konto getrennt: Gladys liest es nicht mehr. Das Gerät bleibt, lösche es bei Bedarf.',
    es: 'Cuenta Polar desvinculada: Gladys ya no la lee. El dispositivo permanece, elimínalo si quieres.',
  },
};

/**
 * @description Whether a value is a supported language.
 * @param {unknown} value - The value.
 * @returns {boolean} True for en, fr, de, es.
 */
function isLanguage(value) {
  return LANGUAGES.includes(value);
}

const localeOf = (language) => (isLanguage(language) ? language : 'en');

/**
 * @description A text in a language (English fallback), with its substitutions.
 * @param {string} key - The TEXTS key.
 * @param {string} language - The language.
 * @param {object} [values] - The substitutions.
 * @returns {string} The text.
 * @example
 * t('deviceName', 'fr', { name: 'Marie' }); // -> 'Polar Marie'
 */
function t(key, language, values = {}) {
  const entry = TEXTS[key];
  if (!entry) {
    return key;
  }
  const template = entry[language] ?? entry.en;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

/**
 * @description The text in every language, for a multi-language message.
 * @param {string} key - The TEXTS key.
 * @param {object|Function} [values] - The substitutions, or `(language) => values`.
 * @returns {{ en: string, fr: string, de: string, es: string }} The message.
 */
function all(key, values = {}) {
  return Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      t(key, language, typeof values === 'function' ? values(language) : values),
    ]),
  );
}

/**
 * @description The name of a sport.
 * @param {object} exercise - `{ sport, detailedSport }`.
 * @param {string} language - The language.
 * @returns {string} "Course à pied", or Polar's English name.
 */
function sportLabel({ sport, detailedSport } = {}, language) {
  for (const code of [detailedSport, sport]) {
    if (!code) {
      continue;
    }
    if (SPORTS[code]) {
      return SPORTS[code][language] ?? SPORTS[code].en;
    }
    if (POLAR_SPORT_NAMES[code]) {
      return POLAR_SPORT_NAMES[code];
    }
  }
  const code = detailedSport ?? sport;
  if (!code) {
    return SPORTS.OTHER[language] ?? SPORTS.OTHER.en;
  }
  const words = String(code).toLowerCase().replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * @description The name of a Nightly Recharge status.
 * @param {number|null} status - 1 to 6.
 * @param {string} language - The language.
 * @returns {string} The name.
 */
function rechargeLabel(status, language) {
  return Number.isInteger(status) && status >= 1 && status <= 6
    ? (RECHARGE[language] ?? RECHARGE.en)[status]
    : t('unknown', language);
}

/**
 * @description The name of a "compared to your usual level" value.
 * @param {number|null} level - 1 to 5.
 * @param {string} language - The language.
 * @returns {string} The name.
 */
function chargeLabel(level, language) {
  return Number.isInteger(level) && level >= 1 && level <= 5
    ? (CHARGE[language] ?? CHARGE.en)[level]
    : t('unknown', language);
}

/**
 * @description The name of a cardio load status.
 * @param {string|null} status - The status.
 * @param {string} language - The language.
 * @returns {string} The name.
 */
function cardioStatusLabel(status, language) {
  const entry = CARDIO_STATUS[status] ?? CARDIO_STATUS.UNRECOGNIZED;
  return entry[language] ?? entry.en;
}

/**
 * @description A number written the way of a language ("1,2" in French).
 * @param {number|null} value - The number.
 * @param {string} language - The language.
 * @param {number} [digits] - Decimals at most.
 * @returns {string} The text, '?' without a value.
 */
function formatNumber(value, language, digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '?';
  }
  return new Intl.NumberFormat(localeOf(language), { maximumFractionDigits: digits }).format(value);
}

/**
 * @description A duration in minutes, the short way ("45 min", "7 h 32").
 * @param {number|null} minutes - The minutes.
 * @param {string} language - The language.
 * @returns {string} The text, '?' without a value.
 */
function formatMinutes(minutes, language) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return '?';
  }
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) {
    return t('minutes', language, { m: total });
  }
  return t('hoursMinutes', language, {
    h: Math.floor(total / 60),
    m: String(total % 60).padStart(2, '0'),
  });
}

/**
 * @description A time of day ("15:42").
 * @param {number} instant - The instant, in ms.
 * @param {string} language - The language.
 * @param {string} [timeZone] - IANA timezone.
 * @returns {string} The text.
 */
function shortTime(instant, language, timeZone) {
  return new Intl.DateTimeFormat(localeOf(language), {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(instant));
}

/**
 * @description A calendar day, the short way ("Thu 29 Oct").
 * @param {string} date - 'YYYY-MM-DD'.
 * @param {string} language - The language.
 * @returns {string} The text.
 */
function shortDate(date, language) {
  return new Intl.DateTimeFormat(localeOf(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * @description A local date-time of the watch, the short way ("Thu 29 Oct, 18:05").
 * @param {string} local - '2026-10-29T18:05' (no timezone: the watch's own time).
 * @param {string} language - The language.
 * @returns {string} The text.
 */
function dayTime(local, language) {
  return new Intl.DateTimeFormat(localeOf(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${local.slice(0, 16)}:00Z`));
}

/**
 * @description The local clock time of an ISO date-time with offset, as the
 * watch saw it ('2026-10-29T23:41:07+01:00' -> '23:41').
 * @param {string|null} value - The date-time.
 * @returns {string|null} 'HH:MM'.
 */
function clockTime(value) {
  const match = typeof value === 'string' ? /T(\d{2}):(\d{2})/.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

export {
  LANGUAGES,
  TEXTS,
  RECHARGE,
  CHARGE,
  CARDIO_STATUS,
  SPORTS,
  POLAR_SPORT_NAMES,
  isLanguage,
  t,
  all,
  sportLabel,
  rechargeLabel,
  chargeLabel,
  cardioStatusLabel,
  formatNumber,
  formatMinutes,
  shortTime,
  shortDate,
  dayTime,
  clockTime,
};
