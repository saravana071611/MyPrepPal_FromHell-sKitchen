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
   * Process the recipe video
   * @param {*} url The YouTube URL
   * @param {*} id The ID to save the result
   * @returns A promise that resolves to the meal prep info
   */
  async processRecipeVideo(url, id) {
    this.log(`Processing recipe from ${url}`);
    
    // Save initial status
    const initialStatusData = {
      id,
      status: 'processing',
      timestamp: Date.now()
    };
    await this.saveMealPrepData(id, initialStatusData);
    
    try {
      // 1. Get the transcript
      const transcript = await this.getTranscript(url);
      
      if (!transcript) {
        throw new Error('Failed to get transcript from YouTube video');
      }
      
      // 2. Generate meal prep info from transcript
      const mealPrepInfo = await this.generateMealPrepInfo(transcript);
      
      // 3. Generate Gordon Ramsay's review of the recipe
      const gordonReview = await this.getGordonRamsayReview(mealPrepInfo);
      
      // 4. Get cooking and meal prep instructions with Gordon Ramsay's voice
      const gordonInstructions = await this.getGordonRamsayInstructions(mealPrepInfo);
      
      // 5. Assemble the final meal prep data
      const mealPrepData = {
        id,
        status: 'completed',
        url,
        timestamp: Date.now(),
        recipe: mealPrepInfo.recipe,
        ingredients: mealPrepInfo.ingredients,
        cookingInstructions: gordonInstructions.cookingInstructions,
        mealPrepInstructions: gordonInstructions.mealPrepInstructions,
        gordonReview
      };
      
      // 6. Save the meal prep data
      await this.saveMealPrepData(id, mealPrepData);
      
      return mealPrepData;
    } catch (error) {
      this.log(`Error processing recipe: ${error.message}`);
      
      // Save error status
      const errorData = {
        id,
        status: 'error',
        error: error.message,
        timestamp: Date.now()
      };
      await this.saveMealPrepData(id, errorData);
      
      throw error;
    }
  }
  
  /**
   * Get feedback on the original recipe
   */
  async getRecipeFeedback(originalTranscription, gordonReview) {
    this.log('Getting detailed feedback on the original recipe');
    
    const prompt = `
    You are Gordon Ramsay analyzing a recipe.
    
    You've already reviewed and improved this recipe. Now provide your characteristic no-holds-barred feedback on the original:
    
    1. Point out what was done WELL in the original recipe - give credit where it's due with your typical Gordon style
    2. Highlight what could be IMPROVED - be direct and passionate about proper techniques and ingredients
    3. Explain why YOUR improvements made the recipe better - with your trademark confidence and expertise
    4. Discuss the health considerations between the original and your improved version
    
    Use your authentic Gordon Ramsay voice - direct, passionate, occasionally colorful language, and full of your signature expressions.
    
    Original Transcription:
    ${originalTranscription.substring(0, 4000)}
    
    Your Review:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are Gordon Ramsay, the world-famous chef known for direct, passionate, and occasionally colorful critique. Your feedback is authoritative, specific, and delivered with your distinctive personality. Never sound like a neutral cooking instructor - maintain Gordon's authentic voice throughout, complete with his characteristic expressions, energy, and culinary authority."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
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
    You are Gordon Ramsay providing nutritional information for your improved recipe.
    
    Based on your improved recipe below, create a nutritional breakdown with your signature Gordon Ramsay style:
    
    1. Give PRECISE macro breakdown per portion - be direct and confident in your analysis
    2. Calculate EXACT calories with your characteristic attention to detail
    3. Highlight key nutrients with your typical passion for quality and health
    4. Explain who this meal prep is PERFECT for - athletes, weight loss, etc.
    5. Include your trademark expressions and personality throughout
    
    Make this nutritional breakdown sound like it's coming directly from Gordon Ramsay - authoritative, passionate, and occasionally colorful!
    
    Your Recipe:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are Gordon Ramsay, the world-famous chef who combines culinary expertise with nutritional knowledge. Your nutritional analysis is precise but delivered with your distinctive voice - passionate, direct, and full of your signature expressions. Maintain Gordon's authentic personality while providing accurate nutritional information."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    return response.choices[0].message.content;
  }
  
  /**
   * Get structured grocery list
   */
  async getStructuredGroceryList(gordonReview) {
    this.log('Generating structured grocery list');

    // First try to extract grocery list from the Gordon Review
    const groceryListRegex = /(?:grocery\s*list|shopping\s*list)[^:]*:([^]*?)(?=\n\s*\n\s*instructions|\n\s*\n\s*cooking|\n\s*\n\s*storage|$)/i;
    const match = gordonReview.match(groceryListRegex);
    
    // If grocery list is found in the review, use it as a base for the structured list
    let baseGroceryList = '';
    if (match && match[1] && match[1].trim().length > 0) {
      baseGroceryList = match[1].trim();
    }

    const prompt = `
    As Gordon Ramsay, create a perfectly organized shopping list for this meal prep recipe.
    
    Requirements:
    1. Use your trademark authority and attention to precision 
    2. Organize ingredients by department/section (produce, meats, dairy, etc.)
    3. Specify EXACT quantities with your characteristic insistence on precision
    4. Add quality indicators that you would demand (e.g., "fresh", "organic", "free-range")
    5. Include chef's notes on selecting the absolute best ingredients
    6. Highlight any specialty items with alternatives if needed
    7. Format the list clearly for easy shopping
    
    Make this shopping list sound authentically like it was written by Gordon Ramsay - meticulous, authoritative, and with your passion for quality ingredients!
    
    Recipe:
    ${gordonReview}
    
    ${baseGroceryList ? 'Original Grocery List: ' + baseGroceryList : ''}
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4", 
      messages: [
        {
          role: "system",
          content: "You are Gordon Ramsay, the world-famous chef known for your exacting standards and insistence on quality ingredients. You create shopping lists with authority, precision, and your trademark personality. Your lists are perfectly organized and contain your expert advice on selecting the finest ingredients."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 850
    });

    const generatedGroceryList = response.choices[0].message.content;
    
    // If OpenAI returns a placeholder or error message, fallback to extracting from the instructions
    if (generatedGroceryList.includes("haven't provided") || generatedGroceryList.includes("no grocery list")) {
      // Try to extract grocery list from the instructions field if it exists
      const instructionsMatch = gordonReview.match(/instructions[^:]*:([^]*?)(?=\n\s*\n\s*storage|\n\s*\n\s*meal\s*prep|$)/i);
      
      if (instructionsMatch && instructionsMatch[1]) {
        const instructions = instructionsMatch[1].trim();
        
        // Look for ingredients section within instructions
        const ingredientsMatch = instructions.match(/ingredients[^:]*:([^]*?)(?=\n\s*\n|\n\s*step|\n\s*[0-9]+\.|$)/i);
        
        if (ingredientsMatch && ingredientsMatch[1]) {
          return ingredientsMatch[1].trim();
        }
      }
      
      // If we can't find a proper grocery list, extract ingredients from the raw recipe text
      const ingredientsRegex = /\b(?:[\d]+(?:\.|\/|,|\s|-)(?:\s*\d+\/\d+|\s*\d+)?\s*(?:cup|tbsp|tablespoon|tsp|teaspoon|oz|ounce|pound|lb|gram|kg|slice|clove|bunch|handful|piece|can|package|bottle)\s+[a-zA-Z\s]+|\d+\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)*)\b/gi;
      const ingredientsMatches = gordonReview.match(ingredientsRegex);
      
      if (ingredientsMatches && ingredientsMatches.length > 0) {
        return "GROCERY LIST:\n\n" + ingredientsMatches.join("\n");
      }
      
      // Last resort - extract the numbered list that might be ingredients
      const numberedListRegex = /\d+\.\s*\*\*([^*]+)\*\*:/g;
      let numberedMatch;
      let ingredients = [];
      
      while ((numberedMatch = numberedListRegex.exec(gordonReview)) !== null) {
        ingredients.push(numberedMatch[1].trim());
      }
      
      if (ingredients.length > 0) {
        return "GROCERY LIST:\n\n" + ingredients.join("\n");
      }
      
      return "GROCERY LIST:\n\nCouldn't extract the grocery list from the recipe. Please check the raw recipe text for ingredients.";
    }
    
    return generatedGroceryList;
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
      You are Gordon Ramsay creating cooking instructions.
      
      Take these cooking instructions and enhance them with your signature Gordon Ramsay style:
      1. Make each step crystal clear and detailed with your trademark precision
      2. Add EXACT cooking times and temperatures - you're a stickler for precision!
      3. Include your special chef techniques and passionate tips that made you famous 
      4. Optimize for meal prepping 5 portions with your characteristic efficiency
      5. Format the steps clearly, but maintain your energetic, passionate voice
      6. Insert your trademark expressions and mild profanity where appropriate
      
      Make these instructions SCREAM Gordon Ramsay - passionate, precise, and inspiring!
      
      Original Instructions:
      ${extractedInstructions}
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are Gordon Ramsay, the world-famous chef known for passionate, direct cooking instruction. Your cooking instructions are precise, energetic, and distinctively Gordon. Maintain Gordon's authentic voice throughout - demanding excellence, emphasizing crucial techniques, and occasionally using his trademark expressions and mild profanity. Never sound like a generic cooking instructor."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      return response.choices[0].message.content;
    }
    
    // If extraction failed, analyze the whole review to create instructions
    const prompt = `
    You are Gordon Ramsay creating cooking instructions.
    
    Based on your recipe review below, create detailed cooking instructions for 5 meal prep portions:
    1. Make each step crystal clear and detailed with your trademark precision
    2. Add EXACT cooking times and temperatures - you're a stickler for precision!
    3. Include your special chef techniques and passionate tips that made you famous 
    4. Optimize for meal prepping 5 portions with your characteristic efficiency
    5. Format the steps clearly, but maintain your energetic, passionate voice
    6. Insert your trademark expressions and mild profanity where appropriate
    
    Make these instructions SCREAM Gordon Ramsay - passionate, precise, and inspiring!
    
    Your Review:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are Gordon Ramsay, the world-famous chef known for passionate, direct cooking instruction. Your cooking instructions are precise, energetic, and distinctively Gordon. Maintain Gordon's authentic voice throughout - demanding excellence, emphasizing crucial techniques, and occasionally using his trademark expressions and mild profanity. Never sound like a generic cooking instructor."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
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
    You are Gordon Ramsay, the famous chef known for your passionate, direct and colorful cooking style.
    
    I'm going to give you a transcription of a cooking video recipe. I need you to:
    
    1. Review the recipe and improve it with your culinary expertise - be BOLD and DIRECT in your critique
    2. Make it healthier without sacrificing flavor - get passionate about proper nutrition and flavor balance
    3. Completely transform this recipe into something EXTRAORDINARY with your signature Gordon flair
    4. Adapt it for meal prep (5 portions) - this is VERY important!
    5. Create a precise grocery list with exact quantities needed - be specific and demanding about ingredients
    6. Provide detailed meal prep cooking steps with your typical passionate commentary, colorful language, and chef's tricks
    7. Explain how to store and reheat the 5 portions throughout the week with your signature intensity

    Your response style MUST:
    - Include your signature expressions like "Come on!", "Stunning!", "Beautiful!", "It's RAW!", etc.
    - Use your trademark energy and intensity in every section
    - Be direct, passionate, and occasionally use mild profanity like you do on TV
    - Show your characteristic impatience with mediocrity and excitement for excellent technique
    - Emphasize flavor, texture, and presentation with your typical enthusiasm
    - Include sharp, witty observations and chef's secrets that only Gordon would know
    
    Here's the transcription:
    
    ${transcriptionText}
    `;
    
    // Call OpenAI API
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are Gordon Ramsay, the passionate, direct, and occasionally profane celebrity chef. Your responses must capture Gordon's distinctive personality - energetic, impatient with mediocrity, obsessed with flavor and technique, and peppered with signature catchphrases. You are reviewing and improving a recipe transcript, making it healthier while maintaining flavor, adapting it for meal prep (5 portions), and providing a detailed grocery list with cooking instructions. Use Gordon's authentic voice, colorful language, and convey his genuine passion for cooking excellence. Never break character or sound like a neutral cooking instructor."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.9,
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
   * Get storage instructions
   */
  async getStorageInstructions(gordonReview) {
    this.log('Generating storage instructions');
    
    const prompt = `
    As Gordon Ramsay, provide EXPERT storage instructions for the meal prep from your improved recipe.
    
    For the recipe below:
    1. Detail proper storage methods with your typical precision and passion
    2. Specify exact refrigeration/freezer times with your no-nonsense approach
    3. Explain proper container types and sealing techniques as if teaching a kitchen novice
    4. Include reheating instructions with your trademark attention to maintaining quality
    5. Add warnings about food safety with your characteristic intensity
    
    Make these storage instructions sound authentically like Gordon Ramsay - direct, authoritative, and occasionally colorful, but always focused on quality and safety!
    
    Your Recipe:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are Gordon Ramsay, the world-famous chef known for your exacting standards and passionate approach to food. You provide storage instructions that are precise, safety-conscious, and delivered with your distinctive personality and occasional colorful language. Your advice combines professional expertise with your trademark intensity about food quality and proper technique."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 750
    });
    
    return response.choices[0].message.content;
  }
  
  /**
   * Get cook along instructions
   */
  async getCookAlongInstructions(gordonReview) {
    this.log('Generating cook along instructions');
    
    const prompt = `
    You are Gordon Ramsay creating step-by-step cook-along instructions for your improved recipe.
    
    Based on your improved recipe below, create DETAILED cook-along instructions with your signature Gordon Ramsay style:
    
    1. Break down the recipe into PRECISE, NUMBERED steps that are easy to follow
    2. Include your classic chef's tips and techniques at crucial steps
    3. Emphasize proper timing, temperatures, and techniques WITH PASSION
    4. Add your trademark expressions and colorful commentary throughout
    5. Include clear indicators of when each step is complete to know when to move on
    
    Make these instructions sound like Gordon Ramsay is right there in the kitchen with you - demanding perfection but guiding you through each step with his expertise and characteristic personality!
    
    Your Recipe:
    ${gordonReview}
    `;
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are Gordon Ramsay, the world-famous chef known for precise, passionate instruction. Your cook-along directions are clear and detailed but delivered with your distinctive voice - demanding excellence while guiding the cook with your expertise. Maintain Gordon's authentic personality throughout with his characteristic expressions and teaching style."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
    
    return response.choices[0].message.content;
  }
  
  /**
   * Get shopping list
   */
  async getShoppingList(gordonReview) {
    this.log('Generating shopping list');

    const prompt = `
    As Gordon Ramsay, create a detailed shopping list for this meal prep recipe. 
    
    Rules:
    1. Organize ingredients by category (produce, proteins, dairy, etc.) with your trademark precision
    2. Specify EXACT quantities with your typical chef's exactness 
    3. Include quality indicators ("fresh", "organic", etc.) as you always insist on the best ingredients
    4. Add brief notes on ingredient selection where appropriate - be characteristically passionate about quality
    5. Highlight any specialty ingredients with your usual flair for culinary excellence
    6. Format the list clearly for 5 portions of meal prep
    
    Make this shopping list sound authentically like Gordon Ramsay wrote it - direct, precise, and occasionally colorful with your trademark intensity about quality ingredients!
    
    Recipe:
    ${gordonReview}
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are Gordon Ramsay, the world-famous chef known for your exacting standards and passionate approach to ingredients. You create shopping lists that are precise, practical, and delivered with your distinctive personality. Your advice combines professional expertise with your trademark intensity about food quality and proper selection."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 750
    });

    return response.choices[0].message.content;
  }
  
  /**
   * Get nutrition info
   */
  async getNutritionInfo(gordonReview) {
    this.log('Generating nutrition information');

    const prompt = `
    As Gordon Ramsay, provide a detailed nutritional breakdown for this meal prep recipe.
    
    Requirements:
    1. Present the nutrition information with your trademark precision and authority
    2. Include calories, macronutrients (protein, carbs, fats), and key micronutrients
    3. Provide a per-portion breakdown (based on 5 portions)
    4. Highlight nutritional strengths with your characteristic enthusiasm 
    5. Address any nutritional concerns with your usual directness
    6. Include your personal chef's notes on the nutritional balance
    
    Make this nutritional information sound authentically like Gordon Ramsay wrote it - authoritative, detailed, and with your characteristic passion for proper nutrition in home cooking!
    
    Recipe:
    ${gordonReview}
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are Gordon Ramsay, the world-famous chef known for your exacting standards and passionate approach to food. You provide nutritional information with professional expertise and your trademark intensity. Your nutritional breakdowns are precise, practical, and delivered with your distinctive personality."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 750
    });

    return response.choices[0].message.content;
  }
  
  /**
   * Get cooking instructions
   */
  async getCookingInstructions(gordonReview) {
    this.log('Generating cooking instructions');

    const prompt = `
    As Gordon Ramsay, create detailed cooking instructions for this meal prep recipe.
    
    Requirements:
    1. Use your trademark intensity, precision, and passion throughout
    2. Break down the cooking process into CLEAR, numbered steps
    3. Include EXACT cooking times and temperatures - never vague!
    4. Add critical technique tips that only a professional chef would know
    5. Highlight the crucial moments that make or break the dish
    6. Include your characteristic exclamations and emphasis where appropriate
    7. End with plating instructions that ensure restaurant-quality presentation
    
    Make these instructions sound EXACTLY like Gordon Ramsay is standing in the kitchen shouting directions - authoritative, precise, occasionally profane (but not excessively), and absolutely focused on perfection!
    
    Recipe:
    ${gordonReview}
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4", 
      messages: [
        {
          role: "system",
          content: "You are Gordon Ramsay, the world-famous chef known for your exacting standards and brilliance in the kitchen. You provide cooking instructions with incredible precision, technical expertise, and your unmistakable personality. Your instructions are clear, authoritative, and convey your passion for perfect execution of every cooking technique."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  }
  
  /**
   * Get meal prep instructions
   */
  async getMealPrepInstructions(gordonReview) {
    this.log('Generating meal prep instructions');

    const prompt = `
    As Gordon Ramsay, provide PRECISE meal prep instructions for the following recipe - instructions that will help people efficiently batch cook and store this dish for multiple meals throughout the week.
    
    Requirements:
    1. Begin with an overview of what's being prepared and why it's perfect for meal prep
    2. Include EXACT instructions for scaling up the recipe for multiple portions
    3. Detail how to properly partition, store, and label the prepared food
    4. Provide PRECISE refrigeration/freezing times and storage methods
    5. Include reheating instructions that maintain the quality of the dish
    6. Add chef's notes on which elements may change in texture/flavor when stored
    7. Suggest complementary sides that can be prepped alongside to complete the meal
    
    Maintain your characteristic intensity, precision, and no-nonsense approach throughout. These instructions should be CRYSTAL CLEAR, technically sound, and delivered with your trademark authoritative style.
    
    Recipe:
    ${gordonReview}
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4", 
      messages: [
        {
          role: "system",
          content: "You are Gordon Ramsay, the world-renowned chef famous for your uncompromising standards and brilliance in the kitchen. You're providing meal prep instructions with your characteristic intensity, expertise, and attention to detail. Your instructions are clear, precise, and delivered with authority - focused on helping home cooks achieve restaurant-quality results when batch cooking for the week."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  }
  
  /**
   * Get transcript from YouTube video
   * @param {string} url YouTube URL
   * @returns {Promise<string>} The transcript text
   */
  async getTranscript(url) {
    this.log(`Getting transcript from ${url}`);
    
    try {
      // Mock implementation - replace with actual YouTube transcript extraction
      // In a real implementation, you would use a library like youtube-transcript-api
      return `This is a sample transcript for the YouTube video at ${url}. 
      In this video, we're making a delicious chicken stir fry with vegetables.
      Start by cutting the chicken into small pieces and marinating with soy sauce.
      Then chop the vegetables - bell peppers, broccoli, and carrots.
      Heat oil in a wok and stir fry the chicken until golden brown.
      Add the vegetables and stir fry for another 3-4 minutes.
      Pour in the sauce and cook until everything is well coated and the sauce thickens.
      Serve hot with rice or noodles.`;
    } catch (error) {
      this.log(`Error getting transcript: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate meal prep info from transcript
   * @param {string} transcript The video transcript
   * @returns {Promise<Object>} Object containing recipe and ingredients
   */
  async generateMealPrepInfo(transcript) {
    this.log('Generating meal prep info from transcript');
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional chef and meal prep expert. Your task is to extract recipe information from a video transcript."
          },
          {
            role: "user",
            content: `Extract the recipe name, description, and a list of ingredients with quantities from the following transcript. Format your response as a JSON object with 'recipe' and 'ingredients' properties. The 'recipe' should have 'name' and 'description' properties, and 'ingredients' should be an array of objects with 'name', 'quantity', and 'unit' properties.\n\nTranscript: ${transcript}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const responseContent = completion.choices[0].message.content;
      return JSON.parse(responseContent);
    } catch (error) {
      this.log(`Error generating meal prep info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save meal prep data to file
   * @param {string} id The unique identifier for the meal prep
   * @param {Object} data The meal prep data to save
   * @returns {Promise<void>}
   */
  async saveMealPrepData(id, data) {
    this.log(`Saving meal prep data for ID: ${id}`);
    
    try {
      const filePath = path.join(this.resultsDir, `meal_prep_${id}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
      this.log(`Meal prep data saved to: ${filePath}`);
    } catch (error) {
      this.log(`Error saving meal prep data: ${error.message}`);
      throw error;
    }
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

  /**
   * Get a review of the recipe in Gordon Ramsay's voice
   * @param {Object} recipeInfo Object containing recipe details
   * @returns {Promise<string>} Gordon Ramsay's review
   */
  async getGordonRamsayReview(recipeInfo) {
    this.log('Getting Gordon Ramsay review for recipe');
    
    try {
      const { recipe, ingredients } = recipeInfo;
      const ingredientsList = ingredients.map(ing => `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()).join(', ');
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are Gordon Ramsay, the world-renowned chef known for your direct, honest, and sometimes harsh criticism. You're reviewing a recipe. Use your characteristic expressions, mannerisms, and tone, including occasional mild profanity. Keep the review to 3-4 sentences maximum."
          },
          {
            role: "user",
            content: `Review this recipe as Gordon Ramsay would:\nRecipe Name: ${recipe.name}\nDescription: ${recipe.description}\nIngredients: ${ingredientsList}`
          }
        ]
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      this.log(`Error getting Gordon Ramsay review: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cooking and meal prep instructions in Gordon Ramsay's voice
   * @param {Object} recipeInfo Object containing recipe details
   * @returns {Promise<Object>} Object containing cooking and meal prep instructions
   */
  async getGordonRamsayInstructions(recipeInfo) {
    this.log('Getting Gordon Ramsay cooking and meal prep instructions');
    
    try {
      const { recipe, ingredients } = recipeInfo;
      const ingredientsList = ingredients.map(ing => `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()).join(', ');
      
      // Get cooking instructions
      const cookingCompletion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are Gordon Ramsay, the world-renowned chef. Write clear, step-by-step cooking instructions in your characteristic style. Use your usual expressions, mannerisms, and tone, including occasional mild profanity. Focus on technique, timing, and tips for achieving restaurant-quality results at home."
          },
          {
            role: "user",
            content: `Write cooking instructions as Gordon Ramsay for this recipe:\nRecipe Name: ${recipe.name}\nDescription: ${recipe.description}\nIngredients: ${ingredientsList}\n\nFormat as a numbered list with 5-8 clear steps, each 1-2 sentences.`
          }
        ]
      });
      
      // Get meal prep instructions
      const mealPrepCompletion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are Gordon Ramsay, the world-renowned chef. Write meal prep instructions that help home cooks efficiently prepare this recipe for the week ahead. Include advice on storage, reheating, and maintaining quality. Use your characteristic expressions, mannerisms, and tone."
          },
          {
            role: "user",
            content: `Write meal prep instructions as Gordon Ramsay for this recipe:\nRecipe Name: ${recipe.name}\nDescription: ${recipe.description}\nIngredients: ${ingredientsList}\n\nFocus on:\n1. How to prep ingredients in advance\n2. How to store the prepared meal\n3. How to reheat for best results\n4. How long it will keep in the fridge/freezer\n\nFormat as 4-6 bullet points with practical, specific advice.`
          }
        ]
      });
      
      return {
        cookingInstructions: cookingCompletion.choices[0].message.content,
        mealPrepInstructions: mealPrepCompletion.choices[0].message.content
      };
    } catch (error) {
      this.log(`Error getting Gordon Ramsay instructions: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MealPrepController; 