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
	apiKey: process.env.MISTRAL_API_KEY || '6nDPXghTKUWZpMJiticQULm1CPxQBDBF'
});

// Google Gemini configuration
const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY
});

// Define the schema for the API response
const DataSchema = z.object({
	lu_part1: z.string().describe('First part of the proverb in Luxembourgish'),
	lu_part2: z.string().describe('Second part of the proverb in Luxembourgish'),
	en_literal_p1: z
		.string()
		.describe(
			'Literal but grammatically correct, translation of the Luxembourgish Proverb, Part 1'
		),
	en_literal_p2: z
		.string()
		.describe(
			'Literal but grammatically correct, translation of the Luxembourgish Proverb, Part 2'
		),
	en_correct_p1: z
		.string()
		.describe('Idiomatic correct translation of the Luxembourgish Proverb, Part 1'),
	en_correct_p2: z
		.string()
		.describe('Idiomatic correct translation of the Luxembourgish Proverb, Part 2'),
	culturalPopularity: z
		.number()
		.int()
		.min(1)
		.max(5)
		.describe(
			'Popularity score (1-5) based on how common or well known the proverb is in modern Luxembourgish.'
		),
	wordsDifficulty: z
		.number()
		.int()
		.min(1)
		.max(5)
		.describe(
			'Difficulty score (1-5), based on how many uncommon or complicated words are used in the original Luxembourgish.'
		)
});

// Function to call AI API with fallback
async function callAI(prompt) {
	const models = [mistral('mistral-large-latest'), google('gemini-2.0-flash-exp')];

	let lastError;
	for (const model of models) {
		try {
			console.log(`Calling model: ${model.modelId}`);
			const { output } = await generateText({
				model,
				output: Output.object({
					schema: DataSchema
				}),
				system:
					'Analyze and translate the following Luxembourgish proverb. Also ensure to split the proverb into two parts semantically in the requested format.',
				prompt
			});

			return output;
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

// Function to process each .txt file and generate a .json file
export async function processFile(txtFilePath) {
	try {
		const content = fs.readFileSync(txtFilePath, 'utf-8').trim();

		const prompt = `Luxembourgish proverb:
        "${content}"
        
        Important: The combination of lu_part1 and lu_part2 must exactly match the original proverb: "${content}". Do not modify the original text.`;

		const translationData = await callAI(prompt);

		// Verify that the combination of lu_part1 and lu_part2 matches the original content
		const combinedParts = translationData.lu_part1 + ' ' + translationData.lu_part2;
		const normalizedExpected = content.replace(/\s+/g, ' ').trim();
		const normalizedGot = combinedParts.replace(/\s+/g, ' ').trim();

		if (normalize(normalizedExpected) !== normalize(normalizedGot)) {
			console.warn(
				`Verification failed for ${txtFilePath}: Combined parts do not match the original content.`
			);
			console.log(`Expected: "${content}"`);
			console.log(`Got: "${combinedParts}"`);

			const errorFilePath = txtFilePath.replace('.txt', '_error.json');
			fs.writeFileSync(
				errorFilePath,
				JSON.stringify(
					{
						file: txtFilePath,
						expected: content,
						got: combinedParts,
						data: translationData
					},
					null,
					2
				),
				'utf-8'
			);
			return;
		}

		const jsonFilePath = txtFilePath.replace('.txt', '.json');
		fs.writeFileSync(jsonFilePath, JSON.stringify(translationData, null, 2), 'utf-8');
		console.log(`Generated: ${jsonFilePath}`);
	} catch (error) {
		console.error(`Failed to process ${txtFilePath}: ${error.message}`);
		throw error;
	}
}

// Function to iterate over all .txt files in the datasets folder
export async function iterateAndGenerate(limit = null) {
	const datasetsDir = path.join(__dirname, 'datasets');
	const txtFiles = [];

	function readFiles(dir) {
		const files = fs.readdirSync(dir);
		files.forEach((file) => {
			const fullPath = path.join(dir, file);
			const stat = fs.statSync(fullPath);
			if (stat.isDirectory()) {
				readFiles(fullPath);
			} else if (file.endsWith('.txt')) {
				txtFiles.push(fullPath);
			}
		});
	}

	if (!fs.existsSync(datasetsDir)) {
		console.error(`Directory not found: ${datasetsDir}`);
		return;
	}

	readFiles(datasetsDir);
	txtFiles.sort();

	const filesToProcess = limit ? txtFiles.slice(0, limit) : txtFiles;

	// Process files in batches
	const BATCH_SIZE = 5;
	for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
		const batch = filesToProcess.slice(i, i + BATCH_SIZE);
		await Promise.all(batch.map((txtFile) => processFile(txtFile)));
	}
}

// Entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	const limit = args.length > 0 ? parseInt(args[0]) : null;

	iterateAndGenerate(limit)
		.then(() => console.log('Finished processing.'))
		.catch(console.error);
}

export { DataSchema, callAI };
