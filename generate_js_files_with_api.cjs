const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// Mistral API configuration
const MISTRAL_API_KEY = '6nDPXghTKUWZpMJiticQULm1CPxQBDBF';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Define the schema for the Mistral API response
const TranslationSchema = z.object({
    lu_part1: z.string().describe("First part of the proverb in Luxembourgish"),
    lu_part2: z.string().describe("Second part of the proverb in Luxembourgish"),
    en_literal_p1: z.string().describe("Literal translation of Part 1"),
    en_literal_p2: z.string().describe("Literal translation of Part 2"),
    en_correct_p1: z.string().describe("Idiomatic/correct translation of Part 1"),
    en_correct_p2: z.string().describe("Idiomatic/correct translation of Part 2"),
    culturalPopularity: z.union([z.string(), z.number()]).transform(val => parseInt(val, 10)).describe("Popularity score (1-5)"),
    wordsDifficulty: z.union([z.string(), z.number()]).transform(val => parseInt(val, 10)).describe("Difficulty score (1-5)")
});

// Function to call Mistral API with retry logic and exponential backoff
async function callMistralAPI(prompt, maxRetries = 3) {
    let retries = 0;
    let delay = 1000; // Initial delay in milliseconds
    
    while (retries < maxRetries) {
        try {
            const response = await fetch(MISTRAL_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'mistral-tiny',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    response_format: { type: 'json_object' }
                })
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limit exceeded, wait and retry with exponential backoff
                    console.log(`Rate limited. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                    retries++;
                    continue;
                } else {
                    throw new Error(`API request failed with status ${response.status}`);
                }
            }
            
            const data = await response.json();
            const parsedData = TranslationSchema.parse(JSON.parse(data.choices[0].message.content));
            return parsedData;
        } catch (error) {
            console.error(`Attempt ${retries + 1} failed: ${error.message}`);
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
    const prompt = `Analyze and translate the following Luxembourgish proverb:
    "${content}"
    
    Split the proverb into two parts semantically and provide the following in JSON format:
    {
        "lu_part1": "First part of the proverb in Luxembourgish",
        "lu_part2": "Second part of the proverb in Luxembourgish",
        "en_literal_p1": "Literal translation of Part 1",
        "en_literal_p2": "Literal translation of Part 2",
        "en_correct_p1": "Idiomatic/correct translation of Part 1",
        "en_correct_p2": "Idiomatic/correct translation of Part 2",
        "culturalPopularity": "Popularity score (1-5)",
        "wordsDifficulty": "Difficulty score (1-5)"
    }
    
    Important: The combination of lu_part1 and lu_part2 must exactly match the original proverb: "${content}". Do not modify the original text.`;
    
    // Call Mistral API
    const translationData = await callMistralAPI(prompt);
    
    // Verify that the combination of lu_part1 and lu_part2 matches the original content
    const combinedParts = translationData.lu_part1 + ' ' + translationData.lu_part2;
    const normalizedExpected = content.replace(/\s+/g, ' ').trim();
    const normalizedGot = combinedParts.replace(/\s+/g, ' ').trim();
    
    // Allow minor differences like commas
    const expectedWithoutComma = normalizedExpected.replace(/,/g, '');
    const gotWithoutComma = normalizedGot.replace(/,/g, '');
    
    if (expectedWithoutComma !== gotWithoutComma) {
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
    
    for (const txtFile of filesToProcess) {
        await processFile(txtFile);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const limit = args.length > 0 ? parseInt(args[0]) : null;

// Execute the function with optional limit
iterateAndGenerate(limit).catch(console.error);