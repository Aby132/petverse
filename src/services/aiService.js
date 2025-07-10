// PetVerse AI Healthcare Assistant
// Uses Hugging Face Inference API (Free Tier)

class PetHealthcareAI {
  constructor() {
    // Hugging Face Inference API configuration (Free tier - no API key required)
    this.huggingFaceConfig = {
      baseUrl: 'https://api-inference.huggingface.co/models',
      // Multiple models for different purposes
      models: {
        // Primary conversational model (best for chat)
        primary: 'microsoft/DialoGPT-large',
        // Backup conversational model
        backup: 'microsoft/DialoGPT-medium',
        // Text generation model
        textGen: 'gpt2-medium',
        // Question answering model
        qa: 'deepset/roberta-base-squad2',
        // Instruction following model
        instruct: 'microsoft/DialoGPT-medium'
      },
      timeout: 20000, // 20 second timeout
      retryAttempts: 2,
      maxTokens: 150
    };

    // Pet healthcare context for Hugging Face models
    this.petCareContext = `You are Dr. PetCare, a veterinary AI assistant specializing in pet healthcare.

RULES:
- Only answer pet/animal questions
- For non-pet topics: "I specialize in pet healthcare. How can I help with your pet? 🐾"
- For emergencies: Direct to veterinary care immediately
- Always recommend vet consultation for health issues
- Be helpful and professional

EXPERTISE: Pet health, nutrition, behavior, training, grooming, emergency care.`;
  }

  // Main method to generate pet healthcare responses
  async generateResponse(message, context = []) {
    try {
      // Step 1: Check if query is pet-related
      if (!this.isPetRelated(message)) {
        return "I'm specialized in pet healthcare and can only help with questions about animals, pet health, nutrition, behavior, or pet products. How can I help you with your pet today? 🐾";
      }

      // Step 2: Check for emergency situations first
      const emergencyResponse = this.checkEmergency(message);
      if (emergencyResponse) {
        return emergencyResponse;
      }

      // Step 3: Try specialized pet healthcare responses
      const specializedResponse = this.getSpecializedResponse(message);
      if (specializedResponse) {
        return specializedResponse;
      }

      // Step 4: Use Hugging Face Inference API for AI-powered responses
      const aiResponse = await this.queryHuggingFaceAI(message, context);
      if (aiResponse) {
        return this.enhancePetResponse(aiResponse, message);
      }

      // Step 5: Fallback to comprehensive pet knowledge base
      return this.getPetFallbackResponse(message);

    } catch (error) {
      console.error('Pet AI Error:', error);
      return this.getPetFallbackResponse(message);
    }
  }

  // Check if the query is related to pets/animals
  isPetRelated(message) {
    const petKeywords = [
      // Animals
      'dog', 'cat', 'puppy', 'kitten', 'pet', 'animal', 'bird', 'fish', 'rabbit', 'hamster',
      'guinea pig', 'ferret', 'reptile', 'snake', 'lizard', 'turtle', 'parrot', 'canary',
      // Health terms
      'vet', 'veterinarian', 'sick', 'health', 'disease', 'symptom', 'medicine', 'vaccine',
      'flea', 'tick', 'worm', 'parasite', 'allergy', 'infection', 'injury', 'pain',
      // Care terms
      'feed', 'food', 'nutrition', 'diet', 'exercise', 'walk', 'play', 'toy', 'treat',
      'groom', 'bath', 'brush', 'nail', 'teeth', 'training', 'behavior', 'litter',
      // Pet products
      'collar', 'leash', 'cage', 'aquarium', 'bed', 'carrier', 'harness'
    ];

    const lowerMessage = message.toLowerCase();
    return petKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Check for emergency situations
  checkEmergency(message) {
    const emergencyKeywords = [
      'emergency', 'urgent', 'help', 'dying', 'unconscious', 'bleeding', 'blood',
      'poisoned', 'poison', 'toxic', 'choking', 'seizure', 'convulsion', 'collapse',
      'not breathing', 'difficulty breathing', 'severe pain', 'accident', 'hit by car',
      'broken bone', 'fracture', 'swallowed', 'ate something', 'overdose'
    ];

    const lowerMessage = message.toLowerCase();
    const hasEmergency = emergencyKeywords.some(keyword => lowerMessage.includes(keyword));

    if (hasEmergency) {
      return `🚨 **EMERGENCY ALERT** 🚨

This sounds like a potential emergency! Please:

1. **CALL YOUR VET IMMEDIATELY** or go to the nearest emergency animal hospital
2. **Don't wait** - time is critical in emergencies
3. **Stay calm** and keep your pet as comfortable as possible

**Emergency Contacts:**
- Your regular veterinarian
- Nearest 24/7 emergency animal hospital
- Pet Poison Control: (888) 426-4435

**While getting help:**
- Keep your pet warm and quiet
- Don't give food, water, or medication unless instructed
- Bring any packaging if poisoning is suspected

I'm here for general advice, but emergency situations need immediate professional veterinary care! 🏥`;
    }

    return null;
  }

  // Get specialized responses for common pet issues
  getSpecializedResponse(message) {
    const lowerMessage = message.toLowerCase();

    // Feeding and nutrition
    if (lowerMessage.includes('not eating') || lowerMessage.includes('loss of appetite') || lowerMessage.includes('won\'t eat')) {
      return `🍽️ **Loss of Appetite in Pets**

**Immediate steps:**
- Monitor for 12-24 hours (6-12 hours for puppies/kittens)
- Ensure fresh water is available
- Try offering favorite treats or warming food slightly
- Check for other symptoms (lethargy, vomiting, diarrhea)

**When to see a vet:**
- No eating for 24+ hours (12+ for young pets)
- Accompanied by vomiting, diarrhea, or lethargy
- Significant weight loss
- Behavioral changes

**Possible causes:**
- Stress or environmental changes
- Dental problems
- Illness or infection
- Food spoilage or change in diet

💡 **Always consult your veterinarian if appetite loss persists or worsens.**`;
    }

    // Vomiting
    if (lowerMessage.includes('vomiting') || lowerMessage.includes('throwing up') || lowerMessage.includes('vomit')) {
      return `🤢 **Pet Vomiting Guide**

**Immediate care:**
- Withhold food for 12-24 hours (not water)
- Provide small amounts of water frequently
- Monitor closely for other symptoms

**When to see a vet IMMEDIATELY:**
- Blood in vomit
- Repeated vomiting (more than 2-3 times)
- Signs of dehydration
- Lethargy or weakness
- Abdominal pain or bloating

**Gradual refeeding:**
- Start with bland diet (boiled chicken & rice)
- Small, frequent meals
- Gradually return to normal food over 3-4 days

**Common causes:**
- Eating too fast
- Dietary indiscretion
- Stress
- Infections
- More serious conditions requiring vet care

🏥 **If vomiting persists or your pet seems unwell, contact your vet immediately.**`;
    }

    // Diarrhea
    if (lowerMessage.includes('diarrhea') || lowerMessage.includes('loose stool') || lowerMessage.includes('runny poop')) {
      return `💩 **Pet Diarrhea Management**

**Immediate steps:**
- Ensure plenty of fresh water (prevent dehydration)
- Withhold food for 12-24 hours
- Monitor frequency and consistency

**When to see a vet:**
- Blood in stool
- Black, tarry stools
- Severe dehydration
- Lasts more than 24-48 hours
- Accompanied by vomiting or fever

**Recovery diet:**
- Bland food: boiled chicken and rice
- Small, frequent meals
- Probiotics (vet-approved)
- Gradually return to normal diet

**Prevention:**
- Consistent, high-quality diet
- Avoid table scraps
- Regular deworming
- Stress management

💊 **Never give human anti-diarrheal medications without vet approval.**`;
    }

    return null;
  }

  // Query Hugging Face Inference API for AI responses
  async queryHuggingFaceAI(message, context = []) {
    const models = this.huggingFaceConfig.models;

    // Try primary model first, then backup
    const modelsToTry = [models.primary, models.backup];

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying Hugging Face model: ${modelName}`);

        // Prepare the prompt with pet care context
        const prompt = this.preparePetCarePrompt(message, context);

        const response = await fetch(`${this.huggingFaceConfig.baseUrl}/${modelName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_length: this.huggingFaceConfig.maxTokens,
              temperature: 0.7,
              do_sample: true,
              return_full_text: false,
              pad_token_id: 50256
            },
            options: {
              wait_for_model: true,
              use_cache: false
            }
          })
        });

        if (!response.ok) {
          console.warn(`Model ${modelName} failed with status: ${response.status}`);
          continue; // Try next model
        }

        const data = await response.json();
        console.log('Hugging Face response:', data);

        // Extract response from different model formats
        let aiResponse = this.extractResponseFromHuggingFace(data, message);

        if (aiResponse && aiResponse.length > 10) {
          return this.cleanAndValidateResponse(aiResponse, message);
        }

      } catch (error) {
        console.warn(`Error with model ${modelName}:`, error.message);
        continue; // Try next model
      }
    }

    // If all models fail, return null to use fallback
    console.log('All Hugging Face models failed, using fallback responses');
    return null;
  }

  // Prepare pet care focused prompt for Hugging Face
  preparePetCarePrompt(message, context) {
    // Add context from previous messages if available
    let contextStr = '';
    if (context && context.length > 0) {
      contextStr = context.slice(-2).map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\n';
    }

    // Create focused prompt for pet care
    return `${this.petCareContext}

${contextStr}Human: ${message}
Dr. PetCare:`;
  }

  // Extract response from various Hugging Face model formats
  extractResponseFromHuggingFace(data, originalMessage) {
    try {
      // Handle array response (most common)
      if (Array.isArray(data) && data.length > 0) {
        const firstResult = data[0];

        // DialoGPT format
        if (firstResult.generated_text) {
          return firstResult.generated_text;
        }

        // GPT-2 format
        if (firstResult.text) {
          return firstResult.text;
        }

        // Direct string response
        if (typeof firstResult === 'string') {
          return firstResult;
        }
      }

      // Handle direct object response
      if (data.generated_text) {
        return data.generated_text;
      }

      if (data.text) {
        return data.text;
      }

      // Handle error responses
      if (data.error) {
        console.error('Hugging Face API error:', data.error);
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error extracting Hugging Face response:', error);
      return null;
    }
  }

  // Clean and validate AI response
  cleanAndValidateResponse(response, originalMessage) {
    if (!response || typeof response !== 'string') {
      return null;
    }

    // Remove the original prompt/context from response
    let cleanResponse = response;

    // Remove common prefixes and the original message
    cleanResponse = cleanResponse
      .replace(this.petCareContext, '')
      .replace(originalMessage, '')
      .replace(/^(Human:|Dr\. PetCare:|AI:|Assistant:|Bot:)/i, '')
      .trim();

    // Remove incomplete sentences at the end
    const sentences = cleanResponse.split(/[.!?]+/);
    if (sentences.length > 1 && sentences[sentences.length - 1].trim().length < 10) {
      sentences.pop();
      cleanResponse = sentences.join('.') + '.';
    }

    // Ensure minimum length and quality
    if (cleanResponse.length < 10 || cleanResponse.length > 500) {
      return null;
    }

    // Check if response is pet-related (basic validation)
    const petKeywords = ['pet', 'dog', 'cat', 'animal', 'vet', 'health', 'care', 'feed', 'train'];
    const lowerResponse = cleanResponse.toLowerCase();
    const hasPetContent = petKeywords.some(keyword => lowerResponse.includes(keyword));

    if (!hasPetContent) {
      return null; // Let fallback handle non-pet responses
    }

    return cleanResponse;
  }

  // Enhance AI responses with pet-specific context
  enhancePetResponse(response, originalMessage) {
    if (!response) return null;

    let enhancedResponse = response;

    // Add veterinarian disclaimer for health-related queries
    const healthKeywords = ['sick', 'ill', 'disease', 'symptom', 'pain', 'injury', 'infection'];
    const lowerMessage = originalMessage.toLowerCase();
    const isHealthRelated = healthKeywords.some(keyword => lowerMessage.includes(keyword));

    if (isHealthRelated && !enhancedResponse.includes('veterinarian') && !enhancedResponse.includes('vet')) {
      enhancedResponse += "\n\n💡 **Important:** For any health concerns, always consult with a qualified veterinarian for proper diagnosis and treatment.";
    }

    return enhancedResponse;
  }

  // Comprehensive pet knowledge fallback responses
  getPetFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();

    // Dog-related queries
    if (lowerMessage.includes('dog') || lowerMessage.includes('puppy')) {
      return `🐕 **Dog Care Information**

Dogs are wonderful companions that need:
- **Daily exercise:** 30 minutes to 2+ hours depending on breed
- **Quality nutrition:** Age-appropriate dog food, avoid human food
- **Regular vet checkups:** Annual wellness exams, vaccinations
- **Mental stimulation:** Training, toys, social interaction
- **Grooming:** Regular brushing, nail trims, dental care

**Common dog health signs to watch:**
- Changes in appetite or water consumption
- Lethargy or unusual behavior
- Vomiting, diarrhea, or constipation
- Difficulty breathing or excessive panting
- Limping or difficulty moving

🏥 **Always consult your veterinarian for specific health concerns!**`;
    }

    // Cat-related queries
    if (lowerMessage.includes('cat') || lowerMessage.includes('kitten')) {
      return `🐱 **Cat Care Information**

Cats are independent but need proper care:
- **Nutrition:** High-quality cat food, fresh water daily
- **Litter box:** Clean daily, one box per cat plus one extra
- **Indoor safety:** Cat-proof your home, provide enrichment
- **Regular vet care:** Annual checkups, vaccinations, spay/neuter
- **Grooming:** Brush regularly, especially long-haired cats

**Cat health warning signs:**
- Not using litter box properly
- Hiding or changes in behavior
- Not eating or drinking
- Excessive vocalization
- Difficulty urinating (emergency!)

🏥 **Cats hide illness well - regular vet checkups are essential!**`;
    }

    // Nutrition and feeding
    if (lowerMessage.includes('food') || lowerMessage.includes('feed') || lowerMessage.includes('nutrition') || lowerMessage.includes('diet')) {
      return `🥘 **Pet Nutrition Guide**

**General feeding guidelines:**
- **Puppies/Kittens:** 3-4 small meals daily
- **Adult pets:** 1-2 meals daily
- **Senior pets:** May need special diets

**Choose quality food:**
- Age-appropriate formulas
- AAFCO-approved pet foods
- Avoid frequent brand changes

**TOXIC FOODS TO AVOID:**
- Chocolate, grapes, raisins
- Onions, garlic, chives
- Xylitol (artificial sweetener)
- Avocado, macadamia nuts
- Alcohol, caffeine

**Signs of good nutrition:**
- Healthy coat and skin
- Good energy levels
- Healthy weight
- Regular, normal stools

🏥 **Consult your vet for specific dietary recommendations based on your pet's needs!**`;
    }

    // Training and behavior
    if (lowerMessage.includes('training') || lowerMessage.includes('behavior') || lowerMessage.includes('aggressive') || lowerMessage.includes('barking')) {
      return `🎓 **Pet Training & Behavior**

**Basic training principles:**
- **Positive reinforcement:** Reward good behavior
- **Consistency:** Same commands, same rules
- **Patience:** Learning takes time
- **Short sessions:** 5-15 minutes multiple times daily

**Common behavioral issues:**
- **Excessive barking:** Address underlying causes
- **Destructive behavior:** Provide appropriate outlets
- **Aggression:** Seek professional help immediately
- **Separation anxiety:** Gradual desensitization

**When to seek help:**
- Aggressive behavior toward people/pets
- Destructive behavior that's escalating
- Sudden behavioral changes
- Training isn't progressing

🎯 **Consider professional trainers or veterinary behaviorists for complex issues!**`;
    }

    // General pet care
    if (lowerMessage.includes('care') || lowerMessage.includes('pet') || lowerMessage.includes('animal')) {
      return `🐾 **General Pet Care Tips**

**Daily care essentials:**
- Fresh water always available
- Regular feeding schedule
- Exercise and mental stimulation
- Love and attention

**Regular health maintenance:**
- Annual vet checkups
- Vaccinations as recommended
- Parasite prevention (fleas, ticks, worms)
- Dental care

**Safety considerations:**
- Pet-proof your home
- Secure identification (tags, microchip)
- Safe transportation (carriers, harnesses)
- Emergency vet contact information

**Signs your pet needs vet attention:**
- Changes in eating, drinking, or bathroom habits
- Lethargy or unusual behavior
- Vomiting, diarrhea, or difficulty breathing
- Any injury or pain

🏥 **When in doubt, contact your veterinarian - they're your best resource for pet health!**`;
    }

    // Default pet-focused response
    return `🐾 **Hello! I'm your Pet Healthcare AI Assistant**

I'm here to help with:
- 🏥 Pet health and wellness questions
- 🥘 Nutrition and feeding advice
- 🎓 Training and behavior guidance
- 🛡️ Emergency care information
- 🧴 Pet product recommendations

**What can I help you with today?**

*Remember: For serious health concerns, always consult with a qualified veterinarian for proper diagnosis and treatment.*`;
  }

  // Check if Hugging Face API is available
  async checkHuggingFaceAvailability() {
    try {
      const response = await fetch(`${this.huggingFaceConfig.baseUrl}/${this.huggingFaceConfig.models.primary}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: "Hello",
          parameters: { max_length: 10 }
        })
      });

      return response.status !== 503; // 503 means model is loading
    } catch (error) {
      console.warn('Hugging Face availability check failed:', error);
      return false;
    }
  }

  // Check if AI service is configured
  isConfigured() {
    return true; // Hugging Face Inference API is always available (free tier)
  }

  // Get current model information
  getCurrentModel() {
    return {
      provider: 'Hugging Face',
      primary: this.huggingFaceConfig.models.primary,
      backup: this.huggingFaceConfig.models.backup,
      status: 'Free Tier - No API Key Required'
    };
  }
}

// Export the service
const petHealthcareAI = new PetHealthcareAI();
export default petHealthcareAI;
