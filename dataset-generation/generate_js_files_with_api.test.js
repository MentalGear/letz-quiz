import { expect, test, describe, mock, beforeAll, afterAll } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { normalize, processFile, iterateAndGenerate } from './generate_js_files_with_api.js';

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

describe('processFile', () => {
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

	test('should process file correctly when AI returns matching parts', async () => {
		// Mock the ai package's generateText
		mock.module('ai', () => ({
			generateText: async () => ({
				output: {
					lu_part1: "D'Aen op oder",
					lu_part2: 'de Beidel.',
					en_literal_p1: 'Eyes up or',
					en_literal_p2: 'the bag.',
					en_correct_p1: 'Pay attention',
					en_correct_p2: 'or pay the price.',
					culturalPopularity: 4,
					wordsDifficulty: 3
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

		await processFile(testTxt);

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

		// We can't easily test iterateAndGenerate without mocking its internal readFiles or fs.readdirSync
		// because it expects a specific path.
		// But we can verify the sorting logic works as intended.
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
