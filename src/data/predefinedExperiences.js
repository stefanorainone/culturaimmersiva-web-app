export const predefinedExperiences = [
  {
    id: 'pompei',
    name: "L'Antica Pompei",
    duration: 15,
    description: "Un viaggio immersivo nell'antica città di Pompei prima dell'eruzione del Vesuvio. Cammina tra le strade romane e scopri la vita quotidiana di 2000 anni fa.",
    image: '/images/cities/pompei-vr.webp',
    category: 'storia'
  },
  {
    id: 'van-gogh',
    name: 'Van Gogh Experience',
    duration: 20,
    description: "Entra nei capolavori di Vincent van Gogh. Un'esperienza artistica immersiva che ti permette di camminare dentro i suoi dipinti più famosi.",
    image: '/images/cities/van-gogh.webp',
    category: 'arte'
  },
  {
    id: 'space',
    name: 'Viaggio nello Spazio',
    duration: 15,
    description: "Esplora il sistema solare e oltre. Visita pianeti, stelle e galassie in un'avventura spaziale mozzafiato.",
    image: '/images/cities/space.webp',
    category: 'scienza'
  },
  {
    id: 'ocean',
    name: 'Oceano Profondo',
    duration: 15,
    description: "Immergiti nelle profondità dell'oceano. Incontra creature marine straordinarie e scopri ecosistemi sottomarini nascosti.",
    image: '/images/cities/ocean.webp',
    category: 'natura'
  },
  {
    id: 'colosseo',
    name: 'Il Colosseo Romano',
    duration: 20,
    description: "Rivivi la grandezza dell'antica Roma. Assisti ai giochi gladiatori nel Colosseo come se fossi lì 2000 anni fa.",
    image: '/images/cities/cover.webp',
    category: 'storia'
  },
  {
    id: 'egitto',
    name: 'Antico Egitto',
    duration: 20,
    description: "Esplora le piramidi di Giza e scopri i segreti dei faraoni. Un viaggio nel tempo nell'antica civiltà egizia.",
    image: '/images/cities/cover.webp',
    category: 'storia'
  },
  {
    id: 'leonardo',
    name: 'Leonardo da Vinci',
    duration: 15,
    description: "Scopri il genio di Leonardo. Esplora le sue invenzioni, i suoi dipinti e i suoi studi scientifici in modo interattivo.",
    image: '/images/cities/cover.webp',
    category: 'arte'
  },
  {
    id: 'dinosauri',
    name: 'Era dei Dinosauri',
    duration: 15,
    description: "Torna indietro di milioni di anni. Cammina tra i dinosauri e scopri come era il mondo preistorico.",
    image: '/images/cities/cover.webp',
    category: 'scienza'
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
