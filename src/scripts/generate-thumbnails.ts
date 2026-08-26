import { createCanvas, loadImage } from 'canvas';
import { writeFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

interface WorkoutDay {
  day: number;
  title: string;
  exercises: string[];
  imageIndex: number;
}

function generateWorkoutPlan(totalDays: number): WorkoutDay[] {
  const workoutTypes = [
    { title: 'Chest & Triceps', exercises: ['Bench Press', 'Incline Dumbbell Press', 'Tricep Dips', 'Cable Flyes'] },
    { title: 'Back & Biceps', exercises: ['Pull-ups', 'Barbell Rows', 'Lat Pulldown', 'Bicep Curls'] },
    { title: 'Legs & Glutes', exercises: ['Squats', 'Leg Press', 'Romanian Deadlifts', 'Lunges'] },
    { title: 'Shoulders & Abs', exercises: ['Overhead Press', 'Lateral Raises', 'Face Pulls', 'Planks'] },
    { title: 'Full Body', exercises: ['Deadlifts', 'Clean & Press', 'Burpees', 'Mountain Climbers'] },
    { title: 'Arms & Core', exercises: ['Hammer Curls', 'Skull Crushers', 'Russian Twists', 'Hanging Leg Raises'] },
    { title: 'Cardio & HIIT', exercises: ['Treadmill Sprints', 'Battle Ropes', 'Box Jumps', 'Kettlebell Swings'] },
  ];

  const plan: WorkoutDay[] = [];
  
  for (let day = 1; day <= totalDays; day++) {
    const workoutType = workoutTypes[(day - 1) % workoutTypes.length];
    plan.push({
      day,
      title: workoutType.title,
      exercises: workoutType.exercises,
      imageIndex: (day - 1) % 120,
    });
  }

  return plan;
}

async function createThumbnail(
  inputPath: string,
  outputPath: string,
  dayNumber: number,
  workoutTitle: string
): Promise<void> {
  const image = await loadImage(inputPath);
  
  const canvas = createCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Calculate crop dimensions to fill thumbnail
  const imageAspect = image.width / image.height;
  const thumbAspect = THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT;
  
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (imageAspect > thumbAspect) {
    sourceWidth = image.height * thumbAspect;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / thumbAspect;
    sourceY = (image.height - sourceHeight) / 2;
  }

  // Draw cropped image
  ctx.drawImage(
    image,
    sourceX, sourceY, sourceWidth, sourceHeight,
    0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT
  );

  // Add gradient overlay at bottom
  const gradient = ctx.createLinearGradient(0, THUMBNAIL_HEIGHT - 80, 0, THUMBNAIL_HEIGHT);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, THUMBNAIL_HEIGHT - 80, THUMBNAIL_WIDTH, 80);

  // Add day number badge
  ctx.fillStyle = '#FF4444';
  ctx.beginPath();
  ctx.roundRect(10, 10, 80, 35, 5);
  ctx.fill();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Day ${dayNumber}`, 50, 33);

  // Add workout title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(workoutTitle, 15, THUMBNAIL_HEIGHT - 20);

  // Save thumbnail
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
  await writeFile(outputPath, buffer);
}

async function generateThumbnails(
  planDays: number,
  outputDir: string,
  allImagePaths: string[]
): Promise<void> {
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const plan = generateWorkoutPlan(planDays);
  
  console.log(`\nGenerating ${planDays} thumbnails for ${outputDir}...`);

  for (const workout of plan) {
    const inputPath = allImagePaths[workout.imageIndex % allImagePaths.length];
    const outputPath = path.join(outputDir, `day-${workout.day.toString().padStart(2, '0')}.jpg`);
    
    try {
      await createThumbnail(inputPath, outputPath, workout.day, workout.title);
      console.log(`  Created: day-${workout.day.toString().padStart(2, '0')}.jpg - ${workout.title}`);
    } catch (error) {
      console.error(`  Failed to create day ${workout.day}: ${error}`);
    }
  }
}

async function main() {
  const gymDir = path.join(process.cwd(), 'public', 'images', 'gym');
  const menDir = path.join(gymDir, 'men');
  const womenDir = path.join(gymDir, 'women');
  const thumbnailsDir = path.join(process.cwd(), 'public', 'images', 'thumbnails');

  // Get all image paths
  const menFiles = (await readdir(menDir))
    .filter(f => f.endsWith('.jpg'))
    .map(f => path.join(menDir, f));
  
  const womenFiles = (await readdir(womenDir))
    .filter(f => f.endsWith('.jpg'))
    .map(f => path.join(womenDir, f));

  const allImagePaths = [...menFiles, ...womenFiles];
  
  console.log(`Found ${allImagePaths.length} gym images`);

  // Generate thumbnails for each plan duration
  const plan30Dir = path.join(thumbnailsDir, '30-day');
  const plan60Dir = path.join(thumbnailsDir, '60-day');
  const plan90Dir = path.join(thumbnailsDir, '90-day');

  await generateThumbnails(30, plan30Dir, allImagePaths);
  await generateThumbnails(60, plan60Dir, allImagePaths);
  await generateThumbnails(90, plan90Dir, allImagePaths);

  console.log('\n=== Thumbnail Generation Complete ===');
  console.log(`30-day plan: ${plan30Dir}`);
  console.log(`60-day plan: ${plan60Dir}`);
  console.log(`90-day plan: ${plan90Dir}`);
}

main().catch(console.error);
