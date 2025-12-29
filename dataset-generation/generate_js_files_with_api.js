import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { generateText, Output } from 'ai';
import { createMistral } from '@ai-sdk/mistral';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mistral API configuration
const mistral = createMistral({
	apiKey: process.env.MISTRAL_API_KEY
});

// Google Gemini configuration
const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY
});

// Define the schema for a single saying entry
const SayingSchema = z.object({
	original_lu: z.string().describe('The original Luxembourgish saying provided in the input'),
	lu_part1: z.string().describe('First part of the saying in Luxembourgish'),
	lu_part2: z.string().describe('Second part of the saying in Luxembourgish'),
	en_literal_translation_p1: z
		.string()
		.describe('Literal but grammatically correct, translation of the Luxembourgish saying, Part 1'),
	en_literal_translation_p2: z
		.string()
		.describe('Literal but grammatically correct, translation of the Luxembourgish saying, Part 2'),
	en_closest_real_corresponding_saying_p1: z
		.string()
		.describe('Closest real corresponding English saying of the Luxembourgish saying, Part 1'),
	en_closest_real_corresponding_saying_p2: z
		.string()
		.describe('Closest real corresponding English saying of the Luxembourgish saying, Part 2'),
	culturalPopularity: z
		.number()
		.int()
		.min(1)
		.max(5)
		.describe(
			'Popularity score (1-5) based on how common or well known the saying is in modern Luxembourgish.'
		),
	wordsDifficulty: z
		.number()
		.int()
		.min(1)
		.max(5)
		.describe(
			'Difficulty score (1-5), based on how many uncommon or complicated words are used in the original Luxembourgish.'
		),
	vulgarity: z
		.number()
		.int()
		.min(1)
		.max(5)
		.describe(
			'Vulgarity score (1-5), where 1 is not vulgar at all and 5 is extremely offensive or inappropriate.'
		)
});

// Define the schema for the batch API response
const BatchDataSchema = z.object({
	sayings: z.array(SayingSchema).describe('List of analyzed and translated sayings')
});

const finalErrors = [];

// Function to call AI API with fallback
async function callAI(sayings, extraInstructions = '') {
	const models = [mistral('mistral-large-latest')];
	// try if google is better in finding the right english sayings, but out of free credits
	// const models = [google('gemini-2.0-flash-exp')];

	const prompt = `Analyze and translate the following Luxembourgish sayings:
${sayings.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

Important: Part1 of each saying should be enough for the quiz player to be able to guess Part2, but try not to have just one word as part 2 (i.e. it should be quite semantically balanced). Also, for each saying, the combination of lu_part1 and lu_part2 must exactly match the original saying. Do not modify the original text. Return the results in the requested JSON format.
${extraInstructions}

Example record:
\`\`\`json
{
  "lu_part1": "Wann d'Aarbecht ee räich méich,",
  "lu_part2": "da wier den Iesel méi räich wéi de Mëller.",
  "en_literal_translation_p1": "If the work makes one rich,",
  "en_literal_translation_p2": "then the donkey would be richer than the miller.",
  "en_closest_real_corresponding_saying_p1": "If hard work led to success,",
  "en_closest_real_corresponding_saying_p2": "the donkey would own the farm.",
  "culturalPopularity": 3,
  "wordsDifficulty": 3,
  "vulgarity": 1
}
\`\`\`
`;

	let lastError;
	for (const model of models) {
		try {
			console.log(`Calling model: ${model.modelId} for ${sayings.length} sayings`);
			const { output } = await generateText({
				model,
				output: Output.object({
					schema: BatchDataSchema
				}),
				temperature: 0,
				system:
					'You are an expert in Luxembourgish language and culture. Analyze and translate the provided sayings, splitting each into two semantic parts. Also assess cultural popularity, word difficulty, and vulgarity.',
				prompt
			});

			return output.sayings;
		} catch (error) {
			console.error(`Error with model ${model.modelId}: ${error.message}`);
			lastError = error;
		}
	}
	throw lastError;
}

// Export functions for testing
export const normalize = (str) =>
	str.replace(/[,\.]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Validates a saying entry based on strict split requirements and text matching.
 * @returns {string|null} Error message if invalid, null if valid.
 */
function validateSaying(translationData, originalContent) {
	if (!translationData) return 'No data returned';

	// 1. Strict split verification
	const p2Fields = [
		'lu_part2',
		'en_literal_translation_p2',
		'en_closest_real_corresponding_saying_p2'
	];

	for (const field of p2Fields) {
		if (!translationData[field] || translationData[field].trim() === '') {
			return `Field ${field} is empty - sayings must always be split in 2`;
		}
	}

	// 2. Text match verification
	const combinedParts = (translationData.lu_part1 || '') + ' ' + (translationData.lu_part2 || '');
	const normalizedExpected = originalContent.replace(/\s+/g, ' ').trim();
	const normalizedGot = combinedParts.replace(/\s+/g, ' ').trim();

	if (normalize(normalizedExpected) !== normalize(normalizedGot)) {
		return 'Combined parts do not match original text';
	}

	return null; // Valid
}

// Function to process a batch of .txt files
export async function processBatch(batch) {
	try {
		const sayingContents = batch.map((txtFilePath) => ({
			path: txtFilePath,
			content: fs.readFileSync(txtFilePath, 'utf-8').trim()
		}));

		console.log(`Processing batch of ${sayingContents.length} items...`);
		let results = await callAI(sayingContents.map((p) => p.content));

		let successes = [];
		let failures = [];

		// Initial check
		for (let i = 0; i < sayingContents.length; i++) {
			const item = sayingContents[i];
			const translationData = results[i];
			const error = validateSaying(translationData, item.content);

			if (error) {
				console.warn(`⚠️  Initial validation failed for: ${item.path} - ${error}`);
				console.warn('Received data:', JSON.stringify(translationData, null, 2));
				failures.push({ ...item, error, data: translationData });
			} else {
				successes.push({ ...item, data: translationData });
			}
		}

		// Retry logic for failures
		if (failures.length > 0) {
			console.log(`\nRetrying ${failures.length} failed items with corrected instructions...`);
			const retryResults = await callAI(
				failures.map((f) => f.content),
				'\n\nCRITICAL FIX: The previous attempt failed validation. Every saying MUST be split into TWO semantic parts. All "p2" fields (lu_part2, en_literal_translation_p2, en_closest_real_corresponding_saying_p2) MUST contain text. Do not leave them empty.'
			);

			const stillFailing = [];
			for (let i = 0; i < failures.length; i++) {
				const item = failures[i];
				const translationData = retryResults[i];
				const error = validateSaying(translationData, item.content);

				if (error) {
					console.warn(`❌ Still failing after retry: ${item.path} - ${error}`);
					console.warn('Received data:', JSON.stringify(translationData, null, 2));
					stillFailing.push({ ...item, error, data: translationData });
				} else {
					successes.push({ ...item, data: translationData });
				}
			}
			failures = stillFailing;
		}

		// Handle successes
		for (const item of successes) {
			const jsonFilePath = item.path.replace('.txt', '.json');
			const { original_lu, ...rest } = item.data;
			fs.writeFileSync(jsonFilePath, JSON.stringify(rest, null, 2), 'utf-8');
			console.log(`Generated: ${jsonFilePath}`);
			// Ensure any previous error file is removed if it now succeeded
			const errorFile = item.path.replace('.txt', '-error.json');
			if (fs.existsSync(errorFile)) fs.unlinkSync(errorFile);
		}

		// Handle final failures
		for (const item of failures) {
			const errorFilePath = item.path.replace('.txt', '-error.json');
			const errorData = {
				file: item.path,
				error: item.error,
				expected: item.content,
				got: (item.data?.lu_part1 || '') + ' | ' + (item.data?.lu_part2 || ''),
				fullData: item.data
			};
			fs.writeFileSync(errorFilePath, JSON.stringify(errorData, null, 2), 'utf-8');
			console.error(`❌ FAILED: ${item.path} - ${item.error}`);
			finalErrors.push(`${item.path}: ${item.error}`);
		}
	} catch (error) {
		console.error(`Failed to process batch: ${error.message}`);
		throw error;
	}
}

// Function to iterate over all .txt files in the datasets folder
export async function iterateAndGenerate(limit = null, overwrite = false, limitPerFolder = null) {
	const datasetsDir = path.join(__dirname, 'datasets');
	const txtFiles = [];

	function readFiles(dir) {
		const entries = fs
			.readdirSync(dir, { withFileTypes: true })
			.sort((a, b) => a.name.localeCompare(b.name));
		let addedInDir = 0;

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				readFiles(fullPath);
			} else if (entry.name.endsWith('.txt')) {
				if (limitPerFolder !== null && addedInDir >= limitPerFolder) continue;

				const jsonFile = fullPath.replace('.txt', '.json');
				if (overwrite || !fs.existsSync(jsonFile)) {
					txtFiles.push(fullPath);
					addedInDir++;
				}
			}
		}
	}

	if (!fs.existsSync(datasetsDir)) {
		console.error(`Directory not found: ${datasetsDir}`);
		return;
	}

	readFiles(datasetsDir);
	// Global sort to ensure overall processing order is consistent if no global limit is used,
	// though per-folder limit already depends on per-folder sort.
	txtFiles.sort();

	const filesToProcess = limit ? txtFiles.slice(0, limit) : txtFiles;

	if (filesToProcess.length === 0) {
		console.log('No new files to process.');
		return;
	}

	console.log(`Processing ${filesToProcess.length} files...`);

	// Process files in batches for LLM (e.g., 10 sayings per LLM call)
	const LLM_BATCH_SIZE = 10;
	for (let i = 0; i < filesToProcess.length; i += LLM_BATCH_SIZE) {
		const batch = filesToProcess.slice(i, i + LLM_BATCH_SIZE);
		await processBatch(batch);
	}
}

// Entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	let limit = null;
	let limitPerFolder = null;
	let overwrite = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--overwrite' || arg === '-o') {
			overwrite = true;
		} else if (arg === '--n' || arg === '-n') {
			const val = parseInt(args[++i]);
			if (!isNaN(val)) limitPerFolder = val;
		} else if (!isNaN(parseInt(arg)) && limit === null) {
			limit = parseInt(arg);
		}
	}

	iterateAndGenerate(limit, overwrite, limitPerFolder)
		.then(() => {
			if (finalErrors.length > 0) {
				console.log('\n' + '='.repeat(50));
				console.log(`Finished with ${finalErrors.length} errors:`);
				finalErrors.forEach((err) => console.log(`❌ ${err}`));
				console.log('='.repeat(50));
			} else {
				console.log('\nFinished processing successfully.');
			}
		})
		.catch(console.error);
}

export { BatchDataSchema as DataSchema, callAI, validateSaying };
