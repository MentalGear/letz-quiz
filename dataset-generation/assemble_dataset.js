import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const datasetsDir = path.join(__dirname, 'datasets');
const outputFile = path.join(__dirname, '..', 'src', 'lib', 'dataset.json');

function collectJsonFiles(dir, fileList = []) {
	const files = fs.readdirSync(dir);

	files.forEach((file) => {
		const filePath = path.join(dir, file);
		if (fs.statSync(filePath).isDirectory()) {
			collectJsonFiles(filePath, fileList);
		} else if (path.extname(file) === '.json' && !file.endsWith('-error.json')) {
			// only use none error files
			fileList.push(filePath);
		}
	});

	return fileList;
}

function assembleDataset() {
	console.log(`Searching for JSON files in ${datasetsDir}...`);
	const jsonFiles = collectJsonFiles(datasetsDir);
	console.log(`Found ${jsonFiles.length} JSON files.`);

	const dataset = jsonFiles
		.map((filePath) => {
			try {
				const content = fs.readFileSync(filePath, 'utf-8');
				return JSON.parse(content);
			} catch (error) {
				console.error(`Error reading or parsing ${filePath}:`, error.message);
				return null;
			}
		})
		.filter((item) => item !== null);

	console.log(`Assembling ${dataset.length} items into ${outputFile}...`);
	fs.writeFileSync(outputFile, JSON.stringify(dataset, null, 2), 'utf-8');
	console.log('Dataset assembly complete.');
}

assembleDataset();
