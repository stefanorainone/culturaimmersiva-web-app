// Service for generating city images using AI

export const generateCityImage = async (cityName, region) => {
  const prompt = `A beautiful, photorealistic aerial view of ${cityName}, ${region}, Italy. Historic architecture, vibrant colors, cinematic lighting, high quality, professional photography.`;

  try {
    // Using a free placeholder service while we set up DALL-E
    // In production, you would use OpenAI DALL-E API

    // For now, we use Unsplash API or similar
    // const response = await fetch(`https://api.unsplash.com/search/photos?query=${cityName}+italy&client_id=YOUR_KEY`);

    // Alternative: Use a placeholder that generates based on text
    const imageUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(cityName)},italy,architecture`;

    return imageUrl;
  } catch (error) {
    console.error('Error generating image:', error);
    // Fallback to cover image
    return '/images/cities/cover.webp';
  }
};

// Function to use OpenAI DALL-E (requires API key)
export const generateWithDALLE = async (cityName, region) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not found, using fallback');
    return generateCityImage(cityName, region);
  }

  const prompt = `A stunning panoramic view of the historic city of ${cityName} in ${region}, Italy. Show iconic architecture, beautiful Italian cityscape, warm Mediterranean lighting, professional travel photography style, 4k quality`;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    const data = await response.json();

    if (data.data && data.data[0] && data.data[0].url) {
      return data.data[0].url;
    }

    throw new Error('Invalid response from DALL-E');
  } catch (error) {
    console.error('Error with DALL-E:', error);
    return generateCityImage(cityName, region);
  }
};
