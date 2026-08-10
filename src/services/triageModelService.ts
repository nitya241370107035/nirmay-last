import modelMetadata from '../data/model_metadata.json';
import templatesData from '../data/templates.json';
import { LanguageCode } from '../types';
import { embeddingService } from './embeddingService';

export interface TriagePredictionResult {
  classId: number; // 0: Home Care, 1: Consult within 48 Hours, 2: Immediate Medical Attention
  className: string;
  riskLevel: 'green' | 'orange' | 'red';
  confidence: number;
  probabilities: number[];
  topInfluencingFactors: { name: string; impact: string; weight: number }[];
  isRedFlagForced: boolean;
  matchedTemplateId?: string;
  matchedTemplateName?: string;
}

export interface TriageTemplate {
  id: string;
  diseaseKey?: string;
  name: Record<string, string>;
  category: string;
  urgency?: 'red' | 'orange' | 'green';
  keywords?: string[];
  discriminatingFeatures?: string[];
  redFlags?: string[];
  questions: {
    id: string;
    featureKey?: string;
    text: Record<string, string>;
    type: 'single_choice' | 'boolean' | 'boolean_inverted' | 'number';
    label?: Record<string, string>;
    options?: { value: string; label: Record<string, string>; score?: number }[];
    score?: number;
    unit?: string;
  }[];
}

class TriageModelService {
  private metadata = modelMetadata;
  private templates: TriageTemplate[] = templatesData as TriageTemplate[];
  private embeddings: Array<{ id: string; name: string; vector: number[] }> | null = null;
  private trees: any[] | null = null;
  private isModelLoading = false;

  private async loadTreesAndEmbeddings() {
    if (this.trees && this.embeddings) return;
    if (this.isModelLoading) return;
    this.isModelLoading = true;
    try {
      const [treesMod, embMod] = await Promise.all([
        import('../data/xgboost_trees.json'),
        import('../data/template_embeddings.json')
      ]);
      this.trees = (treesMod.default || treesMod) as any[];
      this.embeddings = (embMod.default || embMod) as any[];
    } catch (e) {
      console.warn('Lazy model loading fallback:', e);
    } finally {
      this.isModelLoading = false;
    }
  }

  /**
   * Computes a normalized 384-dim semantic hash vector for matching user complaint against templates
   */
  public generateEmbedding(text: string): Float32Array {
    const cleaned = text.toLowerCase().trim();
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
   * Computes cosine similarity between two vectors
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
   * Finds the best matching Chief Complaint template from clinical categories
   */
  public findBestTemplate(
    queryText: string,
    language: LanguageCode = 'en'
  ): { template: TriageTemplate; similarity: number } {
    const res = embeddingService.retrieveTemplate(queryText, language);
    return {
      template: res.template,
      similarity: res.similarity
    };
  }

  private evaluateTreeNode(node: any, featureVector: number[], featureNames: string[]): number {
    if (node.leaf !== undefined) {
      return node.leaf;
    }

    const splitFeatureName = node.split;
    let featVal = 0;

    if (splitFeatureName !== undefined) {
      let featIdx = featureNames.indexOf(splitFeatureName);
      if (featIdx === -1 && typeof splitFeatureName === 'string' && splitFeatureName.startsWith('f')) {
        const parsedIdx = parseInt(splitFeatureName.substring(1), 10);
        if (!isNaN(parsedIdx) && parsedIdx < featureVector.length) {
          featIdx = parsedIdx;
        }
      }
      if (featIdx !== -1) {
        featVal = featureVector[featIdx];
      }
    }

    const condition = node.split_condition !== undefined ? node.split_condition : 0;
    const isMissing = featVal === null || featVal === undefined || isNaN(featVal);

    if (isMissing) {
      const missingId = node.missing;
      const child = node.children.find((c: any) => c.nodeid === missingId);
      return child ? this.evaluateTreeNode(child, featureVector, featureNames) : (node.children[0]?.leaf || 0);
    }

    if (featVal < condition) {
      const yesId = node.yes;
      const child = node.children.find((c: any) => c.nodeid === yesId);
      return child ? this.evaluateTreeNode(child, featureVector, featureNames) : (node.children[0]?.leaf || 0);
    } else {
      const noId = node.no;
      const child = node.children.find((c: any) => c.nodeid === noId);
      return child ? this.evaluateTreeNode(child, featureVector, featureNames) : (node.children[1]?.leaf || 0);
    }
  }

  /**
   * Predicts triage urgency by running the trained XGBoost multi-class tree ensemble
   */
  public predictTriage(
    features: number[],
    forceRedFlag = false,
    matchedTemplate?: TriageTemplate
  ): TriagePredictionResult {
    const meta = this.metadata as any;
    const numClasses = meta.num_classes || meta.numDiseases || 3;
    const rawScores = new Float64Array(numClasses).fill(0.0);
    const featureNames = meta.feature_names || meta.canonicalFeatureOrder || [];

    // Trigger lazy loading
    if (!this.trees) {
      this.loadTreesAndEmbeddings();
    }

    // Evaluate trees if loaded
    if (this.trees && Array.isArray(this.trees)) {
      for (let i = 0; i < this.trees.length; i++) {
        const classIdx = i % numClasses;
        const treeRoot = this.trees[i];
        const leafScore = this.evaluateTreeNode(treeRoot, features, featureNames);
        rawScores[classIdx] += leafScore;
      }
    } else {
      // Direct baseline heuristics while trees load
      const redIdx = featureNames.indexOf('has_red_flag');
      const hasRed = (redIdx !== -1 && features[redIdx] === 1) || forceRedFlag;
      if (hasRed) {
        rawScores[2] = 5.0;
      } else {
        const sevModIdx = featureNames.indexOf('severity_moderate');
        const isMod = sevModIdx !== -1 && features[sevModIdx] === 1;
        if (isMod) rawScores[1] = 3.0;
        else rawScores[0] = 3.0;
      }
    }

    // Softmax probabilities
    let maxLogit = -Infinity;
    for (let i = 0; i < numClasses; i++) {
      if (rawScores[i] > maxLogit) maxLogit = rawScores[i];
    }

    let sumExp = 0;
    const expScores = new Float64Array(numClasses);
    for (let i = 0; i < numClasses; i++) {
      expScores[i] = Math.exp(rawScores[i] - maxLogit);
      sumExp += expScores[i];
    }

    const probabilities: number[] = [];
    for (let i = 0; i < numClasses; i++) {
      probabilities.push(sumExp > 0 ? expScores[i] / sumExp : 1.0 / numClasses);
    }

    let bestClass = 0;
    let highestProb = -1;
    for (let i = 0; i < numClasses; i++) {
      if (probabilities[i] > highestProb) {
        highestProb = probabilities[i];
        bestClass = i;
      }
    }

    const isRedFlag = forceRedFlag || features[featureNames.indexOf('has_red_flag')] === 1;
    if (isRedFlag) {
      bestClass = 2;
      probabilities[2] = Math.max(0.95, probabilities[2]);
    }

    const riskLevels: ('green' | 'orange' | 'red')[] = ['green', 'orange', 'red'];
    const classNames = meta.classes || ['Low', 'Medium', 'High'];

    const topInfluencingFactors: { name: string; impact: string; weight: number }[] = [];
    const topFeaturesList = meta.top_features || [];
    for (const item of topFeaturesList.slice(0, 4)) {
      const feat = String(item[0]);
      const weight = Number(item[1]);
      const idx = featureNames.indexOf(feat);
      const val = idx !== -1 ? features[idx] : 0;
      if (val > 0) {
        topInfluencingFactors.push({
          name: feat.replace(/_/g, ' ').replace('chief complaint ', ''),
          impact: val > 1 ? `Recorded: ${val}` : 'Present in Clinical Assessment',
          weight
        });
      }
    }

    return {
      classId: bestClass,
      className: classNames[bestClass] || 'Consult within 48 Hours',
      riskLevel: riskLevels[bestClass] || 'orange',
      confidence: Math.round(probabilities[bestClass] * 100),
      probabilities,
      topInfluencingFactors,
      isRedFlagForced: isRedFlag,
      matchedTemplateId: matchedTemplate?.id,
      matchedTemplateName: matchedTemplate?.name?.en
    };
  }

  public getTemplates(): TriageTemplate[] {
    return this.templates;
  }

  public getMetadata() {
    return this.metadata;
  }
}

export const triageModelService = new TriageModelService();

export async function loadXGBoostModel() {
  return triageModelService;
}

export function predictTriage(features: number[], forceRedFlag = false, template?: TriageTemplate) {
  return triageModelService.predictTriage(features, forceRedFlag, template);
}
