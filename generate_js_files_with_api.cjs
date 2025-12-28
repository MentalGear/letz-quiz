const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { Mistral } = require('@mistralai/mistralai');

// Mistral API configuration
const MISTRAL_API_KEY = '6nDPXghTKUWZpMJiticQULm1CPxQBDBF';

// Define the schema for the Mistral API response
const DataSchema = z.object({
    lu_part1: z.string().describe("First part of the proverb in Luxembourgish"),
    lu_part2: z.string().describe("Second part of the proverb in Luxembourgish"),
    en_literal_p1: z.string().describe("Literal but grammatically correct, translation of the Luxembourgish Proverb, Part 1"),
    en_literal_p2: z.string().describe("Literal but grammatically correct, translation of the Luxembourgish Proverb, Part 2"),
    en_correct_p1: z.string().describe("Idiomatic correct translation of the Luxembourgish Proverb, Part 1"),
    en_correct_p2: z.string().describe("Idiomatic correct translation of the Luxembourgish Proverb, Part 2"),
    culturalPopularity: z.union([z.string(), z.number()]).transform(val => parseInt(val, 10)).describe("Popularity score (1-5) based on how common or well known the proverb is in modern Luxembourgish."),
    wordsDifficulty: z.union([z.string(), z.number()]).transform(val => parseInt(val, 10)).describe("Difficulty score (1-5), based on how many uncommon or complicated words are used in the original Luxembourgish.")
});

// Function to call Mistral API with retry logic and exponential backoff
async function callMistralAPI(prompt, maxRetries = 3) {
    let retries = 0;
    let delay = 1000; // Initial delay in milliseconds

    const client = new Mistral({ apiKey: MISTRAL_API_KEY });

    while (retries < maxRetries) {
        try {
            console.log(`Attempt ${retries + 1}: Calling Mistral API with prompt: ${prompt}`);
            console.log(`DataSchema: ${JSON.stringify(DataSchema)}`);
            const chatResponse = await client.chat.parse({
                model: 'mistral-large-2512',
                messages: [
                        {
      role: 'system',
      content: 'Analyze and translate the following Luxembourgish proverb. Also ensure to split the proverb into two parts semantically in the requested format.',
    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                response_format: { type: 'json_schema', schema: DataSchema },
            });

            console.log(`API Response: ${chatResponse.choices[0].message.content}`);
            const parsedData = DataSchema.parse(JSON.parse(chatResponse.choices[0].message.content));
            return parsedData;
        } catch (error) {
            console.error(`Attempt ${retries + 1} failed: ${error.message}`);
            console.error(`Error Stack: ${error.stack}`);
            retries++;
            if (retries >= maxRetries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
}

// Function to process each .txt file and generate a .json file
async function processFile(txtFilePath) {
    const content = fs.readFileSync(txtFilePath, 'utf-8').trim();
    
    // Generate the prompt for Mistral API
    // const prompt = `Analyze and translate the following Luxembourgish proverb:
    const prompt = `Luxembourgish proverb:
    "${content}"
    
    Important: The combination of lu_part1 and lu_part2 must exactly match the original proverb: "${content}". Do not modify the original text.`;
    
    // Call Mistral API
    const translationData = await callMistralAPI(prompt);
    
    // Verify that the combination of lu_part1 and lu_part2 matches the original content
    const combinedParts = translationData.lu_part1 + ' ' + translationData.lu_part2;
    const normalizedExpected = content.replace(/\s+/g, ' ').trim();
    const normalizedGot = combinedParts.replace(/\s+/g, ' ').trim();

    // Allow minor differences like commas and periods
    const expectedWithoutPunctuation = normalizedExpected.replace(/[,\.]/g, '');
    const gotWithoutPunctuation = normalizedGot.replace(/[,\.]/g, '');

    if (expectedWithoutPunctuation !== gotWithoutPunctuation) {
        console.error(`Verification failed for ${txtFilePath}: Combined parts do not match the original content.`);
        console.log(`Expected: "${content}"`);
        console.log(`Got: "${combinedParts}"`);
        
        // Write the error record to a separate error file
        const errorFilePath = txtFilePath.replace('.txt', '_error.json');
        const errorContent = {
            file: txtFilePath,
            expected: content,
            got: combinedParts,
            data: translationData
        };
        fs.writeFileSync(errorFilePath, JSON.stringify(errorContent, null, 2), 'utf-8');
        console.log(`Error record written to: ${errorFilePath}`);
        return;
    }
    
    // Generate the corresponding .json file path
    const jsonFilePath = txtFilePath.replace('.txt', '.json');
    
    // Create the .json file content
    const jsonContent = {
        lu_part1: translationData.lu_part1,
        lu_part2: translationData.lu_part2,
        en_literal_p1: translationData.en_literal_p1,
        en_literal_p2: translationData.en_literal_p2,
        en_correct_p1: translationData.en_correct_p1,
        en_correct_p2: translationData.en_correct_p2,
        culturalPopularity: translationData.culturalPopularity,
        wordsDifficulty: translationData.wordsDifficulty
    };
    
    // Write the .json file
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonContent, null, 2), 'utf-8');
    console.log(`Generated: ${jsonFilePath}`);
}

// Function to iterate over all .txt files in the datasets folder
async function iterateAndGenerate(limit = null) {
    const datasetsDir = path.join(__dirname, 'src/lib/datasets');
    const txtFiles = [];

    // Recursively read all files in the datasets directory
    function readFiles(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                readFiles(fullPath);
            } else if (file.endsWith('.txt')) {
                txtFiles.push(fullPath);
            }
        });
    }

    readFiles(datasetsDir);

    // Process files with optional limit
    const filesToProcess = limit ? txtFiles.slice(0, limit) : txtFiles;

    // Process files in batches of 10 for efficiency
    for (let i = 0; i < filesToProcess.length; i += 10) {
        const batch = filesToProcess.slice(i, i + 10);
        await Promise.all(batch.map(txtFile => processFile(txtFile)));
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const limit = args.length > 0 ? parseInt(args[0]) : null;

// Execute the function with optional limit
iterateAndGenerate(limit).catch(console.error);