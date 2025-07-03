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
