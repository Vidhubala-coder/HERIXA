import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import Monument from '../models/monument';
import User from '../models/user';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const downloadImage = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

const SEED_MONUMENTS = [
  {
    name: 'Brihadeeswarar Temple',
    slug: 'brihadeeswarar',
    location: 'Thanjavur',
    state: 'Tamil Nadu',
    country: 'India',
    category: 'Temples' as const,
    period: '11th Century CE (1010 CE)',
    dynasty: 'Chola Dynasty',
    description: 'A magnificent Hindu temple dedicated to Shiva located in Thanjavur, Tamil Nadu. It is one of the largest South Indian temples and an exemplary example of fully realized Tamil architecture. Built by Raja Raja Chola I, it is part of the UNESCO World Heritage Site known as the "Great Living Chola Temples".',
    historicalSignificance: 'Commissioned by Rajaraja Chola I between 1003 and 1010 CE, this temple marked the peak of Chola power and prosperity. The temple was built to showcase the Chola Emperor\'s imperial power, wealth, and devotion. It stands as a monumental testimony to the architectural, engineering, and artistic heights achieved during the medieval Chola era.',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/b/b2/Thanjavur_Brihadeeswarar_temple.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/1/1b/Brihadeeswarar_temple_evening%2C_Thanjavur%2C_Tamilnadu.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/d/dd/Brihadisvara_Temple_during_Maha_Shivaratri-WUS03611_%28edit%29.jpg'
    ],
    latitude: 10.7828,
    longitude: 79.1318,
    historicalBackground: 'The temple turned 1000 years old in 2010. Its creation was recorded in detail in thousands of inscriptions engraved on the stone walls, which describe how the emperor gathered engineers, architects, weavers, goldsmiths, and sculptors from across the empire to construct this architectural marvel.',
    architecture: 'The temple tower (Vimana) is 216 feet high and is built entirely of granite, which was brought from over 60 km away. The monolithic capstone (Kumbam) at the very top of the Vimana is estimated to weigh around 80 tonnes. It was raised to the top via a custom-designed earthen ramp stretching several kilometers.',
    culturalSignificance: 'It is a symbol of Chola grandeur. The temple has survived over a millennium of natural calamities, wars, and earthquakes, standing as a stellar testament to ancient Indian acoustics, engineering, and structural stability.',
    preservationStatus: 'Maintained by the Archaeological Survey of India (ASI). Major preservation tasks include preventing structural shifts, protecting the ancient murals on the inner walls from humidity, and maintaining the extensive stone carvings from atmospheric erosion.',
    interestingFacts: [
      'Built entirely of granite, though there are no granite quarries within a 60km radius.',
      'The shadow of the Vimana (main tower) is said to never fall on the ground at noon during any season.',
      'The Nandi mandapam houses a massive monolithic Nandi bull weighing about 20 tonnes.',
      'The temple is constructed using an interlocking stone method without any cement or mortar.',
      'It contains the earliest known large-scale fresco paintings in South India.',
      'Rajaraja Chola I appointed 400 temple dancers, whose names and addresses are carved in stone.',
      'The main Shiva Lingam inside the sanctum is two stories high (about 8.7 meters).',
      'The entire complex is surrounded by fortification walls built later during the Nayak and Maratha periods.'
    ],
    featured: true,
    timeline: [
      { year: '1003 CE', event: 'Emperor Raja Raja Chola I orders the construction of the temple.' },
      { year: '1010 CE', event: 'The temple is completed and consecrated on the 275th day of the 25th year of Raja Raja Chola\'s reign.' },
      { year: '1987 CE', event: 'Inscribed as a UNESCO World Heritage Site.' },
      { year: '2010 CE', event: 'The temple celebrates its 1000th anniversary with massive cultural festivals.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Thanjavur_Brihadeeswarar_temple.JPG',
    imageLicense: 'CC BY-SA 3.0',
    imageAttribution: 'By A.R.Rajahgopal (Own work)',

    // Basic Information
    district: 'Thanjavur',
    coordinates: { latitude: 10.7828, longitude: 79.1318 },
    monumentType: 'Temple Complex',
    historicalPeriod: 'Medieval Chola',
    constructionYear: '1010 CE',
    constructionPeriod: '1003 - 1010 CE',
    ruler: 'Rajaraja Chola I',
    builder: 'Rajaraja Chola I',
    architect: 'Kunjara Mallan Raja Raja Perunthachan',

    // History
    shortHistory: 'Brihadeeswarar Temple was built in 1010 CE by Emperor Rajaraja Chola I as a symbol of Chola power and religious devotion. Built entirely of granite, it represents the golden age of Dravidian structural temple architecture.',
    fullHistory: 'The Brihadeeswarar Temple, also known as Rajarajeswaram, is a monumental Hindu temple dedicated to Lord Shiva, located in Thanjavur, Tamil Nadu. It was commissioned by the legendary Chola emperor Raja Raja Chola I between 1003 and 1010 CE. The construction was a feat of ancient organization; since Thanjavur has no local granite quarries, millions of tonnes of granite block stones had to be transported from hills located over 60 kilometers away, likely using flat rafts along rivers and rollers on land.\n\nThe temple was designed as the central focus of the Chola empire\'s administrative, religious, and economic life. It served as a royal chapel, treasury, bank, and cultural hub. Thousands of individuals—including priests, accountants, musicians, scholars, administrators, and 400 dancers—were employed directly by the temple. Their duties, salaries, and even home addresses were detailed in copper plate grants and stone inscriptions on the temple outer walls, offering a vivid window into 11th-century Tamil society.\n\nFollowing the decline of the Cholas, subsequent dynasties including the Pandyas, the Vijayanagara Empire, the Madurai Nayaks, and the Thanjavur Marathas assumed control of the region. Rather than dismantling the monument, these rulers respected its heritage and expanded it by adding minor shrines, stone fortification walls, moat structures, and additional entrance gopurams. In 1987, the temple was recognized as a UNESCO World Heritage Site under the designation "Great Living Chola Temples," confirming its global cultural significance.',
    originStory: 'Local legend says that Rajaraja Chola I conceived the idea of building this temple while traveling in Sri Lanka, where he was inspired by the grand Buddhist stupas and monuments. Wishing to create a structure of unprecedented height to honor Lord Shiva, he returned to Thanjavur and gathered the finest master builders of the realm.',
    constructionHistory: 'The construction began in 1003 CE and was completed exactly seven years later in 1010 CE. The structural blocks were carved and fitted together using an interlocking system, using no mortar or binding agents. To place the massive 80-tonne capstone (Kumbam) atop the 216-foot Vimana tower, engineers built a gradual inclined earthen ramp starting several kilometers away, allowing elephants and bulls to haul the monolithic stone to the summit.',
    importantRulers: ['Rajaraja Chola I', 'Rajendra Chola I', 'Sarabhoji II'],
    dynastyHistory: 'The Chola Dynasty (3rd century BCE to 13th century CE) was one of the longest-ruling dynasties in world history. Under Rajaraja I and Rajendra I, the empire became a military, economic, and cultural powerhouse, expanding across South India and maritime Southeast Asia.',
    historicalTimeline: [
      { year: '1003 CE', title: 'Foundation Laid', description: 'Emperor Rajaraja Chola I initiates construction.' },
      { year: '1010 CE', title: 'Consecration (Kumbhabhishekham)', description: 'The golden finial is placed atop the Vimana tower, completing the project.' },
      { year: '1500s CE', title: 'Nayak Fortifications', description: 'Madurai/Thanjavur Nayaks add defensive walls and a moat around the complex.' },
      { year: '1987 CE', title: 'UNESCO Recognition', description: 'The temple is inscribed as a UNESCO World Heritage Site.' }
    ],
    historicalEvents: [
      { period: '1010 CE', title: 'Golden Finial Consecration', description: 'Rajaraja Chola I hands over a gold-plated copper pot to be placed at the peak.' },
      { period: '1300s CE', title: 'Pandya Dynasty Control', description: 'Pandyan rulers gain control and construct the Amman shrine inside the court.' },
      { period: '1700s CE', title: 'Maratha Restorations', description: 'Maratha rulers rebuild the Ganapathy shrine and add historical fresco restorations.' }
    ],

    // Architecture
    buildingMaterials: 'Granite Blocks, Lime Mortar (for later additions)',
    structuralFeatures: '13-tier pyramidal Vimana tower, rectangular courtyard layout, monolithic Nandi mandapam.',
    architecturalStyle: 'Dravidian Architecture (Imperial Chola Style)',
    vimanaDetails: 'The main tower (Vimana) rises to a height of 65.8 meters (216 feet) and stands on a square base. It is designed to represent Mount Meru, the cosmic mountain of Hindu cosmology.',
    gopuramDetails: 'Two main eastern gateways: the Keralantakan Gopuram (outer) and the Rajarajan Gopuram (inner), decorated with relief figures of Shiva and guardians.',
    mandapaDetails: 'The central axial assembly halls include the Nandi Mandapam, Mukha Mandapam, Maha Mandapam, and the Artha Mandapam leading to the garbhagriha.',
    sculptureDetails: 'Exquisite Chola relief carvings depicting Harihara, Ardhanarishvara, Dakshinamurthy, and various dance poses from the Bharatanatyam tradition.',
    pillarDetails: 'Stately stone columns displaying floral scrollwork, mythic yali animals, and decorative scroll patterns.',
    ceilingDetails: 'The corridors contain original 11th-century frescoes beneath Maratha-era tempera paint layers.',
    inscriptionDetails: 'Tamil and Sanskrit stone carvings documenting the administrative registers, land revenues, donations, and names of temple servants.',
    engineeringFeatures: 'Interlocking dry-stone construction; the foundation relies on a massive stone raft layout to stabilize the soil weight.',

    // Cultural Importance
    culturalImportance: 'The Brihadeeswarar Temple is a living monument that remains a central pillar of Tamil Nadu\'s cultural, architectural, and dance heritage. Over a thousand years old, it serves as the backdrop for the annual Natyanjali dance festival, where classical dancers pay homage to Shiva as Nataraja, the Lord of Dance.',
    religiousImportance: 'A prominent pilgrimage center for Saivism. The temple houses a colossal Shiva Lingam in its main sanctum, which stands nearly 9 meters tall, representing the formless cosmic energy of Lord Shiva.',
    socialImportance: 'Historically served as the social nucleus of Thanjavur, functioning as a school, hospital, public court, and bank during the Chola era.',
    artisticImportance: 'Home to some of the finest classical murals and stone reliefs in South India, illustrating a synthesis of classical dance, music, and sculpture.',
    culturalPractices: 'Classical music recitals, Bharatanatyam performances, and Vedic chanting are performed regularly in the outer courtyards.',
    traditionalPractices: 'Traditional metal sculpting (Tanjore bronzes) and painting styles are preserved in the surrounding artisan quarters.',
    festivals: ['Maha Shivaratri', 'Chithirai Brahmotsavam', 'Rajaraja Chola Chathirai (King Birthday)'],
    rituals: ['Daily Kala Poojas (six times a day)', 'Pradosham Abhishegam (bi-weekly ritual for Nandi)'],

    // Legends and Stories
    legends: [
      'The shadow of the main Vimana dome is popular legend to never fall on the ground at noon, although this is a visual effect of its layout geometry.',
      'The Nandi bull statue at the entrance was carved from a single stone block and was rumored to grow in size, prompting priests to insert a metal nail to stop it.'
    ],
    mythology: 'Associated with Shiva\'s cosmic dance and the alignment of the temple as a terrestrial mount of Mount Kailash.',
    localStories: ['Stories of a hidden network of underground escape tunnels leading to the Thanjavur Palace.'],
    interestingStories: ['The story of a local cowherd woman named Alagi, who donated a large stone to be used for the Vimana capstone; in her honor, Rajaraja named the capstone location after her.'],

    // Preservation
    preservationHistory: 'Maintained by the Archaeological Survey of India (ASI) since the British colonial era. Efforts have focused on chemical cleaning of soot, moisture control on internal frescoes, and environmental monitoring.',
    restorationHistory: 'In the late 20th century, ASI experts successfully executed a delicate "de-layering" process to uncover original 11th-century Chola frescoes that had been painted over by Maratha rulers in the 17th century.',
    damageHistory: 'The temple suffered minor structure damage during historical sieges, but its interlocking granite construction preserved it from major collapse.',
    conservationEfforts: 'Strict guidelines regulate modern tourist footfalls, plastic usage, and nearby vehicular traffic to prevent structural vibration damage.',
    currentCondition: 'Excellent. The temple remains structurally stable and actively hosts religious worship and tourists daily.',

    // Heritage Status
    heritageStatus: 'UNESCO World Heritage Site',
    unescoStatus: 'Inscribed',
    unescoYear: '1987',
    heritageRecognition: 'National Monument of India',

    // Visitor Information
    dressCode: 'Sober traditional attire required. Shoulders and knees must be covered. Footwear must be deposited at the entrance.',
    visitorGuidelines: 'No photography allowed inside the inner sanctum. Silence must be observed in the worship halls. Avoid touching stone inscriptions.',
    howToReach: 'Located in the heart of Thanjavur city. Easily accessible by local auto-rickshaws, city buses, or taxis from Thanjavur Railway Junction (3 km) or Trichy Airport (55 km).',
    visitingInformation: 'Open daily. Wheelchair access is available in the main courtyard. Best visited during October to March.',
    openingHours: '6:00 AM - 12:30 PM, 4:00 PM - 9:00 PM',
    bestTimeToVisit: 'October to March (cooler winter months)',
    entryFee: 'Free entry. Special quick darshan tickets are available for 50 INR.',
    nearbyPlaces: ['Thanjavur Royal Palace and Museum', 'Saraswathi Mahal Library', 'Schwartz Church', 'Punnainallur Mariamman Temple'],

    // Educational Information
    didYouKnow: [
      'The cupstone (Kumbam) at the top of the Vimana tower is carved out of a single granite block weighing 80 tonnes.',
      'The temple is constructed using zero mortar, relying entirely on gravity and precise interlocking stone joinery.'
    ],
    importantFacts: [
      'Completed in 1010 CE, celebrating over 1000 years of structural integrity.',
      'One of the tallest structural temples in the world.'
    ],
    quizTopics: ['Chola temple architecture', 'Rajaraja Chola I military conquests', 'South Indian bronze casting techniques'],
    historySections: [
      {
        id: 'sec-brih-royal-vision',
        title: 'The Royal Vision',
        content: 'The Brihadeeswarar Temple was built under the patronage of Emperor Rajaraja Chola I, who ordered its construction in 1003 CE. The Emperor envisioned a temple of monumental proportions to reflect the glory and prosperity of the Chola empire. Completed in 1010 CE, it served as the royal temple and the center of the kingdom\'s religious, political, and cultural life.',
        images: [],
        imageUrls: [],
        order: 1
      },
      {
        id: 'sec-brih-engineering',
        title: 'Engineering the Vimana',
        content: 'The Vimana (temple tower) rises to a height of 216 feet, constructed completely of granite block stones using an interlocking dry-stone method without cement or mortar. The monolithic capstone (Kumbam) at the peak weighs around 80 tonnes. According to historical accounts, engineers constructed a massive earthen ramp stretching several kilometers to haul the monolithic stone to the top using elephants.',
        images: [],
        imageUrls: [],
        order: 2
      },
      {
        id: 'sec-brih-inscriptions',
        title: 'Inscriptions & Administration',
        content: 'The temple stone walls are etched with thousands of detailed Tamil and Sanskrit inscriptions. These records serve as administrative registers, detailing land grants, revenues, royal gifts, and the names, duties, and home addresses of temple staff—including priests, accountants, musicians, and 400 temple dancers—providing a unique, high-resolution record of 11th-century Chola society.',
        images: [],
        imageUrls: [],
        order: 3
      }
    ]
  },
  {
    name: 'Meenakshi Amman Temple',
    slug: 'meenakshi-amman',
    location: 'Madurai',
    state: 'Tamil Nadu',
    country: 'India',
    category: 'Temples' as const,
    period: 'Rebuilt 14th - 17th Century CE',
    dynasty: 'Pandya & Nayak Dynasties',
    description: 'An ancient and historic Hindu temple located on the southern bank of the Vaigai River in the temple city of Madurai. It is dedicated to Meenakshi, a form of Parvati, and her consort, Sundareswarar, a form of Shiva. It forms the heart and lifeline of the 2500-year-old city.',
    historicalSignificance: 'Though the temple has roots stretching back to antiquity (mentioned in Sangam literature), the original structure was ransacked in the early 14th century by Malik Kafur. The temple was reconstructed and significantly expanded by the Nayak rulers of Madurai, primarily Vishwanatha Nayak and later Thirumalai Nayak, between the 16th and 17th centuries.',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/2/20/Meenakshi_Amman_Temple_-_Gateway_Tower%2C_Madurai.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/c/c6/S-TN-34_Meenakshi_Amman_Temple_South_Gopuram_enriched_with_delicate_Stucco_works.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/6/63/Golden_Lotus_in_Meenakshi_Amman_Temple.jpg'
    ],
    latitude: 9.9197,
    longitude: 78.1194,
    historicalBackground: 'According to legend, the temple was founded by Indra, the king of the Devas, who found a Swayambu Lingam here. The deity Meenakshi is depicted with three breasts in local lore, a curse that dissolved upon meeting her divine consort, Sundareswarar.',
    architecture: 'The temple complex is divided into concentric quadrangles enclosed by high stone walls. It features 14 gateway towers (Gopurams), ranging from 45 to 50 meters in height. The southern tower is the tallest, at 51.9 meters. The complex also contains the famous Hall of a Thousand Pillars (Ayiram Kaal Mandapam), where each stone pillar produces a unique musical note when struck.',
    culturalSignificance: 'A major center of pilgrimage and the cultural epicenter of Madurai. It hosts the spectacular Chithirai Festival annually, drawing over a million devotees to celebrate the divine wedding of Meenakshi and Sundareswarar.',
    preservationStatus: 'Preserved by the Hindu Religious and Charitable Endowments (HR&CE) department and ASI. Recent focuses include plastic-free zones, restoration of historical painting pigments, and mechanical reinforcements of Gopurams.',
    interestingFacts: [
      'The Hall of a Thousand Pillars actually contains 985 beautifully carved granite pillars.',
      'It was nominated as one of the new Seven Wonders of the World.',
      'The temple is covered in an estimated 33,000 sculptures painted in vibrant colors.',
      'It features a sacred golden lotus tank (Porthamarai Kulam) in the center of the complex.',
      'The southern tower is the tallest of all 14 gopurams at 51.9 meters.',
      'Goddess Meenakshi is depicted holding a parrot, which symbolizes green nature and sweet speech.',
      'The temple is designed as a mandala structure, forming the geographic center of Madurai city.',
      'Every night, a ritual is performed carrying an icon of Sundareswarar to Meenakshi\'s bedchamber.'
    ],
    featured: true,
    timeline: [
      { year: '6th Century CE', event: 'Early temple roots noted in Tamil Sangam literature.' },
      { year: '1310 CE', event: 'The historic temple is heavily damaged and looted by the Delhi Sultanate general Malik Kafur.' },
      { year: '1559 CE', event: 'King Vishwanatha Nayak initiates the rebuilding and major expansion of the temple.' },
      { year: '1623 CE', event: 'King Thirumalai Nayak builds the primary mandapams and tallest Gopurams.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Meenakshi_Amman_Temple_-_Gateway_Tower,_Madurai.jpg',
    imageLicense: 'CC BY-SA 4.0',
    imageAttribution: 'By IM3847 (Own work)',

    // Basic Information
    district: 'Madurai',
    coordinates: { latitude: 9.9197, longitude: 78.1194 },
    monumentType: 'Temple Complex',
    historicalPeriod: 'Nayak Kingdom',
    constructionYear: 'Rebuilt 16th - 17th Century',
    constructionPeriod: '1559 - 1659 CE',
    ruler: 'King Thirumalai Nayak',
    builder: 'Vishwanatha Nayak & Thirumalai Nayak',
    architect: 'Nayak Guild Architects',

    // History
    shortHistory: 'The Meenakshi Amman Temple is a historic Dravidian temple complex in Madurai. Originally dating to Sangam times, it was plundered in 1310 CE and rebuilt to its current grandeur by the Nayak rulers in the 16th-17th centuries.',
    fullHistory: 'The Madurai Meenakshi Amman Temple has a history rooted in ancient antiquity. Early Sangam literature from the 1st millennium BCE mentions Madurai as a temple city structured around the residence of Shiva and Parvati. The temple was the religious and cultural heart of the Pandyan kingdom, which ruled the southern Tamil region for centuries.\n\nIn 1310 CE, the peace was shattered when Malik Kafur, a general of the Delhi Sultanate, invaded Madurai. He plundered the temple complex of all its gold, jewels, and stone icons, and demolished most of its ancient towers and shrines, leaving only the primary sanctums partially intact. Following a period of sultanate rule, the region was integrated into the Vijayanagara Empire, which appointed Nayak governors (Nayakas) to rule Madurai.\n\nIn 1559 CE, King Vishwanatha Nayak declared independence and established the Madurai Nayak dynasty. He initiated the comprehensive rebuilding of the temple according to ancient Shilpa Shastra guidelines. The temple reached the pinnacle of its architectural expansion under King Thirumalai Nayak (1623–1659 CE). He constructed the vast gateway gopurams, the Golden Lotus Tank, and the grand halls decorated with detailed sculptures. Under Nayak patronage, the temple became a center of Tamil literature, philosophy, and classical arts. Today, the temple remains under active worship, managed by the HR&CE department of Tamil Nadu.',
    originStory: 'Legend says the temple was founded by Indra, the king of the gods. Having committed a sin, Indra traveled the earth to purify himself. He found a self-manifested (Swayambhu) Shiva Lingam under a Kadamba tree in Madurai and built a small temple over it, after which Shiva cleared him of his burden.',
    constructionHistory: 'The modern structure was built systematically over a century (1559–1659 CE). The architects designed concentric stone walls forming quadrangles, constructing 14 gateway gopurams. Stucco plaster (sudhai) made of lime, sand, and jaggery was used to sculpt thousands of figures on the towers. The legendary Hall of a Thousand Pillars was engineered to support the ceiling using monolithic granite pillars carved with warriors and deities.',
    importantRulers: ['Vishwanatha Nayak', 'Thirumalai Nayak', 'Queen Mangammal'],
    dynastyHistory: 'The Madurai Nayaks rose as governors of the Vijayanagara Empire and later became independent sovereigns. They ruled from the mid-16th to the mid-18th century, leaving a legacy of temple architecture, water reservoirs, and civic forts.',
    historicalTimeline: [
      { year: '1310 CE', title: 'Malik Kafur Plunder', description: 'The Delhi Sultanate general raids Madurai and demolishes the ancient temple structures.' },
      { year: '1559 CE', title: 'Reconstruction Begins', description: 'Vishwanatha Nayak establishes the Nayak dynasty and starts the rebuild.' },
      { year: '1623 CE', title: 'Thirumalai Nayak Reign', description: 'Primary construction of the gateway towers and halls is completed.' },
      { year: '1963 CE', title: 'Major Consecration', description: 'The temple undergoes massive renovation and modern consecration rituals.' }
    ],
    historicalEvents: [
      { period: '1310 CE', title: 'Destruction of Gopurams', description: 'Malik Kafur dismantles the ancient stone towers and loots the temple treasury.' },
      { period: '1659 CE', title: 'Thirumalai Nayak Consecration', description: 'The king completes the Pudhu Mandapam and dedicates it during the spring festival.' },
      { period: '1700s CE', title: 'Queen Mangammal Grants', description: 'Queen Mangammal makes extensive land grants for the upkeep of the temple kitchens.' }
    ],

    // Architecture
    buildingMaterials: 'Granite stone blocks, lime stucco (sudhai) sculptures.',
    structuralFeatures: 'Concentric rectangular layouts, 14 monumental gateway towers, sacred temple tank.',
    architecturalStyle: 'Madurai Nayak style Dravidian Architecture',
    vimanaDetails: 'Two main gold-plated Vimanas rise above the sanctums of Goddess Meenakshi and Lord Sundareswarar.',
    gopuramDetails: '14 gopurams in total. The South Gopuram is the tallest at 51.9 meters, decorated with over 1,500 stucco sculptures.',
    mandapaDetails: 'Includes the Hall of a Thousand Pillars (containing 985 carved pillars), Kambathadi Mandapam, and Ashta Shakthi Mandapam.',
    sculptureDetails: 'Carvings of the wedding of Meenakshi and Shiva, yali guardians, and figures of Lord Shiva dancing.',
    pillarDetails: 'Granite pillars carved with life-sized figures of warriors on rearing horses (yalis) and divine forms of Shiva.',
    ceilingDetails: 'Ceilings decorated with colourful murals showing stories from local legends (Thiruvilayadal Puranam).',
    inscriptionDetails: 'Medieval Tamil and Telugu inscriptions on the sanctum walls documenting royal donations and festivals.',
    engineeringFeatures: 'Advanced rainwater collection routing water from roofs into the central Golden Lotus Tank.',

    // Cultural Importance
    culturalImportance: 'Meenakshi Temple is the cultural core of Madurai. The city layout is designed as concentric streets centering around the temple, mirroring a traditional lotus mandala. It remains a vibrant center of classical Carnatic music, Tamil literature, and traditional craftsmanship.',
    religiousImportance: 'One of the most sacred Shakta pilgrimage sites in India. Unlike most Hindu temples where the male deity is primary, here Goddess Meenakshi is the chief deity, signifying the importance of feminine cosmic energy (Shakti).',
    socialImportance: 'Functions as the cultural hub of Madurai, housing library archives, traditional schools, and providing charity meals to thousands daily.',
    artisticImportance: 'Exhibits a collection of stucco art, stone sculpture, and historical paintings illustrating local Saivite legends.',
    culturalPractices: 'Classical dance recitals and Carnatic concerts are held in the temple mandapams during festivals.',
    traditionalPractices: 'Traditional flower garland weaving and brass lamp making thrive in the markets around the temple.',
    festivals: ['Chithirai Festival (Wedding of Meenakshi)', 'Navarathri', 'Float Festival (Theppotsavam)'],
    rituals: ['Palli Arai Pooja (Bedchamber ritual every night)', 'Daily abhishekham and aradhana in the inner sanctums'],

    // Legends and Stories
    legends: [
      'Goddess Meenakshi was born out of a sacrificial fire to the childless Pandyan King Malayadwaja Pandya. She was born with three breasts, and a prophecy declared the third breast would disappear when she met her future husband. It did so when she met Lord Shiva on Mount Kailash.',
      'Shiva performed the cosmic dance on one leg in Madurai. In response to requests from a Pandyan king, he changed legs, a pose known as Rajatha Sabha (Silver Hall).'
    ],
    mythology: 'Grounding of Madurai as the sacred site where Shiva\'s local miracles (Thiruvilayadal) took place.',
    localStories: ['Stories of local saints like Thirugnana Sambandar curing the king\'s illness through sacred ash.'],
    interestingStories: ['The story of the British Collector Rous Peter, who donated golden stirrups to the temple after being saved from a flash flood by a vision of a young girl.'],

    // Preservation
    preservationHistory: 'Managed by the HR&CE department of Tamil Nadu and monitored by ASI. Focuses include structural stability check of gopurams and preserving the stucco sculptures.',
    restorationHistory: 'Every 12 years, the temple undergoes renovation (Kumbhabhishekham), where the stucco sculptures on the gopurams are repaired, repainted with natural pigments, and structural stones are reinforced.',
    damageHistory: 'The temple suffered destruction in 1310 CE, but the solid granite base structures survived, allowing for 16th-century reconstruction.',
    conservationEfforts: 'The temple courtyard has been declared a plastic-free zone, and modern fire safety systems have been installed inside the mandapams.',
    currentCondition: 'Excellent. Well-maintained structure, hosting hundreds of thousands of visitors daily.',

    // Heritage Status
    heritageStatus: 'National Monument of India',
    unescoStatus: 'Nominated',
    unescoYear: 'N/A',
    heritageRecognition: 'Swachh Iconic Place (Cleanest Heritage Site)',

    // Visitor Information
    dressCode: 'Strict traditional dress code: dhotis, sarees, or salwar kameez. Jeans, shorts, and western outfits are not permitted. Footwear is strictly prohibited.',
    visitorGuidelines: 'No electronic gadgets, cameras, or mobile phones are allowed inside the temple premises. Security screening is mandatory at the entrances.',
    howToReach: 'Located in the center of Madurai. Easily accessible by local buses, auto-rickshaws, or taxis. Madurai Junction railway station is 2 km away, and Madurai Airport is 12 km away.',
    visitingInformation: 'Open daily. Separate queues for general and special entry tickets are available.',
    openingHours: '5:00 AM - 12:30 PM, 4:00 PM - 10:00 PM',
    bestTimeToVisit: 'November to February (mild winter temperatures)',
    entryFee: 'Free entry. Special entrance darshan ticket is 50 INR.',
    nearbyPlaces: ['Thirumalai Nayakkar Palace', 'Koodal Azhagar Temple', 'Gandhi Memorial Museum', 'Vandiyur Mariamman Teppakulam'],

    // Educational Information
    didYouKnow: [
      'The temple complex has 14 gateway towers (Gopurams), which are visible from across Madurai.',
      'The Hall of a Thousand Pillars has 985 carved pillars, each displaying unique artistic motifs.'
    ],
    importantFacts: [
      'The temple forms the geographic and administrative hub of Madurai city.',
      'Hosts the 10-day Chithirai Festival celebrating the wedding of Meenakshi and Shiva.'
    ],
    quizTopics: ['Nayak temple architecture', 'Madurai Sangam history', 'Saivite iconography and legends'],
    historySections: [
      {
        id: 'sec-meen-sacred-myth',
        title: 'The Sacred Myth',
        content: 'According to legend, the temple stands where Goddess Meenakshi (a form of Parvati born with three breasts) met Lord Sundareswarar (Shiva) and her third breast disappeared, fulfilling a prophecy. The couple\'s marriage is celebrated annually in the spectacular 10-day Chithirai Festival, which acts as the major cultural event of Madurai, bringing together millions of devotees.',
        images: [],
        imageUrls: [],
        order: 1
      },
      {
        id: 'sec-meen-rebuilding',
        title: 'Rebuilding the Gopurams',
        content: 'Although the temple has ancient roots mentioned in 2,500-year-old Tamil Sangam literature, the original structures were ransacked and destroyed in the early 14th century by the general Malik Kafur of the Delhi Sultanate. The temple was reconstructed and expanded in the 16th and 17th centuries by the Madurai Nayak rulers, who built the 14 massive gopurams (gateway towers) and the legendary Hall of a Thousand Pillars.',
        images: [],
        imageUrls: [],
        order: 2
      }
    ]
  },
  {
    name: 'Mahabalipuram Shore Temple',
    slug: 'mahabalipuram',
    location: 'Mamallapuram',
    state: 'Tamil Nadu',
    country: 'India',
    category: 'Sculptures' as const,
    period: '8th Century CE (700-728 CE)',
    dynasty: 'Pallava Dynasty',
    description: 'A structural temple, built with blocks of granite, overlooking the shore of the Bay of Bengal at Mahabalipuram. It is one of the oldest structural stone temples of South India, built during the reign of Narasimhavarman II. It has been classified as a UNESCO World Heritage Site.',
    historicalSignificance: 'Mamallapuram was a busy port city during the Pallava dynasty. The Shore Temple was constructed not just as a place of worship, but also as a landmark or lighthouse for incoming trading ships. It represents the transition from rock-cut cave temples to structural stone temples.',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/8/87/Mahabalipuram-Shore_Temple-WUS01811.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/5/5d/Shore_Temple%2C_Mahabalipuram_1.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/d/d7/Mahabalipuram-Shore_Temple-WUS01970.jpg'
    ],
    latitude: 12.6164,
    longitude: 80.1986,
    historicalBackground: 'Early European travelers referred to Mahabalipuram as the "Seven Pagodas," believing that the Shore Temple was just one of seven magnificent temples lined up along the coast. Recent underwater archaeological surveys have found evidence of submerged structures, hinting that these legends might be true.',
    architecture: 'Built of cut granite stones rather than being carved out of a copy. The temple houses three shrines: two dedicated to Shiva and one dedicated to Vishnu (depicted as Anantashayana Vishnu). It has a pyramidal Vimana and features numerous monolithic stone carvings of bulls (Nandi) lining the outer compound.',
    culturalSignificance: 'One of the earliest and most vital examples of Dravidian structural architecture, illustrating the genius Pallavas had in handling hard granite stone to resist coastal environmental elements.',
    preservationStatus: 'Due to its seaside location, the temple faces severe threat from salty sea breezes, water spray, and sand erosion. ASI has constructed a groyne wall (breakwater) in the sea and planted Casuarina trees to act as a windbreak and mitigate erosion.',
    interestingFacts: [
      'It is the sole surviving temple of the legendary "Seven Pagodas" of Mamallapuram.',
      'The tsunami of December 2004 temporarily pulled back the sea, exposing ancient carvings and structural foundations of companion temples.',
      'Unlike other temples of the period, it contains shrines for both Shiva and Vishnu in a single complex.',
      'Built entirely of locally quarried granite blocks fitted together with dry stone joinery.',
      'It served as a landmark for sailors, earning it the name "Seven Pagodas" from European traders.',
      'The entrance has a monolithic stone sculpture of a lion containing a small shrine inside its chest.',
      'The main shrine contains a sixteen-faceted faceted Shiva Lingam made of black basalt stone.',
      'The temple is designed to catch the first rays of the rising sun across the Bay of Bengal.'
    ],
    featured: false,
    timeline: [
      { year: '700 CE', event: 'Pallava King Narasimhavarman II (Rajasimha) begins construction of the stone temple.' },
      { year: '728 CE', event: 'Temple construction completed, housing both Shiva and Vishnu shrines.' },
      { year: '1984 CE', event: 'Inscribed as a UNESCO World Heritage Site as part of the Mahabalipuram monuments group.' },
      { year: '2004 CE', event: 'The Indian Ocean Tsunami hits the coast, exposing submerged historical structures near the temple.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Mahabalipuram-Shore_Temple-WUS01811.jpg',
    imageLicense: 'CC BY-SA 4.0',
    imageAttribution: 'By J.M.Garg (Own work)',

    // Basic Information
    district: 'Chengalpattu',
    coordinates: { latitude: 12.6164, longitude: 80.1986 },
    monumentType: 'Structural Temple Complex',
    historicalPeriod: 'Late Pallava',
    constructionYear: '728 CE',
    constructionPeriod: '700 - 728 CE',
    ruler: 'King Narasimhavarman II (Rajasimha)',
    builder: 'King Narasimhavarman II',
    architect: 'Pallava Master Stone Masons',

    // History
    shortHistory: 'Constructed in the early 8th century by Pallava King Rajasimha, the Shore Temple is one of the earliest structural temples in South India. Overlooking the Bay of Bengal, it served as a temple and lighthouse for Mamallapuram port.',
    fullHistory: 'The Shore Temple at Mahabalipuram was built during the reign of the Pallava King Rajasimha (Narasimhavarman II, 700-728 CE). During the Pallava era, Mamallapuram was a vital international port city, trading with Southeast Asia, China, and the Mediterranean. The Shore Temple was constructed directly on the beach, likely serving as both a place of worship and a visual beacon or lighthouse for merchant ships entering the harbor.\n\nEuropean mariners who sailed past the coast in the 17th century referred to the town as the "Seven Pagodas," suggesting that the Shore Temple was just one of seven structural temples built along the waterline. According to legend, the other six temples were swallowed by the sea due to the jealousy of the rain god Indra. For centuries, this was regarded as a myth, but during the tsunami of December 2004, the sea receded by several hundred meters, exposing stone walls, animal carvings, and foundations just offshore. Subsequent underwater archaeological surveys conducted by the ASI confirmed the existence of these submerged ruins, proving that a larger temple complex once lined the coast.\n\nWith the fall of the Pallavas, the temple fell into disuse and was slowly covered by sand dunes and eroded by sea spray. In the late 19th and early 20th centuries, British and Indian archaeologists excavated the site, clearing the sand and restoring the collapsed portions of the shrines. Today, it stands as a UNESCO World Heritage Site.',
    originStory: 'Legend says that Prince Prahlada, an ardent devotee of Vishnu, refused to worship his demon father Hiranyakashipu. Angered, Hiranyakashipu tried to kill him but was defeated. Prahlada went on to rule the region, and his grandson Bali founded Mahabalipuram. The gods, jealous of Bali\'s prosperity, flooded the city, leaving only the tallest temple towers standing.',
    constructionHistory: 'The temple was built by fitting cut blocks of granite together without mortar. Unlike the rock-cut cave temples of the earlier Pallava period, this structure was built from the ground up. Over the centuries, wind, salt, and sand have softened the outlines of the granite sculptures, giving them a smooth, weathered appearance.',
    importantRulers: ['Narasimhavarman II (Rajasimha)', 'Dantivarman', 'Nandivarman III'],
    dynastyHistory: 'The Pallava Dynasty (3rd to 9th century CE) ruled northern Tamil Nadu and parts of Andhra Pradesh. They are credited with introducing structural stone architecture and rock-cut cave temples to South India.',
    historicalTimeline: [
      { year: '700 CE', title: 'Rajasimha Initiates Construction', description: 'The Pallava king orders a structural temple on the beach.' },
      { year: '728 CE', title: 'Consecration', description: 'The shrines are dedicated to Shiva and Vishnu.' },
      { year: '1984 CE', title: 'UNESCO Designation', description: 'Inscribed on the World Heritage List.' },
      { year: '2004 CE', title: 'Tsunami Exposure', description: 'Submerged ruins are exposed during the Indian Ocean tsunami.' }
    ],
    historicalEvents: [
      { period: '8th Century CE', title: 'Royal Dedication', description: 'King Rajasimha dedicates the temple and places the basalt Lingam.' },
      { period: '1780 CE', title: 'British Documentation', description: 'Early British surveyors document the site under the name Seven Pagodas.' },
      { period: '2004 CE', title: 'Underwater Discovery', description: 'ASI initiates marine surveys to document the submerged temples.' }
    ],

    // Architecture
    buildingMaterials: 'Locally quarried Granite Blocks',
    structuralFeatures: 'Pyramidal Vimana towers, three separate shrines, stone compound wall with Nandi figures.',
    architecturalStyle: 'Rajasimha style Pallava Dravidian Architecture',
    vimanaDetails: 'Features a smaller western Vimana and a larger eastern Vimana, both shaped like stepped pyramids.',
    gopuramDetails: 'The temple has small gateway structures, though it lacks the high gopuram towers of later periods.',
    mandapaDetails: 'Contains a small transverse hall (Ardha Mandapam) leading to the primary Shiva shrine.',
    sculptureDetails: 'Reliefs of Somaskanda (Shiva, Parvati, and Skanda), Durga, and a reclining Vishnu.',
    pillarDetails: 'Pillars display carved lions (Simha pillars) at their bases, a characteristic Pallava motif.',
    ceilingDetails: 'The internal stone ceiling slabs are supported by heavy granite beams.',
    inscriptionDetails: 'Pallava Grantha inscriptions detailing the titles of King Rajasimha.',
    engineeringFeatures: 'Designed to resist coastal winds using solid granite blocks and low structural heights.',

    // Cultural Importance
    culturalImportance: 'The Shore Temple represents the transition from rock-cut architecture to structural stone temples in South India. It is a symbol of the Pallava dynasty\'s maritime trade and cultural influence across Southeast Asia, inspiring temple layouts in Indonesia and Cambodia.',
    religiousImportance: 'Unique in housing three shrines: the main eastern shrine and western shrine are dedicated to Shiva, while the middle shrine houses a reclining image of Lord Vishnu (Anantashayana Vishnu).',
    socialImportance: 'Serves as a historical monument and a focal point for Mahabalipuram\'s tourism-based economy.',
    artisticImportance: 'Exhibits the transition of sculpture style from early rock-cut forms to refined structural stone reliefs.',
    culturalPractices: 'Hosts the annual Mamallapuram Dance Festival, drawing classical dancers from across India.',
    traditionalPractices: 'The town remains a thriving school for traditional stone carving and sculpture.',
    festivals: ['Mamallapuram Dance Festival (January)', 'Maha Shivaratri'],
    rituals: ['No active daily worship is performed inside the shrines, as the temple is a protected archaeological monument.'],

    // Legends and Stories
    legends: [
      'The temple is the sole survivor of the "Seven Pagodas" of Mamallapuram, six of which were swallowed by the sea due to the jealousy of the rain god Indra.'
    ],
    mythology: 'Representing the cosmic conflict between gods and demons, linked to the legend of King Mahabali.',
    localStories: ['Stories of fishermen reporting sightings of golden temple tops underwater during low tides.'],
    interestingStories: ['The story of the 2004 tsunami exposing a monolithic stone elephant and a lion carving on the beach that had been buried in the sand for centuries.'],

    // Preservation
    preservationHistory: 'Managed by the Archaeological Survey of India (ASI). Focuses include combating salinity damage, sand erosion, and sea encroachment.',
    restorationHistory: 'ASI installed a massive stone breakwater wall in the sea to prevent wave impact and planted Casuarina trees along the coast to act as a sand and wind shield.',
    damageHistory: 'Centuries of exposure to salt-laden winds have eroded the finer details of the outer stone carvings, leaving them with a softened appearance.',
    conservationEfforts: 'Chemical treatment is periodically applied to the stone to dissolve accumulated salts and protect the granite surface.',
    currentCondition: 'Stable. The breakwater wall successfully protects the structure from marine waves.',

    // Heritage Status
    heritageStatus: 'UNESCO World Heritage Site',
    unescoStatus: 'Inscribed',
    unescoYear: '1984',
    heritageRecognition: 'ASI Protected Monument',

    // Visitor Information
    dressCode: 'Sober casual clothing is recommended. Footwear is allowed in the outer courtyard but must be removed before entering the inner sanctum chambers.',
    visitorGuidelines: 'Do not climb on the ancient structures or Nandi statues. Keep the premises clean. Drone photography is strictly prohibited without prior ASI permission.',
    howToReach: 'Located in Mamallapuram town, 60 km south of Chennai. Accessible via the scenic East Coast Road (ECR). The nearest airport and railway station are in Chennai.',
    visitingInformation: 'Open daily. Tickets can be booked online via the ASI portal.',
    openingHours: '6:00 AM - 6:00 PM',
    bestTimeToVisit: 'November to February (pleasant weather for outdoor exploration)',
    entryFee: '40 INR for Indian citizens, 600 INR for foreign tourists. Children under 15 enter free.',
    nearbyPlaces: ['Five Rathas (Pancha Rathas)', 'Arjuna\'s Penance', 'Krishna\'s Butterball', 'Mahabalipuram Beach'],

    // Educational Information
    didYouKnow: [
      'The Shore Temple is one of the earliest structural stone temples in South India.',
      'It contains shrines for both Shiva and Vishnu in a single complex.'
    ],
    importantFacts: [
      'Inscribed as a UNESCO World Heritage Site in 1984.',
      'Constructed using interlocking granite blocks without mortar.'
    ],
    quizTopics: ['Pallava dynasty architecture', 'Maritime trade in ancient India', 'Indian structural temple design']
  },
  {
    name: 'Gangaikonda Cholapuram',
    slug: 'gangaikonda-cholapuram',
    location: 'Gangaikonda Cholapuram',
    state: 'Tamil Nadu',
    country: 'India',
    category: 'Temples' as const,
    period: '11th Century CE (1035 CE)',
    dynasty: 'Chola Dynasty',
    description: 'Built by Rajendra Chola I, the son and successor of Raja Raja Chola I, this temple was designed to rival the Brihadeeswarar Temple of Thanjavur. It served as the capital of the Chola Empire for over 250 years. The temple is famous for its feminine-curved Vimana tower and high-quality sculptures.',
    historicalSignificance: 'Rajendra Chola I established this city and temple to commemorate his successful military campaign to the Ganges River in North India. He assumed the title "Gangaikonda Cholan" (The Chola who took the Ganges) and built this temple as a monument of his victory, filling its sacred tank with water brought from the Ganges.',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/1/12/Gangaikonda_Cholapuram_Temple_2015.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/6/67/Vimana_of_Gangaikondacholisvarar_Temple.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/8/87/Gangaikondacholapuram_Saraswathi.jpg'
    ],
    latitude: 11.2064,
    longitude: 79.4478,
    historicalBackground: 'After conquering kingdoms up to the Ganges, Rajendra Chola I wanted to build a new capital that would surpass Thanjavur. The city of Gangaikonda Cholapuram was founded in 1025 CE, and the temple was completed around 1035 CE. It stood as a capital until the fall of the Chola dynasty in the 13th century, after which it was largely abandoned.',
    architecture: 'The temple Vimana is 180 feet high, slightly shorter than Thanjavur, but is designed with concave, curved tiers that give it a softer, more graceful "feminine" appearance. The temple features a massive monolithic Nandi bull, an underground sanctum, and a collection of Chola bronze-casting era sculptures, including the famous Chola Saraswathi and Chandeshvara Anugraha Murthy.',
    culturalSignificance: 'Part of the UNESCO World Heritage Site "Great Living Chola Temples." It represents the height of Chola artistic expression, displaying a transition towards more fluid, expressive carving styles in South Indian sculpture.',
    preservationStatus: 'Maintained by the Archaeological Survey of India (ASI). Focuses include preserving the extensive lawns, restoring structural stones that were damaged during British colonial excavations (when stones were taken to build a nearby dam), and protecting carvings from weather.',
    interestingFacts: [
      'The Vimana tower is designed with concave curves, unlike the straight pyramid of Thanjavur.',
      'The sacred temple tank, Cholagangam, was filled with water brought from the Ganges River by defeated kings.',
      'It contains a unique solar stone structure (Suryapitha) that shines light into the sanctum.',
      'The Nandi bull at the entrance is made of stucco rather than granite, unlike the one in Thanjavur.',
      'The temple courtyard features a monolithic lion-shaped step-well (Simhakinar) built by Rajendra Chola I.',
      'The British dismantled parts of the temple fort wall in the 19th century to use as stones for the Lower Anaicut dam.',
      'It contains a beautiful relief carving of Shiva crowning his devotee Chandesha, representing Rajendra Chola himself.',
      'The main Shiva Lingam inside is the largest in any Chola temple (four meters high).'
    ],
    featured: false,
    timeline: [
      { year: '1023 CE', event: 'Rajendra Chola I completes his military campaign to the Ganges River.' },
      { year: '1025 CE', event: 'The city of Gangaikonda Cholapuram is founded as the new Chola capital.' },
      { year: '1035 CE', event: 'The temple construction is completed, and the Ganges water is poured into the temple reservoir.' },
      { year: '2004 CE', event: 'Inscribed as part of the UNESCO World Heritage Site "Great Living Chola Temples".' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Gangaikonda_Cholapuram_Temple_2015.jpg',
    imageLicense: 'CC BY-SA 4.0',
    imageAttribution: 'By Kasiarun (Own work)',

    // Basic Information
    district: 'Ariyalur',
    coordinates: { latitude: 11.2064, longitude: 79.4478 },
    monumentType: 'Temple Complex',
    historicalPeriod: 'Medieval Chola',
    constructionYear: '1035 CE',
    constructionPeriod: '1025 - 1035 CE',
    ruler: 'Rajendra Chola I',
    builder: 'Rajendra Chola I',
    architect: 'Chola Royal Guild Architects',

    // History
    shortHistory: 'Built in 1035 CE by Rajendra Chola I, this temple was the centerpiece of the new Chola capital. It was built to celebrate his victory in North India and features a curved Vimana tower.',
    fullHistory: 'Gangaikonda Cholapuram was established by Rajendra Chola I (1014–1044 CE), the illustrious son of Raja Raja Chola I. Under Rajendra\'s leadership, the Chola Empire expanded to its greatest extent, with military campaigns reaching north to the Ganges River and maritime expeditions conquering parts of Sri Lanka, Malaysia, and Indonesia.\n\nTo commemorate his victory over the Pala dynasty of Bengal and the bringing of the Ganges water, Rajendra founded a new capital city named Gangaikonda Cholapuram (The City of the Chola who took the Ganges) and built a central temple to rival his father\'s creation in Thanjavur. The temple was completed around 1035 CE, and the defeated kings were ordered to carry pots of Ganges water to fill the temple\'s sacred reservoir, Cholagangam.\n\nThe city remained the Chola capital for over two and a half centuries. However, after the Pandya dynasty defeated the Cholas in the late 13th century, the city was sacked, and the palace complexes were razed to the ground. During the British colonial period, the site suffered further damage when stones from the outer fortification walls were dismantled to construct the Lower Anaicut dam across the Kollidam River. The temple itself survived and was designated a UNESCO World Heritage Site in 2004.',
    originStory: 'Legend says that Rajendra Chola I wanted to create a temple that reflected the Chola victory, symbolizing the union of the sacred rivers of the South (Kaveri) and the North (Ganges). Defeated rulers were not asked for gold or land, but were instead asked to carry jars of Ganges water to consecrate the temple reservoir.',
    constructionHistory: 'Constructed over ten years using granite blocks transported from distant quarries. The architects used curved structural lines in the Vimana tower, which required advanced geometric calculations to balance the weight without using mortar.',
    importantRulers: ['Rajendra Chola I', 'Rajadhiraja Chola I', 'Kulothunga Chola I'],
    dynastyHistory: 'The Chola Dynasty reached its height under Rajendra I, who established a powerful navy that dominated the Bay of Bengal, turning it into a "Chola Lake" and facilitating trade with China and Southeast Asia.',
    historicalTimeline: [
      { year: '1025 CE', title: 'New Capital Founded', description: 'Rajendra Chola I establishes the city of Gangaikonda Cholapuram.' },
      { year: '1035 CE', title: 'Temple Completion', description: 'The main temple is completed and the Ganges reservoir is consecrated.' },
      { year: '1279 CE', title: 'Pandyan Conquest', description: 'Pandya rulers defeat the Cholas, and the royal palace is destroyed.' },
      { year: '2004 CE', title: 'UNESCO Inscription', description: 'Inscribed on the UNESCO World Heritage list.' }
    ],
    historicalEvents: [
      { period: '1035 CE', title: 'Ganges Water Consecration', description: 'Water from the Ganges is poured into the temple\'s Simhakinar well.' },
      { period: '1836 CE', title: 'British Stone Extraction', description: 'Stones from the outer fort are taken to build the Kollidam river dam.' }
    ],

    // Architecture
    buildingMaterials: 'Granite Blocks, Lime Mortar',
    structuralFeatures: 'Pyramidal Vimana with curved steps, monolithic Nandi, lion-shaped step-well (Simhakinar).',
    architecturalStyle: 'Dravidian Architecture (Chola Style)',
    vimanaDetails: 'The Vimana tower is 55 meters (180 feet) high, designed with concave curves that distinguish it from the straight pyramid of Thanjavur.',
    gopuramDetails: 'The main gopuram gateway was destroyed during historical conflicts, leaving only the stone base.',
    mandapaDetails: 'Features a large columned assembly hall (Maha Mandapam) leading to the inner sanctum.',
    sculptureDetails: 'Reliefs of Saraswathi, Chandeshvara Anugraha Murthy, and Shiva as Ardhanarishvara.',
    pillarDetails: 'The columns inside the Maha Mandapam feature carved details showing Chola military victories.',
    ceilingDetails: 'The ceiling slabs feature structural patterns designed to distribute the weight of the upper Vimana tiers.',
    inscriptionDetails: 'Tamil inscriptions detailing the Chola campaigns in Bengal, Sri Lanka, and Kadaram (Malaysia).',
    engineeringFeatures: 'A solar alignment system where light is reflected from a polished stone onto the main deity.',

    // Cultural Importance
    culturalImportance: 'Gangaikonda Cholapuram stands as a monument to Chola artistic and political achievements. It serves as a historical resource for scholars studying medieval South Indian history, maritime expansion, and classical Dravidian art.',
    religiousImportance: 'Houses the largest monolithic Shiva Lingam in South India (4 meters high, 8.5 meters in circumference), representing the cosmic form of Lord Shiva.',
    socialImportance: 'Serves as an educational resource and tourist attraction in Ariyalur district.',
    artisticImportance: 'Exhibits some of the finest classical stone carvings from the Chola golden age, including detailed Chola bronzes.',
    culturalPractices: 'Classical music concerts and dance recitals are held in the temple courtyards during annual festivals.',
    traditionalPractices: 'Local cultural heritage is preserved through community events and historical societies.',
    festivals: ['Maha Shivaratri', 'Aadi Pooram', 'Annabhishekam (covering the giant Lingam with cooked rice)'],
    rituals: ['Daily kala poojas performed by local priests.'],

    // Legends and Stories
    legends: [
      'The sacred step-well, Simhakinar, is believed to be filled with Ganges water mixed with local spring water by Rajendra Chola I.'
    ],
    mythology: 'Representing the descent of the Goddess Ganga to the South, symbolizing spiritual purity.',
    localStories: ['Stories of local villagers finding Chola-era relics or copper plates during excavations.'],
    interestingStories: ['The legend of Chandesha, a young devotee who was crowned with flowers by Shiva, illustrating how Rajendra Chola saw himself as the king consecrated under divine authority.'],

    // Preservation
    preservationHistory: 'Maintained by the Archaeological Survey of India (ASI). Preservation work focuses on stone reinforcement, lawn maintenance, and chemical cleaning of structural blocks.',
    restorationHistory: 'ASI has restored the collapsed portions of the central mandapam and recreated the outer boundary walls to match the original layout.',
    damageHistory: 'The royal palaces and outer fortifications were destroyed during the 13th-century Pandyan conquest, and stones were removed in the 19th century for dam construction.',
    conservationEfforts: 'Monitored under the UNESCO World Heritage guidelines to prevent commercial encroachment around the temple boundaries.',
    currentCondition: 'Good. The central temple structure and lawns are well-preserved.',

    // Heritage Status
    heritageStatus: 'UNESCO World Heritage Site',
    unescoStatus: 'Inscribed',
    unescoYear: '2004',
    heritageRecognition: 'ASI Protected Site',

    // Visitor Information
    dressCode: 'Sober traditional clothing is recommended. Footwear must be removed before entering the temple platform.',
    visitorGuidelines: 'Do not touch the stone sculptures. Keep the lawn clean. Commercial video recording requires prior permission from the ASI.',
    howToReach: 'Located in Ariyalur district. Easily accessible by road from Trichy (100 km) or Chidambaram (50 km). The nearest railway station is in Kumbakonam (35 km).',
    visitingInformation: 'Open daily. Access is easy for elderly visitors due to flat lawn pathways.',
    openingHours: '6:00 AM - 12:00 PM, 4:00 PM - 8:00 PM',
    bestTimeToVisit: 'November to February',
    entryFee: 'Free entry.',
    nearbyPlaces: ['Chidambaram Nataraja Temple', 'Kumbakonam Temples', 'Jayankondam town'],

    // Educational Information
    didYouKnow: [
      'The temple was constructed to commemorate the Chola campaign to the Ganges River.',
      'The main Shiva Lingam is four meters high, carved out of a single block of granite.'
    ],
    importantFacts: [
      'Part of the UNESCO designation "Great Living Chola Temples".',
      'The city served as the capital of the Chola Empire for 250 years.'
    ],
    quizTopics: ['Chola military campaigns', 'Dravidian structural engineering', 'Rajendra Chola I maritime expeditions']
  },
  {
    name: 'Airavatesvara Temple',
    slug: 'airavatesvara',
    location: 'Darasuram',
    state: 'Tamil Nadu',
    country: 'India',
    category: 'Temples' as const,
    period: '12th Century CE (1166 CE)',
    dynasty: 'Chola Dynasty',
    description: 'A Dravidian Hindu temple dedicated to Shiva located in Darasuram near Kumbakonam, Tamil Nadu. Built by Rajaraja Chola II in the 12th century, it is classified as a UNESCO World Heritage Site. The temple is famous for its stone chariot design and detailed carvings.',
    historicalSignificance: 'Commissioned by Rajaraja Chola II, this temple represents the final flourish of Chola art. The architecture is characterized by smaller, more intricate details compared to the monumental scale of Thanjavur. It is named after Airavata, the white elephant of Indra, who is said to have worshiped Shiva here.',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/e/e0/Airavatesvara_Temple%2C_Darasuram%2C_Kumbakonam.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b3/Airavatesvara_temple_Darasuram.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/5/5a/Agasthiyar_at_Dharasuram.jpg'
    ],
    latitude: 10.9479,
    longitude: 79.3569,
    historicalBackground: 'Completed in 1166 CE, the temple was built during the late Chola period, when the empire\'s borders had stabilized. Darasuram was a royal suburb of Kumbakonam, functioning as a center of court life, dance, and craft guilds. The temple was built to showcase the sophistication of late Chola craftsmanship.',
    architecture: 'The temple is designed in the shape of a stone chariot drawn by horses and elephants, complete with stone wheels. The front mandapam (Rajagambhiran Mandapam) has steps that produce musical notes when walked upon. The temple features carvings illustrating stories from Tamil Saivite literature, including the Periya Puranam, and reliefs showing scenes of music, dance, and daily life.',
    culturalSignificance: 'Part of the UNESCO World Heritage Site "Great Living Chola Temples." It is an archive of late medieval Tamil culture, providing valuable details about music, dance (Bharatanatyam), and craft guilds in 12th-century South India.',
    preservationStatus: 'Protected by the ASI. Major challenges include preserving the musical steps from wear, preventing water stagnation in the sunken courtyard, and maintaining the stucco work on the surrounding gopuram structures.',
    interestingFacts: [
      'The front mandapam is built in the shape of a stone chariot drawn by horses and elephants.',
      'The entrance has musical steps (balipitha) that produce musical notes when struck.',
      'Named after Airavata, the legendary white elephant of Indra who worshiped Shiva here to cure a curse.',
      'It contains a carving showing a combined figure of a bull and an elephant sharing a single head.',
      'Features detailed carvings illustrating the stories of all 63 Nayanars (Tamil Saivite saints) from the Periya Puranam.',
      'The temple courtyard contains a small shrine dedicated to Sarabha, a mythic beast associated with Shiva.',
      'The pillars inside are carved with miniatures showing dance poses from the Natya Shastra.',
      'It is smaller than the Thanjavur and Gangaikonda Cholapuram temples, but contains more detailed carvings.'
    ],
    featured: false,
    timeline: [
      { year: '1146 CE', event: 'Rajaraja Chola II begins planning the construction of a temple at Darasuram.' },
      { year: '1166 CE', event: 'The temple is completed, consecrated, and dedicated to Shiva as Airavatesvara.' },
      { year: '2004 CE', event: 'Inscribed as a UNESCO World Heritage Site under the Great Living Chola Temples designation.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Airavatesvara_Temple,_Darasuram,_Kumbakonam.jpg',
    imageLicense: 'CC BY-SA 4.0',
    imageAttribution: 'By Kasiarun (Own work)',

    // Basic Information
    district: 'Thanjavur',
    coordinates: { latitude: 10.9479, longitude: 79.3569 },
    monumentType: 'Temple Complex',
    historicalPeriod: 'Late Chola',
    constructionYear: '1166 CE',
    constructionPeriod: '1146 - 1166 CE',
    ruler: 'Rajaraja Chola II',
    builder: 'Rajaraja Chola II',
    architect: 'Late Chola Master Stone Masons',

    // History
    shortHistory: 'Built in 1166 CE by Rajaraja Chola II, the Airavatesvara Temple in Darasuram is famous for its stone chariot design and detailed carvings of classical dance and Saivite legends.',
    fullHistory: 'The Airavatesvara Temple at Darasuram was built under the patronage of the Chola king Rajaraja Chola II in the mid-12th century, with construction completed around 1166 CE. By this period, Chola architecture had shifted from the monumental, plain surfaces of the 11th century (seen in Thanjavur) toward a style focused on intricate, detailed ornamentation and miniature stone carvings.\n\nThe suburb of Darasuram served as a royal residence and a center for silk weavers, musicians, and dancers. The temple was built to reflect this courtly culture. It was named Airavatesvara because, according to legend, Airavata, the white elephant of Indra, worshiped Shiva here to cure a skin disease caused by a sage\'s curse. The temple walls are carved with scenes from the Periya Puranam, a Tamil epic describing the lives of the 63 Nayanar saints, functioning as a stone library of Saivite lore.\n\nFollowing the decline of the Chola dynasty, the temple was maintained by the Pandyas and Vijayanagara kings. In 2004, it was added to the UNESCO World Heritage Site list, completing the designation of the "Great Living Chola Temples" alongside Thanjavur and Gangaikonda Cholapuram.',
    originStory: 'Legend says that Airavata, the white elephant of Indra, was cursed by the sage Durvasa to lose its clean white color. Having wandered the earth in distress, Airavata found the sacred spring at Darasuram, bathed in its waters, and worshiped Shiva, who restored its color. The temple is named in honor of this event.',
    constructionHistory: 'Constructed using granite blocks fitted together with dry stone joinery. The architects designed the central hall as a stone chariot with wheels, drawn by horses, symbolizing the solar chariot of Surya or the chariot of Shiva. The carvings were executed by skilled guilds of stone carvers.',
    importantRulers: ['Rajaraja Chola II', 'Kulothunga Chola III'],
    dynastyHistory: 'The late Chola period saw a stability in military campaigns, which allowed rulers to dedicate resource wealth to temple arts, resulting in highly detailed stone carvings and classical bronze sculptures.',
    historicalTimeline: [
      { year: '1146 CE', title: 'Construction Begins', description: 'Rajaraja Chola II initiates the Darasuram temple project.' },
      { year: '1166 CE', title: 'Consecration', description: 'The temple is dedicated to Shiva as Airavatesvara.' },
      { year: '2004 CE', title: 'UNESCO Status', description: 'Added to the Great Living Chola Temples UNESCO listing.' }
    ],
    historicalEvents: [
      { period: '12th Century CE', title: 'Royal Consecration', description: 'Rajaraja Chola II performs the consecration ceremony.' },
      { period: '1600s CE', title: 'Nayak Additions', description: 'Nayak governors restore the surrounding brick compound walls.' }
    ],

    // Architecture
    buildingMaterials: 'Granite Blocks, Lime Plaster (for gopuram)',
    structuralFeatures: 'Chariot-shaped mandapam, musical steps, carved columns.',
    architecturalStyle: 'Late Chola Dravidian Architecture',
    vimanaDetails: 'The Vimana tower is 24 meters (80 feet) high, featuring detailed stone carvings on each tier.',
    gopuramDetails: 'The entrance gopuram is built of brick and stone, decorated with stucco figures.',
    mandapaDetails: 'The Rajagambhiran Mandapam is designed as a stone chariot with wheels, drawn by elephants and horses.',
    sculptureDetails: 'Miniature carvings showing the 63 Nayanar saints, yali guardians, and classical dance poses.',
    pillarDetails: 'Pillars are carved with miniature reliefs showing stories from Saivite literature and dance.',
    ceilingDetails: 'The ceiling of the main mandapam features carved stone medallions showing floral designs.',
    inscriptionDetails: 'Tamil inscriptions detailing the histories of the Saivite Nayanar saints.',
    engineeringFeatures: 'Steps designed to produce musical notes when walked upon, utilizing hollow stone chambers.',

    // Cultural Importance
    culturalImportance: 'The Airavatesvara Temple is an artistic archive of late medieval Tamil culture. The carvings depict classical dance poses, musical instruments, and scenes of daily life, providing a reference for historians studying the social history of the Chola period.',
    religiousImportance: 'A Saivite pilgrimage site, named after the legend of Airavata, the white elephant, and Yama, the lord of death, both of whom are said to have worshiped Shiva here.',
    socialImportance: 'Serves as an educational resource and tourist destination in Thanjavur district.',
    artisticImportance: 'Known for its high-quality stone carvings, including the famous "bull-elephant" optical illusion carving.',
    culturalPractices: 'Classical dance festivals are held periodically in the temple courtyard.',
    traditionalPractices: 'Darasuram remains famous for its traditional handloom silk weaving, a craft supported since Chola times.',
    festivals: ['Maha Shivaratri', 'Arudra Darshan', 'Pradosham'],
    rituals: ['Daily kala poojas performed by local priests.'],

    // Legends and Stories
    legends: [
      'Yama, the lord of death, was cursed by a sage to suffer a burning sensation across his skin. He worshiped Shiva at the Darasuram tank, bathed in its waters, and was cured. The tank is named Yama Theertham.'
    ],
    mythology: 'Representing the cosmic healing powers of Shiva, associated with the legends of Airavata and Yama.',
    localStories: ['Stories of the musical steps being protected from damage during historical invasions by being buried in sand.'],
    interestingStories: ['The carving of the bull and elephant sharing a single head, illustrating the artistic playfulness of late Chola stone carvers.'],

    // Preservation
    preservationHistory: 'Managed by the Archaeological Survey of India (ASI). Focuses include protecting the musical steps from wear and managing water runoff in the courtyard.',
    restorationHistory: 'ASI has restored the sunken courtyard and reconstructed the boundary walls to prevent water logging during monsoons.',
    damageHistory: 'The temple suffered minor damage during historical conflicts, and some outer brick structures have collapsed over time.',
    conservationEfforts: 'The musical steps have been covered with a protective metal grill to prevent damage from visitors walking on them.',
    currentCondition: 'Good. Well-preserved, active monument.',

    // Heritage Status
    heritageStatus: 'UNESCO World Heritage Site',
    unescoStatus: 'Inscribed',
    unescoYear: '2004',
    heritageRecognition: 'ASI Protected Monument',

    // Visitor Information
    dressCode: 'Sober casual clothing is recommended. Footwear must be removed before entering the temple platform.',
    visitorGuidelines: 'Do not touch or climb on the carved stone pillars. Drones are prohibited. Follow the designated pathways.',
    howToReach: 'Located in Darasuram, 3 km from Kumbakonam. Accessible by local buses, autos, or taxis. Kumbakonam is the nearest railway junction.',
    visitingInformation: 'Open daily. Access is easy from the main highway.',
    openingHours: '6:00 AM - 12:00 PM, 4:00 PM - 8:00 PM',
    bestTimeToVisit: 'October to March',
    entryFee: 'Free entry.',
    nearbyPlaces: ['Kumbakonam temples', 'Swamimalai Murugan Temple', 'Thanjavur city'],

    // Educational Information
    didYouKnow: [
      'The temple features steps that produce musical notes when walked upon.',
      'It contains a stone carving of a bull and an elephant that share a single head.'
    ],
    importantFacts: [
      'Inscribed as a UNESCO World Heritage Site in 2004.',
      'Built by Rajaraja Chola II in 1166 CE.'
    ],
    quizTopics: ['Late Chola architecture', 'Tamil Saivite Nayanar saints', 'Dravidian sculptural techniques']
  },
  {
    name: 'Thirumalai Nayakkar Palace',
    slug: 'thirumalai-nayakkar',
    location: 'Madurai',
    state: 'Tamil Nadu',
    country: 'India',
    category: 'Forts' as const,
    period: '17th Century CE (1636 CE)',
    dynasty: 'Nayak Dynasty',
    description: 'A 17th-century palace complex built by King Thirumalai Nayak, ruler of Madurai\'s Nayak dynasty. The palace is famous for its giant white pillars and a design showing a synthesis of Dravidian, Islamic, and European (Italian) architectural styles.',
    historicalSignificance: 'Built in 1636 CE, this palace was the royal residence of King Thirumalai Nayak, who moved the capital back from Trichy to Madurai. The palace is a monument of the Nayak dynasty\'s wealth and political power. It originally consisted of two main parts: Swarga Vilasam (Celestial Pavilion) and Ranga Vilasam.',
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/e/ea/Madurai_Palace_pillars.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/e/e0/Inside_thirumalai_nayak_palace.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/f/ff/Thirumalai_Nayak_Palace_Madurai_TN.jpg'
    ],
    latitude: 9.9149,
    longitude: 78.1226,
    historicalBackground: 'The palace was completed in 1636 CE. During the rule of Thirumalai Nayak\'s grandson, Chokkannatha Nayak, the capital was moved to Trichy. To build a new palace there, Chokkannatha dismantled large parts of the Madurai palace, taking the carved wood and stone columns. Only the central courtyard and Swarga Vilasam survived. During the British colonial period, Lord Napier, the Governor of Madras, initiated the restoration of the surviving portions of the palace between 1869 and 1882.',
    architecture: 'The palace is famous for its giant circular pillars, which are 82 feet high and 19 feet in circumference. The design is a synthesis of Dravidian stone carving, Islamic arches, and European-style Italian columns and dome designs. The central courtyard (Swarga Vilasam) features a large open-air court surrounded by columned corridors, decorated with stucco work on the arches.',
    culturalSignificance: 'Maintained as a national monument of Tamil Nadu. It is a key historical resource for studying 17th-century courtly architecture, administrative history, and the synthesis of European and Indian designs in South India. It hosts an annual light and sound show explaining Madurai\'s history.',
    preservationStatus: 'Protected by the Tamil Nadu State Archaeology Department. Restoration efforts focus on reinforcing the stucco work, cleaning the lime plaster columns, and maintaining the light and sound show infrastructure.',
    interestingFacts: [
      'The palace features giant white pillars that are 82 feet high and 19 feet in circumference.',
      'It represents a synthesis of Dravidian, Islamic, and European (Italian) architectural styles.',
      'Only about one-fourth of the original palace complex survives today; the rest was dismantled by Thirumalai Nayak\'s grandson.',
      'The central dome was constructed without using heavy structural iron or steel beams, relying on lime concrete.',
      'Lord Napier, the British Governor of Madras, restored the palace in the late 19th century.',
      'It served as a temporary court house during the British colonial administration.',
      'The palace features a light and sound show every evening in English and Tamil.',
      'The central courtyard was originally designed for royal assemblies, music, and dance performances.'
    ],
    featured: false,
    timeline: [
      { year: '1636 CE', event: 'King Thirumalai Nayak completes construction of the palace as his royal residence.' },
      { year: '1680s CE', event: 'Chokkannatha Nayak dismantles parts of the palace to transport materials to Trichy.' },
      { year: '1869 CE', event: 'Lord Napier initiates a restoration project to preserve the surviving structures.' },
      { year: '1970s CE', event: 'The palace is declared a protected national monument by the State Archaeology Department.' }
    ],
    imageSource: 'Wikimedia Commons',
    imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Madurai_Palace_pillars.jpg',
    imageLicense: 'CC BY-SA 4.0',
    imageAttribution: 'By Kasiarun (Own work)',
    historySections: [
      {
        id: 'sec-palace-royal-commission',
        title: 'The Royal Commission',
        content: 'The palace was commissioned by King Thirumalai Nayak in the 17th century (1636 CE) as his royal residence and administrative headquarters. It is known for its Indo-Saracenic architectural character and monumental courtyards, arches, domes, and stucco work.',
        images: [],
        imageUrls: [],
        order: 1
      },
      {
        id: 'sec-palace-architecture',
        title: 'Indo-Saracenic Architecture',
        content: 'The palace is celebrated for its giant circular white pillars, rising to a height of 82 feet with a circumference of 19 feet. The design reflects a fusion of Italian, Islamic, and Dravidian styles, constructed using brick and lime concrete without using heavy iron structural beams.',
        images: [],
        imageUrls: [],
        order: 2
      }
    ],

    // Basic Information
    district: 'Madurai',
    coordinates: { latitude: 9.9149, longitude: 78.1226 },
    monumentType: 'Royal Palace Complex',
    historicalPeriod: 'Nayak Kingdom',
    constructionYear: '1636 CE',
    constructionPeriod: '1623 - 1636 CE',
    ruler: 'King Thirumalai Nayak',
    builder: 'King Thirumalai Nayak',
    architect: 'Italian and Nayak Guild Architects',

    // History
    shortHistory: 'Built in 1636 CE by King Thirumalai Nayak, this palace in Madurai is famous for its giant columns and a design showing a synthesis of Dravidian, Islamic, and Italian styles.',
    fullHistory: 'The Thirumalai Nayakkar Palace was built in 1636 CE by King Thirumalai Nayak, who ruled the Madurai Nayak kingdom from 1623 to 1659 CE. Thirumalai Nayak is remembered as one of the most powerful and culturally active rulers of the dynasty. He decided to move the capital back from Tiruchirappalli to Madurai, and commissioned this palace as a royal residence and administrative headquarters.\n\nThe palace was originally a large complex, containing gardens, residential quarters, theaters, temples, and weapon armories. It was divided into two main parts: Swarga Vilasam (Celestial Pavilion), which served as the administrative court, and Ranga Vilasam, which served as the residential wing. The design was created by a guild of architects including Italian designers, resulting in a synthesis of Dravidian stone carving, Islamic arches, and Italian columns.\n\nFollowing the death of Thirumalai Nayak, his grandson Chokkannatha Nayak decided to move the capital back to Trichy. To build his new palace there, Chokkannatha dismantled large parts of the Madurai palace, taking the carved wood and stone columns. The remaining structures fell into disuse. During the British colonial period, the surviving portion of the palace was used as a court house. Lord Napier, the Governor of Madras, initiated a restoration project between 1869 and 1882 to preserve the central courtyard and Swarga Vilasam. Today, it is maintained by the Tamil Nadu State Archaeology Department.',
    originStory: 'Legend says that King Thirumalai Nayak wanted to build a palace that reflected the international connections of Madurai, which traded with European merchants. He hired Italian architects alongside local sthapathis to design a palace that combined the styles of both worlds.',
    constructionHistory: 'The palace was constructed using brick and lime mortar (concrete), with granite columns supporting the arches. The giant white pillars were finished with a plaster made of lime, sand, and egg whites to give them a smooth, marble-like surface. Only the Swarga Vilasam and courtyard survived the 17th-century dismantling.',
    importantRulers: ['Thirumalai Nayak', 'Chokkannatha Nayak', 'Queen Mangammal'],
    dynastyHistory: 'The Nayaks of Madurai established a rich cultural tradition, patronizing classical Tamil literature, temple restorations, and the construction of public water tanks and palaces.',
    historicalTimeline: [
      { year: '1636 CE', title: 'Palace Completed', description: 'Thirumalai Nayak completes construction of his new residence.' },
      { year: '1680 CE', title: 'Dismantling of Ranga Vilasam', description: 'Chokkannatha Nayak removes structural elements for his Trichy palace.' },
      { year: '1869 CE', title: 'British Restoration', description: 'Lord Napier initiates restoration of the surviving structures.' },
      { year: '1971 CE', title: 'Archaeological Protection', description: 'Declared a protected monument by the state government.' }
    ],
    historicalEvents: [
      { period: '1636 CE', title: 'Royal Inauguration', description: 'Thirumalai Nayak hosts a grand assembly to inaugurate the palace.' },
      { period: '1870 CE', title: 'Napier Restoration Project', description: 'British engineers reinforce the main dome and clean the columns.' }
    ],

    // Architecture
    buildingMaterials: 'Brick, Lime Mortar, Granite stone columns.',
    structuralFeatures: 'Giant circular columns, arches, central open-air courtyard.',
    architecturalStyle: 'Synthesis of Dravidian, Islamic, and European (Italian) styles',
    vimanaDetails: 'The central dome of Swarga Vilasam is a structural feature, rising 25 meters without internal column support.',
    gopuramDetails: 'Lacks temple gopurams, but features decorated gateway arches leading to the main courtyard.',
    mandapaDetails: 'The Swarga Vilasam serves as the primary audience hall, surrounded by columned corridors.',
    sculptureDetails: 'Stucco relief work on the arches depicting mythic beasts and floral designs.',
    pillarDetails: 'Features giant white circular pillars, 82 feet high and 19 feet in circumference.',
    ceilingDetails: 'The ceiling of the main hall is decorated with stucco designs and painted scrollwork.',
    inscriptionDetails: 'No extensive stone inscriptions, but historical registers document the construction cost.',
    engineeringFeatures: 'Use of lime concrete to construct domes and arches without using modern iron reinforcements.',

    // Cultural Importance
    culturalImportance: 'The Thirumalai Nayakkar Palace is a key monument of 17th-century South Indian architecture. It illustrates the synthesis of European and Indian designs, reflecting the maritime trade and cultural exchange that characterized Madurai during the Nayak period.',
    religiousImportance: 'A secular administrative building, though it contains minor shrines dedicated to Goddess Meenakshi and Lord Shiva.',
    socialImportance: 'Hosts the annual Madurai tourism festivals and classical music events.',
    artisticImportance: 'Exhibits a collection of stucco relief art, historical paintings, and stone columns.',
    culturalPractices: 'Classical music concerts and dance recitals are held in the central courtyard during festivals.',
    traditionalPractices: 'Local cultural heritage is preserved through state-sponsored historical exhibitions.',
    festivals: ['Madurai Tourism Festival (January)', 'Independence Day cultural shows'],
    rituals: ['No active religious rituals are performed inside the palace premises.'],

    // Legends and Stories
    legends: [
      'The ghost of King Thirumalai Nayak is local folklore to watch over the palace corridors at night, protecting his royal legacy.'
    ],
    mythology: 'No direct mythological links, as the palace is a secular royal residence.',
    localStories: ['Stories of the British using the main hall as a temporary prison and court house in the 19th century.'],
    interestingStories: ['The story of Chokkannatha Nayak attempting to build a palace in Trichy using Madurai\'s columns, only to find the materials did not fit the new design.'],

    // Preservation
    preservationHistory: 'Managed by the Tamil Nadu State Archaeology Department. Restoration work focuses on reinforcing the stucco work and cleaning the lime plaster columns.',
    restorationHistory: 'Recent restoration projects include repairing the stucco arches, repainting the ceilings, and installing energy-efficient lighting.',
    damageHistory: 'Large parts of the palace were dismantled in the late 17th century, leaving only about one-fourth of the original structure.',
    conservationEfforts: 'Monitored to prevent commercial development around the palace boundaries and protect the plaster work from moisture.',
    currentCondition: 'Good. The central courtyard and Swarga Vilasam are well-preserved.',

    // Heritage Status
    heritageStatus: 'National Monument of India',
    unescoStatus: 'N/A',
    unescoYear: 'N/A',
    heritageRecognition: 'Protected Site by State Archaeology Department',

    // Visitor Information
    dressCode: 'Sober casual clothing is recommended. Footwear is allowed across the palace courtyard.',
    visitorGuidelines: 'Do not touch or write on the plaster columns. Drone photography is prohibited. Keep the courtyard clean.',
    howToReach: 'Located in Madurai city, 2 km from the Meenakshi Temple. Easily accessible by local buses, autos, or taxis.',
    visitingInformation: 'Open daily. Features a light and sound show every evening.',
    openingHours: '9:00 AM - 5:00 PM',
    bestTimeToVisit: 'November to February',
    entryFee: '10 INR for adults, 5 INR for children. Camera fee is 30 INR. Light and sound show tickets are separate.',
    nearbyPlaces: ['Meenakshi Amman Temple', 'Madurai market area', 'Gandhi Memorial Museum'],

    // Educational Information
    didYouKnow: [
      'Only about one-fourth of the original palace complex survives today.',
      'The palace features giant columns that are 82 feet high.'
    ],
    importantFacts: [
      'Constructed by King Thirumalai Nayak in 1636 CE.',
      'Features a daily light and sound show in English and Tamil.'
    ],
    quizTopics: ['Nayak dynasty history', 'Indo-Saracenic palace design', 'Restoration of historical monuments']
  }
];

export const seedData = async (): Promise<void> => {
  try {
    console.log('Connecting to database...');
    // Ensure mongoose is connected
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/heritagear';
      await mongoose.connect(mongoUri);
      console.log('MongoDB connection established successfully.');
    }

    console.log('Seeding monuments...');
    for (const data of SEED_MONUMENTS) {
      const isBrihadeeswarar = data.slug === 'brihadeeswarar';
      const existing = await Monument.findOne({ slug: data.slug });

      let imageUrl = '';
      let galleryImages: string[] = [];

      if (existing) {
        imageUrl = existing.imageUrl || existing.image || '';
        galleryImages = existing.galleryImages || [];
      }

      // Check if image exists locally
      if (!imageUrl) {
        const destDir = path.join(__dirname, '../../uploads/monuments');
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        const destPath = path.join(destDir, `${data.slug}.jpeg`);
        const relativeUrl = `/uploads/monuments/${data.slug}.jpeg`;

        if (fs.existsSync(destPath)) {
          imageUrl = relativeUrl;
          if (!galleryImages.includes(relativeUrl)) {
            galleryImages.push(relativeUrl);
          }
          console.log(`- Seed image file found locally for ${data.name}. Reusing it.`);
        } else {
          try {
            console.log(`- Downloading photograph for ${data.name}...`);
            await downloadImage(data.images[0], destPath);
            imageUrl = relativeUrl;
            if (!galleryImages.includes(relativeUrl)) {
              galleryImages.push(relativeUrl);
            }
            console.log(`- Downloaded seed image successfully for ${data.name}.`);
          } catch (err: any) {
            console.warn(`[WARNING] Could not download image for ${data.name} from Wikimedia: ${err.message}. Seeding will proceed without local image.`);
          }
        }
      } else {
        console.log(`- Preserving manually uploaded/existing imageUrl for ${data.name}: ${imageUrl}`);
      }

      let updatePayload: any = {};

      const wikimediaUrls: Record<string, string> = {
        'brihadeeswarar': 'https://commons.wikimedia.org/wiki/Category:Brihadisvara_Temple,_Thanjavur',
        'meenakshi-amman': 'https://commons.wikimedia.org/wiki/Category:Meenakshi_Amman_Temple',
        'mahabalipuram': 'https://commons.wikimedia.org/wiki/Category:Shore_Temple',
        'gangaikonda-cholapuram': 'https://commons.wikimedia.org/wiki/Category:Brihadisvara_Temple,_Gangaikonda_Cholapuram',
        'airavatesvara': 'https://commons.wikimedia.org/wiki/Category:Airavatesvara_Temple',
        'thirumalai-nayakkar': 'https://commons.wikimedia.org/wiki/Category:Thirumalai_Nayak_Palace'
      };
      
      const collectionUrl = wikimediaUrls[data.slug];
      const referenceSources = collectionUrl ? [{ provider: 'Wikimedia Commons', collectionUrl }] : [];

      if (existing) {
        // NON-DESTRUCTIVE: loop and set only missing/empty fields
        for (const key of Object.keys(data)) {
          const val = (data as any)[key];
          const currentVal = existing.get(key);

          // We check if field is missing, null, undefined, empty string, or empty array
          const isEmpty = currentVal === undefined || 
                          currentVal === null || 
                          (typeof currentVal === 'string' && currentVal.trim() === '') ||
                          (Array.isArray(currentVal) && currentVal.length === 0);

          if (isEmpty) {
            updatePayload[key] = val;
          }
        }

        // Never overwrite image or model assets if they are already populated
        if (!existing.imageUrl && !existing.image && imageUrl) {
          updatePayload.imageUrl = imageUrl;
          updatePayload.image = imageUrl;
        }
        if (existing.galleryImages.length === 0 && galleryImages.length > 0) {
          updatePayload.galleryImages = galleryImages;
        }

        if (!existing.referenceSources || existing.referenceSources.length === 0) {
          updatePayload.referenceSources = referenceSources;
        }

        // Never overwrite or delete admin-created historySections
        if (existing.historySections && existing.historySections.length > 0) {
          delete updatePayload.historySections;
        }

        // Only update if there are changes to avoid resetting updatedAt
        if (Object.keys(updatePayload).length > 0) {
          await Monument.findOneAndUpdate({ slug: data.slug }, { $set: updatePayload }, { new: true });
          console.log(`- Updated missing fields for existing monument: ${data.name}`);
        } else {
          console.log(`- No changes needed for existing monument: ${data.name}`);
        }
      } else {
        // Full insertion for new monument
        updatePayload = {
          ...data,
          imageUrl: imageUrl || '',
          image: imageUrl || '',
          galleryImages: galleryImages,
          arEnabled: isBrihadeeswarar,
          recognitionImageUrl: isBrihadeeswarar 
            ? 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Thanjavur_Brihadeeswarar_temple.JPG'
            : '',
          referenceSources: referenceSources,
          referenceImages: []
        };

        await Monument.findOneAndUpdate({ slug: data.slug }, { $set: updatePayload }, { upsert: true, new: true });
        console.log(`- Seeded new monument: ${data.name} (AR Enabled: ${isBrihadeeswarar})`);
      }
    }

    console.log('Seeding guest and admin users...');
    
    // Seed Guest User
    const guestId = new mongoose.Types.ObjectId('6a7a70eb677209d21b1bb799');
    let guestUser = await User.findById(guestId);
    if (!guestUser) {
      guestUser = new User({
        _id: guestId,
        name: 'Guest Explorer',
        email: 'guest@heritagear.com',
        avatar: 'GE',
        favoriteMonuments: [],
        role: 'user',
        isEmailVerified: true
      });
      await guestUser.save();
      console.log('- Created Guest Explorer user.');
    } else {
      console.log('- Guest user verified.');
    }

    // Seed Admin User
    const adminId = new mongoose.Types.ObjectId('6a7a70eb677209d21b1bb99a');
    let adminUser = await User.findById(adminId);
    if (!adminUser) {
      adminUser = new User({
        _id: adminId,
        name: 'Admin Conservator',
        email: 'admin@heritagear.com',
        avatar: 'AC',
        favoriteMonuments: [],
        role: 'admin',
        isEmailVerified: true
      });
      await adminUser.save();
      console.log('- Created Admin Conservator user.');
    } else {
      console.log('- Admin user verified.');
    }

    console.log(`
==================================================
GUEST USER ID: 6a7a70eb677209d21b1bb799
ADMIN USER ID: 6a7a70eb677209d21b1bb99a
==================================================
`);
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error during database seeding:', error);
  }
};

// Check if run directly
if (require.main === module) {
  seedData().then(() => {
    mongoose.disconnect().then(() => {
      console.log('MongoDB connection disconnected.');
      process.exit(0);
    });
  });
}
