/**
 * Meal Prep Controller
 * 
 * This controller orchestrates the complete flow:
 * 1. Extract audio from YouTube video
 * 2. Transcribe the audio with Whisper API
 * 3. Send to Gordon Ramsay persona for recipe improvement
 * 4. Format and return the final meal prep output
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const TranscriptionService = require('./utils/transcription-service');

class MealPrepController {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.tempDir = options.tempDir || path.join(__dirname, 'temp');
    this.debug = options.debug || false;
    
    // Ensure API key is set
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    // Initialize the TranscriptionService
    this.transcriptionService = new TranscriptionService({
      apiKey: this.apiKey,
      tempDir: this.tempDir,
      debug: this.debug
    });
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.apiKey
    });
    
    this.log('MealPrepController initialized');
  }
  
  /**
   * Process a recipe video from YouTube to get meal prep instructions
   */
  async processRecipeVideo(videoUrl, options = {}) {
    const statusCallback = options.statusCallback || (() => {});
    const result = {
      success: false,
      status: 'initialized',
      videoUrl,
      error: null
    };
    
    try {
      // Update status
      result.status = 'extracting_audio';
      statusCallback({ ...result });
      this.log('Step 1: Extracting audio from video');
      
      // Extract and transcribe audio
      const transcriptionResult = await this.transcriptionService.extractAndTranscribe(videoUrl, {
        progressCallback: (progress) => {
          result.status = progress.stage;
          result.progress = progress.progress;
          result.message = progress.message;
          statusCallback({ ...result });
        },
        verbose: true
      });
      
      if (!transcriptionResult.success) {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      }
      
      // Update status
      result.status = 'generating_meal_prep';
      result.message = 'Sending to Gordon Ramsay for meal prep instructions';
      statusCallback({ ...result });
      this.log('Step 2: Generating meal prep instructions with Gordon Ramsay persona');
      
      // Send transcription to Gordon Ramsay persona
      const gordonReview = await this.getGordonReview(transcriptionResult.transcription.text);
      
      // Update status
      result.status = 'generating_detailed_feedback';
      result.message = 'Generating detailed feedback and macro goals';
      statusCallback({ ...result });
      this.log('Step 3: Generating detailed feedback and macro analysis');
      
      // Get detailed feedback on original recipe
      const recipeFeedback = await this.getRecipeFeedback(
        transcriptionResult.transcription.text, 
        gordonReview
      );
      
      // Get nutrition and macro goals
      const macroAnalysis = await this.getMacroAnalysis(gordonReview);
      
      // Get a more structured grocery list
      const structuredGroceryList = await this.getStructuredGroceryList(gordonReview);
      
      // Get detailed cooking method
      const detailedCookingMethod = await this.getDetailedCookingMethod(gordonReview);
      
      // Process and combine all information
      const mealPrepInfo = {
        raw: gordonReview,
        feedback: recipeFeedback,
        groceryList: structuredGroceryList,
        instructions: detailedCookingMethod,
        macros: macroAnalysis,
        storage: this.extractStorageInfo(gordonReview)
      };
      
      // Save the full review
      const timestamp = Date.now();
      const outputFilePath = path.join(
        this.tempDir, 
        `meal_prep_${timestamp}.json`
      );
      
      fs.writeFileSync(outputFilePath, JSON.stringify({
        videoUrl,
        transcription: transcriptionResult.transcription.text,
        gordonReview,
        mealPrepInfo
      }, null, 2));
      
      // Update result with success data
      result.success = true;
      result.status = 'completed';
      result.message = 'Meal prep instructions generated';
      result.mealPrepInfo = mealPrepInfo;
      result.audioFile = transcriptionResult.audioFile;
      result.transcription = transcriptionResult.transcription;
      result.gordonReview = gordonReview;
      result.outputFilePath = outputFilePath;
      
    } catch (error) {
      result.success = false;
      result.status = 'error';
      result.error = error.message;
      result.details = error.stack;
      this.log(`Error in processRecipeVideo: ${error.message}`, true);
    }
    
    // Final status update
    statusCallback({ ...result });
    return result;
  }
  
  /**
   * Get feedback on the original recipe
   */
  async getRecipeFeedback(originalTranscription, gordonReview) {
    this.log('Getting detailed feedback on the original recipe');
    
    const prompt = `
    You are a professional culinary expert. 
    
    You have been given:
    1. A transcription of an original cooking video
    2. Gordon Ramsay's review and improvement of this recipe
    
    Please provide specific, detailed feedback on the original recipe, highlighting:
    - What was done well in the original recipe
    - What could be improved (technique, ingredients, cooking methods)
    - Why Gordon's improvements are beneficial 
    - Health considerations between the original and improved version
    
    Original Transcription:
    ${originalTranscription.substring(0, 4000)}
    
    Gordon Ramsay's Review:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are a professional culinary expert. Provide detailed, specific feedback comparing the original recipe with Gordon Ramsay's improvements. Be objective and educational in your feedback."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return response.choices[0].message.content;
  }
  
  /**
   * Get nutrition and macro goals analysis
   */
  async getMacroAnalysis(gordonReview) {
    this.log('Generating nutrition and macro analysis');
    
    const prompt = `
    You are a nutritionist specializing in meal prep.
    
    Based on Gordon Ramsay's improved recipe below, please:
    
    1. Estimate the macro breakdown per portion (protein, carbs, fats)
    2. Calculate approximate calories per portion
    3. List key nutrients and health benefits
    4. Suggest who this meal prep would be ideal for (athletes, weight loss, etc.)
    5. Format this information clearly in sections for easy reading
    
    Gordon's Recipe:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are a nutritionist who analyzes recipes and provides precise macro nutritional information. Focus on accuracy and practical information."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 800
    });
    
    return response.choices[0].message.content;
  }
  
  /**
   * Get a structured grocery list
   */
  async getStructuredGroceryList(gordonReview) {
    this.log('Generating structured grocery list');
    
    // First try our regex extraction
    const extractedList = this.extractGroceryList(gordonReview);
    
    if (extractedList) {
      // If we have a grocery list, process it with OpenAI for better structure
      const prompt = `
      You are an expert meal prep assistant.
      
      Please take this grocery list and restructure it to:
      1. Group items by category (produce, protein, dairy, spices, etc.)
      2. Ensure quantities are clear and specified for 5 meal prep portions
      3. Sort ingredients in order of use in the recipe
      4. Add any notes for substitutions or alternatives where relevant
      
      Grocery List:
      ${extractedList}
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are a meal prep assistant who creates well-structured grocery lists. Be concise, clear and practical."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 600
      });
      
      return response.choices[0].message.content;
    }
    
    // If extraction failed, analyze the whole review to create a grocery list
    const prompt = `
    You are an expert meal prep assistant.
    
    Based on Gordon Ramsay's recipe review below, please create a detailed grocery list for 5 portions:
    1. Group items by category (produce, protein, dairy, spices, etc.)
    2. Ensure quantities are clear and specified for 5 meal prep portions
    3. Sort ingredients in order of use in the recipe
    4. Add any notes for substitutions or alternatives where relevant
    
    Gordon's Review:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are a meal prep assistant who creates well-structured grocery lists from recipe reviews. Be concise, clear and practical."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 600
    });
    
    return response.choices[0].message.content;
  }
  
  /**
   * Get detailed cooking method
   */
  async getDetailedCookingMethod(gordonReview) {
    this.log('Generating detailed cooking method');
    
    // First try our regex extraction
    const extractedInstructions = this.extractCookingInstructions(gordonReview);
    
    if (extractedInstructions) {
      // If we have instructions, process them with OpenAI for better structure
      const prompt = `
      You are a professional chef assistant.
      
      Please take these cooking instructions and enhance them to:
      1. Ensure each step is clear and detailed
      2. Add cooking times and temperatures where missing
      3. Include techniques and tips for better results
      4. Optimize for meal prepping 5 portions efficiently
      5. Format for easy reading with clear step numbers
      
      Original Instructions:
      ${extractedInstructions}
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are a professional chef who provides clear, detailed cooking instructions. Focus on clarity, precision and professional techniques."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 1000
      });
      
      return response.choices[0].message.content;
    }
    
    // If extraction failed, analyze the whole review to create instructions
    const prompt = `
    You are a professional chef assistant.
    
    Based on Gordon Ramsay's recipe review below, please create detailed cooking instructions for 5 meal prep portions:
    1. Ensure each step is clear and detailed
    2. Add cooking times and temperatures where needed
    3. Include techniques and tips for better results
    4. Optimize for meal prepping 5 portions efficiently
    5. Format for easy reading with clear step numbers
    
    Gordon's Review:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are a professional chef who provides clear, detailed cooking instructions from recipe reviews. Focus on clarity, precision and professional techniques."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 1000
    });
    
    return response.choices[0].message.content;
  }
  
  /**
   * Get Gordon Ramsay's review and improvements for a recipe
   */
  async getGordonReview(transcriptionText) {
    this.log(`Getting Gordon Ramsay's review`);
    
    // Prepare the prompt for Gordon Ramsay's review
    const prompt = `
    You are Gordon Ramsay, the famous chef known for your passionate, direct and sometimes cheeky cooking style.
    
    I'm going to give you a transcription of a cooking video recipe. I need you to:
    
    1. Review the recipe and improve it with your culinary expertise
    2. Make it healthier without sacrificing flavor
    3. Add your signature flair and boldness to the recipe
    4. Adapt it for meal prep (5 portions) - this is VERY important!
    5. Create a grocery list with exact quantities needed
    6. Provide detailed meal prep cooking steps for 5 portions with your typical passionate commentary
    7. Explain how to store and reheat the 5 portions throughout the week
    
    Be cheeky, passionate, and use your characteristic expressions. Don't hold back!
    
    Here's the transcription:
    
    ${transcriptionText}
    `;
    
    // Call OpenAI API
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are Gordon Ramsay, the passionate, direct, and sometimes cheeky celebrity chef. You're reviewing and improving a recipe transcript, making it healthier while maintaining flavor, adapting it for meal prep (5 portions), and providing a grocery list with detailed cooking instructions. Use Gordon's characteristic expressions and passionate style." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2500
    });
    
    // Return Gordon's response
    return response.choices[0].message.content;
  }
  
  /**
   * Process Gordon's review to extract structured meal prep information
   */
  processMealPrep(gordonReview) {
    this.log('Processing meal prep information');
    
    // Extract the grocery list
    const groceryList = this.extractGroceryList(gordonReview);
    
    // Extract cooking instructions
    const cookingInstructions = this.extractCookingInstructions(gordonReview);
    
    // Extract storage information
    const storageInfo = this.extractStorageInfo(gordonReview);
    
    return {
      raw: gordonReview,
      groceryList,
      instructions: cookingInstructions,
      storage: storageInfo
    };
  }
  
  /**
   * Extract the grocery list from Gordon's review
   */
  extractGroceryList(text) {
    // Look for "Grocery list:" or similar patterns
    const groceryListRegex = /(?:grocery\s*list|shopping\s*list)[^:]*:([^]*?)(?=\n\s*\n\s*\d+\.|meal\s*prep|cooking|$)/i;
    const match = text.match(groceryListRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return null;
  }
  
  /**
   * Extract cooking instructions from Gordon's review
   */
  extractCookingInstructions(text) {
    // First try to find a section labeled as cooking instructions
    const cookingRegex = /(?:cooking\s*instructions|meal\s*prep\s*steps)[^:]*:([^]*?)(?=\n\s*\n\s*now,\s*to\s*store|storage|$)/i;
    const match = text.match(cookingRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // If not found, look for numbered steps
    const stepsRegex = /(?:\n\s*\d+\.\s[^]*?)(?=\n\s*\n\s*now,\s*to\s*store|storage|$)/i;
    const stepsMatch = text.match(stepsRegex);
    
    if (stepsMatch && stepsMatch[0]) {
      return stepsMatch[0].trim();
    }
    
    return null;
  }
  
  /**
   * Extract storage and reheating information
   */
  extractStorageInfo(text) {
    // Look for storage and reheating instructions
    const storageRegex = /(?:now,\s*to\s*store|storage[^:]*:|reheat)[^:]*(?::)?([^]*?)(?=\n\s*\n\s*and\s*there\s*you\s*have\s*it|$)/i;
    const match = text.match(storageRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return null;
  }
  
  /**
   * Extract a section from Gordon's review text (legacy method kept for compatibility)
   */
  extractSection(text, sectionName) {
    // Try to find section with "**SectionName:**" format
    const pattern = new RegExp(`\\*\\*${sectionName}[^*]*:\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`, 'i');
    const match = text.match(pattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Try to find section with "SectionName:" format
    const simplePattern = new RegExp(`${sectionName}[^:]*:([\\s\\S]*?)(?=\\n\\n\\w+:|$)`, 'i');
    const simpleMatch = text.match(simplePattern);
    
    if (simpleMatch && simpleMatch[1]) {
      return simpleMatch[1].trim();
    }
    
    return null;
  }
  
  /**
   * Logging helper
   */
  log(message, isError = false) {
    if (this.debug) {
      if (isError) {
        console.error(`[MealPrepController] ${message}`);
      } else {
        console.log(`[MealPrepController] ${message}`);
      }
    }
  }
}

module.exports = MealPrepController; 