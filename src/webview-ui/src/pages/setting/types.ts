export type ConfigValueType =
  | string
  | number
  | boolean
  | undefined
  | null
  | object;

export interface SettingItem {
  key: string;
  type: string;
  default: ConfigValueType;
  description: string;
  enum?: string[];
  value: ConfigValueType;
  markdownDescription?: string;
  fromPackageJSON?: boolean;
}
