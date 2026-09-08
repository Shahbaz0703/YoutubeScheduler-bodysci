import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/videos.json');

/**
 * Reads the video queue from data/videos.json
 * @returns {Array} Array of video objects
 */
export function loadVideos() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.videos)) {
      return parsed.videos;
    } else if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error reading videos.json:', error.message);
    return [];
  }
}

/**
 * Formats JSON object with tags array compact on a single line
 */
export function formatJsonWithSingleLineTags(dataObj) {
  let jsonStr = JSON.stringify(dataObj, null, 2);
  jsonStr = jsonStr.replace(/"tags":\s*\[\s*([\s\S]*?)\s*\]/g, (match, p1) => {
    const items = p1.split('\n').map(s => s.trim()).filter(Boolean).join(' ');
    return `"tags": [ ${items} ]`;
  });
  return jsonStr;
}

/**
 * Calculates YouTube tag character count exactly matching YouTube Studio / API:
 * - Multi-word tags (containing spaces) are counted with surrounding quotation marks ("tag" = tag.length + 2)
 * - Single-word tags are counted by their character length
 * - Tags are separated by commas (adds 1 char per separator)
 * @param {Array<string>} tags
 * @returns {number} Exact YouTube character count
 */
export function calculateYouTubeTagsLength(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    total += tag.includes(' ') ? tag.length + 2 : tag.length;
  }
  total += (tags.length - 1);
  return total;
}

/**
 * Sanitizes and truncates video tags array to comply with YouTube Data API constraints:
 * - Each tag is a clean string without angle brackets (< >)
 * - Each tag <= 100 characters
 * - Total character length calculated using YouTube's exact rules <= maxTotalLength (default 480 chars to stay safely under YouTube's 500 limit)
 * @param {Array<string>} tags 
 * @param {number} maxTotalLength 
 * @returns {Array<string>} Safe array of tags
 */
export function sanitizeTags(tags = [], maxTotalLength = 480) {
  if (!Array.isArray(tags)) return [];
  const safeTags = [];
  let currentLength = 0;

  for (let tag of tags) {
    if (typeof tag !== 'string') continue;
    let cleanTag = tag.replace(/[<>]/g, '').trim();
    if (!cleanTag) continue;
    if (cleanTag.length > 100) {
      cleanTag = cleanTag.substring(0, 100).trim();
    }
    
    const tagChars = cleanTag.includes(' ') ? cleanTag.length + 2 : cleanTag.length;
    const addedLen = safeTags.length === 0 ? tagChars : tagChars + 1;
    if (currentLength + addedLen > maxTotalLength) {
      break;
    }
    
    safeTags.push(cleanTag);
    currentLength += addedLen;
  }

  return safeTags;
}

/**
 * Saves the video queue array back to data/videos.json under { videos: [...] }
 * @param {Array} videos 
 */
export function saveVideos(videos) {
  try {
    if (Array.isArray(videos)) {
      videos.forEach(v => {
        if (v && v.tags) {
          v.tags = sanitizeTags(v.tags);
        }
      });
    }
    const dataObj = { videos };
    const jsonContent = formatJsonWithSingleLineTags(dataObj);

    fs.writeFileSync(DATA_FILE, jsonContent, 'utf-8');

    const jsFile = path.join(path.dirname(DATA_FILE), 'videos.js');
    const jsContent = `window.VIDEOS_DATA = ${jsonContent};\n`;
    fs.writeFileSync(jsFile, jsContent, 'utf-8');

    console.log(`Successfully updated ${DATA_FILE}`);
  } catch (error) {
    console.error('Error writing to videos.json:', error.message);
  }
}

/**
 * Returns summary statistics for video statuses
 * @param {Array} videos 
 */
export function calculateStats(videos = []) {
  return {
    total: videos.length,
    pending: videos.filter(v => v.status === 'pending').length,
    scheduled: videos.filter(v => v.status === 'scheduled').length,
    uploading: videos.filter(v => v.status === 'uploading').length,
    published: videos.filter(v => v.status === 'published').length,
    failed: videos.filter(v => v.status === 'failed').length
  };
}

/**
 * Finds the next scheduled video chronologically
 * @param {Array} videos 
 */
export function getNextUpload(videos = []) {
  const now = new Date();
  const scheduled = videos
    .filter(v => v.status === 'scheduled' && v.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  
  return scheduled.find(v => new Date(v.scheduledAt) > now) || scheduled[0] || null;
}

/**
 * Formats a Date into a human-readable string
 * @param {string|Date} dateIso 
 */
export function formatDate(dateIso) {
  if (!dateIso) return 'N/A';
  const d = new Date(dateIso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
