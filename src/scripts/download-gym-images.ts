import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const PEXELS_API_KEY = 'hmX4zfX3GzDOBmUJusTsSjMCQmJEX44D9pBR6J5D2xodmJc6hBlshnpO';
const BASE_URL = 'https://api.pexels.com/v1/search';

interface PexelsPhoto {
  id: number;
  src: {
    large: string;
    medium: string;
    small: string;
  };
  alt: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
}

const menSearchQueries = [
  'man gym dumbbells workout',
  'man weightlifting barbell',
  'man kettlebell exercise',
  'man cable machine gym',
  'man pull up bar workout',
  'man resistance band training',
  'man medicine ball exercise',
  'man battle ropes gym',
  'man rowing machine workout',
  'man leg press gym',
  'man chest press machine',
  'man shoulder press dumbbells',
  'man bicep curls gym',
  'man tricep pushdown',
  'man lat pulldown gym',
];

const womenSearchQueries = [
  'woman gym dumbbells workout',
  'woman weightlifting barbell',
  'woman kettlebell exercise',
  'woman cable machine gym',
  'woman pull up bar workout',
  'woman resistance band training',
  'woman medicine ball exercise',
  'woman battle ropes gym',
  'woman rowing machine workout',
  'woman leg press gym',
  'woman chest press machine',
  'woman shoulder press dumbbells',
  'woman bicep curls gym',
  'woman tricep pushdown',
  'woman lat pulldown gym',
];

async function searchPexels(query: string, page: number = 1, perPage: number = 15): Promise<PexelsResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    per_page: perPage.toString(),
    orientation: 'portrait',
    size: 'medium',
  });

  const response = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      'Authorization': PEXELS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await writeFile(filepath, Buffer.from(buffer));
}

async function downloadGymImages(
  queries: string[],
  targetDir: string,
  targetCount: number
): Promise<string[]> {
  const downloadedIds = new Set<number>();
  const downloadedFiles: string[] = [];
  let queryIndex = 0;

  console.log(`\nDownloading ${targetCount} images to ${targetDir}...`);

  while (downloadedFiles.length < targetCount && queryIndex < queries.length) {
    const query = queries[queryIndex];
    console.log(`\nSearching: "${query}" (${downloadedFiles.length}/${targetCount} downloaded)`);

    try {
      const page = Math.floor(downloadedFiles.length / 15) + 1;
      const result = await searchPexels(query, page, 15);

      for (const photo of result.photos) {
        if (downloadedFiles.length >= targetCount) break;
        if (downloadedIds.has(photo.id)) continue;

        downloadedIds.add(photo.id);
        const filename = `gym-${photo.id}.jpg`;
        const filepath = path.join(targetDir, filename);

        try {
          await downloadImage(photo.src.large, filepath);
          downloadedFiles.push(filename);
          console.log(`  Downloaded: ${filename} (${downloadedFiles.length}/${targetCount})`);
        } catch (error) {
          console.error(`  Failed to download ${photo.id}: ${error}`);
        }
      }
    } catch (error) {
      console.error(`Failed to search "${query}": ${error}`);
    }

    queryIndex++;

    // Add a small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return downloadedFiles;
}

async function main() {
  const baseDir = path.join(process.cwd(), 'public', 'images', 'gym');
  const menDir = path.join(baseDir, 'men');
  const womenDir = path.join(baseDir, 'women');

  // Ensure directories exist
  if (!existsSync(menDir)) {
    await mkdir(menDir, { recursive: true });
  }
  if (!existsSync(womenDir)) {
    await mkdir(womenDir, { recursive: true });
  }

  console.log('Starting gym image download...');
  console.log(`Men's directory: ${menDir}`);
  console.log(`Women's directory: ${womenDir}`);

  // Download 60 images for men and 60 for women
  const menFiles = await downloadGymImages(menSearchQueries, menDir, 60);
  const womenFiles = await downloadGymImages(womenSearchQueries, womenDir, 60);

  console.log('\n=== Download Complete ===');
  console.log(`Men's images: ${menFiles.length}`);
  console.log(`Women's images: ${womenFiles.length}`);
  console.log(`Total: ${menFiles.length + womenFiles.length}`);

  // Create an index file for easy access
  const index = {
    men: menFiles,
    women: womenFiles,
    totalMen: menFiles.length,
    totalWomen: womenFiles.length,
    total: menFiles.length + womenFiles.length,
  };

  await writeFile(
    path.join(baseDir, 'index.json'),
    JSON.stringify(index, null, 2)
  );
  console.log('\nIndex file created at public/images/gym/index.json');
}

main().catch(console.error);
