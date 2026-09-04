import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatJsonWithSingleLineTags } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.join(__dirname, '../videos');
const DATA_FILE = path.join(__dirname, '../data/videos.json');
const SUPPORTED_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv']);
const DEFAULT_CHANNEL_DESCRIPTION = `Welcome to BodySci Edu — created and presented by Shahbaz Alam.

Discover what happens inside the human body through AI-assisted 3D visualization and educational visual storytelling.

Our videos explore human anatomy, organs, digestion, physiology, pregnancy, reproductive health, conception, and fascinating biological processes in a simple and easy-to-understand way.

All content is independently conceptualized, designed, and curated by Shahbaz Alam. AI tools are used as visual aids for educational demonstrations, not as automated content production.

⚠️ EDUCATIONAL DISCLAIMER:
This content is for general educational and learning purposes only. It is not medical advice and should not be used for diagnosis or treatment. For personal medical concerns, consult a qualified healthcare professional.

Subscribe to BodySci Edu to explore and understand the human body.

BodySci Edu — Explore. Understand. Learn the Human Body.

#Anatomy #HealthFacts #HumanBody #MedicalEducation #alteredcontent`;

const DEFAULT_CHANNEL_TAGS = [
  "human body",
  "anatomy",
  "human anatomy",
  "anatomy fact",
  "health facts",
  "medical facts",
  "health education",
  "medical education",
  "science facts",
  "biology",
  "food fact",
  "nutrition",
  "food digestion",
  "digestion",
  "digestive system",
  "healthy food",
  "pregnancy",
  "pregnancy facts",
  "pregnancy health",
  "pregnancy safety",
  "pregnancy education",
  "pregnancy foods",
  "foods during pregnancy",
  "pregnancy positions",
  "ai"
];

/**
 * Ensures a directory exists synchronously
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Reads videos.json safely, returning { videos: [] } on failure or missing file
 */
function readDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { videos: [] };
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.videos)) {
      return parsed;
    } else if (Array.isArray(parsed)) {
      // Legacy migration support if needed
      return { videos: parsed };
    }
    return { videos: [] };
  } catch (error) {
    console.warn(`Warning: Could not read ${DATA_FILE} (${error.message}). Re-initializing data structure.`);
    return { videos: [] };
  }
}



/**
 * Writes updated video dataset to videos.json safely
 */
function writeDataFile(data) {
  try {
    ensureDirectoryExists(path.dirname(DATA_FILE));
    const jsonContent = formatJsonWithSingleLineTags(data);

    // Write JSON file
    fs.writeFileSync(DATA_FILE, jsonContent, 'utf-8');
    
    // Write JS bundle file for seamless direct file:// opening in browser without CORS errors
    const jsFile = path.join(path.dirname(DATA_FILE), 'videos.js');
    const jsContent = `window.VIDEOS_DATA = ${jsonContent};\n`;
    fs.writeFileSync(jsFile, jsContent, 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${DATA_FILE}:`, error.message);
    throw error;
  }
}

/**
 * Main scanner execution function
 */
function scanVideos() {
  try {
    // 1. Ensure videos directory exists
    ensureDirectoryExists(VIDEOS_DIR);

    // 2. Read directory and filter by supported extensions
    const dirEntries = fs.readdirSync(VIDEOS_DIR);
    const videoFiles = dirEntries.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_EXTENSIONS.has(ext);
    });

    // Sort filenames for consistent order
    videoFiles.sort();

    // 3. Read current videos.json data
    const dataObj = readDataFile();
    const existingVideos = dataObj.videos || [];

    // Map existing videos by fileName for O(1) lookup
    const existingMap = new Map();
    existingVideos.forEach(v => {
      if (v.fileName) {
        existingMap.set(v.fileName, v);
      }
    });

    let newCount = 0;
    let existingCount = 0;
    const updatedVideos = [];

    // 4. Process each detected video file
    for (const fileName of videoFiles) {
      if (existingMap.has(fileName)) {
        // Preserve existing video metadata
        updatedVideos.push(existingMap.get(fileName));
        existingCount++;
      } else {
        // Generate new video entry with default schema
        const fileBase = path.basename(fileName, path.extname(fileName));
        const newVideo = {
          id: fileBase,
          fileName: fileName,
          title: "",
          description: DEFAULT_CHANNEL_DESCRIPTION,
          tags: [...DEFAULT_CHANNEL_TAGS],
          status: "pending",
          scheduledAt: null,
          youtubeVideoId: null,
          youtubeUrl: null,
          publishedAt: null,
          error: null
        };
        updatedVideos.push(newVideo);
        newCount++;
      }
    }

    // Save back to videos.json
    dataObj.videos = updatedVideos;
    writeDataFile(dataObj);

    // 5. Output required terminal summary format
    const totalCount = videoFiles.length;

    console.log(`Found ${totalCount} video files.`);
    console.log('');
    console.log('New:');
    console.log(`${newCount}`);
    console.log('');
    console.log('Existing:');
    console.log(`${existingCount}`);
    console.log('');
    console.log('Total:');
    console.log(`${totalCount}`);

  } catch (error) {
    console.error('An error occurred during video scanning:', error.message);
    process.exit(1);
  }
}

// Execute scanner
scanVideos();
