import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyDH8NhvfrCoZq0CutGB1nThRkEhbfJOlJg');

async function listModels() {
  // We have to fetch from REST API because SDK doesn't expose listModels natively in older versions
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDH8NhvfrCoZq0CutGB1nThRkEhbfJOlJg');
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

listModels();
