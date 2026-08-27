import https from 'https';
import fs from 'fs';
import path from 'path';
import Monument, { IReferenceImage } from '../models/monument';

// central user agent for Wikimedia query etiquette
const USER_AGENT = 'HERIXA-HeritageBot/1.0 (contact: admin@herixa.org)';

const downloadFile = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: { 'User-Agent': USER_AGENT }
    }, (response) => {
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

const fetchJson = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': USER_AGENT }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

// helper to classify viewType based on title/description keywords
const determineViewType = (title: string, desc: string): string => {
  const t = (title + ' ' + desc).toLowerCase();
  if (t.includes('nandi') || t.includes('bull')) return 'nandi';
  if (t.includes('gopuram')) return 'gopuram';
  if (t.includes('vimana') || t.includes('shikhara')) return 'vimana';
  if (t.includes('mandapam') || t.includes('mandap') || t.includes('hall')) return 'mandapam';
  if (t.includes('courtyard') || t.includes('court')) return 'courtyard';
  if (t.includes('pillar') || t.includes('column')) return 'pillar';
  if (t.includes('sculpture') || t.includes('statue') || t.includes('relief')) return 'sculpture';
  if (t.includes('inscription') || t.includes('carving') || t.includes('fresco')) return 'inscription';
  if (t.includes('entrance') || t.includes('gate') || t.includes('doorway')) return 'entrance';
  if (t.includes('side') || t.includes('profile')) return 'side';
  if (t.includes('rear') || t.includes('back')) return 'rear';
  if (t.includes('front')) return 'front';
  if (t.includes('wide') || t.includes('panoramic') || t.includes('aerial')) return 'wide';
  if (t.includes('detail') || t.includes('close') || t.includes('architectural-detail')) return 'architectural-detail';
  if (t.includes('surroundings') || t.includes('surrounding') || t.includes('outside')) return 'surroundings';
  return 'exterior';
};

const cleanHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

export const syncWikimediaReferences = async (monumentId: string): Promise<{ success: boolean; syncedCount: number; message: string }> => {
  const monument = await Monument.findById(monumentId);
  if (!monument) {
    throw new Error('Monument not found');
  }

  const wikimediaSource = (monument.referenceSources || []).find(src => src.provider === 'Wikimedia Commons');
  if (!wikimediaSource || !wikimediaSource.collectionUrl) {
    return {
      success: false,
      syncedCount: 0,
      message: 'No Wikimedia category source configured for this monument'
    };
  }

  const collectionUrl = wikimediaSource.collectionUrl;
  console.log(`[WIKIMEDIA SYNC] Starting sync for ${monument.name} using URL: ${collectionUrl}`);

  // 1. Parse Category Title
  const categoryPrefix = 'wiki/Category:';
  const idx = collectionUrl.indexOf(categoryPrefix);
  let categoryTitle = '';
  if (idx !== -1) {
    categoryTitle = 'Category:' + decodeURIComponent(collectionUrl.substring(idx + categoryPrefix.length));
  } else {
    try {
      const urlObj = new URL(collectionUrl);
      const pathname = urlObj.pathname;
      const match = pathname.match(/\/Category:([^\/]+)/);
      if (match) {
        categoryTitle = 'Category:' + decodeURIComponent(match[1]);
      }
    } catch (_) {}
  }

  categoryTitle = categoryTitle.replace(/_/g, ' ').trim();
  if (!categoryTitle) {
    return {
      success: false,
      syncedCount: 0,
      message: 'Failed to extract Category title from configured collection URL'
    };
  }

  let pages: any[] = [];

  // Helper to fetch details for page objects
  const retrieveImageDetails = async (titlesList: string[]): Promise<any[]> => {
    const detailsUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titlesList.join('|'))}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1024&format=json`;
    const detailsRes = await fetchJson(detailsUrl);
    if (detailsRes.query && detailsRes.query.pages) {
      return Object.values(detailsRes.query.pages);
    }
    return [];
  };

  // 2. Fetch category members (gcmtype=file)
  const catMembersUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(categoryTitle)}&gcmtype=file&gcmlimit=50&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1024&format=json`;
  try {
    const response = await fetchJson(catMembersUrl);
    if (response.query && response.query.pages) {
      pages = Object.values(response.query.pages);
      console.log(`[WIKIMEDIA SYNC] Discovered ${pages.length} members in category: ${categoryTitle}`);
    }
  } catch (err) {
    console.warn(`[WIKIMEDIA SYNC] Failed to query category members for '${categoryTitle}':`, err);
  }

  // 3. Fallback Category Title (remove common trailing descriptive segments like ", Thanjavur")
  if (pages.length === 0 && categoryTitle.includes(',')) {
    const fallbackCategory = categoryTitle.split(',')[0].trim();
    console.log(`[WIKIMEDIA SYNC] Category empty. Attempting fallback category: ${fallbackCategory}`);
    const fallbackUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(fallbackCategory)}&gcmtype=file&gcmlimit=50&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1024&format=json`;
    try {
      const response = await fetchJson(fallbackUrl);
      if (response.query && response.query.pages) {
        pages = Object.values(response.query.pages);
        console.log(`[WIKIMEDIA SYNC] Discovered ${pages.length} members in fallback category: ${fallbackCategory}`);
      }
    } catch (err) {
      console.warn(`[WIKIMEDIA SYNC] Failed to query fallback category members:`, err);
    }
  }

  // 4. Fallback Keyword Search (srnamespace=6 queries File namespace)
  if (pages.length === 0) {
    const searchKeywords = monument.name.replace(/Temple|Palace|Complex/gi, '').trim() + ' ' + monument.location;
    console.log(`[WIKIMEDIA SYNC] Category still empty. Attempting keyword search fallback: "${searchKeywords}"`);
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchKeywords)}&srnamespace=6&srlimit=40&format=json`;
    try {
      const searchRes = await fetchJson(searchUrl);
      if (searchRes.query && searchRes.query.search && searchRes.query.search.length > 0) {
        const fileTitles = searchRes.query.search.map((s: any) => s.title);
        for (let i = 0; i < fileTitles.length; i += 20) {
          const chunk = fileTitles.slice(i, i + 20);
          const chunkDetails = await retrieveImageDetails(chunk);
          pages.push(...chunkDetails);
        }
        console.log(`[WIKIMEDIA SYNC] Discovered ${pages.length} images via keyword search.`);
      }
    } catch (err) {
      console.error(`[WIKIMEDIA SYNC] Keyword search fallback failed:`, err);
    }
  }

  if (pages.length === 0) {
    return {
      success: true,
      syncedCount: 0,
      message: 'No images discovered on Wikimedia Commons'
    };
  }

  // 5. Filter and select suitable images
  const filteredPages = pages.filter((page: any) => {
    if (!page.imageinfo || page.imageinfo.length === 0) return false;
    const info = page.imageinfo[0];
    
    const width = info.width || 0;
    const height = info.height || 0;
    if (width < 800 && height < 800) return false;

    const size = info.size || 0;
    if (size < 51200) return false;

    return true;
  });

  console.log(`[WIKIMEDIA SYNC] ${filteredPages.length} of ${pages.length} images passed quality filter.`);

  const syncLimit = 20;
  const selectedPages = filteredPages.slice(0, syncLimit);

  // 6. Download and store locally
  const destDir = path.resolve(__dirname, '../..', `uploads/monuments/recognition/${monument.slug}`);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const syncedImages: IReferenceImage[] = [];
  let downloadedCount = 0;

  for (let i = 0; i < selectedPages.length; i++) {
    const page = selectedPages[i];
    const info = page.imageinfo[0];
    const sourceUrl = info.thumburl || info.url;
    
    if (!sourceUrl) continue;

    let ext = path.extname(new URL(sourceUrl).pathname) || '.jpg';
    if (!ext || ext.length > 5) ext = '.jpg';
    
    const filename = `ref_${downloadedCount + 1}${ext}`;
    const destPath = path.join(destDir, filename);
    const localPath = `/uploads/monuments/recognition/${monument.slug}/${filename}`;

    try {
      console.log(`[WIKIMEDIA SYNC] Downloading image ${i + 1}/${selectedPages.length}: ${sourceUrl}`);
      await downloadFile(sourceUrl, destPath);

      const metadata = info.extmetadata || {};
      const artistVal = cleanHtml(metadata.Artist?.value || '');
      const licenseVal = cleanHtml(metadata.LicenseShortName?.value || 'CC-BY-SA');
      const licenseUrlVal = cleanHtml(metadata.LicenseUrl?.value || '');
      
      const viewType = determineViewType(page.title, metadata.ImageDescription?.value || '');

      const referenceImg: IReferenceImage = {
        filename,
        localPath,
        viewType,
        source: 'Wikimedia Commons',
        sourceUrl: info.descriptionurl || sourceUrl,
        author: artistVal || 'Wikimedia Contributor',
        license: licenseVal,
        licenseUrl: licenseUrlVal
      };

      syncedImages.push(referenceImg);
      downloadedCount++;
    } catch (dlErr: any) {
      console.error(`[WIKIMEDIA SYNC] Failed to download/process ${sourceUrl}:`, dlErr.message || dlErr);
    }
  }

  if (syncedImages.length > 0) {
    monument.referenceImages = syncedImages;
    await monument.save();
    console.log(`[WIKIMEDIA SYNC] Successfully updated database references for ${monument.name} with ${syncedImages.length} images.`);
  }

  return {
    success: true,
    syncedCount: downloadedCount,
    message: `Successfully synchronized ${downloadedCount} reference images from Wikimedia Commons.`
  };
};
