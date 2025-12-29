// Script to split the dataset into individual files
import fs from 'fs';
import path from 'path';

// Read the input file
const inputFile = 'src/lib/Sprechwierder-lu-from-wikipedia.md';
const inputContent = fs.readFileSync(inputFile, 'utf-8');
const lines = inputContent.split('\n');

// Create the dataset directory if it doesn't exist
const datasetDir = 'dataset';
if (!fs.existsSync(datasetDir)) {
	fs.mkdirSync(datasetDir);
}

// Variables to track the current section and output file
let currentSection = null;
let currentSectionDir = null;
let currentFileIndex = 0;

// Process each line
for (const line of lines) {
	// Skip empty lines
	if (line.trim() === '') {
		continue;
	}

	// Check if the line is a section header (single character)
	if (line.length === 1 && /^[A-Z]$/.test(line)) {
		currentSection = line;
		currentSectionDir = path.join(datasetDir, currentSection);

		// Create the section directory if it doesn't exist
		if (!fs.existsSync(currentSectionDir)) {
			fs.mkdirSync(currentSectionDir);
		}

		// Reset the file index for the new section
		currentFileIndex = 0;
		continue;
	}

	// Skip lines that don't belong to any section
	if (!currentSection) {
		continue;
	}

	// Remove sentences in parentheses
	const cleanedLine = line.replace(/\(.*?\)/g, '').trim();

	// Skip empty lines after cleaning
	if (cleanedLine === '') {
		continue;
	}

	// Write the line to a new file
	const outputFile = path.join(currentSectionDir, `${currentSection}_${currentFileIndex}.txt`);
	fs.writeFileSync(outputFile, cleanedLine);
	currentFileIndex++;
}

console.log('Dataset split successfully!');
