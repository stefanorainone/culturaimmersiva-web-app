export const predefinedExperiences = [
  {
    id: 'arte-immersiva',
    name: 'Arte Immersiva',
    duration: 15,
    description: "Immergiti nell'arte in modo innovativo. Un'esperienza che ti permette di vivere le opere d'arte come mai prima d'ora.",
    image: '/images/cities/van-gogh.webp',
    category: 'arte'
  },
  {
    id: 'pompei',
    name: 'L\'antica Pompei',
    duration: 15,
    description: "Un viaggio immersivo nell'antica città di Pompei prima dell'eruzione del Vesuvio. Cammina tra le strade romane e scopri la vita quotidiana di 2000 anni fa.",
    image: '/images/cities/pompei-vr.webp',
    category: 'storia'
  },
  {
    id: 'universo',
    name: 'Viaggio nell\'Universo',
    duration: 15,
    description: "Esplora il sistema solare e oltre. Visita pianeti, stelle e galassie in un'avventura spaziale mozzafiato.",
    image: '/images/cities/space.webp',
    category: 'scienza'
  },
  {
    id: 'oceano',
    name: 'Alla scoperta dell\'Oceano',
    duration: 15,
    description: "Immergiti nelle profondità dell'oceano. Incontra creature marine straordinarie e scopri ecosistemi sottomarini nascosti.",
    image: '/images/cities/ocean.webp',
    category: 'natura'
  },
  {
    id: 'musica-immersiva',
    name: 'Musica Immersiva',
    duration: 15,
    description: "Vivi la musica a 360 gradi. Un'esperienza sensoriale unica che unisce suoni, colori e emozioni.",
    image: '/images/cities/cover.webp',
    category: 'musica'
  }
];

export const getExperienceById = (id) => {
  return predefinedExperiences.find(exp => exp.id === id);
};

export const getExperiencesByCategory = (category) => {
  return predefinedExperiences.filter(exp => exp.category === category);
};

// Default experiences for new cities
export const defaultCityExperiences = [
  'pompei',
  'van-gogh',
  'space'
];
