import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Monument from '../models/monument';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('[HERIXA-SEED] MONGODB_URI missing from environment!');
  process.exit(1);
}

const MONUMENT_UPDATES = [
  {
    slug: 'brihadeeswarar',
    name: 'Brihadeeswarar Temple',
    images: ['/uploads/monuments/brihadeeswarar.jpeg'],
    imageUrl: '/uploads/monuments/brihadeeswarar.jpeg',
    image: '/uploads/monuments/brihadeeswarar.jpeg',
    heritagePreviewImages: [
      {
        id: 'brih-vis-1',
        uri: '/uploads/monuments/brihadeeswarar.jpeg',
        viewType: 'vimana',
        title: 'Vimana Great Tower',
        description: 'The 216-foot tall granite Vimana tower crowned with an 80-tonne monolithic capstone.',
        category: 'Vimana',
        order: 1,
        enabled: true,
        visible: true
      },
      {
        id: 'brih-vis-2',
        uri: '/uploads/monuments/brihadeeswarar.jpeg',
        viewType: 'mandapa',
        title: 'Monolithic Nandi Pavilion',
        description: 'The historic 20-tonne monolithic Nandi bull carved from a single massive granite block.',
        category: 'Mandapam',
        order: 2,
        enabled: true,
        visible: true
      },
      {
        id: 'brih-vis-3',
        uri: '/uploads/monuments/brihadeeswarar.jpeg',
        viewType: 'sculpture',
        title: 'Chola Relief Frescoes',
        description: 'Original 11th-century Tamil Chola murals depicting divine dance poses and Saivite legends.',
        category: 'Inscriptions',
        order: 3,
        enabled: true,
        visible: true
      }
    ]
  },
  {
    slug: 'meenakshi-amman',
    name: 'Meenakshi Amman Temple',
    images: ['/uploads/monuments/meenakshi-amman.jpeg'],
    imageUrl: '/uploads/monuments/meenakshi-amman.jpeg',
    image: '/uploads/monuments/meenakshi-amman.jpeg',
    heritagePreviewImages: [
      {
        id: 'mee-vis-1',
        uri: '/uploads/monuments/meenakshi-amman.jpeg',
        viewType: 'gopuram',
        title: 'Southern Gateway Gopuram',
        description: 'The tallest gopuram tower at 51.9 meters adorned with over 33,000 colorful stucco figures.',
        category: 'Gopuram',
        order: 1,
        enabled: true,
        visible: true
      },
      {
        id: 'mee-vis-2',
        uri: '/uploads/monuments/meenakshi-amman.jpeg',
        viewType: 'mandapa',
        title: 'Hall of 1000 Pillars',
        description: 'Carved granite pillars depicting mythic Yalis, dancers, and musical stone columns.',
        category: 'Mandapam',
        order: 2,
        enabled: true,
        visible: true
      },
      {
        id: 'mee-vis-3',
        uri: '/uploads/monuments/meenakshi-amman.jpeg',
        viewType: 'courtyard',
        title: 'Golden Lotus Sacred Tank',
        description: 'The ancient Porthamarai Kulam sacred water reservoir in the temple center.',
        category: 'Courtyard',
        order: 3,
        enabled: true,
        visible: true
      }
    ]
  },
  {
    slug: 'mahabalipuram',
    name: 'Mahabalipuram Shore Temple',
    images: ['/uploads/monuments/mahabalipuram.jpeg'],
    imageUrl: '/uploads/monuments/mahabalipuram.jpeg',
    image: '/uploads/monuments/mahabalipuram.jpeg',
    heritagePreviewImages: [
      {
        id: 'maha-vis-1',
        uri: '/uploads/monuments/mahabalipuram.jpeg',
        viewType: 'exterior',
        title: 'Coastal Structural Shrines',
        description: '8th-century Pallava granite structural temple facing the Bay of Bengal.',
        category: 'Exterior',
        order: 1,
        enabled: true,
        visible: true
      },
      {
        id: 'maha-vis-2',
        uri: '/uploads/monuments/mahabalipuram.jpeg',
        viewType: 'sculpture',
        title: 'Monolithic Nandi Enclosure',
        description: 'Lines of carved granite Nandi bulls enclosing the coastal temple compound.',
        category: 'Sculptures',
        order: 2,
        enabled: true,
        visible: true
      }
    ]
  },
  {
    slug: 'gangaikonda-cholapuram',
    name: 'Gangaikonda Cholapuram',
    images: ['/uploads/monuments/gangaikonda-cholapuram.jpeg'],
    imageUrl: '/uploads/monuments/gangaikonda-cholapuram.jpeg',
    image: '/uploads/monuments/gangaikonda-cholapuram.jpeg',
    heritagePreviewImages: [
      {
        id: 'ganga-vis-1',
        uri: '/uploads/monuments/gangaikonda-cholapuram.jpeg',
        viewType: 'vimana',
        title: 'Curvilinear Chola Vimana',
        description: '180-foot vimana tower celebrating Rajendra Chola I victory at the Ganges River.',
        category: 'Vimana',
        order: 1,
        enabled: true,
        visible: true
      },
      {
        id: 'ganga-vis-2',
        uri: '/uploads/monuments/gangaikonda-cholapuram.jpeg',
        viewType: 'sculpture',
        title: 'Chandesha Anugraha Relief',
        description: 'Exquisite stone relief carving depicting Lord Shiva crowning Emperor Rajendra Chola I.',
        category: 'Sculptures',
        order: 2,
        enabled: true,
        visible: true
      }
    ]
  },
  {
    slug: 'airavatesvara',
    name: 'Airavatesvara Temple',
    images: ['/uploads/monuments/airavatesvara.jpeg'],
    imageUrl: '/uploads/monuments/airavatesvara.jpeg',
    image: '/uploads/monuments/airavatesvara.jpeg',
    heritagePreviewImages: [
      {
        id: 'aira-vis-1',
        uri: '/uploads/monuments/airavatesvara.jpeg',
        viewType: 'mandapa',
        title: 'Chariot Mandapam',
        description: 'Stone assembly hall intricately carved in the shape of a royal horse-drawn chariot.',
        category: 'Mandapam',
        order: 1,
        enabled: true,
        visible: true
      },
      {
        id: 'aira-vis-2',
        uri: '/uploads/monuments/airavatesvara.jpeg',
        viewType: 'sculpture',
        title: 'Musical Basalt Steps',
        description: 'Ancient stone steps designed to produce distinct musical notes when walked upon.',
        category: 'Architecture',
        order: 2,
        enabled: true,
        visible: true
      }
    ]
  },
  {
    slug: 'thirumalai-nayakkar',
    name: 'Thirumalai Nayakkar Palace',
    images: ['/uploads/monuments/thirumalai-nayakkar.jpeg'],
    imageUrl: '/uploads/monuments/thirumalai-nayakkar.jpeg',
    image: '/uploads/monuments/thirumalai-nayakkar.jpeg',
    heritagePreviewImages: [
      {
        id: 'thiru-vis-1',
        uri: '/uploads/monuments/thirumalai-nayakkar.jpeg',
        viewType: 'interior',
        title: 'Swarga Vilasam Pavilion',
        description: 'Celestial Pavilion built with 82-foot giant white pillars coated in shell-lime plaster.',
        category: 'Interior',
        order: 1,
        enabled: true,
        visible: true
      },
      {
        id: 'thiru-vis-2',
        uri: '/uploads/monuments/thirumalai-nayakkar.jpeg',
        viewType: 'courtyard',
        title: 'Indo-Saracenic Courtyard',
        description: 'Grand royal palace courtyard blending Italian, Islamic, and Dravidian architectural features.',
        category: 'Courtyard',
        order: 2,
        enabled: true,
        visible: true
      }
    ]
  }
];

async function seedProductionImagesAndVisuals() {
  console.log('[HERIXA-SEED] Connecting to production MongoDB Atlas...');
  await mongoose.connect(mongoUri as string);
  console.log('[HERIXA-SEED] Connected to MongoDB Atlas successfully!');

  for (const item of MONUMENT_UPDATES) {
    const res = await Monument.updateOne(
      { slug: item.slug },
      {
        $set: {
          images: item.images,
          imageUrl: item.imageUrl,
          image: item.image,
          heritagePreviewImages: item.heritagePreviewImages,
        }
      }
    );
    console.log(`[HERIXA-SEED] Updated ${item.name} (${item.slug}) -> matched: ${res.matchedCount}, modified: ${res.modifiedCount}`);
  }

  const count = await Monument.countDocuments({});
  console.log(`[HERIXA-SEED] Complete. Total monuments in DB: ${count}`);

  await mongoose.disconnect();
  console.log('[HERIXA-SEED] Disconnected from MongoDB.');
}

seedProductionImagesAndVisuals().catch(err => {
  console.error('[HERIXA-SEED] Seeding error:', err);
  process.exit(1);
});
