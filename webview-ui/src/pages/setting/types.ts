export type ConfigValueType =
  | string
  | number
  | boolean
  | undefined
  | null
  | object;

export interface Feature {
  what: string;
  benefits: string[];
  drawbacks: string[];
}

export interface SettingItem {
  key: string;
  type: string;
  default: ConfigValueType;
  description: string;
  enum?: string[];
  value: ConfigValueType;
  markdownDescription?: string;
  fromPackageJSON?: boolean;
  feature?: {
    "zh-CN": Feature;
    "en-US": Feature;
  };
}

export interface AIModel {
  readonly id: string;
  readonly name: string;
  readonly maxTokens: { input: number; output: number };
  readonly provider: {
    id: string;
    name: string;
  };
  readonly default?: boolean;
  readonly hidden?: boolean;
  readonly capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
  };
  readonly cost?: {
    input: number;
    output: number;
  };
}
