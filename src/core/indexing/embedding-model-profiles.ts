export type EmbeddingModelProfile = {
  dimension: number;
};

export type EmbeddingModelProfiles = {
  [provider: string]: {
    [model: string]: EmbeddingModelProfile;
  };
};

export const EMBEDDING_MODEL_PROFILES: EmbeddingModelProfiles = {
	openai: {
		"text-embedding-3-small": { dimension: 1536 },
		"text-embedding-3-large": { dimension: 3072 },
		"text-embedding-ada-002": { dimension: 1536 },
	},
	ollama: {
		"nomic-embed-text": { dimension: 768 },
		"mxbai-embed-large": { dimension: 1024 },
		"all-minilm": { dimension: 384 },
		// Add default Ollama model if applicable, e.g.:
		// 'default': { dimension: 768 } // Assuming a default dimension
	},
	"openai-compatible": {
		"text-embedding-3-small": { dimension: 1536 },
		"text-embedding-3-large": { dimension: 3072 },
		"text-embedding-ada-002": { dimension: 1536 },
	},
};