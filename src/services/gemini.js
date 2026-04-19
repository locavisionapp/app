import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const analyzeVehicleImage = async (imageBase64, vehicleType = 'car') => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
    Analyze this ${vehicleType} image for damage detection. Provide a detailed JSON response with the following structure:
    
    {
      "damages": [
        {
          "type": "scratch|dent|broken_glass|other",
          "severity": 1-5,
          "location": "front|rear|left|right|roof|interior",
          "description": "brief description",
          "estimated_cost": optional_number
        }
      ],
      "overall_condition": 1-10,
      "confidence": 0-1
    }
    
    Focus on:
    - Scratches and paint damage
    - Dents and body damage  
    - Glass damage (windows, mirrors)
    - Tire condition
    - Interior damage if visible
    
    Be conservative in damage detection - only report clear damage.
    Respond with valid JSON only.
    `;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // Clean and parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Invalid JSON response from Gemini');
    
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    throw error;
  }
};

export const compareInspections = async (beforeImages, afterImages) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
    Compare these vehicle inspection images (before vs after) and identify NEW damages that appeared.
    
    Provide JSON response:
    {
      "new_damages": [
        {
          "type": "scratch|dent|broken_glass|other",
          "severity": 1-5,
          "location": "front|rear|left|right|roof|interior",
          "description": "description of new damage",
          "estimated_cost": number
        }
      ],
      "total_new_cost": number,
      "comparison_confidence": 0-1
    }
    
    Only include damages that are present in "after" images but NOT in "before" images.
    `;
    
    const imageParts = [
      ...beforeImages.map(img => ({
        inlineData: {
          data: img,
          mimeType: 'image/jpeg'
        }
      })),
      ...afterImages.map(img => ({
        inlineData: {
          data: img,
          mimeType: 'image/jpeg'
        }
      }))
    ];
    
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Invalid JSON response from comparison');
    
  } catch (error) {
    console.error('Error comparing inspections:', error);
    throw error;
  }
};

export const extractVehicleInfoFromPlate = async (plateOrImage) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    let prompt = "";
    let content = [];

    if (plateOrImage.startsWith('data:image') || plateOrImage.length > 50) {
      // Image mode
      prompt = `
      Identify the vehicle in this image.
      Read the license plate (OCR).
      Identify brand and model from the vehicle's appearance.
      
      Provide a JSON response ONLY with this exact structure:
      {
        "licensePlate": "STRING (the plate found)",
        "brand": "STRING (e.g. Peugeot)",
        "model": "STRING (e.g. 5008)",
        "category": "citadine|berline|suv|utilitaire|fourgon",
        "confidence": 0-1
      }
      
      If you can't read the plate but identify the car, return the car info and plate "INCONNU".
      Respond with valid JSON only.
      `;
      content = [
        prompt,
        {
          inlineData: {
            data: plateOrImage.split(',')[1] || plateOrImage,
            mimeType: 'image/jpeg'
          }
        }
      ];
    } else {
      // Text mode (simulate lookup)
      prompt = `
      You are a vehicle database assistant. Given the license plate "${plateOrImage}", determine the most likely vehicle details (Brand, Model, Category) if this sequence/format corresponds to any known car in your training data (focused on French/European formats).
      
      If the plate looks random, guess a common professional rental vehicle.
      
      Provide a JSON response ONLY:
      {
        "licensePlate": "${plateOrImage}",
        "brand": "STRING",
        "model": "STRING",
        "category": "citadine|berline|suv|utilitaire|fourgon",
        "confidence": 0-1
      }
      `;
      content = [prompt];
    }

    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text().trim();
    
    // Improved JSON extraction: search for the first '{' and the last '}'
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = text.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonStr);
    }
    
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Error extracting vehicle info:', error);
    // Return a structured error object instead of throwing
    return { 
      error: true, 
      message: error.message,
      brand: '',
      model: '',
      licensePlate: typeof plateOrImage === 'string' && plateOrImage.length < 20 ? plateOrImage : 'ERREUR',
      category: 'citadine'
    };
  }
};
