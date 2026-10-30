// worker.js
import { pipeline, env } from './transformers.min.js';

// Configure local pathways
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = './models/';

let generator = null;
const model_directory = 'Llama-3.2-1B-Instruct-ONNX';

// Listen for messages from the main UI thread
self.addEventListener('message', async (event) => {
  const { type, text } = event.data;

  // Handle Model Initialization
  if (type === 'load') {
    try {
      self.postMessage({ type: 'status', data: 'Loading local q4f16 model into WebGPU...' });
      
      generator = await pipeline('text-generation', model_directory, {
        device: 'webgpu',
        dtype: 'q4f16',
      });

      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', data: err.message });
    }
  }

  // Handle Token Generation
  if (type === 'generate') {
    if (!generator) {
      self.postMessage({ type: 'error', data: 'Model not initialized' });
      return;
    }

    try {
      const messages = [{ role: 'user', content: text }];

      const res = await generator(messages, {
        max_new_tokens: 128,
        temperature: 0.7,
      });

      const responseText = res.generated_text.at(-1).content;
      self.postMessage({ type: 'result', data: responseText });
    } catch (err) {
      self.postMessage({ type: 'error', data: err.message });
    }
  }
});
