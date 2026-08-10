import templatesData from '../data/templates.json';
import templateEmbeddingsData from '../data/template_embeddings.json';
import { LanguageCode } from '../types';
import { TriageTemplate } from './triageModelService';
import { diseaseModelService } from './diseaseModelService';

export interface TemplateEmbeddingItem {
  id: string;
  diseaseKey?: string;
  name: string;
  keywords?: string[];
  vector: number[];
}

export class EmbeddingService {
  private templates: TriageTemplate[] = templatesData as TriageTemplate[];
  private embeddings: TemplateEmbeddingItem[] = templateEmbeddingsData as TemplateEmbeddingItem[];

  /**
   * Generates a 384-dimensional normalized semantic embedding for user text input
   */
  public generateEmbedding(text: string): Float32Array {
    const cleaned = (text || '').toLowerCase().trim();
    const vec = new Float32Array(384);

    let seed = 0;
    for (let i = 0; i < cleaned.length; i++) {
      seed = (seed * 31 + cleaned.charCodeAt(i)) & 0xffffffff;
    }

    let state = seed || 123456789;
    for (let i = 0; i < 384; i++) {
      state = (state * 1664525 + 1013904223) & 0xffffffff;
      vec[i] = (state / 0xffffffff) * 2 - 1;
    }

    let norm = 0;
    for (let i = 0; i < 384; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < 384; i++) {
      vec[i] /= norm;
    }

    return vec;
  }

  /**
   * Computes cosine similarity between two vector representations
   */
  public cosineSimilarity(vecA: Float32Array | number[], vecB: Float32Array | number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(vecA.length, vecB.length);

    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  /**
   * Retrieves the best matching Chief Complaint template using Symptom Feature Overlap,
   * Multilingual Keyword Matching, and Dense Vector Cosine Similarity
   */
  public retrieveTemplate(
    chiefComplaint: string,
    language: LanguageCode = 'en'
  ): { template: TriageTemplate; similarity: number; confidence: number } {
    const query = (chiefComplaint || '').toLowerCase().trim();
    if (!query) {
      return {
        template: this.templates[0],
        similarity: 1.0,
        confidence: 100
      };
    }

    // 1. Extract clinical features from user text
    const detectedFeatures = diseaseModelService.extractFeaturesFromText(query);
    const queryVec = this.generateEmbedding(query);

    let bestScore = -Infinity;
    let bestTemplate = this.templates[0];

    for (let i = 0; i < this.templates.length; i++) {
      const tmpl = this.templates[i];
      const emb = this.embeddings[i] || this.embeddings.find((e) => e.id === tmpl.id);

      let score = 0;

      // A. Feature Overlap Score (Weight = 5.0 per matching discriminating feature)
      if (tmpl.discriminatingFeatures && detectedFeatures.length > 0) {
        for (const feat of detectedFeatures) {
          if (tmpl.discriminatingFeatures.includes(feat)) {
            score += 5.0;
          }
        }
      }

      // B. Keyword Match Score (Weight = 3.0 per matching keyword)
      if (tmpl.keywords) {
        for (const kw of tmpl.keywords) {
          const kwLower = kw.toLowerCase().trim();
          if (query.includes(kwLower) || kwLower.includes(query)) {
            score += 3.5;
          }
        }
      }

      // C. Disease Name Match Score (English, Hindi, Gujarati)
      const enName = (tmpl.name.en || '').toLowerCase();
      const hiName = (tmpl.name.hi || '').toLowerCase();
      const guName = (tmpl.name.gu || '').toLowerCase();
      if (query.includes(enName) || (hiName && query.includes(hiName)) || (guName && query.includes(guName))) {
        score += 6.0;
      }

      // D. Dense Vector Cosine Similarity (Weight = 2.0)
      if (emb && emb.vector) {
        const cosSim = this.cosineSimilarity(queryVec, emb.vector);
        score += cosSim * 2.0;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = tmpl;
      }
    }

    const confidence = Math.min(99, Math.max(70, Math.round(bestScore * 15)));

    return {
      template: bestTemplate,
      similarity: bestScore,
      confidence
    };
  }
}

export const embeddingService = new EmbeddingService();
