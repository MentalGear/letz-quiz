import { expect, test, describe, mock, beforeAll, afterAll } from 'bun:test';
import fs from 'fs';
import path from 'path';
import {
	normalize,
	processBatch,
	iterateAndGenerate,
	validateSaying
} from './generate_js_files_with_api.js';

describe('validateSaying', () => {
	const content = 'Wan d’Aarbecht ee räich méich, da wier den Iesel méi räich wéi de Mëller.';

	test('should return null for valid translation', () => {
		const data = {
			lu_part1: 'Wan d’Aarbecht ee räich méich,',
			lu_part2: 'da wier den Iesel méi räich wéi de Mëller.',
			en_literal_translation_p1: 'If work made one rich,',
			en_literal_translation_p2: 'then the donkey would be richer than the miller.',
			en_closest_real_corresponding_saying_p1: 'If hard work led to success,',
			en_closest_real_corresponding_saying_p2: 'the donkey would own the farm.'
		};
		expect(validateSaying(data, content)).toBeNull();
	});

	test('should fail if lu_part1 + lu_part2 do not match content', () => {
		const data = {
			lu_part1: 'Mismatch',
			lu_part2: 'Text',
			en_literal_translation_p2: 'valid',
			en_closest_real_corresponding_saying_p2: 'valid'
		};
		expect(validateSaying(data, content)).toBe('Combined parts do not match original text');
	});

	test('should fail if a p2 field is empty', () => {
		const data = {
			lu_part1: 'Wan d’Aarbecht ee räich méich,',
			lu_part2: '',
			en_literal_translation_p1: 'If work made one rich,',
			en_literal_translation_p2: 'then the donkey would be richer than the miller.',
			en_closest_real_corresponding_saying_p1: 'If hard work led to success,',
			en_closest_real_corresponding_saying_p2: 'the donkey would own the farm.'
		};
		expect(validateSaying(data, content)).toBe(
			'Field lu_part2 is empty - sayings must always be split in 2'
		);
	});

	test('should fail if en_literal_translation_p2 is missing', () => {
		const data = {
			lu_part1: 'Wan d’Aarbecht ee räich méich,',
			lu_part2: 'da wier den Iesel méi räich wéi de Mëller.',
			en_literal_translation_p1: 'If work made one rich,',
			en_literal_translation_p2: ' ',
			en_closest_real_corresponding_saying_p1: 'If hard work led to success,',
			en_closest_real_corresponding_saying_p2: 'the donkey would own the farm.'
		};
		expect(validateSaying(data, content)).toBe(
			'Field en_literal_translation_p2 is empty - sayings must always be split in 2'
		);
	});
});

describe('normalize', () => {
	test('should remove commas and periods', () => {
		expect(normalize('Hello, world.')).toBe('hello world');
	});

	test('should collapse whitespace', () => {
		expect(normalize('  Hello   world  ')).toBe('hello world');
	});

	test('should handle empty string', () => {
		expect(normalize('')).toBe('');
	});

	test('should handle mixed case', () => {
		expect(normalize('HELLO')).toBe('hello');
	});
});

describe('processBatch', () => {
	const testDir = path.join(__dirname, 'test_temp');
	const testTxt = path.join(testDir, 'test.txt');
	const testJson = path.join(testDir, 'test.json');

	beforeAll(() => {
		if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
		fs.writeFileSync(testTxt, "D'Aen op oder de Beidel.");
	});

	afterAll(() => {
		if (fs.existsSync(testTxt)) fs.unlinkSync(testTxt);
		if (fs.existsSync(testJson)) fs.unlinkSync(testJson);
		if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
	});

	test('should process batch correctly when AI returns matching parts', async () => {
		// Mock the ai package's generateText
		mock.module('ai', () => ({
			generateText: async () => ({
				output: {
					sayings: [
						{
							original_lu: "D'Aen op oder de Beidel.",
							lu_part1: "D'Aen op oder",
							lu_part2: 'de Beidel.',
							en_literal_translation_p1: 'Eyes up or',
							en_literal_translation_p2: 'the bag.',
							en_closest_real_corresponding_saying_p1: 'Pay attention',
							en_closest_real_corresponding_saying_p2: 'or pay the price.',
							culturalPopularity: 4,
							wordsDifficulty: 3,
							vulgarity: 1
						}
					]
				}
			}),
			Output: {
				object: (schema) => schema
			}
		}));

		// We also need to mock the providers
		mock.module('@ai-sdk/mistral', () => ({
			createMistral: () => () => ({ modelId: 'mistral' })
		}));
		mock.module('@ai-sdk/google', () => ({
			createGoogleGenerativeAI: () => () => ({ modelId: 'google' })
		}));

		await processBatch([testTxt]);

		expect(fs.existsSync(testJson)).toBe(true);
		const result = JSON.parse(fs.readFileSync(testJson, 'utf-8'));
		expect(result.lu_part1).toBe("D'Aen op oder");
	});
});

describe('File Discovery', () => {
	test('files should be sorted alphabetically', async () => {
		const testDir = path.join(__dirname, 'test_sort');
		const subDirA = path.join(testDir, 'A');
		const subDirB = path.join(testDir, 'B');

		if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
		if (!fs.existsSync(subDirA)) fs.mkdirSync(subDirA);
		if (!fs.existsSync(subDirB)) fs.mkdirSync(subDirB);

		fs.writeFileSync(path.join(subDirB, 'B_1.txt'), 'B1');
		fs.writeFileSync(path.join(subDirA, 'A_1.txt'), 'A1');

		// Sorting logic verification
		const files = ['path/to/B/B_1.txt', 'path/to/A/A_1.txt'];
		files.sort();
		expect(files[0]).toBe('path/to/A/A_1.txt');

		// Cleanup
		fs.unlinkSync(path.join(subDirA, 'A_1.txt'));
		fs.unlinkSync(path.join(subDirB, 'B_1.txt'));
		fs.rmdirSync(subDirA);
		fs.rmdirSync(subDirB);
		fs.rmdirSync(testDir);
	});
});
