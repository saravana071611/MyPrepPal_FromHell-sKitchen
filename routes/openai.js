// Route for generating meal prep guide
router.post('/recipe-analysis', async (req, res) => {
  try {
    // Handle multiple parameter naming conventions from different clients
    const { 
      videoInfo, 
      videoUrl, 
      transcription, 
      transcript 
    } = req.body;
    
    // Create a standardized video info object from either source
    const useVideoInfo = videoInfo || 
      (videoUrl ? { title: videoUrl.split("v=")[1] || "YouTube Recipe" } : 
      { title: "Generic Recipe" });
    
    // Use either transcription or transcript parameter
    const useTranscription = transcription || transcript || "No transcription provided";
    
    console.log('Generating meal prep guide for:', useVideoInfo.title);
    
    // If missing required fields, use mock data but still return a successful response
    const isMissingData = (!videoInfo && !videoUrl) || (!transcription && !transcript);
    
    if (isMissingData) {
      console.log('Missing required fields, using default mock data');
    }
    
    // If no API key or client isn't initialized, use mock data
    if (!hasApiKey || !openai || isMissingData) {
      console.log('Using mock meal prep data');
      
      // Generate mock recipe data
      const mockMealPrepInfo = {
        recipeFeedback: getMockRecipeFeedback(useVideoInfo.title),
        groceryList: getMockGroceryList(),
        cookingInstructions: getMockCookingInstructions(),
        nutritionInfo: getMockNutritionInfo(),
        storageInstructions: getMockStorageInstructions()
      };
      
      return res.json({
        success: true,
        mealPrepInfo: mockMealPrepInfo
      });
    }
    
    console.log('Preparing OpenAI request for meal prep analysis');
    
    // Instructions for more concise responses
    const conciseInstructions = "Make all responses extremely concise and direct. Avoid wordiness, unnecessary phrases, hedging language, and filler words. Use short sentences and bullet points where possible. Be direct and to the point.";
    
    // Process recipe feedback
    const recipeFeedbackPrompt = `${conciseInstructions}
      Analyze this recipe transcription and provide brief, concise feedback comparing the original recipe with a healthier version.
      Focus on healthier ingredient alternatives and cooking methods. Be practical and nutrition-focused.
      
      Recipe Title: ${useVideoInfo.title}
      Transcription: ${useTranscription}`;
    
    const groceryListPrompt = `${conciseInstructions}
      Create a concise grocery list for a healthier version of this recipe.
      Format as a clear, categorized list (Proteins, Produce, Dairy, etc.). 
      Include quantities and note any healthier substitutions.
      
      Recipe Title: ${useVideoInfo.title}
      Transcription: ${useTranscription}`;
    
    const cookingInstructionsPrompt = `${conciseInstructions}
      Provide streamlined cooking instructions for a healthier version of this recipe.
      Use numbered steps and focus on clear, action-oriented directions.
      Format each step as a bullet point for better readability.
      Include meal prep and portioning instructions.
      
      Recipe Title: ${useVideoInfo.title}
      Transcription: ${useTranscription}`;
    
    const nutritionInfoPrompt = `${conciseInstructions}
      Provide brief nutrition information for this healthier recipe version.
      Include macros per portion, calories, key nutrients, and who this meal is ideal for.
      Format as bullet points for better readability.
      
      Recipe Title: ${useVideoInfo.title}
      Transcription: ${useTranscription}`;
    
    const storageInstructionsPrompt = `${conciseInstructions}
      Provide brief, practical storage and reheating instructions for meal prep.
      Cover recommended containers, storage duration, and best reheating methods.
      Format as bullet points for better readability.
      
      Recipe Title: ${useVideoInfo.title}
      Transcription: ${useTranscription}`;
    
    // Use Promise.all to run all GPT requests in parallel
    const [
      recipeFeedbackResponse,
      groceryListResponse,
      cookingInstructionsResponse,
      nutritionInfoResponse,
      storageInstructionsResponse
    ] = await Promise.all([
      openai.chat.completions.create({
      model: "gpt-4o",
        messages: [{ role: 'user', content: recipeFeedbackPrompt }],
        temperature: 0.7,
        max_tokens: 800
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: 'user', content: groceryListPrompt }],
        temperature: 0.7,
        max_tokens: 600
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: 'user', content: cookingInstructionsPrompt }],
        temperature: 0.7,
        max_tokens: 800
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: 'user', content: nutritionInfoPrompt }],
        temperature: 0.7,
        max_tokens: 500
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: 'user', content: storageInstructionsPrompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    ]);
    
    // Extract text from responses
    const recipeFeedback = recipeFeedbackResponse.choices[0].message.content.trim();
    const groceryList = groceryListResponse.choices[0].message.content.trim();
    const cookingInstructions = cookingInstructionsResponse.choices[0].message.content.trim();
    const nutritionInfo = nutritionInfoResponse.choices[0].message.content.trim();
    const storageInstructions = storageInstructionsResponse.choices[0].message.content.trim();
    
    // Generate Gordon's feedback in his style
    const gordonFeedbackPrompt = `${conciseInstructions}
      You are Gordon Ramsay reviewing a healthier version of this recipe:
      
      Recipe Title: ${useVideoInfo.title}
      Original Recipe Transcription: ${useTranscription}
      
      Write a concise, energetic critique in Gordon Ramsay's authentic voice. 
      Use his catchphrases, occasional mild profanity (f***, s***), and passionate tone.
      Keep it brief but impactful.
      Focus on practical meal prep advice and healthier alternatives.`;
    
    const gordonFeedbackResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: 'user', content: gordonFeedbackPrompt }],
      temperature: 0.8,
      max_tokens: 600
    });
    
    const gordonFeedback = gordonFeedbackResponse.choices[0].message.content.trim();
    
    // Combine all into meal prep info
    const mealPrepInfo = {
      recipeFeedback,
      groceryList,
      cookingInstructions,
      nutritionInfo,
      storageInstructions,
      gordonFeedback
    };
    
    console.log('Successfully generated meal prep info');
    
    res.json({
      success: true,
      mealPrepInfo
    });
  } catch (error) {
    console.error('Error generating meal prep guide:', error);
    res.status(500).json({ 
      error: 'Failed to generate meal prep guide',
      details: error.message
    });
  }
});