
export enum InputMode {
  FILE = 'FILE',
  URL = 'URL',
  REPORT = 'REPORT',
  TRANSLATE_EN_TO_MY = 'TRANSLATE_EN_TO_MY',
  TRANSLATE_MY_TO_EN = 'TRANSLATE_MY_TO_EN',
  TRANSLATE_TEXT = 'TRANSLATE_TEXT',
}

export enum ScriptLength {
  STANDARD = 'STANDARD',
  ONE_MINUTE = 'ONE_MINUTE',
  FIVE_MINUTES = 'FIVE_MINUTES',
  LONG_ARTICLE = 'LONG_ARTICLE',
}

export enum ScriptTone {
  FORMAL = 'FORMAL',
  FRIENDLY = 'FRIENDLY',
  URGENT = 'URGENT',
  INVESTIGATIVE = 'INVESTIGATIVE',
  PRESS_RELEASE = 'PRESS_RELEASE',
  REPORT = 'REPORT',
}

export enum ScriptType {
  WEB_POST = 'WEB_POST',
  VIDEO_POST = 'VIDEO_POST',
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: WebSource;
  // Potentially other types of sources in the future
}

export interface SEOData {
  optimizedTitle: string;
  hashtags: string[];
  metaDescription: string;
}

export interface ReportStatistic {
  metric: string;
  value: string;
  detail: string;
}

export interface ReportChartData {
  label: string;
  value: number;
  unit?: string;
}

export interface GeneratedScriptResponse {
  script: string;
  sources?: GroundingChunk[];
  intermediateTranslation?: string;
  fromCache?: boolean; // To indicate if the result was served from cache
  seoData?: SEOData;
  category?: string;
  statistics?: ReportStatistic[];
  chartData?: ReportChartData[];
  chartTitle?: string;
  chartType?: string;
  scrapeMethod?: string;
  scrapeNotice?: string;
}

// Define a more specific type for candidate structure if needed for groundingMetadata
export interface Candidate {
  groundingMetadata?: {
    groundingChunks?: GroundingChunk[];
  };
  // other candidate properties
}