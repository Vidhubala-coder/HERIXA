export interface TimelineEvent {
  year: string;
  event: string;
}

export interface Monument {
  id: string;
  name: string;
  location: string;
  state: string;
  category: 'Temples' | 'Sculptures' | 'Forts' | 'Artifacts' | 'Historical Sites';
  period: string;
  dynasty: string;
  description: string;
  historicalSignificance: string;
  image: string;
  latitude: number;
  longitude: number;
  
  // History screen details
  background: string;
  architecture: string;
  significance: string;
  preservation: string;
  facts: string[];
  timeline: TimelineEvent[];

  // Image source details
  imageSource?: string;
  imageSourceUrl?: string;
  imageLicense?: string;
  imageAttribution?: string;
}

export const MONUMENTS: Monument[] = [
  {
    id: 'brihadeeswarar',
    name: 'Brihadeeswarar Temple',
    location: 'Thanjavur',
    state: 'Tamil Nadu',
    category: 'Temples',
    period: '11th Century CE (1010 CE)',
    dynasty: 'Chola Dynasty',
    description: 'A magnificent Hindu temple dedicated to Shiva located in Thanjavur, Tamil Nadu. It is one of the largest South Indian temples and an exemplary example of fully realized Tamil architecture. Built by Raja Raja Chola I, it is part of the UNESCO World Heritage Site known as the "Great Living Chola Temples".',
    historicalSignificance: 'Commissioned by Rajaraja Chola I between 1003 and 1010 CE, this temple marked the peak of Chola power and prosperity. The temple was built to showcase the Chola Emperor\'s imperial power, wealth, and devotion. It stands as a monumental testimony to the architectural, engineering, and artistic heights achieved during the medieval Chola era.',
    image: '/uploads/monuments/brihadeeswarar.jpeg',
    latitude: 10.7828,
    longitude: 79.1318,
    background: 'The temple turned 1000 years old in 2010. Its creation was recorded in detail in thousands of inscriptions engraved on the stone walls, which describe how the emperor gathered engineers, architects, weavers, goldsmiths, and sculptors from across the empire to construct this architectural marvel.',
    architecture: 'The temple tower (Vimana) is 216 feet high and is built entirely of granite, which was brought from over 60 km away. The monolithic capstone (Kumbam) at the very top of the Vimana is estimated to weigh around 80 tonnes. It was raised to the top via a custom-designed earthen ramp stretching several kilometers.',
    significance: 'It is a symbol of Chola grandeur. The temple has survived over a millennium of natural calamities, wars, and earthquakes, standing as a stellar testament to ancient Indian acoustics, engineering, and structural stability.',
    preservation: 'Maintained by the Archaeological Survey of India (ASI). Major preservation tasks include preventing structural shifts, protecting the ancient murals on the inner walls from humidity, and maintaining the extensive stone carvings from atmospheric erosion.',
    facts: [
      'Built entirely of granite, though there are no granite quarries within a 60km radius.',
      'The shadow of the Vimana (main tower) is said to never fall on the ground at noon during any season.',
      'The Nandi mandapam houses a massive monolithic Nandi bull weighing about 20 tonnes.'
    ],
    timeline: [
      { year: '1003 CE', event: 'Emperor Raja Raja Chola I orders the construction of the temple.' },
      { year: '1010 CE', event: 'The temple is completed and consecrated on the 275th day of the 25th year of Raja Raja Chola\'s reign.' },
      { year: '1987 CE', event: 'Inscribed as a UNESCO World Heritage Site.' },
      { year: '2010 CE', event: 'The temple celebrates its 1000th anniversary with massive cultural festivals.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Thanjavur_Brihadeeswarar_temple.JPG',
    imageLicense: 'CC BY-SA 3.0',
    imageAttribution: 'By A.R.Rajahgopal (Own work)'
  },
  {
    id: 'meenakshi-amman',
    name: 'Meenakshi Amman Temple',
    location: 'Madurai',
    state: 'Tamil Nadu',
    category: 'Temples',
    period: 'Rebuilt 14th - 17th Century CE',
    dynasty: 'Pandya & Nayak Dynasties',
    description: 'An ancient and historic Hindu temple located on the southern bank of the Vaigai River in the temple city of Madurai. It is dedicated to Meenakshi, a form of Parvati, and her consort, Sundareswarar, a form of Shiva. It forms the heart and lifeline of the 2500-year-old city.',
    historicalSignificance: 'Though the temple has roots stretching back to antiquity (mentioned in Sangam literature), the original structure was ransacked in the early 14th century by Malik Kafur. The temple was reconstructed and significantly expanded by the Nayak rulers of Madurai, primarily Vishwanatha Nayak and later Thirumalai Nayak, between the 16th and 17th centuries.',
    image: '/uploads/monuments/meenakshi-amman-1786967984977.jpeg',
    latitude: 9.9197,
    longitude: 78.1194,
    background: 'According to legend, the temple was founded by Indra, the king of the Devas, who found a Swayambu Lingam here. The deity Meenakshi is depicted with three breasts in local lore, a curse that dissolved upon meeting her divine consort, Sundareswarar.',
    architecture: 'The temple complex is divided into concentric quadrangles enclosed by high stone walls. It features 14 gateway towers (Gopurams), ranging from 45 to 50 meters in height. The southern tower is the tallest, at 51.9 meters. The complex also contains the famous Hall of a Thousand Pillars (Ayiram Kaal Mandapam), where each stone pillar produces a unique musical note when struck.',
    significance: 'A major center of pilgrimage and the cultural epicenter of Madurai. It hosts the spectacular Chithirai Festival annually, drawing over a million devotees to celebrate the divine wedding of Meenakshi and Sundareswarar.',
    preservation: 'Preserved by the Hindu Religious and Charitable Endowments (HR&CE) department and ASI. Recent focuses include plastic-free zones, restoration of historical painting pigments, and mechanical reinforcements of Gopurams.',
    facts: [
      'The Hall of a Thousand Pillars actually contains 985 beautifully carved granite pillars.',
      'It was nominated as one of the new Seven Wonders of the World.',
      'The temple is covered in an estimated 33,000 sculptures painted in vibrant colors.'
    ],
    timeline: [
      { year: '6th Century CE', event: 'Early temple roots noted in Tamil Sangam literature.' },
      { year: '1310 CE', event: 'The historic temple is heavily damaged and looted by the Delhi Sultanate general Malik Kafur.' },
      { year: '1559 CE', event: 'King Vishwanatha Nayak initiates the rebuilding and major expansion of the temple.' },
      { year: '1623 CE', event: 'King Thirumalai Nayak builds the primary mandapams and tallest Gopurams.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Meenakshi_Amman_Temple_-_Gateway_Tower,_Madurai.jpg',
    imageLicense: 'CC BY-SA 4.0',
    imageAttribution: 'By IM3847 (Own work)'
  },
  {
    id: 'mahabalipuram',
    name: 'Mahabalipuram Shore Temple',
    location: 'Mamallapuram',
    state: 'Tamil Nadu',
    category: 'Sculptures',
    period: '8th Century CE (700-728 CE)',
    dynasty: 'Pallava Dynasty',
    description: 'A structural temple, built with blocks of granite, overlooking the shore of the Bay of Bengal at Mahabalipuram. It is one of the oldest structural stone temples of South India, built during the reign of Narasimhavarman II. It has been classified as a UNESCO World Heritage Site.',
    historicalSignificance: 'Mamallapuram was a busy port city during the Pallava dynasty. The Shore Temple was constructed not just as a place of worship, but also as a landmark or lighthouse for incoming trading ships. It represents the transition from rock-cut cave temples to structural stone temples.',
    image: '/uploads/monuments/mahabalipuram-1786967943471.jpeg',
    latitude: 12.6164,
    longitude: 80.1986,
    background: 'Early European travelers referred to Mahabalipuram as the "Seven Pagodas," believing that the Shore Temple was just one of seven magnificent temples lined up along the coast. Recent underwater archaeological surveys have found evidence of submerged structures, hinting that these legends might be true.',
    architecture: 'Built of cut granite stones rather than being carved out of a cave. The temple houses three shrines: two dedicated to Shiva and one dedicated to Vishnu (depicted as Anantashayana Vishnu). It has a pyramidal Vimana and features numerous monolithic stone carvings of bulls (Nandi) lining the outer compound.',
    significance: 'One of the earliest and most vital examples of Dravidian structural architecture, illustrating the genius Pallavas had in handling hard granite stone to resist coastal environmental elements.',
    preservation: 'Due to its seaside location, the temple faces severe threat from salty sea breezes, water spray, and sand erosion. ASI has constructed a groyne wall (breakwater) in the sea and planted Casuarina trees to act as a windbreak and mitigate erosion.',
    facts: [
      'It is the sole surviving temple of the legendary "Seven Pagodas" of Mamallapuram.',
      'The tsunami of December 2004 temporarily pulled back the sea, exposing ancient carvings and structural foundations of companion temples.',
      'Unlike other temples of the period, it contains shrines for both Shiva and Vishnu in a single complex.'
    ],
    timeline: [
      { year: '700 CE', event: 'Pallava King Rajasimha (Narasimhavarman II) begins construction of the Shore Temple.' },
      { year: '728 CE', event: 'Construction is completed, serving as both a worship site and a harbor lighthouse.' },
      { year: '1984 CE', event: 'Inscribed as a UNESCO World Heritage Site under the "Group of Monuments at Mahabalipuram".' },
      { year: '2004 CE', event: 'The Indian Ocean Tsunami hits the coast, revealing previously buried ruins nearby.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Mahabalipuram-Shore_Temple-WUS01811.jpg',
    imageLicense: 'CC BY-SA 4.0',
    imageAttribution: 'By J.M.Garg (Own work)'
  },
  {
    id: 'gangaikonda-cholapuram',
    name: 'Gangaikonda Choleswarar Temple',
    location: 'Ariyalur District',
    state: 'Tamil Nadu',
    category: 'Temples',
    period: '11th Century CE (1035 CE)',
    dynasty: 'Chola Dynasty',
    description: 'Built by Rajendra Chola I, the son and successor of Raja Raja Chola I, to commemorate his victorious military campaign to the Ganges River. It served as the capital temple of the Chola empire for over 250 years.',
    historicalSignificance: 'After conquering kingdoms up to the Ganges River, Emperor Rajendra Chola I assumed the title "Gangaikonda Cholan" (The Chola who conquered the Ganges) and established a new capital city. The temple was built as a feminine counterpart to the masculine Brihadeeswarar Temple of Thanjavur, featuring softer, more curved architectural outlines.',
    image: '/uploads/monuments/gangaikonda-cholapuram-1786967886745.jpeg',
    latitude: 11.2063,
    longitude: 79.4487,
    background: 'Upon founding the capital, Rajendra Chola ordered a massive lake called Cholagangam to be dug and filled it with water brought from the Ganges as a liquid pillar of victory.',
    architecture: 'The main vimana is 180 feet tall, slightly shorter than Thanjavur, but boasts a curved concave contour. The carvings are exceptionally detailed, particularly the Chandesha Anugraha Murti, which depicts Shiva blessing Rajendra Chola himself.',
    significance: 'A cornerstone of the Great Living Chola Temples. Its sculptures are widely praised as some of the most dynamic and expressive in South Indian stone art history.',
    preservation: 'Preserved by ASI. Major work includes soil stabilization, restoring minor shrines that deteriorated due to vegetation, and landscaping the lawns surrounding the stone complex.',
    facts: [
      'The temple vimana has a curved outline, compared to the straight pyramidal vimana of Thanjavur.',
      'A massive lion-faced stepwell (Simhakeni) stands in the courtyard, symbolic of royal victory.',
      'The main Shiva Lingam inside is the largest monolithic Lingam in South India, standing 13 feet tall.'
    ],
    timeline: [
      { year: '1023 CE', event: 'Rajendra Chola I successfully leads his army to the Ganges River.' },
      { year: '1035 CE', event: 'The grand temple of the new capital Gangaikonda Cholapuram is consecrated.' },
      { year: '2004 CE', event: 'UNESCO expands the World Heritage site listing to include this monument.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Brihadisvara_Temple_-_Gangaikonda_Cholapuram_-_complex_view_from_outside.jpg',
    imageLicense: 'CC BY-SA 3.0',
    imageAttribution: 'By Arian Zwegers (Flickr)'
  },
  {
    id: 'airavatesvara',
    name: 'Airavatesvara Temple',
    location: 'Darasuram',
    state: 'Tamil Nadu',
    category: 'Temples',
    period: '12th Century CE',
    dynasty: 'Chola Dynasty',
    description: 'A Dravidian architecture Hindu temple located in Darasuram near Kumbakonam. Built by Rajaraja Chola II in the 12th century, this temple is a storehouse of art and architecture, featuring exquisite stone carvings of miniature narratives.',
    historicalSignificance: 'Named after Airavata, the white elephant of Indra who worshipped Shiva at this temple to cure a skin disease. It is smaller but far more ornate than the temples of Thanjavur and Gangaikonda Cholapuram, focusing on micro-carvings and structural elegance.',
    image: '/uploads/monuments/airavatesvara-1786966049222.jpeg',
    latitude: 10.9484,
    longitude: 79.3567,
    background: 'According to tradition, the king built this temple to bring divine music and dance into stone. The temple incorporates numerous sculptures of celestial musicians, classical Bharatanatyam dance poses, and mythological epics.',
    architecture: 'The temple front mandapam is designed in the shape of a massive stone chariot drawn by horses and elephants. The steps leading into the mandapam are made of basalt stone and are known as the "Singing Steps," which produce musical notes when walked upon.',
    significance: 'It is highly regarded for its artistic density. The entire Chola history and mythologies are carved into miniature panels, making it an educational hub for ancient arts.',
    preservation: 'Under ASI protection. It is situated in a low-lying area, which makes water logging during monsoons a major issue. ASI installed custom drainage systems to pump out monsoon water to prevent water logging around the base carvings.',
    facts: [
      'The Rajagambhiran Mandapam is carved like an imperial horse-drawn chariot.',
      'Features unique "singing steps" that yield musical notes (Sa, Re, Ga, Ma...) when struck.',
      'Contains detailed stone carvings of all 63 Nayanmars (Saivite saints).'
    ],
    timeline: [
      { year: '1146 CE', event: 'Rajaraja Chola II ascends the throne and commissions a new capital and temple in Darasuram.' },
      { year: '1173 CE', event: 'The temple is completed, serving as a hub for court artists, musicians, and dancers.' },
      { year: '2004 CE', event: 'UNESCO adds the Airavatesvara Temple to the Great Living Chola Temples listing.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Darasuram,_Airavatesvara_Temple,_Entrance,_India.jpg',
    imageLicense: 'CC BY-SA 3.0',
    imageAttribution: 'By Bernard Gagnon (Own work)'
  },
  {
    id: 'thirumalai-nayakkar',
    name: 'Thirumalai Nayakkar Palace',
    location: 'Madurai',
    state: 'Tamil Nadu',
    category: 'Forts',
    period: '17th Century CE (1636 CE)',
    dynasty: 'Nayak Dynasty',
    description: 'A classic 17th-century palace constructed by King Thirumalai Nayak. It is an architectural blend of Dravidian and Islamic styles, located close to the Meenakshi Amman Temple in Madurai.',
    historicalSignificance: 'Built in 1636 as the royal residence of King Thirumalai Nayak, who ruled Madurai from 1623 to 1659. The king employed an Italian architect to design this massive palace complex. It was intended to be one of the grandest palaces in South Asia.',
    image: '/uploads/monuments/thirumalai-nayakkar-1786975851978.jpeg',
    latitude: 9.9148,
    longitude: 78.1243,
    background: 'During the 18th century, many portions of the palace were dismantled by Thirumalai Nayak\'s grandson, Chokkanatha Nayak, to transport building materials to Trichy for a new palace. Only a quarter of the original palace building survives today.',
    architecture: 'Famous for its giant white pillars, which are 82 feet tall and 19 feet in circumference. The palace contains the Swarga Vilasam (Celestial Pavilion), built entirely without rafters, utilizing brick and mortar archways supported by these massive pillars.',
    significance: 'A rare and prime example of Indo-Saracenic (Italian-Islamic-Dravidian) fusion architecture in medieval South India. It is highly regarded for its stucco work on the arches and domes.',
    preservation: 'Preserved by the Tamil Nadu Archaeological Department. Regular activities include plastering lime mortar to protect the massive pillars, chemical cleaning of stucco work, and presenting light and sound shows to educate visitors.',
    facts: [
      'The giant pillars are made of brickwork coated with egg-white and shell-lime plaster for a glossy finish.',
      'Only about one-fourth of the original grand palace structure remains today.',
      'Lord Napier, Governor of Madras, conducted a major restoration of the remaining structures in the 1870s.'
    ],
    timeline: [
      { year: '1636 CE', event: 'King Thirumalai Nayak completes construction of his new royal residence in Madurai.' },
      { year: '1680 CE', event: 'Grandson Chokkanatha Nayak dismantles key parts of the palace to build a competitor palace in Tiruchirappalli.' },
      { year: '1872 CE', event: 'The British restore the remaining parts of the palace for administrative offices.' },
      { year: '1970 CE', event: 'Declared a protected national monument and opened to the public.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:S-TN-23_Thirumalai_Naicker_Palace_Madurai_2.jpg',
    imageLicense: 'CC BY-SA 4.0',
    imageAttribution: 'By J.M.Garg (Own work)'
  }
];
