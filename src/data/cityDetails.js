export const cityDetails = {
  benevento: {
    title: "Benevento - Cultura Immersiva",
    description: "Un evento che unisce Arte, Cultura, Bellezza e Tecnologia per creare esperienze emozionanti uniche. Potrai interagire con le opere più famose e visitare alcuni dei luoghi più belli al mondo attraverso la tecnologia VR.",
    dates: "Sabato 22 e Domenica 23 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "DOT Incubatore sociale",
      address: "Via Nuova Calore 8, 82100 Benevento"
    },
    organizer: "Associazione Musikarma",
    pricing: {
      individual: 10,
      group: null,
      currency: "€",
      note: "Base donazione"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, il Teatro Grande, le case romane",
        image: "/images/cities/pompei-vr.webp"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Un viaggio nello spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      },
      {
        name: "Musica Immersiva",
        duration: 15,
        description: "Pianista che esegue composizioni originali attraverso i paesaggi della Costiera Amalfitana",
        image: "/images/cities/cover.webp"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: true
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  bologna: {
    title: "Bologna - Cultura Immersiva",
    description: "Un evento che unisce Arte, Cultura, Bellezza e Tecnologia per creare esperienze emozionanti uniche. Potrai interagire con le opere più famose e visitare alcuni dei luoghi più belli al mondo.",
    dates: "Sabato 27 e Domenica 28 Settembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Kobain",
      address: "Via Antonio Zannoni 29, 40134 Bologna BO"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, le case romane",
        image: "/images/cities/pompei-vr.webp"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Galleria Spaziale",
        duration: 15,
        image: "/images/esperienza galleria spaziale.jpg",
        description:"Saturno, stelle"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 379 2121188"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  cagliari: {
    title: "Cultura Immersiva - Cagliari",
    description: "Un'esperienza culturale immersiva che combina arte, cultura, bellezza e tecnologia. I visitatori possono interagire con opere famose e visitare luoghi belli di tutto il mondo attraverso esperienze VR.",
    dates: "Sabato 15 e Domenica 16 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "EXMA",
      address: "Via S. Lucifero 71, 09127 Cagliari CA"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, le case romane"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Viaggio nello Spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 379 2121188"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  chieti: {
    title: "Cultura Immersiva - Chieti",
    description: "Cultura Immersiva presenta esperienze VR immersive che combinano arte, cultura, bellezza e tecnologia. I visitatori possono interagire con capolavori come la Mona Lisa di Da Vinci e la Creazione di Adamo di Michelangelo.",
    dates: "Sabato 29 e Domenica 30 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Hub 15 Coworking",
      address: "Via Vella, 66100 Chieti CH"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, le case romane",
        image: "/images/cities/pompei-vr.webp"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata, Mona Lisa, Creazione di Adamo"
      },
      {
        name: "Paesaggi Naturalistici",
        duration: 15,
        image: "/images/cities/cover.webp",
        description:"Paesaggi naturali"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Viaggio nello Spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 346 699 9803"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  ferrara: {
    title: "Ferrara - Cultura Immersiva",
    description: "L'evento combina arte, cultura, bellezza e tecnologia attraverso esperienze VR immersive, permettendo ai visitatori di interagire con capolavori ed esplorare luoghi iconici in tutto il mondo.",
    dates: "Sabato 15 e Domenica 16 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Factory Grisù",
      address: "Via Mario Poledrelli 21, 44121 Ferrara FE"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, le case romane",
        image: "/images/cities/pompei-vr.webp"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Viaggio nello Spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 379 2121188"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  foligno: {
    title: "Cultura Immersiva - Foligno",
    description: "L'evento unisce Arte, Cultura, Bellezza e Tecnologia per offrire esperienze VR immersive con capolavori e meraviglie naturali.",
    dates: "Sabato 29 e Domenica 30 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Spazio Modu Foligno",
      address: "Via Guglielmo Oberdan 55, 06034 Foligno PG"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, il Teatro Grande, le Domus romane"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Galleria Spaziale",
        duration: 15,
        image: "/images/esperienza galleria spaziale.jpg",
        description:"Esperienza nella galleria spaziale"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Un viaggio nello spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 379 2121188"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  lucca: {
    title: "Lucca - Cultura Immersiva",
    description: "Un'esperienza culturale immersiva che combina arte, cultura, bellezza e tecnologia. I visitatori possono interagire con opere famose e visitare splendidi luoghi globali attraverso esperienze VR.",
    dates: "Domenica 23 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Associazione Culturale la Farfalla",
      address: "Via Stefano Tofanelli 14, 55100 Lucca"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, il Teatro Grande, le ville romane"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Paesaggi Naturalistici",
        duration: 15,
        image: "/images/cities/cover.webp",
        description:"8 esperienze di paesaggi naturali"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Viaggio nello Spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 329 289 0532"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  modena: {
    title: "Cultura Immersiva - Modena",
    description: "Un'esperienza immersiva che combina arte, cultura, bellezza e tecnologia. I visitatori possono interagire con capolavori come la Mona Lisa di Leonardo da Vinci e visitare alcuni dei luoghi più belli del mondo attraverso la tecnologia VR.",
    dates: "Sabato 22 e Domenica 23 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Consorzio Creativo",
      address: "Via Carteria 100/102, 41121 Modena MO"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, le case romane",
        image: "/images/cities/pompei-vr.webp"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Galleria Spaziale",
        duration: 15,
        image: "/images/esperienza galleria spaziale.jpg",
        description:"Universo, pianeti, stelle"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 379 2121188"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  monopoli: {
    title: "Cultura Immersiva - Monopoli",
    description: "L'evento combina Arte, Cultura, Bellezza e Tecnologia per offrire esperienze immersive. I partecipanti possono interagire con la Mona Lisa di Leonardo da Vinci e visitare luoghi di fama mondiale attraverso la realtà virtuale.",
    dates: "Sabato 22 e Domenica 23 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "CoWorking Space Monopoli",
      address: "Via Giovanni Barnaba 34, 70043 Monopoli BA"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, il Teatro Grande, le Domus romane"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Viaggio nello Spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: true
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  napoli: {
    title: "Cultura Immersiva - Napoli",
    description: "Un'esperienza culturale immersiva che combina arte, cultura, bellezza e tecnologia. I partecipanti possono interagire con opere d'arte famose e visitare luoghi iconici del mondo attraverso esperienze VR.",
    dates: "Sabato 29 e Domenica 30 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Associazione Teatro Sole",
      address: "vico Freddo a Rua Catalana, 4, Napoli"
    },
    organizer: "Associazione Musikarma",
    pricing: {
      individual: 10,
      currency: "€",
      note: "Base donazione"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, il Teatro Grande"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Un viaggio nello spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      },
      {
        name: "Musica Immersiva",
        duration: 15,
        description: "Pianista che esegue nei paesaggi della Costiera Amalfitana"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: true
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  nola: {
    title: "Cultura Immersiva - Nola",
    description: "L'evento combina Arte, Cultura, Bellezza e Tecnologia per offrire esperienze VR immersive. I visitatori possono interagire virtualmente con opere d'arte famose e visitare luoghi iconici in tutto il mondo.",
    dates: "Sabato 22 e Domenica 23 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Parco Archeologico Mastrilli",
      address: "Via V. la Rocca 90, 80035 Nola NA"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, il Teatro Grande, le Case Romane"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Galleria Spaziale",
        duration: 15,
        image: "/images/esperienza galleria spaziale.jpg",
        description:"Saturno, galassie, sole"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Viaggio nello Spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 379 2121188"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  palermo: {
    title: "Cultura Immersiva - Palermo",
    description: "L'evento combina Arte, Cultura, Bellezza e Tecnologia per creare esperienze emozionanti uniche. I partecipanti possono interagire con la Mona Lisa di Leonardo da Vinci e visitare alcuni dei luoghi più belli del mondo attraverso la tecnologia immersiva.",
    dates: "Sabato 22 e Domenica 23 Novembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Neu[Noi]",
      address: "Via Alloro 64, 90133 Palermo PA"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, le case romane",
        image: "/images/cities/pompei-vr.webp"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Un viaggio nello spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: true
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  termoli: {
    title: "Termoli - Cultura Immersiva",
    description: "L'evento combina Arte, Cultura, Bellezza e Tecnologia per offrire esperienze immersive. I partecipanti possono interagire con opere d'arte iconiche e visitare luoghi rinomati di tutto il mondo attraverso la tecnologia VR.",
    dates: "Sabato 23 e Domenica 24 Agosto",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Casa Museo Dimora Stephanus",
      address: "Piazza Duomo 1/3, Termoli"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, le case romane",
        image: "/images/cities/pompei-vr.webp"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Un viaggio nello spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      },
      {
        name: "Galleria spaziale",
        duration: 15,
        image: "/images/esperienza galleria spaziale.jpg",
        description:"Saturno, galassie, Terra, sole"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 379 2121188"
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  trieste: {
    title: "Cultura Immersiva - Trieste",
    description: "Una fusione di arte, cultura, bellezza e tecnologia che offre esperienze VR immersive. I visitatori possono interagire con capolavori come la Mona Lisa e la Creazione di Adamo di Michelangelo ed esplorare luoghi di fama mondiale virtualmente.",
    dates: "Sabato 18 e Domenica 19 Ottobre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Spazio Caraboa",
      address: "Via Antonio Caccia, 6/B, Trieste 34129"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, le case romane",
        image: "/images/cities/pompei-vr.webp"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Un viaggio nello spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: true
    },
    experiencesPerTicket: 2,
    status: "available"
  },

  udine: {
    title: "Udine - Cultura Immersiva",
    description: "Gli organizzatori hanno combinato arte, cultura, bellezza e tecnologia per creare esperienze emozionanti uniche. I visitatori possono interagire con capolavori famosi e visitare luoghi splendidi in tutto il mondo attraverso la tecnologia immersiva.",
    dates: "Sabato 27 e Domenica 28 Settembre",
    duration: "20-30 minuti per esperienza",
    location: {
      name: "Niduh Coworking artistico",
      address: "Via Bezzecca, 73, 33100 Udine UD"
    },
    organizer: "Cultura Immersiva",
    pricing: {
      individual: 15,
      group: 20,
      groupSize: 2,
      currency: "€"
    },
    experiences: [
      {
        name: "L'Antica Pompei",
        duration: 15,
        description: "Il Foro, il Tempio di Apollo, il Teatro Grande, le Case Romane"
      },
      {
        name: "Arte Immersiva",
        duration: 15,
        description: "Notte Stellata (Van Gogh), Mona Lisa (Da Vinci), Creazione di Adamo",
        image: "/images/cities/van-gogh.webp"
      },
      {
        name: "Galleria Spaziale",
        duration: 15,
        image: "/images/esperienza galleria spaziale.jpg",
        description:"Galleria spaziale"
      },
      {
        name: "Oceano Immersivo",
        duration: 15,
        description: "Delfini, balene, squali, orche",
        image: "/images/cities/ocean.webp"
      },
      {
        name: "Un viaggio nello spazio",
        duration: 15,
        description: "Universo, pianeti, stelle",
        image: "/images/esperienza galleria spaziale.jpg"
      }
    ],
    booking: {
      advancePayment: false,
      cancellationPolicy: "Cancellazione gratuita fino a 24 ore prima dell'evento",
      limitedSpots: true,
      paymentMethods: ["Contanti", "Carta"],
      whatsapp: "+39 379 2121188"
    },
    experiencesPerTicket: 2,
    status: "available"
  }
};

export const getCityDetails = (cityId) => {
  return cityDetails[cityId] || null;
};
